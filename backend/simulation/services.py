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
        self.ep_path = settings.ENERGYPLUS_PATH
        
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

    def run_single_simulation(self, idf_file, weather_file, energyplus_exe, idf_results_dir):
        import subprocess

        idf_basename = os.path.basename(idf_file.file.path)
        idf_name_no_ext = os.path.splitext(idf_basename)[0]

        temp_idf_path = os.path.join(idf_results_dir, 'input.idf')
        temp_epw_path = os.path.join(idf_results_dir, 'weather.epw')
        Path(idf_results_dir).mkdir(parents=True, exist_ok=True)

        with open(idf_file.file.path, 'rb') as src, open(temp_idf_path, 'wb') as dst:
            dst.write(src.read())

        with open(weather_file.file.path, 'rb') as src, open(temp_epw_path, 'wb') as dst:
            dst.write(src.read())

        command = [
            energyplus_exe,
            '--weather', temp_epw_path,
            '--output-directory', str(idf_results_dir),
            '--expandobjects',
            '--readvars',
            temp_idf_path
        ]

        process = subprocess.run(
            command, capture_output=True, text=True, cwd=str(idf_results_dir), timeout=300
        )

        output_log = {
            "idf_file": idf_file.file.name,
            "stdout": process.stdout,
            "stderr": process.stderr,
            "returncode": process.returncode,
            "output_dir": str(idf_results_dir)
        }

        # Save output logs
        with open(os.path.join(idf_results_dir, 'run_output.log'), 'w') as f:
            f.write(f"COMMAND: {' '.join(command)}\n\n")
            f.write(f"STDOUT:\n{process.stdout}\n\nSTDERR:\n{process.stderr}")

        # Rename standard output files
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
            src_path = os.path.join(idf_results_dir, src_name)
            if os.path.exists(src_path):
                dst_path = os.path.join(idf_results_dir, dst_name)
                os.rename(src_path, dst_path)

        return output_log

    def run_parallel_simulations(self, idf_files, weather_file, energyplus_exe, results_dir, max_workers=4):
        # Run multiple IDF files in parallel using ThreadPoolExecutor
        from concurrent.futures import ThreadPoolExecutor, as_completed

        futures = []
        logs = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            for idf_file in idf_files:
                idf_basename = os.path.basename(idf_file.file.path)
                idf_name_no_ext = os.path.splitext(idf_basename)[0]
                idf_results_dir = results_dir / idf_name_no_ext
                future = executor.submit(
                    self.run_single_simulation,
                    idf_file, weather_file, energyplus_exe, str(idf_results_dir)
                )
                futures.append((idf_file, future))
            for idf_file, future in futures:
                try:
                    log = future.result()
                    logs.append((idf_file, log))
                except Exception as e:
                    logs.append((idf_file, {"error": str(e)}))
        return logs

    def run_batch_parametric_simulation(self, base_idf_files, construction_sets, weather_file, energyplus_exe, results_dir, max_workers=4):
        """
        For each base IDF and each construction set, generate a new IDF with the construction set inserted,
        store it in a subfolder, and run all in parallel.
        """
        from .idf_parser import IdfParser
        from concurrent.futures import ThreadPoolExecutor, as_completed

        generated_idf_paths = []
        variant_map = []

        # Generate all variant IDFs and store them in organized folders
        for idf_idx, idf_file in enumerate(base_idf_files):
            with open(idf_file.file.path, "r", encoding="utf-8") as f:
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
                    energyplus_exe,
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

        # Save all results to SQLite in the root of the simulation results dir
        sqlite_path = results_dir / 'batch_results.db'
        print(f"Saving batch results to: {sqlite_path}")
        self.save_results_to_sqlite(sqlite_path, results, job_info={
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
        # ...existing code up to idf_files and weather_file extraction...
        try:
            self.simulation.status = 'running'
            self.simulation.save()

            idf_files = self.simulation.files.filter(file_type='idf')
            weather_file = self.simulation.files.filter(file_type='weather').first()

            if not idf_files or not weather_file:
                raise ValueError("Missing required simulation files")

            energyplus_exe = settings.ENERGYPLUS_EXE if hasattr(settings, 'ENERGYPLUS_EXE') else os.path.join(self.ep_path, 'energyplus.exe')

            # Batch parametric mode: run all variants for all IDFs
            if batch_mode and construction_sets:
                self.run_batch_parametric_simulation(
                    idf_files, construction_sets, weather_file, energyplus_exe, self.results_dir, max_workers=max_workers
                )
                return

            if not os.path.exists(energyplus_exe):
                print(f"ERROR: EnergyPlus executable not found at: {energyplus_exe}")
                # Try with or without .exe extension
                alternative_exe = energyplus_exe.replace('.exe', '') if energyplus_exe.endswith('.exe') else f"{energyplus_exe}.exe"
                if os.path.exists(alternative_exe):
                    print(f"Found EnergyPlus at alternative path: {alternative_exe}")
                    energyplus_exe = alternative_exe
                else:
                    # Try to locate energyplus on the system
                    import shutil
                    eplus_bin = shutil.which('energyplus') or shutil.which('energyplus.exe')
                    if eplus_bin:
                        print(f"Found EnergyPlus in PATH at: {eplus_bin}")
                        energyplus_exe = eplus_bin
                    else:
                        print("ERROR: EnergyPlus not found in PATH. Make sure it's installed correctly.")
                        raise FileNotFoundError(f"EnergyPlus executable not found at: {energyplus_exe} or {alternative_exe}")

            # Check if IDF/weather files exist
            for idf_file in idf_files:
                if not os.path.exists(idf_file.file.path):
                    raise FileNotFoundError(f"IDF file not found at: {idf_file.file.path}")
            if not os.path.exists(weather_file.file.path):
                raise FileNotFoundError(f"Weather file not found at: {weather_file.file.path}")

            all_results = []
            logs = []

            if parallel:
                print(f"Running simulations in parallel mode (max_workers={max_workers})")
                logs = self.run_parallel_simulations(idf_files, weather_file, energyplus_exe, self.results_dir, max_workers=max_workers)
                for idf_file, log in logs:
                    idf_basename = os.path.basename(idf_file.file.path)
                    idf_name_no_ext = os.path.splitext(idf_basename)[0]
                    idf_results_dir = self.results_dir / idf_name_no_ext
                    results_path = idf_results_dir / 'output'
                    file_results = self.process_file_results(results_path, idf_file)
                    if file_results:
                        all_results.append(file_results)
            else:
                print("Running simulations in serial mode")
                for idf_file in idf_files:
                    idf_basename = os.path.basename(idf_file.file.path)
                    idf_name_no_ext = os.path.splitext(idf_basename)[0]
                    idf_results_dir = self.results_dir / idf_name_no_ext
                    log = self.run_single_simulation(idf_file, weather_file, energyplus_exe, str(idf_results_dir))
                    logs.append((idf_file, log))
                    results_path = idf_results_dir / 'output'
                    file_results = self.process_file_results(results_path, idf_file)
                    if file_results:
                        all_results.append(file_results)

            # Save all results to a combined JSON file
            combined_results_path = self.results_dir / 'combined_results.json'
            with open(combined_results_path, 'w') as f:
                json.dump(all_results, f)

            # If batch_mode, save results to local sqlite
            if batch_mode:
                sqlite_path = self.results_dir / 'batch_results.db'
                self.save_results_to_sqlite(sqlite_path, all_results, job_info={
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
                results['originalFileName'] = idf_file.original_name if hasattr(idf_file, 'original_name') and idf_file.original_name else os.path.basename(idf_file.file.name)
                
                # Save parsed results as a JSON file
                json_path = output_file.with_suffix('.json')
                with open(json_path, 'w') as f:
                    json.dump(results, f)
                
                return results
            else:
                print(f"Warning: HTML results file not found at {html_path}")
                return {
                    'error': 'HTML results file not found',
                    'fileName': os.path.basename(idf_file.file.name),
                    'originalFileName': idf_file.original_name if hasattr(idf_file, 'original_name') and idf_file.original_name else os.path.basename(idf_file.file.name),
                    'status': 'error'
                }
                
        except Exception as e:
            print(f"Error processing file results: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                'error': str(e),
                'fileName': os.path.basename(idf_file.file.name),
                'originalFileName': idf_file.original_name if hasattr(idf_file, 'original_name') and idf_file.original_name else os.path.basename(idf_file.file.name),
                'status': 'error'
            }

    def save_results_to_sqlite(self, sqlite_path, results, job_info=None):
        """Save parsed simulation results and job info to a local SQLite database."""
        conn = sqlite3.connect(str(sqlite_path))
        c = conn.cursor()
        # Create table if not exists
        c.execute('''
            CREATE TABLE IF NOT EXISTS simulation_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                simulation_id INTEGER,
                run_id TEXT,
                file_name TEXT,
                building TEXT,
                total_energy_use REAL,
                heating_demand REAL,
                cooling_demand REAL,
                lighting_demand REAL,
                equipment_demand REAL,
                run_time REAL,
                total_area REAL,
                status TEXT,
                raw_json TEXT
            )
        ''')
        # Insert each result
        for result in results:
            c.execute('''
                INSERT INTO simulation_results (
                    simulation_id, run_id, file_name, building, total_energy_use,
                    heating_demand, cooling_demand, lighting_demand, equipment_demand,
                    run_time, total_area, status, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                job_info.get("simulation_id") if job_info else None,
                job_info.get("run_id") if job_info else None,
                result.get("fileName"),
                result.get("building"),
                result.get("totalEnergyUse"),
                result.get("heatingDemand"),
                result.get("coolingDemand"),
                result.get("lightingDemand"),
                result.get("equipmentDemand"),
                result.get("runTime"),
                result.get("totalArea"),
                result.get("status"),
                json.dumps(result)
            ))
        conn.commit()
        conn.close()

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
            file_name = first_file.file.name if first_file else "unknown.idf"
        elif isinstance(idf_files, list) and idf_files:
            file_name = getattr(idf_files[0].file, "name", "unknown.idf")
        else:
            file_name = "unknown.idf"
        file_name = os.path.basename(file_name)

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
        return {
            "error": str(e),
            "fileName": idf_files.first().file.name if idf_files.exists() else "unknown.idf",
            "totalEnergyUse": 0.0,
            "heatingDemand": 0.0,
            "coolingDemand": 0.0,
            "runTime": 0.0,
            "energy_use": {},
            "zones": [],
            "status": "error"
        }

def parse_simulation_results(simulation):
    """Retrieve parsed simulation results."""
    if simulation.results_file:
        try:
            # Ensure we interpret the path correctly
            media_root = Path(settings.MEDIA_ROOT)
            
            # Handle FieldFile object properly by accessing its path or name attribute
            if hasattr(simulation.results_file, 'path'):
                results_path = Path(simulation.results_file.path)
            elif hasattr(simulation.results_file, 'name'):
                results_path = media_root / simulation.results_file.name
            else:
                # If it's already a string or PathLike object
                results_path = media_root / str(simulation.results_file)
            
            print(f"Looking for results file at: {results_path}")
            
            # Check if the file exists
            if not results_path.exists():
                # Try alternative paths
                alternative_paths = [
                    # Try the absolute path stored in the DB
                    Path(str(simulation.results_file)),
                    # Try looking in the backend directory
                    Path(settings.BASE_DIR) / 'simulation_results' / str(simulation.id) / 'output.json'
                ]
                
                for alt_path in alternative_paths:
                    print(f"Checking alternative path: {alt_path}")
                    if alt_path.exists():
                        results_path = alt_path
                        print(f"Found results at alternative path: {results_path}")
                        break
            
            if not results_path.exists():
                # If we still can't find combined results, look for individual results
                if simulation.file_count > 1:
                    # Try to collect results from individual IDF files
                    idf_files = simulation.files.filter(file_type='idf')
                    all_results = []
                    
                    for idf_file in idf_files:
                        idf_basename = os.path.basename(idf_file.file.path)
                        idf_name_no_ext = os.path.splitext(idf_basename)[0]
                        
                        individual_results_path = media_root / 'simulation_results' / str(simulation.id) / idf_name_no_ext / 'output.json'
                        
                        if individual_results_path.exists():
                            with open(individual_results_path, 'r') as f:
                                file_results = json.load(f)
                                file_results['simulationId'] = simulation.id
                                all_results.append(file_results)
                    
                    if all_results:
                        return all_results
                
                raise FileNotFoundError(f"Results file not found at {results_path} or any alternative locations")
                
            print(f"Opening results file from: {results_path}")
            
            with open(results_path, 'r') as f:
                result_data = json.load(f)
                
                # Handle both single results and multiple results
                if isinstance(result_data, list):
                    # Add simulation ID to each result
                    for item in result_data:
                        if isinstance(item, dict):
                            item['simulationId'] = simulation.id
                elif isinstance(result_data, dict):
                    # Add simulation ID to the single result
                    result_data['simulationId'] = simulation.id
                
                return result_data
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            
            # Return a consistent format whether one file or multiple
            if simulation.file_count > 1:
                return [{
                    'error': f"Failed to read results: {str(e)}",
                    'simulationId': simulation.id,
                    'fileName': file.file.name if hasattr(file, 'file') else "unknown.idf",
                    'totalEnergyUse': 0.0,
                    'heatingDemand': 0.0,
                    'coolingDemand': 0.0,
                    'runTime': 0.0
                } for file in simulation.files.filter(file_type='idf')]
            else:
                return {
                    'error': f"Failed to read results: {str(e)}",
                    'simulationId': simulation.id,
                    'fileName': getattr(simulation.files.first(), 'file', None) and simulation.files.first().file.name or "unknown.idf",
                    'totalEnergyUse': 0.0,
                    'heatingDemand': 0.0,
                    'coolingDemand': 0.0,
                    'runTime': 0.0
                }
    else:
        # Return a consistent format whether one file or multiple
        if simulation.file_count > 1:
            return [{
                'error': "No results file available",
                'simulationId': simulation.id,
                'fileName': file.file.name if hasattr(file, 'file') else "unknown.idf",
                'totalEnergyUse': 0.0,
                'heatingDemand': 0.0,
                'coolingDemand': 0.0,
                'runTime': 0.0
            } for file in simulation.files.filter(file_type='idf')]
        else:
            return {
                'error': "No results file available",
                'simulationId': simulation.id,
                'fileName': getattr(simulation.files.first(), 'file', None) and simulation.files.first().file.name or "unknown.idf",
                'totalEnergyUse': 0.0,
                'heatingDemand': 0.0,
                'coolingDemand': 0.0,
                'runTime': 0.0
            }

def get_resource_utilisation():
    """
    Return current system resource utilisation (CPU, memory, disk, EnergyPlus status).
    Suitable for streaming via Django Channels.
    """
    from .utils import get_system_resources
    return get_system_resources()

def get_resource_utilisation():
    """Get current system resource utilization"""
    # CPU stats
    cpu_percent = psutil.cpu_percent(interval=0.1)
    cpu_count_physical = psutil.cpu_count(logical=False)
    cpu_count_logical = psutil.cpu_count(logical=True)
    
    # Memory stats
    memory = psutil.virtual_memory()
    memory_total_gb = memory.total / (1024 * 1024 * 1024)
    memory_used_gb = memory.used / (1024 * 1024 * 1024)
    
    # Disk stats
    disk = psutil.disk_usage('/')
    disk_total_gb = disk.total / (1024 * 1024 * 1024)
    disk_used_gb = disk.used / (1024 * 1024 * 1024)
    
    # Network stats (requires 2 measurements)
    net1 = psutil.net_io_counters()
    import time
    time.sleep(0.1)  # Small delay to measure rate
    net2 = psutil.net_io_counters()
    bytes_sent_per_sec = (net2.bytes_sent - net1.bytes_sent) / 0.1
    bytes_recv_per_sec = (net2.bytes_recv - net1.bytes_recv) / 0.1
    
    return {
        'cpu': {
            'usage_percent': cpu_percent,
            'physical_cores': cpu_count_physical,
            'logical_cores': cpu_count_logical,
        },
        'memory': {
            'total_gb': memory_total_gb,
            'used_gb': memory_used_gb,
            'usage_percent': memory.percent,
        },
        'disk': {
            'total_gb': disk_total_gb,
            'used_gb': disk_used_gb,
            'usage_percent': disk.percent,
        },
        'network': {
            'bytes_sent_per_sec': bytes_sent_per_sec,
            'bytes_recv_per_sec': bytes_recv_per_sec,
        }
    }

