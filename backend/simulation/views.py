import os
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .idf_parser import EnergyPlusIDFParser
#from database.models import Material, Construction
from database.models import Material, Construction
from .database_client import check_material_exists, check_construction_exists

from .services import EnergyPlusSimulator
from .models import Simulation, SimulationFile
import threading
import traceback
from django.conf import settings
from .utils import get_system_resources
from pathlib import Path
import sqlite3
import time
from threading import Lock

# Add a simple in-memory rate limiter for parse_idf endpoint
_parse_idf_last_call = 0
_parse_idf_lock = Lock()
_PARSE_IDF_MIN_INTERVAL = 1.0  # seconds

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def parse_idf(request):
    """Parse uploaded IDF files and compare with database."""
    global _parse_idf_last_call
    with _parse_idf_lock:
        now = time.time()
        if now - _parse_idf_last_call < _PARSE_IDF_MIN_INTERVAL:
            return JsonResponse(
                {'error': 'Too Many Requests: Please wait before retrying.'},
                status=429
            )
        _parse_idf_last_call = now

    try:
        print("FILES:", request.FILES)
        files = request.FILES.getlist('files')
        if not files:
            print("No files provided")
            return JsonResponse({
                'error': 'No files provided'
            }, status=400)

        # Parse each IDF file
        parsed_data = {
            'materials': [],
            'constructions': [],
            'zones': []
        }
        
        # Use dictionaries to track unique items by name to avoid duplicates
        materials_dict = {}
        constructions_dict = {}
        zones_dict = {}
        
        for file_index, file in enumerate(files):
            print("Processing file:", file.name)
            content = file.read().decode('utf-8')
            parser = EnergyPlusIDFParser()
            file_data = parser.parse(content)
            
            # Add database comparison for materials
            for material in file_data['materials']:
                material_name = material['name']
                material['existsInDatabase'] = check_material_exists(material_name)
                if not material['existsInDatabase']:
                    material['source'] = f"Extracted from {file.name}"
                
                # Generate a unique key for this material
                material['uniqueKey'] = f"{material_name}_{file_index}_{file.name}"
                
                # Only add if not already added (or replace with the current one)
                if material_name not in materials_dict:
                    materials_dict[material_name] = material
            
            # Add database comparison for constructions
            for construction in file_data['constructions']:
                construction_name = construction['name']
                construction['existsInDatabase'] = check_construction_exists(construction_name)

                
                if not construction['existsInDatabase']:
                    construction['source'] = f"Extracted from {file.name}"
                
                # Generate a unique key for this construction
                construction['uniqueKey'] = f"{construction_name}_{file_index}_{file.name}"
                
                # Only add if not already added (or replace with the current one)
                if construction_name not in constructions_dict:
                    constructions_dict[construction_name] = construction
            
            # Add zones with unique names
            for zone in file_data['zones']:
                zone_name = zone['name']
                
                # Generate a unique key for this zone
                zone['uniqueKey'] = f"{zone_name}_{file_index}_{file.name}"
                
                if zone_name not in zones_dict:
                    zones_dict[zone_name] = zone
        
        # Convert dictionaries to lists for the response
        parsed_data['materials'] = list(materials_dict.values())
        parsed_data['constructions'] = list(constructions_dict.values())
        parsed_data['zones'] = list(zones_dict.values())

        return JsonResponse(parsed_data)

    except Exception as e:
        print(f"Exception in parse_idf: {e}")
        import traceback
        traceback.print_exc()  # This will print the full stack trace
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_components(request):
    """Add extracted components to database."""
    try:
        data = json.loads(request.body)
        components = data.get('components', [])
        component_type = data.get('type')
        
        if not components or not component_type:
            return JsonResponse({
                'error': 'Invalid request data'
            }, status=400)

        added_components = []
        
        if component_type == 'material':
            for comp in components:
                # Clean up any non-database fields like uniqueKey
                # but preserve all the required material properties
                material = Material(
                    name=comp['name'],
                    thickness_m=comp['properties']['thickness'],
                    conductivity_w_mk=comp['properties']['conductivity'],
                    density_kg_m3=comp['properties']['density'],
                    specific_heat_j_kgk=comp['properties']['specificHeat'],
                    roughness=comp['properties'].get('roughness', 'MediumRough'),
                    thermal_absorptance=comp['properties'].get('thermalAbsorptance', 0.9),
                    solar_absorptance=comp['properties'].get('solarAbsorptance', 0.7),
                    visible_absorptance=comp['properties'].get('visibleAbsorptance', 0.7),
                    gwp_kgco2e_per_m2=0.0,  # Default values for required fields
                    cost_sek_per_m2=0.0,    # Default values for required fields
                    author=request.user,
                    source=comp.get('source', '')
                )
                material.save()
                added_components.append(material.id)
        
        elif component_type == 'construction':
            for comp in components:
                # Clean up any non-database fields but preserve construction properties
                construction = Construction(
                    name=comp['name'],
                    element_type=comp['type'],
                    u_value_w_m2k=0.0,      # Default values for required fields
                    gwp_kgco2e_per_m2=0.0,  # Default values for required fields
                    cost_sek_per_m2=0.0,    # Default values for required fields
                    is_window=comp['type'] == 'window',
                    author=request.user,
                    source=comp.get('source', '')
                )
                construction.save()
                
                # Add layers
                for i, layer_name in enumerate(comp['properties']['layers']):
                    try:
                        material = Material.objects.get(name=layer_name)
                        construction.layers.create(
                            material=material,
                            layer_order=i + 1
                        )
                    except Material.DoesNotExist:
                        # Log the error but continue with other layers
                        print(f"Warning: Material '{layer_name}' not found in database")
                
                added_components.append(construction.id)

        return JsonResponse({
            'message': f'Successfully added {len(added_components)} {component_type}s',
            'added_components': added_components
        })

    except Exception as e:
        print(f"Error in add_components: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': str(e)
        }, status=500)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])  # For testing; change to IsAuthenticated in production
