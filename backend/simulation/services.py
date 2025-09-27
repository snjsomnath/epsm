import os
import re
import json
import tempfile
import pathlib
from pathlib import Path
from django.conf import settings
from .models import Simulation, SimulationFile
from eppy.modeleditor import IDF
from bs4 import BeautifulSoup
import psutil

import concurrent.futures
import sqlite3

class EnergyPlusSimulator:
    def __init__(self, simulation: Simulation):
        self.simulation = simulation
        
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

    def run_parallel_simulations(self, idf_files, weather_file, results_dir, max_workers=4):
        # Run multiple IDF files in parallel using ThreadPoolExecutor
        from concurrent.futures import ThreadPoolExecutor, as_completed

        futures = []
        logs = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            for idf_file in idf_files:
                idf_path = os.path.join(settings.MEDIA_ROOT, idf_file.file_path)
                idf_basename = os.path.basename(idf_path)
                idf_name_no_ext = os.path.splitext(idf_basename)[0]
                idf_results_dir = results_dir / idf_name_no_ext
                future = executor.submit(
                    self.run_single_simulation,
                    idf_file, weather_file, str(idf_results_dir)
                )
                futures.append((idf_file, future))
            for idf_file, future in futures:
                try:
                    log = future.result()
                    logs.append((idf_file, log))
                except Exception as e:
                    logs.append((idf_file, {"error": str(e)}))
        return logs

    def run_batch_parametric_simulation(self, base_idf_files, construction_sets, weather_file, results_dir, max_workers=4):
        """
        For each base IDF and each construction set, generate a new IDF with the construction set inserted,
        store it in a subfolder, and run all in parallel.
        """
        # Prefer the older parser that provides `insert_construction_set` used for
        # parametric generation. If it's not available, raise a clear error so
        # the caller knows to install or restore `idf_parser_old.py`.
        try:
            from .idf_parser_new import IdfParser
        except Exception as e:
            raise ImportError(
                "Parametric simulation requires `IdfParser.insert_construction_set` which is provided by `idf_parser_old.py`. "
                "Please ensure `backend/simulation/idf_parser_old.py` is present and importable."
            )
        from concurrent.futures import ThreadPoolExecutor, as_completed

        generated_idf_paths = []
        variant_map = []

        # Generate all variant IDFs and store them in organized folders
        for idf_idx, idf_file in enumerate(base_idf_files):
            idf_path = os.path.join(settings.MEDIA_ROOT, idf_file.file_path)
            with open(idf_path, "r", encoding="utf-8") as f:
                base_content = f.read()
            for variant_idx, construction_set in enumerate(construction_sets):
                parser = IdfParser(base_content)
                parser.insert_construction_set(construction_set)
                # Use a unique subfolder for each variant+idf
                variant_dir = results_dir / f"variant_{variant_idx+1}_idf_{idf_idx+1}"
                variant_dir.mkdir(parents=True, exist_ok=True)
                idf_name = f"idf_{idf_idx+1}_variant_{variant_idx+1}.idf"
                idf_path = variant_dir / idf_name
                parser.idf.saveas(str(idf_path))
                generated_idf_paths.append(idf_path)
                variant_map.append({
                    "idf_file": idf_file,
                    "variant_idx": variant_idx,
                    "idf_idx": idf_idx,
                    "construction_set": construction_set,
                    "idf_path": idf_path,
                    "variant_dir": variant_dir
                })

        # Run all generated IDFs in parallel
        logs = []
        results = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_map = {}
            for entry in variant_map:
                future = executor.submit(
                    self.run_single_simulation,
                    type("FakeFile", (), {"file": type("F", (), {"path": str(entry["idf_path"]), "name": str(entry["idf_path"].name)})})(),
                    weather_file,
                    str(entry["variant_dir"])
                )
                future_map[future] = entry
            for future in as_completed(future_map):
                entry = future_map[future]
                try:
                    log = future.result()
                    logs.append(log)
                    output_file = Path(entry["variant_dir"]) / "output"
                    file_results = self.process_file_results(output_file, entry["idf_file"])
                    if file_results:
                        file_results["variant_idx"] = entry["variant_idx"]
                        file_results["idf_idx"] = entry["idf_idx"]
                        file_results["construction_set"] = entry["construction_set"]
                        results.append(file_results)
                except Exception as e:
                    results.append({"error": str(e), "variant_idx": entry["variant_idx"], "idf_idx": entry["idf_idx"]})

        # Save all results to PostgreSQL database
        print(f"Saving batch results to database for simulation {self.simulation.id}")
        self.save_results_to_database(results, job_info={
            "simulation_id": self.simulation.id,
            "run_id": self.run_id
        })

        # Save combined results as JSON
        combined_results_path = results_dir / 'combined_results.json'
        with open(combined_results_path, 'w') as f:
            json.dump(results, f)

        rel_path = str(combined_results_path.relative_to(self.media_root))
        self.simulation.results_file = rel_path
        self.simulation.status = 'completed'
        self.simulation.save()

        print(f"Batch parametric simulation completed: {len(results)} results")

    def run_simulation(self, parallel=False, max_workers=4, batch_mode=False, construction_sets=None):
        """
        Main method to run simulations using Docker EnergyPlus containers.
        """
        try:
            self.simulation.status = 'running'
            self.simulation.save()

            idf_files = self.simulation.files.filter(file_type='idf')
            weather_file = self.simulation.files.filter(file_type='weather').first()

            if not idf_files or not weather_file:
                raise ValueError("Missing required simulation files")

            # Batch parametric mode: run all variants for all IDFs
            if batch_mode and construction_sets:
                self.run_batch_parametric_simulation(
                    idf_files, construction_sets, weather_file, self.results_dir, max_workers=max_workers
                )
                return

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

            if parallel:
                print(f"Running simulations in parallel mode (max_workers={max_workers})")
                logs = self.run_parallel_simulations(idf_files, weather_file, self.results_dir, max_workers=max_workers)
                for idf_file, log in logs:
                    idf_path = os.path.join(settings.MEDIA_ROOT, idf_file.file_path)
                    idf_basename = os.path.basename(idf_path)
                    idf_name_no_ext = os.path.splitext(idf_basename)[0]
                    idf_results_dir = self.results_dir / idf_name_no_ext
                    results_path = idf_results_dir / 'output'
                    file_results = self.process_file_results(results_path, idf_file)
                    if file_results:
                        all_results.append(file_results)
            else:
                print("Running simulations in serial mode")
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

            # Save all results to a combined JSON file
            combined_results_path = self.results_dir / 'combined_results.json'
            with open(combined_results_path, 'w') as f:
                json.dump(all_results, f)

            # If batch_mode, save results to PostgreSQL database
            if batch_mode:
                self.save_results_to_database(all_results, job_info={
                    "simulation_id": self.simulation.id,
                    "run_id": self.run_id
                })

            rel_path = str(combined_results_path.relative_to(self.media_root))
            self.simulation.results_file = rel_path
            self.simulation.status = 'completed'
            self.simulation.save()

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
        """Save parsed simulation results to PostgreSQL database models"""
        from .models import SimulationResult, SimulationZone, SimulationEnergyUse
        
        for result in results:
            try:
                # Create main simulation result
                simulation_result = SimulationResult.objects.create(
                    simulation=self.simulation,
                    run_id=job_info.get("run_id") if job_info else str(self.simulation.id),
                    file_name=result.get("fileName", "unknown.idf"),
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
                    construction_set_data=result.get("construction_set")
                )
                
                # Create zone records
                zones = result.get("zones", [])
                for zone_data in zones:
                    SimulationZone.objects.create(
                        simulation_result=simulation_result,
                        zone_name=zone_data.get("name", ""),
                        area=zone_data.get("area"),
                        volume=zone_data.get("volume")
                    )
                
                # Create energy use records
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
                
                print(f"Saved simulation result to database: {simulation_result.id}")
                
            except Exception as e:
                print(f"Error saving result to database: {e}")
                import traceback
                traceback.print_exc()

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
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict):
                            item['simulationId'] = simulation.id
                elif isinstance(data, dict):
                    data['simulationId'] = simulation.id
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

