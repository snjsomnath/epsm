import os
import re
import json
import tempfile
import pathlib
from pathlib import Path
from typing import Optional
from django.conf import settings
from .models import Simulation, SimulationFile
import uuid
from eppy.modeleditor import IDF
from bs4 import BeautifulSoup
import psutil

import sqlite3
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


# Reserve the final portion of progress reporting for persistence/finalization steps
FINALIZATION_PROGRESS_CEILING = 95


class EnergyPlusSimulator:
    def __init__(self, simulation: Simulation, celery_task=None):
        self.simulation = simulation
        self.celery_task = celery_task  # Optional Celery task for progress updates
        
        # Ensure we're using media_root for all storage
        self.media_root = Path(settings.MEDIA_ROOT)
        
        # Create directories inside MEDIA_ROOT
        self.simulation_results_dir = self.media_root / 'simulation_results'
        self.simulation_files_dir = self.media_root / 'simulation_files'
        
        # Create the directories if they don't exist
        self.simulation_results_dir.mkdir(parents=True, exist_ok=True)
        self.simulation_files_dir.mkdir(parents=True, exist_ok=True)
        
        # Define and create the specific simulation results directory with run number
        self.run_id = str(simulation.id)
        self.results_dir = self.simulation_results_dir / self.run_id
        self.files_dir = self.simulation_files_dir / self.run_id
        
        self.results_dir.mkdir(parents=True, exist_ok=True)
        self.files_dir.mkdir(parents=True, exist_ok=True)
        
        # Log the paths for debugging
        print(f"Simulation {simulation.id} results will be saved to: {self.results_dir}")
        print(f"Simulation {simulation.id} files will be saved to: {self.files_dir}")

        # Precompute channel group name for progress pushes
        self._channel_layer = get_channel_layer()
        self._progress_group = f"simulation_progress_{self.run_id}"

    def _push_progress(self, progress: int, status: str = None, extra: dict = None):
        """Send a progress update to the Channels group so WebSocket clients receive pushes."""
        payload = {"progress": int(progress)}
        if status is not None:
            payload['status'] = status
        if extra:
            payload.update(extra)

        try:
            async_to_sync(self._channel_layer.group_send)(
                self._progress_group,
                {
                    'type': 'progress_update',
                    'payload': payload
                }
            )
        except Exception:
            # Non-fatal: continue if channel layer is not available
            pass

    def _intermediate_progress(self, completed: int, total: int) -> int:
        """Return a progress percentage capped below 100% for in-flight work."""
        if not total:
            return 100
        pct = int((completed / total) * 100)
        return min(pct, FINALIZATION_PROGRESS_CEILING)

    def run_single_simulation(self, idf_file, weather_file, simulation_dir):
        """Run a single EnergyPlus simulation using Docker container"""
        import subprocess
        import shutil

        # Resolve stored file paths.
        # Support multiple idf_file shapes:
        # - SimulationFile model instance: has `file_path` relative to MEDIA_ROOT
        # - Generated variant fake object: may have `file.path` or `.path` (absolute path)
        idf_path = None
        try:
            if hasattr(idf_file, 'file_path') and getattr(idf_file, 'file_path'):
                idf_path = os.path.join(settings.MEDIA_ROOT, idf_file.file_path)
            elif hasattr(idf_file, 'file') and hasattr(idf_file.file, 'path'):
                idf_path = str(idf_file.file.path)
            elif hasattr(idf_file, 'path'):
                idf_path = str(idf_file.path)
            elif isinstance(idf_file, str):
                idf_path = idf_file
        except Exception:
            idf_path = None

        if not idf_path:
            raise FileNotFoundError('Could not resolve IDF file path for idf_file: %r' % (idf_file,))

        # Weather file expected as SimulationFile model
        weather_path = os.path.join(settings.MEDIA_ROOT, weather_file.file_path)

        idf_basename = os.path.basename(idf_path)
        idf_name_no_ext = os.path.splitext(idf_basename)[0]

        # Prepare simulation directory
        Path(simulation_dir).mkdir(parents=True, exist_ok=True)
        
        # Copy files to simulation directory
        temp_idf_path = os.path.join(simulation_dir, 'input.idf')
        temp_epw_path = os.path.join(simulation_dir, 'weather.epw')

        shutil.copy2(idf_path, temp_idf_path)
        shutil.copy2(weather_path, temp_epw_path)

        # Preflight: ensure copied files exist in the container-side simulation directory.
        # The host path (HOST_MEDIA_ROOT) is only useful for building the docker -v source
        # string but cannot be reliably inspected from inside the container. Instead,
        # verify the files exist where the container will mount them (the container
        # simulation_dir) and write a diagnostic listing that includes the expected
        # host path for external debugging.
        host_media_root = os.environ.get('HOST_MEDIA_ROOT')
        if host_media_root and str(simulation_dir).startswith(str(settings.MEDIA_ROOT)):
            rel = os.path.relpath(str(simulation_dir), str(settings.MEDIA_ROOT))
            expected_host_sim_dir = os.path.join(host_media_root, rel)
        else:
            expected_host_sim_dir = None

        # Paths in the container that should exist
        temp_idf_container = temp_idf_path
        temp_epw_container = temp_epw_path

        missing = []
        for p in (temp_idf_container, temp_epw_container):
            if not os.path.exists(p):
                missing.append(p)

        # Write a preflight listing for debugging (container view). Include expected
        # host path if available but do not attempt to access it from inside the
        # container.
        try:
            listing = '\n'.join(os.listdir(simulation_dir))
        except Exception as _e:
            listing = f"<failed to list: {_e}>"
        try:
            with open(os.path.join(simulation_dir, 'preflight_listing.txt'), 'w') as f:
                f.write(f"simulation_dir: {simulation_dir}\n")
                if expected_host_sim_dir:
                    f.write(f"expected_host_sim_dir: {expected_host_sim_dir}\n")
                f.write(f"contents:\n{listing}\n")
        except Exception:
            pass

        if missing:
            raise FileNotFoundError(f"Preflight: expected file(s) missing in container simulation dir: {missing}")

        # Use NREL EnergyPlus Docker container
        # If backend is running inside Docker and invoking the host Docker daemon,
        # mounting the container-internal path (e.g. /app/media/...) will fail because
        # the Docker daemon on the host doesn't know that path. Allow an explicit
        # host-accessible path via HOST_MEDIA_ROOT env var.
        host_media_root = os.environ.get('HOST_MEDIA_ROOT')

        # If HOST_MEDIA_ROOT is set to the host's MEDIA_ROOT directory, translate
        # the container `simulation_dir` to the equivalent host path. This allows
        # the host Docker daemon to mount the correct host directory even when
        # the code runs inside a container.
        if host_media_root and str(simulation_dir).startswith(str(settings.MEDIA_ROOT)):
            rel = os.path.relpath(str(simulation_dir), str(settings.MEDIA_ROOT))
            mount_source = os.path.join(host_media_root, rel)
        else:
            mount_source = simulation_dir

        # Honor an environment variable to request a specific container platform
        platform = os.environ.get('EPLUS_DOCKER_PLATFORM', 'linux/amd64')

        docker_command = [
            'docker', 'run', '--rm',
            '-v', f'{mount_source}:/var/simdata/energyplus',
            '--platform', platform,
            'nrel/energyplus:23.2.0',
            'energyplus',
            '--weather', '/var/simdata/energyplus/weather.epw',
            '--output-directory', '/var/simdata/energyplus',
            '--expandobjects', '--readvars',
            '/var/simdata/energyplus/input.idf'
        ]

        try:
            # Run EnergyPlus simulation in Docker
            process = subprocess.run(
                docker_command, 
                capture_output=True, 
                text=True, 
                timeout=600,  # 10 minute timeout
                cwd=simulation_dir
            )

            display_idf_name = getattr(idf_file, 'original_name', None) or getattr(idf_file, 'file_name', None) or idf_basename

            output_log = {
                "idf_file": display_idf_name,
                "stdout": process.stdout,
                "stderr": process.stderr,
                "returncode": process.returncode,
                "output_dir": str(simulation_dir),
                "docker_command": ' '.join(docker_command)
            }

            # Save output logs
            with open(os.path.join(simulation_dir, 'run_output.log'), 'w') as f:
                f.write(f"DOCKER COMMAND: {' '.join(docker_command)}\n\n")
                f.write(f"STDOUT:\n{process.stdout}\n\nSTDERR:\n{process.stderr}")

            # Rename standard output files (same as before)
            standard_files = {
                'eplusout.err': 'output.err',
                'eplusout.eso': 'output.eso',
                'eplusout.csv': 'output.csv',
                'eplusout.html': 'output.html',
                'eplusout.mtd': 'output.mtd',
                'eplusout.mtr': 'output.mtr',
                'eplusout.rdd': 'output.rdd',
                'eplusout.shd': 'output.shd',
                'eplustbl.htm': 'output.htm',
                'epluszsz.csv': 'output_zones.csv',
                'eplusssz.csv': 'output_system.csv',
                'eplusout.sql': 'output.sql'
            }
            
            for src_name, dst_name in standard_files.items():
                src_path = os.path.join(simulation_dir, src_name)
                if os.path.exists(src_path):
                    dst_path = os.path.join(simulation_dir, dst_name)
                    os.rename(src_path, dst_path)

            # Ensure a canonical output.html exists: if only output.htm is present,
            # copy it to output.html so clients requesting output.html succeed.
            out_html = os.path.join(simulation_dir, 'output.html')
            out_htm = os.path.join(simulation_dir, 'output.htm')
            try:
                if not os.path.exists(out_html) and os.path.exists(out_htm):
                    shutil.copy2(out_htm, out_html)
            except Exception:
                # Non-fatal; we already saved run_output.log and other outputs.
                pass

            return output_log

        except subprocess.TimeoutExpired:
            return {
                "idf_file": display_idf_name,
                "error": "Simulation timed out after 10 minutes",
                "returncode": -1,
                "output_dir": str(simulation_dir)
            }
        except Exception as e:
            return {
                "idf_file": display_idf_name,
                "error": str(e),
                "returncode": -1,
                "output_dir": str(simulation_dir)
            }

    def run_simulation(self, batch_mode=False, construction_sets=None):
        """
        Main method to run simulations serially using Docker EnergyPlus containers.
        
        Note: Parallelism is handled by Celery task distribution (see tasks.py).
        This method runs simulations sequentially within a single Celery task.
        """
        try:
            self.simulation.status = 'running'
            self.simulation.save()
            # notify clients that simulation has started (progress may be 0)
            try:
                self._push_progress(self.simulation.progress or 0, status='running')
            except Exception:
                pass

            idf_files = self.simulation.files.filter(file_type='idf')
            weather_file = self.simulation.files.filter(file_type='weather').first()

            if not idf_files or not weather_file:
                raise ValueError("Missing required simulation files")

            # Batch parametric mode is now handled by Celery tasks in tasks.py
            # This method should not be called with batch_mode=True anymore
            if batch_mode and construction_sets:
                raise ValueError(
                    "Batch parametric mode should be handled by Celery tasks. "
                    "Use run_energyplus_batch_task in tasks.py instead."
                )

            # Check if IDF/weather files exist
            for idf_file in idf_files:
                idf_full = os.path.join(settings.MEDIA_ROOT, idf_file.file_path)
                if not os.path.exists(idf_full):
                    raise FileNotFoundError(f"IDF file not found at: {idf_full}")
            weather_full = os.path.join(settings.MEDIA_ROOT, weather_file.file_path)
            if not os.path.exists(weather_full):
                raise FileNotFoundError(f"Weather file not found at: {weather_full}")

            all_results = []
            logs = []

            # Run simulations sequentially
            print("Running simulations in serial mode")
            total = len(list(idf_files))
            done = 0
            for idf_file in idf_files:
                idf_path = os.path.join(settings.MEDIA_ROOT, idf_file.file_path)
                idf_basename = os.path.basename(idf_path)
                idf_name_no_ext = os.path.splitext(idf_basename)[0]
                idf_results_dir = self.results_dir / idf_name_no_ext
                log = self.run_single_simulation(idf_file, weather_file, str(idf_results_dir))
                logs.append((idf_file, log))
                results_path = idf_results_dir / 'output'
                file_results = self.process_file_results(results_path, idf_file)
                if file_results:
                    all_results.append(file_results)
                # update progress
                try:
                    done += 1
                    pct = self._intermediate_progress(done, total)
                    self.simulation.progress = pct
                    self.simulation.save()
                    
                    # Update Celery task state if available
                    if self.celery_task:
                        self.celery_task.update_state(
                            state='PROGRESS',
                            meta={
                                'current': pct,
                                'total': 100,
                                'status': f'Processing IDF {done} of {total}...'
                            }
                        )
                except Exception:
                    pass

            # Save all results to a combined JSON file
            combined_results_path = self.results_dir / 'combined_results.json'
            with open(combined_results_path, 'w') as f:
                json.dump(all_results, f)

            # For batch mode, save results to database
            if batch_mode:
                save_summary = self.save_results_to_database(all_results, job_info={
                    "simulation_id": self.simulation.id,
                    "run_id": self.run_id
                })
                if save_summary.get('saved', 0) <= 0:
                    error_msg = "Simulation completed but no results were saved to the database."
                    errors = save_summary.get('errors', [])
                    if errors:
                        error_msg = f"{error_msg} Details: {'; '.join(errors[:5])}"
                    self.simulation.status = 'failed'
                    self.simulation.error_message = error_msg
                    self.simulation.save(update_fields=['status', 'error_message', 'updated_at'])
                    raise RuntimeError(error_msg)

            self.simulation.status = 'completed'
            self.simulation.progress = 100
            self.simulation.save()
            try:
                self._push_progress(100, status='completed')
            except Exception:
                pass

            print(f"Simulation {self.simulation.id} completed successfully with {len(all_results)} result sets")

        except Exception as e:
            print(f"Simulation failed: {str(e)}")
            import traceback
            traceback.print_exc()
            self.simulation.status = 'failed'
            self.simulation.error_message = str(e)
            self.simulation.save()
            raise

    # Add a new helper method to process results for a single file
    def process_file_results(self, output_file: Path, idf_file):
        """Process and store results for a single IDF file."""
        try:
            # Ensure output_file is a Path object
            if isinstance(output_file, str):
                output_file = Path(output_file)
            
            # Get the HTML file path
            html_path = output_file.with_suffix('.htm')
            log_path = output_file.parent / 'run_output.log'
            
            if html_path.exists():
                # Extract results from HTML
                results = parse_html_with_table_lookup(html_path, log_path, [idf_file])

                # If a ReadVars CSV exists, attempt to parse hourly timeseries
                csv_path = output_file.with_suffix('.csv')
                if csv_path.exists():
                    try:
                        hourly_data = parse_readvars_csv(csv_path)
                        if hourly_data:
                            # attach hourly_data to the results so downstream
                            # save_results_to_database can persist it
                            results['hourly_timeseries'] = hourly_data
                    except Exception:
                        # Non-fatal: continue even if CSV parsing fails
                        pass
                
                # Add original filename to results
                results['originalFileName'] = idf_file.original_name if hasattr(idf_file, 'original_name') and idf_file.original_name else (idf_file.file_name if getattr(idf_file, 'file_name', None) else os.path.basename(idf_file.file_path))
                
                # Save parsed results as a JSON file
                json_path = output_file.with_suffix('.json')
                with open(json_path, 'w') as f:
                    json.dump(results, f)
                
                return results
            else:
                print(f"Warning: HTML results file not found at {html_path}")
                return {
                    'error': 'HTML results file not found',
                    'fileName': idf_file.file_name if getattr(idf_file, 'file_name', None) else os.path.basename(idf_file.file_path),
                    'originalFileName': idf_file.original_name if hasattr(idf_file, 'original_name') and idf_file.original_name else (idf_file.file_name if getattr(idf_file, 'file_name', None) else os.path.basename(idf_file.file_path)),
                    'status': 'error'
                }
                
        except Exception as e:
            print(f"Error processing file results: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'error': str(e),
                'fileName': idf_file.file_name if getattr(idf_file, 'file_name', None) else os.path.basename(idf_file.file_path),
                'originalFileName': idf_file.original_name if hasattr(idf_file, 'original_name') and idf_file.original_name else (idf_file.file_name if getattr(idf_file, 'file_name', None) else os.path.basename(idf_file.file_path)),
                'status': 'error'
            }

    def save_results_to_database(self, results, job_info=None):
        """Save parsed simulation results to PostgreSQL database models.

        Returns a summary dict with counts of saved and failed records to help
        callers decide whether the simulation can be marked completed.
        """
        from .models import SimulationResult, SimulationZone, SimulationEnergyUse, SimulationHourlyTimeseries
        import traceback

        summary = {
            'saved': 0,
            'failed': 0,
            'errors': []
        }

        if results is None:
            return summary

        if not isinstance(results, (list, tuple)):
            iterable = [results]
        else:
            iterable = list(results)

        run_id = job_info.get("run_id") if job_info else str(self.simulation.id)
        user_id = getattr(self.simulation, 'user_id', None)

        for idx, result in enumerate(iterable):
            if not isinstance(result, dict):
                summary['failed'] += 1
                summary['errors'].append(f"Result {idx} has unexpected type {type(result).__name__}")
                continue

            try:
                file_name = result.get("fileName") or result.get("originalFileName") or "unknown.idf"

                simulation_result = SimulationResult.objects.create(
                    simulation_id=self.simulation.id,
                    run_id=run_id,
                    file_name=file_name,
                    building_name=result.get("building", ""),
                    total_energy_use=result.get("totalEnergyUse"),
                    heating_demand=result.get("heatingDemand"),
                    cooling_demand=result.get("coolingDemand"),
                    lighting_demand=result.get("lightingDemand"),
                    equipment_demand=result.get("equipmentDemand"),
                    total_area=result.get("totalArea"),
                    run_time=result.get("runTime"),
                    status=result.get("status", "success"),
                    error_message=result.get("error", ""),
                    raw_json=result,
                    variant_idx=result.get("variant_idx"),
                    idf_idx=result.get("idf_idx"),
                    construction_set_data=result.get("construction_set"),
                    user_id=user_id,
                )

                zones = result.get("zones", [])
                for zone_data in zones:
                    SimulationZone.objects.create(
                        simulation_result=simulation_result,
                        zone_name=zone_data.get("name", ""),
                        area=zone_data.get("area"),
                        volume=zone_data.get("volume")
                    )

                energy_uses = result.get("energy_use", {})
                for end_use, values in energy_uses.items():
                    if isinstance(values, dict):
                        SimulationEnergyUse.objects.create(
                            simulation_result=simulation_result,
                            end_use=end_use,
                            electricity=values.get("electricity", 0.0),
                            district_heating=values.get("district_heating", 0.0),
                            total=values.get("total", 0.0)
                        )

                try:
                    hourly_payload = result.get('hourly_timeseries')
                    if hourly_payload and isinstance(hourly_payload, dict) and hourly_payload.get('is_hourly'):
                        SimulationHourlyTimeseries.objects.create(
                            simulation_result=simulation_result,
                            has_hourly=True,
                            hourly_values=hourly_payload
                        )
                except Exception as hourly_err:
                    summary['errors'].append(f"Hourly timeseries save failed for result {file_name}: {hourly_err}")

                summary['saved'] += 1
                print(f"Saved simulation result to database: {simulation_result.pk}")

            except Exception as e:
                summary['failed'] += 1
                summary['errors'].append(f"Result {idx}: {e}")
                print(f"Error saving result to database: {e}")
                traceback.print_exc()

        summary['failed'] = summary['failed'] or 0
        return summary