def run_simulation(request):
    """Start an EnergyPlus simulation with uploaded files."""
    try:
        print("Received simulation request")
        # Check for files
        idf_files = request.FILES.getlist('idf_files')
        weather_file = request.FILES.get('weather_file')
        
        if not idf_files or not weather_file:
            print(f"Missing files: IDF files: {len(idf_files)}, Weather file: {weather_file is not None}")
            return JsonResponse({
                'error': 'Missing required files'
            }, status=400)
        
        # Create simulation record
        # Handle case when user is not authenticated
        user = None
        if request.user and request.user.is_authenticated:
            user = request.user
        
        simulation = Simulation.objects.create(
            user=user,  # Can be None now
            name=f"Simulation {Simulation.objects.count() + 1}",
            description="Baseline simulation",
            status='pending',
            file_count=len(idf_files)  # Track how many files are being simulated
        )
        
        print(f"Created simulation with ID: {simulation.id} for {len(idf_files)} IDF files")
        
        # Ensure media directories exist
        media_dir = os.path.join(settings.MEDIA_ROOT, 'simulation_files', str(simulation.id))
        os.makedirs(media_dir, exist_ok=True)
        
        # Save IDF files
        for idf_file in idf_files:
            print(f"Processing IDF file: {idf_file.name}")
            file_path = f'simulation_files/{simulation.id}/{idf_file.name}'
            
            # Save the file to disk
            full_path = os.path.join(settings.MEDIA_ROOT, file_path)
            with open(full_path, 'wb+') as destination:
                for chunk in idf_file.chunks():
                    destination.write(chunk)
            
            # Create the database record
            SimulationFile.objects.create(
                simulation=simulation,
                file_path=file_path,
                file_name=idf_file.name,
                file_type='idf',
                original_name=idf_file.name  # Store original filename for reference
            )
        
        # Save weather file
        print(f"Processing weather file: {weather_file.name}")
        weather_path = f'simulation_files/{simulation.id}/{weather_file.name}'
        
        # Save the file to disk
        full_path = os.path.join(settings.MEDIA_ROOT, weather_path)
        with open(full_path, 'wb+') as destination:
            for chunk in weather_file.chunks():
                destination.write(chunk)
        
        # Create the database record
        SimulationFile.objects.create(
            simulation=simulation,
            file_path=weather_path,
            file_name=weather_file.name,
            file_type='weather',
            original_name=weather_file.name  # Store original filename for reference
        )
        
        # Update status
        simulation.status = 'running'
        simulation.save()
        
        # Start simulation in background thread
        import threading
        
        def run_sim_in_background():
            try:
                from .services import EnergyPlusSimulator
                simulator = EnergyPlusSimulator(simulation)
                simulator.run_simulation()
            except Exception as e:
                import traceback
                print(f"ERROR in background thread: {str(e)}")
                print(traceback.format_exc())
                simulation.status = 'failed'
                simulation.error_message = str(e)
                simulation.save()
        
        # Start the background thread
        thread = threading.Thread(target=run_sim_in_background)
        thread.daemon = True
        thread.start()
        
        return JsonResponse({
            'simulation_id': simulation.id,
            'message': 'Simulation started successfully',
            'file_count': len(idf_files)
        })
        
    except Exception as e:
        import traceback
        print(f"ERROR in run_simulation view: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'error': str(e)
        }, status=500)

