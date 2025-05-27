import os
import re
import json
import tempfile
from pathlib import Path
from django.conf import settings
from .models import Simulation, SimulationFile
from eppy.modeleditor import IDF

class EnergyPlusSimulator:
    def __init__(self, simulation: Simulation):
        self.simulation = simulation
        self.ep_path = settings.ENERGYPLUS_PATH
        
        # Make sure the main simulation results directory exists
        if not hasattr(settings, 'SIMULATION_RESULTS_DIR'):
            settings.SIMULATION_RESULTS_DIR = os.path.join(settings.MEDIA_ROOT, 'simulation_results')
        
        # Create the results directory if it doesn't exist
        os.makedirs(settings.SIMULATION_RESULTS_DIR, exist_ok=True)
        
        # Define and create the specific simulation results directory
        self.results_dir = Path(settings.SIMULATION_RESULTS_DIR) / str(simulation.id)
        self.results_dir.mkdir(parents=True, exist_ok=True)
        
        # Log the paths for debugging
        print(f"Simulation {simulation.id} results will be saved to: {self.results_dir}")

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
            html_path = output_file.with_suffix('.html')
            print(f"Looking for HTML results at: {html_path}")
            
            if html_path.exists():
                print(f"Found HTML results file: {html_path}")
                # Extract results from HTML
                results = parse_html_results(html_path)
                
                # Save parsed results as a JSON file
                json_path = output_file.with_suffix('.json')
                print(f"Saving JSON results to: {json_path}")
                
                with open(json_path, 'w') as f:
                    json.dump(results, f)
                
                # Store the relative path to the results file
                rel_path = os.path.relpath(json_path, settings.MEDIA_ROOT)
                print(f"Storing results file path: {rel_path}")
                
                # Update the simulation record with the results file path
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
                
                rel_path = os.path.relpath(json_path, settings.MEDIA_ROOT)
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

def parse_html_results(html_path):
    """Parse EnergyPlus HTML output file to extract simulation results."""
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Extract Annual Energy Use
        energy_use = {}
        energy_pattern = r'<td>(\w+)</td>\s*<td>[\d\.]+</td>\s*<td>([\d\.]+)</td>'
        energy_matches = re.findall(energy_pattern, html_content)
        for match in energy_matches:
            energy_use[match[0]] = float(match[1])
        
        # Extract Zone Information
        zones = []
        zone_pattern = r'<td>([^<]+)</td>\s*<td>([\d\.]+)</td>\s*<td>([\d\.]+)</td>\s*<td>([\d\.]+)</td>'
        zone_matches = re.findall(zone_pattern, html_content)
        for match in zone_matches:
            zones.append({
                'name': match[0],
                'area': float(match[1]),
                'volume': float(match[2]),
                'peak_load': float(match[3])
            })
        
        # Extract Summary Statistics
        total_energy = re.search(r'Total Site Energy\s*</td>\s*<td>\s*([\d\.]+)\s*</td>', html_content)
        total_energy_value = float(total_energy.group(1)) if total_energy else 0
        
        eui = re.search(r'Energy Per Total Building Area\s*</td>\s*<td>\s*([\d\.]+)\s*</td>', html_content)
        eui_value = float(eui.group(1)) if eui else 0
        
        # Combine all results
        results = {
            'summary': {
                'total_site_energy': total_energy_value,
                'energy_use_intensity': eui_value
            },
            'energy_use': energy_use,
            'zones': zones
        }
        
        return results
    except Exception as e:
        print(f"Error parsing HTML results: {str(e)}")
        return {
            'error': f"Failed to parse results: {str(e)}",
            'summary': {},
            'energy_use': {},
            'zones': []
        }

def parse_simulation_results(simulation):
    """Retrieve parsed simulation results."""
    if simulation.results_file:
        try:
            results_path = Path(settings.MEDIA_ROOT) / simulation.results_file
            with open(results_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            return {
                'error': f"Failed to read results: {str(e)}"
            }
    else:
        return {
            'error': "No results file available"
        }