def parse_readvars_csv(csv_path: str | Path) -> dict:
    """Parse EnergyPlus ReadVars CSV (eplusout.csv) into a dict of timeseries.

    Heuristics used:
    - Skip the first header row(s) until the line that starts with "" (blank first cell)
      followed by variable columns (older ReadVars sometimes include metadata rows).
    - Detect whether the CSV is hourly by counting rows (>= 8000 rows is treated as yearly hourly).
    - Return a dict mapping sanitized variable names to numeric arrays.

    This implementation is conservative: it reads numeric columns only and limits
    memory by only reading the first ~20000 rows.
    """
    import csv

    csv_path = Path(csv_path)
    series = {}
    try:
        with csv_path.open('r', encoding='utf-8', errors='replace') as fh:
            reader = csv.reader(fh)
            rows = []
            # Read all rows up to a reasonable cap (protect memory)
            max_rows = 20000
            for i, row in enumerate(reader):
                rows.append(row)
                if i + 1 >= max_rows:
                    break

        if len(rows) < 2:
            return {}

        # Attempt to find the header row which contains variable names
        header_idx = 0
        # Common EnergyPlus ReadVars CSV has first column blank then variable labels
        for idx, r in enumerate(rows[:10]):
            # Heuristic: header row contains at least 2 non-empty cells and not numeric
            non_empty = sum(1 for c in r if c and c.strip() != '')
            if non_empty >= 2 and any(not _is_number_like(c) for c in r):
                header_idx = idx
                break

        header = rows[header_idx]
        data_rows = rows[header_idx+1:]

        # If the first column is empty and second column looks like a number for the
        # first data row, then columns from 1..N are variables
        col_count = len(header)
        if col_count < 2:
            return {}

        # Determine if this looks like an hourly file (approx 8760 rows)
        hourly_like = len(data_rows) >= 8000

        # For each column, try to parse numeric values
        for col_idx in range(1, col_count):
            var_name_raw = header[col_idx].strip() if header[col_idx] else f'col_{col_idx}'
            var_name = _sanitize_variable_name(var_name_raw)
            vals = []
            for r in data_rows:
                if col_idx >= len(r):
                    vals.append(None)
                    continue
                v = r[col_idx].strip()
                if v == '' or v == '\u00a0':
                    vals.append(None)
                    continue
                try:
                    vals.append(float(v))
                except Exception:
                    vals.append(None)
            # If hourly_like but we have far fewer rows, skip this variable
            if hourly_like and len([x for x in vals if x is not None]) < 100:
                continue
            series[var_name] = vals

        # If nothing meaningful found, return empty
        if not series:
            return {}

        # Attach metadata
        return {
            'is_hourly': hourly_like,
            'rows': len(data_rows),
            'series': series
        }
    except Exception:
        return {}