@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])  # For testing; change to IsAuthenticated in production
def simulation_status(request, simulation_id):
    """Get the status of a running simulation."""
    try:
        simulation = Simulation.objects.get(id=simulation_id)
        
        if simulation.status == 'running':
            # For demo, generate a progress based on time elapsed
            from django.utils import timezone
            elapsed = (timezone.now() - simulation.updated_at).total_seconds()
            progress = min(int((elapsed / 5) * 100), 99)
        elif simulation.status == 'completed':
            progress = 100
        else:
            progress = 0
        
        return JsonResponse({
            'status': simulation.status,
            'progress': progress,
            'simulationId': simulation_id
        })
        
    except Simulation.DoesNotExist:
        return JsonResponse({
            'error': 'Simulation not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=500)

@csrf_exempt
@api_view(['GET'])
@permission_classes([AllowAny])  # For testing; change to IsAuthenticated in production
def simulation_results(request, simulation_id):
    """Get the results of a completed simulation."""
    # Helper function to safely get file name
    try:
        simulation = Simulation.objects.get(id=simulation_id)
        
        if simulation.status != 'completed':
            return JsonResponse({
                'error': 'Simulation not yet completed',
                'status': simulation.status,
                'simulationId': simulation_id,
                'results': []
            }, status=400)
        
        # Handle results directly rather than trying to access files
        try:
            from .services import parse_simulation_results
            results = parse_simulation_results(simulation)
            
            # If results is not a list but simulation has multiple files,
            # wrap it in a list for consistent handling
            if not isinstance(results, list) and simulation.file_count > 1:
                results = [results]
            
            # Ensure we add simulation ID to each result
            if isinstance(results, list):
                for result in results:
                    if isinstance(result, dict):
                        result['simulationId'] = simulation_id
            elif isinstance(results, dict):
                results['simulationId'] = simulation_id
            
            return JsonResponse(results, safe=False)  # Use safe=False to allow returning a list
        except Exception as e:
            import traceback
            print(f"Error in simulation_results: {str(e)}")
            traceback.print_exc()
            return JsonResponse({
                'error': f"Error retrieving simulation results: {str(e)}",
                'simulationId': simulation_id,
                'results': []
            }, status=500)
        
    except Simulation.DoesNotExist:
        return JsonResponse({
            'error': 'Simulation not found',
            'simulationId': simulation_id
        }, status=404)
    except Exception as e:
        import traceback
        print(f"ERROR in simulation_results view: {str(e)}")
        traceback.print_exc()
        return JsonResponse({
            'error': str(e),
            'simulationId': simulation_id,
            'results': []
        }, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def system_resources(request):
    """Get information about available system resources."""
    try:
        # Use the utility function that's imported at the top
        system_info = get_system_resources()
        
        # Add CORS headers for debugging
        response = JsonResponse(system_info)
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response
        
    except Exception as e:
        print(f"Error fetching system resources: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Return a more informative error response with CORS headers
        response = JsonResponse({
            'error': str(e),
            'detail': traceback.format_exc(),
            'message': 'Failed to retrieve system resources. Please ensure psutil is installed.'
        }, status=500)
        response["Access-Control-Allow-Origin"] = "*"
        return response

@api_view(['GET'])
@permission_classes([AllowAny])
def parallel_simulation_results(request, simulation_id):
    """
    Fetch simulation results from PostgreSQL database for parallel/batch simulations.
    """
    try:
        from .models import SimulationResult
        
        # Get all results for this simulation
        results = SimulationResult.objects.filter(simulation_id=simulation_id).select_related()
        
        if not results.exists():
            return JsonResponse({
                'error': f'No simulation results found for simulation {simulation_id}'
            }, status=404)

        # Convert to list format similar to SQLite version
        results_data = []
        for result in results:
            result_dict = {
                'id': result.id,
                'simulation_id': result.simulation_id,
                'run_id': result.run_id,
                'file_name': result.file_name,
                'building': result.building_name,
                'total_energy_use': result.total_energy_use,
                'heating_demand': result.heating_demand,
                'cooling_demand': result.cooling_demand,
                'lighting_demand': result.lighting_demand,
                'equipment_demand': result.equipment_demand,
                'run_time': result.run_time,
                'total_area': result.total_area,
                'status': result.status,
                'variant_idx': result.variant_idx,
                'idf_idx': result.idf_idx,
                'construction_set': result.construction_set_data,
                'created_at': result.created_at.isoformat(),
                'raw_json': result.raw_json,
                'zones': [
                    {
                        'name': zone.zone_name,
                        'area': zone.area,
                        'volume': zone.volume
                    }
                    for zone in result.zones.all()
                ],
                'energy_uses': [
                    {
                        'end_use': energy.end_use,
                        'electricity': energy.electricity,
                        'district_heating': energy.district_heating,
                        'total': energy.total
                    }
                    for energy in result.energy_uses.all()
                ]
            }
            results_data.append(result_dict)
            
        return JsonResponse(results_data, safe=False)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': str(e)
        }, status=500)