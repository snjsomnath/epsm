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

    def run_simulation(self):
        try:
            self.simulation.status = 'running'
            self.simulation.save()

            idf_file = self.simulation.files.filter(file_type='idf').first()
            weather_file = self.simulation.files.filter(file_type='weather').first()

            if not idf_file or not weather_file:
                raise ValueError("Missing required simulation files")

            print(f"Starting simulation for: {idf_file.file.path}")
            print(f"Using weather file: {weather_file.file.path}")
            
            # Check if EnergyPlus exists at the specified path
            # Use the ENERGYPLUS_EXE setting directly
            energyplus_exe = settings.ENERGYPLUS_EXE if hasattr(settings, 'ENERGYPLUS_EXE') else os.path.join(self.ep_path, 'energyplus.exe')
            
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
            
            print(f"Using EnergyPlus executable: {energyplus_exe}")
            
            # Check if IDF file exists and is readable
            if not os.path.exists(idf_file.file.path):
                print(f"ERROR: IDF file not found at: {idf_file.file.path}")
                raise FileNotFoundError(f"IDF file not found at: {idf_file.file.path}")
            
            # Check if weather file exists and is readable
            if not os.path.exists(weather_file.file.path):
                print(f"ERROR: Weather file not found at: {weather_file.file.path}")
                raise FileNotFoundError(f"Weather file not found at: {weather_file.file.path}")
            
            # Create a working copy of the IDF file
            temp_idf_path = os.path.join(self.results_dir, 'input.idf')
            try:
                with open(idf_file.file.path, 'rb') as src, open(temp_idf_path, 'wb') as dst:
                    dst.write(src.read())
                print(f"Successfully created working copy of IDF file at: {temp_idf_path}")
            except Exception as e:
                print(f"ERROR copying IDF file: {str(e)}")
                raise
            
            # Create a working copy of the weather file
            temp_epw_path = os.path.join(self.results_dir, 'weather.epw')
            try:
                with open(weather_file.file.path, 'rb') as src, open(temp_epw_path, 'wb') as dst:
                    dst.write(src.read())
                print(f"Successfully created working copy of weather file at: {temp_epw_path}")
            except Exception as e:
                print(f"ERROR copying weather file: {str(e)}")
                raise
            
            # Verify the working copies exist
            if not os.path.exists(temp_idf_path):
                print(f"ERROR: Working copy of IDF file not created at: {temp_idf_path}")
                raise FileNotFoundError(f"Working copy of IDF file not created at: {temp_idf_path}")
            
            if not os.path.exists(temp_epw_path):
                print(f"ERROR: Working copy of weather file not created at: {temp_epw_path}")
                raise FileNotFoundError(f"Working copy of weather file not created at: {temp_epw_path}")
            
            # Use subprocess to run EnergyPlus directly
            import subprocess
            
            # Prepare the command
            command = [
                energyplus_exe,  # Use the found executable
                '--weather', temp_epw_path,
                '--output-directory', str(self.results_dir),
                '--expandobjects',
                '--readvars',
                temp_idf_path
            ]
            
            print(f"Running EnergyPlus with command: {' '.join(command)}")
            print(f"Working directory: {str(self.results_dir)}")
            
            # Run the process and capture output
            try:
                process = subprocess.run(
                    command, 
                    capture_output=True, 
                    text=True, 
                    cwd=str(self.results_dir),
                    timeout=300  # 5 minute timeout
                )
                
                # Always print the output for debugging
                print(f"EnergyPlus STDOUT:\n{process.stdout}")
                print(f"EnergyPlus STDERR:\n{process.stderr}")
                
                # Check for errors
                if process.returncode != 0:
                    print(f"ERROR: EnergyPlus failed with return code {process.returncode}")
                    raise Exception(f"EnergyPlus simulation failed with return code {process.returncode}: {process.stderr}")
                
                print(f"EnergyPlus process completed successfully with return code {process.returncode}")
            except subprocess.TimeoutExpired:
                print("ERROR: EnergyPlus process timed out after 5 minutes")
                raise Exception("EnergyPlus simulation timed out after 5 minutes")
            except Exception as e:
                print(f"ERROR running EnergyPlus: {str(e)}")
                raise
            
            # Save the output for debugging
            with open(os.path.join(self.results_dir, 'run_output.log'), 'w') as f:
                f.write(f"COMMAND: {' '.join(command)}\n\n")
                f.write(f"STDOUT:\n{process.stdout}\n\nSTDERR:\n{process.stderr}")
            
            # List all files in the output directory to verify
            print("Files in results directory after simulation:")
            for file in os.listdir(self.results_dir):
                print(f"  {file}")
            
            # Check if any output files were created
            expected_files = ['eplusout.err', 'eplusout.html', 'eplustbl.htm']
            missing_files = [f for f in expected_files if not os.path.exists(os.path.join(self.results_dir, f))]
            
            if missing_files:
                print(f"WARNING: Some expected output files are missing: {', '.join(missing_files)}")
                # Check the error file if it exists
                err_file = os.path.join(self.results_dir, 'eplusout.err')
                if os.path.exists(err_file):
                    with open(err_file, 'r') as f:
                        err_content = f.read()
                        print(f"Contents of eplusout.err:\n{err_content}")
            
            # Rename standard output files to our convention
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
                src_path = os.path.join(self.results_dir, src_name)
                if os.path.exists(src_path):
                    dst_path = os.path.join(self.results_dir, dst_name)
                    print(f"Renaming {src_path} to {dst_path}")
                    os.rename(src_path, dst_path)
            
            # Process and save results
            results_path = self.results_dir / 'output'
            print(f"Processing results from: {results_path}")
            self.process_results(results_path)
            
            self.simulation.status = 'completed'
            self.simulation.save()
            print(f"Simulation {self.simulation.id} completed successfully")

        except Exception as e:
            print(f"Simulation failed: {str(e)}")
            import traceback
            traceback.print_exc()
            
            self.simulation.status = 'failed'
            self.simulation.error_message = str(e)
            self.simulation.save()
            raise

    def process_results(self, output_file: Path):
        """Process and store simulation results."""
        try:
            # Ensure output_file is a Path object
            if isinstance(output_file, str):
                output_file = Path(output_file)
            
            # Get the HTML file path
            html_path = output_file.with_suffix('.htm')
            log_path = self.results_dir / 'run_output.log'
            print(f"Looking for HTML results at: {html_path}")
            print(f"Looking for log file at: {log_path}")
            
            if html_path.exists():
                print(f"Found HTML results file: {html_path}")
                # Extract results from HTML
                results = parse_html_with_table_lookup(html_path, log_path, self.simulation.files.filter(file_type='idf'))
                
                # Save parsed results as a JSON file
                json_path = output_file.with_suffix('.json')
                print(f"Saving JSON results to: {json_path}")
                
                with open(json_path, 'w') as f:
                    json.dump(results, f)
                
                # Store only the relative path from MEDIA_ROOT
                try:
                    # Make sure to compute a valid relative path from MEDIA_ROOT
                    rel_path = str(json_path.relative_to(self.media_root))
                    print(f"Storing results file path relative to MEDIA_ROOT: {rel_path}")
                    
                    # Store as a valid relative path
                    self.simulation.results_file = rel_path
                    self.simulation.save()
                except ValueError:
                    # If the path is not relative to MEDIA_ROOT, try to copy the file to a proper location
                    proper_results_path = self.results_dir / 'output.json'
                    import shutil
                    shutil.copy2(json_path, proper_results_path)
                    
                    # Now store the relative path to the copied file
                    rel_path = str(proper_results_path.relative_to(self.media_root))
                    print(f"Copied results to proper location, storing path: {rel_path}")
                    
                    self.simulation.results_file = rel_path
                    self.simulation.save()
                
                print(f"Successfully processed and saved results for simulation {self.simulation.id}")
            else:
                print(f"Warning: HTML results file not found at {html_path}")
                # Create a simple JSON with error message if HTML file is missing
                json_path = output_file.with_suffix('.json')
                with open(json_path, 'w') as f:
                    json.dump({
                        'error': 'HTML results file not found',
                        'summary': {},
                        'energy_use': {},
                        'zones': []
                    }, f)
                
                # Store the proper relative path
                rel_path = str(json_path.relative_to(self.media_root))
                self.simulation.results_file = rel_path
                self.simulation.save()
                
        except Exception as e:
            print(f"Error processing results: {str(e)}")
            import traceback
            traceback.print_exc()
            
            self.simulation.error_message = f"Error processing results: {str(e)}"
            self.simulation.status = 'failed'
            self.simulation.save()
            raise

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
        
        file_name = idf_files.first().file.name if idf_files.exists() else "unknown.idf"
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
            "lightingDemand": 0.0,
            "equipmentDemand": 0.0,
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
                # Try alternative paths if the standard path doesn't exist
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
                raise FileNotFoundError(f"Results file not found at {results_path} or any alternative locations")
                
            print(f"Opening results file from: {results_path}")
            
            with open(results_path, 'r') as f:
                result_data = json.load(f)
                # Add simulation ID to the results for frontend reference
                if isinstance(result_data, dict):
                    result_data['simulationId'] = simulation.id
                return result_data
        except Exception as e:
            import traceback
            traceback.print_exc()
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
        return {
            'error': "No results file available",
            'simulationId': simulation.id,
            'fileName': getattr(simulation.files.first(), 'file', None) and simulation.files.first().file.name or "unknown.idf",
            'totalEnergyUse': 0.0,
            'heatingDemand': 0.0,
            'coolingDemand': 0.0,
            'runTime': 0.0
        }