def _sanitize_variable_name(name: str) -> str:
    # Remove units in parentheses and replace spaces with underscores
    import re
    s = re.sub(r"\(.*?\)", '', name).strip()
    s = re.sub(r"[^0-9A-Za-z_]+", '_', s)
    s = s.strip('_')
    return s or name


def _is_number_like(s: str) -> bool:
    try:
        float(s)
        return True
    except Exception:
        return False

def parse_html_with_table_lookup(html_path, log_path, idf_files):
    """Parse EnergyPlus HTML output and log to extract structured results."""
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f, 'html.parser')
        
        with open(log_path, 'r', encoding='utf-8') as f:
            log_content = f.read()

        def get_value_from_table(table_title, row_label, col_index=1):
            """Locate a table by title and return value at row_label and column index."""
            table_header = soup.find('b', string=table_title)
            if not table_header:
                return None
            table = table_header.find_next('table')
            for row in table.find_all('tr'):
                cells = row.find_all('td')
                if cells and row_label in cells[0].text.strip():
                    try:
                        return float(cells[col_index].text.strip())
                    except ValueError:
                        return None
            return None

        # Extract building name and file info
        building_name = soup.find('p', string=lambda s: s and 'Building:' in s)
        building_name = building_name.b.text if building_name and building_name.b else "Unknown Building"

        # Fix: idf_files may be a list or a queryset
        file_name = None
        if hasattr(idf_files, "first") and callable(getattr(idf_files, "first", None)):
            first_file = idf_files.first()
            if first_file:
                if getattr(first_file, 'file_name', None):
                    file_name = first_file.file_name
                elif getattr(first_file, 'original_name', None):
                    file_name = first_file.original_name
                elif getattr(first_file, 'file_path', None):
                    file_name = os.path.basename(first_file.file_path)
        elif isinstance(idf_files, list) and idf_files:
            first = idf_files[0]
            if getattr(first, 'file_name', None):
                file_name = first.file_name
            elif getattr(first, 'original_name', None):
                file_name = first.original_name
            elif getattr(first, 'file_path', None):
                file_name = os.path.basename(first.file_path)
            else:
                # Fallback: try FileField-like attribute
                file_attr = getattr(first, 'file', None)
                if file_attr and getattr(file_attr, 'name', None):
                    file_name = os.path.basename(file_attr.name)
        if not file_name:
            file_name = "unknown.idf"

        # Extract values from tables
        total_energy_use = get_value_from_table("Site and Source Energy", "Total Site Energy", 2)  # kWh/m²
        total_area = get_value_from_table("Building Area", "Total Building Area")  # m²
        heating_kwh = get_value_from_table("End Uses", "Heating", 12)
        cooling_kwh = get_value_from_table("End Uses", "Cooling", 12)
        lighting_kwh = get_value_from_table("End Uses", "Interior Lighting", 1)
        equipment_kwh = get_value_from_table("End Uses", "Interior Equipment", 1)

        if not total_area:
            total_area = 1.0  # fallback to avoid division by zero

        # Normalize values by area
        heating_demand = heating_kwh / total_area if heating_kwh else 0.0
        cooling_demand = cooling_kwh / total_area if cooling_kwh else 0.0
        lighting_intensity = lighting_kwh / total_area if lighting_kwh else 0.0
        equipment_intensity = equipment_kwh / total_area if equipment_kwh else 0.0

        # Extract run time in seconds from log
        runtime_match = re.search(r'EnergyPlus Run Time=(\d+)hr\s+(\d+)min\s+([\d\.]+)sec', log_content)
        if runtime_match:
            hr, minute, sec = map(float, runtime_match.groups())
            runtime_seconds = hr * 3600 + minute * 60 + sec
        else:
            runtime_seconds = 0.0

        # Extract energy use breakdown by end use
        energy_use = {}
        table_header = soup.find('b', string="End Uses")
        if table_header:
            table = table_header.find_next('table')
            for row in table.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) > 1:
                    end_use = cells[0].text.strip()
                    if end_use and end_use not in ["", "&nbsp;", "Total End Uses"]:
                        # Get values for electricity and district heating
                        electricity = cells[1].text.strip()
                        district_heating = cells[12].text.strip()
                        try:
                            electricity = float(electricity) if electricity else 0.0
                            district_heating = float(district_heating) if district_heating else 0.0
                            energy_use[end_use] = {
                                "electricity": electricity,
                                "district_heating": district_heating,
                                "total": electricity + district_heating
                            }
                        except ValueError:
                            pass

        # Extract zone information
        zones = []
        zone_table_header = soup.find('b', string="Zone Summary")
        if zone_table_header:
            table = zone_table_header.find_next('table')
            for row in table.find_all('tr'):
                cells = row.find_all('td')
                if len(cells) > 3 and "Total" not in cells[0].text.strip():
                    try:
                        zone_name = cells[0].text.strip()
                        area = float(cells[1].text.strip())
                        volume = float(cells[3].text.strip())
                        zones.append({
                            "name": zone_name,
                            "area": area,
                            "volume": volume
                        })
                    except (ValueError, IndexError):
                        pass

        # Combine results into a structured output
        result = {
            "building": building_name,
            "fileName": file_name,
            "totalEnergyUse": round(total_energy_use, 1) if total_energy_use else 0.0,
            "heatingDemand": round(heating_demand, 1),
            "coolingDemand": round(cooling_demand, 1),
            "lightingDemand": round(lighting_intensity, 1),
            "equipmentDemand": round(equipment_intensity, 1),
            "runTime": round(runtime_seconds, 1),
            "totalArea": total_area,
            "energy_use": energy_use,
            "zones": zones,
            "status": "success"
        }

        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        file_name_fallback = "unknown.idf"
        try:
            if hasattr(idf_files, "first") and callable(getattr(idf_files, "first", None)) and idf_files.exists():
                first_file = idf_files.first()
                if first_file and getattr(first_file, 'file_name', None):
                    file_name_fallback = first_file.file_name
                elif first_file and getattr(first_file, 'file_path', None):
                    file_name_fallback = os.path.basename(first_file.file_path)
        except Exception:
            pass

        return {
            "error": str(e),
            "fileName": file_name_fallback,
            "totalEnergyUse": 0.0,
            "heatingDemand": 0.0,
            "coolingDemand": 0.0,
            "runTime": 0.0,
            "energy_use": {},
            "zones": [],
            "status": "error"
        }

def parse_simulation_results(simulation):
    """Retrieve parsed simulation results.

    Because `Simulation` model doesn't have a `results_file` field, look for
    combined results under MEDIA_ROOT/simulation_results/<simulation.id>/combined_results.json
    or fall back to individual per-idf `output.json` files in the same folder.
    """
    media_root = Path(settings.MEDIA_ROOT)
    sim_results_dir = media_root / 'simulation_results' / str(simulation.id)

    # Preferred combined file
    combined_path = sim_results_dir / 'combined_results.json'
    try:
        if combined_path.exists():
            with open(combined_path, 'r') as f:
                data = json.load(f)
                # Normalize to list if necessary
                if isinstance(data, dict) and simulation.file_count > 1:
                    data = [data]
                # Determine weather filename (if any) attached to the Simulation
                try:
                    weather_obj = simulation.files.filter(file_type='weather').first()
                    weather_name = None
                    if weather_obj is not None:
                        weather_name = getattr(weather_obj, 'original_name', None) or getattr(weather_obj, 'file_name', None) or (os.path.basename(getattr(weather_obj, 'file_path')) if getattr(weather_obj, 'file_path', None) else None)
                except Exception:
                    weather_name = None

                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            # Attach consistent simulation identifiers and weather info
                            try:
                                item['simulationId'] = str(simulation.id)
                            except Exception:
                                item['simulationId'] = simulation.id
                            item['simulation_id'] = str(simulation.id)
                            # ensure a stable id exists for frontend selection; generate UUID if missing
                            if not item.get('id'):
                                item['id'] = str(uuid.uuid4())
                            # backfill common name variants
                            if not item.get('file_name') and item.get('fileName'):
                                item['file_name'] = item.get('fileName')
                            # attach weather metadata if available
                            if weather_name:
                                item['weather_file'] = weather_name
                                item['epw'] = weather_name
                                item['_weatherKey'] = weather_name
                elif isinstance(data, dict):
                    try:
                        data['simulationId'] = str(simulation.id)
                    except Exception:
                        data['simulationId'] = simulation.id
                    data['simulation_id'] = str(simulation.id)
                    if not data.get('id'):
                        data['id'] = str(uuid.uuid4())
                    if not data.get('file_name') and data.get('fileName'):
                        data['file_name'] = data.get('fileName')
                    if weather_name:
                        data['weather_file'] = weather_name
                        data['epw'] = weather_name
                        data['_weatherKey'] = weather_name
                return data

        # Fall back to individual output.json files for each IDF
        if sim_results_dir.exists():
            results = []
            idf_files = simulation.files.filter(file_type='idf')
            for idf_file in idf_files:
                idf_basename = os.path.basename(idf_file.file_path if getattr(idf_file, 'file_path', None) else (getattr(idf_file, 'file_name', None) or 'unknown.idf'))
                idf_name_no_ext = os.path.splitext(idf_basename)[0]
                individual_results_path = sim_results_dir / idf_name_no_ext / 'output.json'
                if individual_results_path.exists():
                    with open(individual_results_path, 'r') as f:
                        file_results = json.load(f)
                        if isinstance(file_results, dict):
                            file_results['simulationId'] = simulation.id
                        results.append(file_results)

            if results:
                return results

        # If nothing found, raise so the caller can respond appropriately
        raise FileNotFoundError(f"No combined or individual results found under {sim_results_dir}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        # Construct a consistent fallback response
        if simulation.file_count > 1:
            fallback = []
            for file in simulation.files.filter(file_type='idf'):
                fallback.append({
                    'error': f"Failed to read results: {str(e)}",
                    'simulationId': simulation.id,
                    'fileName': file.file_name if getattr(file, 'file_name', None) else (os.path.basename(file.file_path) if getattr(file, 'file_path', None) else "unknown.idf"),
                    'totalEnergyUse': 0.0,
                    'heatingDemand': 0.0,
                    'coolingDemand': 0.0,
                    'runTime': 0.0,
                    'status': 'error'
                })
            return fallback
        else:
            first = simulation.files.first()
            file_name_val = "unknown.idf"
            if first:
                if getattr(first, 'file_name', None):
                    file_name_val = first.file_name
                elif getattr(first, 'file_path', None):
                    file_name_val = os.path.basename(first.file_path)
            return {
                'error': f"Failed to read results: {str(e)}",
                'simulationId': simulation.id,
                'fileName': file_name_val,
                'totalEnergyUse': 0.0,
                'heatingDemand': 0.0,
                'coolingDemand': 0.0,
                'runTime': 0.0,
                'status': 'error'
            }

def get_resource_utilisation():
    """
    Return current system resource utilisation (CPU, memory, disk, EnergyPlus status).
    Suitable for streaming via Django Channels.
    """
    from .utils import get_system_resources
    return get_system_resources()

