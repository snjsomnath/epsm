import os
import json
import uuid
from django.http import JsonResponse
from django.core.exceptions import ValidationError as DjangoValidationError
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


# Simple endpoint to return window glazing rows from the materials_db
@api_view(['GET'])
@permission_classes([AllowAny])
def api_window_glazing(request):
    try:
        from database.models import WindowGlazing
        glazings_qs = WindowGlazing.objects.using('materials_db').all()
        glazings = []
        for g in glazings_qs:
            glazings.append({
                'id': str(g.id),
                'name': g.name,
                'thickness_m': g.thickness_m,
                'conductivity_w_mk': g.conductivity_w_mk,
                'solar_transmittance': getattr(g, 'solar_transmittance', None),
                'visible_transmittance': getattr(g, 'visible_transmittance', None),
                'infrared_transmittance': getattr(g, 'infrared_transmittance', None),
                'front_ir_emissivity': getattr(g, 'front_ir_emissivity', None),
                'back_ir_emissivity': getattr(g, 'back_ir_emissivity', None),
                'gwp_kgco2e_per_m2': g.gwp_kgco2e_per_m2,
                'cost_sek_per_m2': g.cost_sek_per_m2,
                'date_created': g.date_created.isoformat() if getattr(g, 'date_created', None) else None,
                'date_modified': g.date_modified.isoformat() if getattr(g, 'date_modified', None) else None,
            })
        return JsonResponse(glazings, safe=False)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

# Database API endpoints for frontend
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])  # Allow unauthenticated access for now
def api_materials(request):
    """Get all materials from database or create a new material"""
    from database.models import Material
    import json
    if request.method == 'GET':
        try:
            materials = Material.objects.using('materials_db').all()
            materials_data = []
            for material in materials:
                materials_data.append({
                    'id': material.id,
                    'name': material.name,
                    'roughness': material.roughness,
                    'thickness_m': material.thickness_m,
                    'conductivity_w_mk': material.conductivity_w_mk,
                    'density_kg_m3': material.density_kg_m3,
                    'specific_heat_j_kgk': material.specific_heat_j_kgk,
                    'thermal_absorptance': material.thermal_absorptance,
                    'solar_absorptance': material.solar_absorptance,
                    'visible_absorptance': material.visible_absorptance,
                    'gwp_kgco2e_per_m2': material.gwp_kgco2e_per_m2,
                    'cost_sek_per_m2': material.cost_sek_per_m2,
                    'wall_allowed': material.wall_allowed,
                    'roof_allowed': material.roof_allowed,
                    'floor_allowed': material.floor_allowed,
                    'window_layer_allowed': material.window_layer_allowed,
                    'date_created': material.date_created.isoformat() if material.date_created else None,
                    'date_modified': material.date_modified.isoformat() if material.date_modified else None,
                    'source': material.source
                })
            return JsonResponse(materials_data, safe=False)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': str(e)}, status=500)
    elif request.method == 'POST':
        try:
            data = json.loads(request.body.decode('utf-8'))
            material = Material.objects.using('materials_db').create(
                name=data['name'],
                roughness=data['roughness'],
                thickness_m=data['thickness_m'],
                conductivity_w_mk=data['conductivity_w_mk'],
                density_kg_m3=data['density_kg_m3'],
                specific_heat_j_kgk=data['specific_heat_j_kgk'],
                thermal_absorptance=data.get('thermal_absorptance', 0.9),
                solar_absorptance=data.get('solar_absorptance', 0.7),
                visible_absorptance=data.get('visible_absorptance', 0.7),
                gwp_kgco2e_per_m2=data['gwp_kgco2e_per_m2'],
                cost_sek_per_m2=data['cost_sek_per_m2'],
                wall_allowed=data.get('wall_allowed', False),
                roof_allowed=data.get('roof_allowed', False),
                floor_allowed=data.get('floor_allowed', False),
                window_layer_allowed=data.get('window_layer_allowed', False),
                source=data.get('source', None)
            )
            return JsonResponse({'id': str(material.id)}, status=201)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': str(e)}, status=400)

@api_view(['GET'])
@permission_classes([AllowAny])  # Allow unauthenticated access for now
def api_constructions(request):
    """Get all constructions from database"""
    try:
        from database.models import Construction
        from django.db import connections
        
        # Check which database is being used
        constructions = Construction.objects.using('materials_db').all()
        
        from database.models import Layer, Material, WindowGlazing
        constructions_data = []
        for construction in constructions:
            # gather flattened layer info for listing
            layers_qs = Layer.objects.using('materials_db').filter(construction=construction).order_by('layer_order')
            layers_list = []
            for L in layers_qs:
                mat = L.material
                win = L.window
                if mat:
                    material_name = mat.name
                    thickness_m = mat.thickness_m
                    conductivity_w_mk = mat.conductivity_w_mk
                elif win:
                    material_name = win.name
                    thickness_m = win.thickness_m
                    conductivity_w_mk = win.conductivity_w_mk
                else:
                    material_name = None
                    thickness_m = None
                    conductivity_w_mk = None

                layers_list.append({
                    'id': getattr(L, 'id', None),
                    'material_id': str(mat.id) if mat else None,
                    'glazing_id': str(win.id) if win else None,
                    'material_name': material_name,
                    'thickness_m': thickness_m,
                    'conductivity_w_mk': conductivity_w_mk,
                    'layer_order': L.layer_order,
                    'is_glazing_layer': L.is_glazing_layer,
                })

            constructions_data.append({
                'id': construction.id,
                'name': construction.name,
                'element_type': construction.element_type,
                'is_window': construction.is_window,
                'u_value_w_m2k': construction.u_value_w_m2k,
                'gwp_kgco2e_per_m2': construction.gwp_kgco2e_per_m2,
                'cost_sek_per_m2': construction.cost_sek_per_m2,
                'date_created': construction.date_created.isoformat() if construction.date_created else None,
                'date_modified': construction.date_modified.isoformat() if construction.date_modified else None,
                'source': construction.source,
                'layers': layers_list
            })
        
        return JsonResponse(constructions_data, safe=False)
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': str(e)
        }, status=500)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def api_constructions_create(request):
    """Create a construction (with optional layers) or list constructions.
    This endpoint accepts POST with JSON body containing construction fields and optional `layers` array.
    Each layer may contain `material_id` or `glazing_id`, `layer_order`, and `is_glazing_layer`.
    """
    try:
        from database.models import Construction, Layer, Material, WindowGlazing

        if request.method == 'GET':
            # Return list of constructions (inline to avoid DRF Request vs HttpRequest mismatch)
            from database.models import Layer, Material, WindowGlazing
            constructions = Construction.objects.using('materials_db').all()
            constructions_data = []
            for construction in constructions:
                # gather flattened layer info for listing
                layers_qs = Layer.objects.using('materials_db').filter(construction=construction).order_by('layer_order')
                layers_list = []
                for L in layers_qs:
                    mat = L.material
                    win = L.window
                    if mat:
                        material_name = mat.name
                        thickness_m = mat.thickness_m
                        conductivity_w_mk = mat.conductivity_w_mk
                    elif win:
                        material_name = win.name
                        thickness_m = win.thickness_m
                        conductivity_w_mk = win.conductivity_w_mk
                    else:
                        material_name = None
                        thickness_m = None
                        conductivity_w_mk = None

                    layers_list.append({
                        'id': getattr(L, 'id', None),
                        'material_id': str(mat.id) if mat else None,
                        'glazing_id': str(win.id) if win else None,
                        'material_name': material_name,
                        'thickness_m': thickness_m,
                        'conductivity_w_mk': conductivity_w_mk,
                        'layer_order': L.layer_order,
                        'is_glazing_layer': L.is_glazing_layer,
                    })

                # debug log
                try:
                    print(f"api_constructions_create: construction={construction.id} found_layers={len(layers_list)}")
                except Exception:
                    pass

                constructions_data.append({
                    'id': construction.id,
                    'name': construction.name,
                    'element_type': construction.element_type,
                    'is_window': construction.is_window,
                    'u_value_w_m2k': construction.u_value_w_m2k,
                    'gwp_kgco2e_per_m2': construction.gwp_kgco2e_per_m2,
                    'cost_sek_per_m2': construction.cost_sek_per_m2,
                    'date_created': construction.date_created.isoformat() if construction.date_created else None,
                    'date_modified': construction.date_modified.isoformat() if construction.date_modified else None,
                    'source': construction.source,
                    'layers': layers_list
                })
            return JsonResponse(constructions_data, safe=False)

        # POST - create construction and layers
        data = json.loads(request.body.decode('utf-8'))

        construction = Construction.objects.using('materials_db').create(
            name=data.get('name'),
            element_type=data.get('element_type', 'wall'),
            is_window=data.get('is_window', False),
            u_value_w_m2k=data.get('u_value_w_m2k', 0.0),
            gwp_kgco2e_per_m2=data.get('gwp_kgco2e_per_m2', 0.0),
            cost_sek_per_m2=data.get('cost_sek_per_m2', 0.0),
            source=data.get('source', None)
        )

        layers = data.get('layers', [])
        for layer in layers:
            layer_order = layer.get('layer_order', 1)
            is_glazing = layer.get('is_glazing_layer', False)
            if layer.get('material_id'):
                # validate UUID
                try:
                    uuid.UUID(str(layer['material_id']))
                except Exception:
                    return JsonResponse({'error': f"Invalid material_id in layer: {layer.get('material_id')}"}, status=400)
                try:
                    mat = Material.objects.using('materials_db').get(id=layer['material_id'])
                    Layer.objects.using('materials_db').create(
                        construction=construction,
                        material=mat,
                        layer_order=layer_order,
                        is_glazing_layer=False
                    )
                except Material.DoesNotExist:
                    # skip missing materials
                    print(f"Warning: material {layer.get('material_id')} not found")
            elif layer.get('glazing_id'):
                # validate UUID
                try:
                    uuid.UUID(str(layer['glazing_id']))
                except Exception:
                    return JsonResponse({'error': f"Invalid glazing_id in layer: {layer.get('glazing_id')}"}, status=400)
                try:
                    win = WindowGlazing.objects.using('materials_db').get(id=layer['glazing_id'])
                    Layer.objects.using('materials_db').create(
                        construction=construction,
                        window=win,
                        layer_order=layer_order,
                        is_glazing_layer=True
                    )
                except WindowGlazing.DoesNotExist:
                    print(f"Warning: glazing {layer.get('glazing_id')} not found")

        return JsonResponse({'id': str(construction.id)}, status=201)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=400)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def api_construction_detail(request, id):
    """Handle GET/PUT/DELETE for a single construction including managing its layers."""
    try:
        from database.models import Construction, Layer, Material, WindowGlazing

        try:
            construction = Construction.objects.using('materials_db').get(id=id)
        except Construction.DoesNotExist:
            return JsonResponse({'error': 'Construction not found'}, status=404)

        if request.method == 'GET':
            # Return construction detail including layers
            layers_qs = Layer.objects.using('materials_db').filter(construction=construction).order_by('layer_order')
            layers_data = []
            for L in layers_qs:
                # include flattened fields expected by the frontend
                mat = L.material
                win = L.window
                if mat:
                    material_name = mat.name
                    thickness_m = mat.thickness_m
                    conductivity_w_mk = mat.conductivity_w_mk
                    gwp = mat.gwp_kgco2e_per_m2
                    cost = mat.cost_sek_per_m2
                elif win:
                    material_name = win.name
                    thickness_m = win.thickness_m
                    conductivity_w_mk = win.conductivity_w_mk
                    gwp = win.gwp_kgco2e_per_m2
                    cost = win.cost_sek_per_m2
                else:
                    material_name = None
                    thickness_m = None
                    conductivity_w_mk = None
                    gwp = None
                    cost = None

                layers_data.append({
                    'id': getattr(L, 'id', None),
                    'material_id': str(mat.id) if mat else None,
                    'glazing_id': str(win.id) if win else None,
                    'material_name': material_name,
                    'thickness_m': thickness_m,
                    'conductivity_w_mk': conductivity_w_mk,
                    'gwp_kgco2e_per_m2': gwp,
                    'cost_sek_per_m2': cost,
                    'layer_order': L.layer_order,
                    'is_glazing_layer': L.is_glazing_layer,
                })

            return JsonResponse({
                'id': str(construction.id),
                'name': construction.name,
                'element_type': construction.element_type,
                'is_window': construction.is_window,
                'u_value_w_m2k': construction.u_value_w_m2k,
                'gwp_kgco2e_per_m2': construction.gwp_kgco2e_per_m2,
                'cost_sek_per_m2': construction.cost_sek_per_m2,
                'layers': layers_data,
            })

        if request.method == 'DELETE':
            # Delete construction and its layers (cascade should handle layers)
            construction.delete()
            return JsonResponse({'status': 'deleted'})

        # PUT - update construction and replace layers if provided
        data = json.loads(request.body.decode('utf-8'))
        # Update fields
        construction.name = data.get('name', construction.name)
        construction.element_type = data.get('element_type', construction.element_type)
        construction.is_window = data.get('is_window', construction.is_window)
        construction.u_value_w_m2k = data.get('u_value_w_m2k', construction.u_value_w_m2k)
        construction.gwp_kgco2e_per_m2 = data.get('gwp_kgco2e_per_m2', construction.gwp_kgco2e_per_m2)
        construction.cost_sek_per_m2 = data.get('cost_sek_per_m2', construction.cost_sek_per_m2)
        construction.source = data.get('source', construction.source)
        construction.save(using='materials_db')

        # If layers provided, remove existing and recreate
        if 'layers' in data:
            Layer.objects.using('materials_db').filter(construction=construction).delete()
            for layer in data.get('layers', []):
                layer_order = layer.get('layer_order', 1)
                if layer.get('material_id'):
                    # validate UUID
                    try:
                        uuid.UUID(str(layer['material_id']))
                    except Exception:
                        return JsonResponse({'error': f"Invalid material_id in layer: {layer.get('material_id')}"}, status=400)
                    try:
                        mat = Material.objects.using('materials_db').get(id=layer['material_id'])
                        Layer.objects.using('materials_db').create(
                            construction=construction,
                            material=mat,
                            layer_order=layer_order,
                            is_glazing_layer=False
                        )
                    except Material.DoesNotExist:
                        print(f"Warning: material {layer.get('material_id')} not found")
                    except (ValueError, DjangoValidationError) as e:
                        return JsonResponse({'error': f"Invalid material_id in layer: {layer.get('material_id')} - {str(e)}"}, status=400)
                elif layer.get('glazing_id'):
                    # validate UUID
                    try:
                        uuid.UUID(str(layer['glazing_id']))
                    except Exception:
                        return JsonResponse({'error': f"Invalid glazing_id in layer: {layer.get('glazing_id')}"}, status=400)
                    try:
                        win = WindowGlazing.objects.using('materials_db').get(id=layer['glazing_id'])
                        Layer.objects.using('materials_db').create(
                            construction=construction,
                            window=win,
                            layer_order=layer_order,
                            is_glazing_layer=True
                        )
                    except WindowGlazing.DoesNotExist:
                        print(f"Warning: glazing {layer.get('glazing_id')} not found")
                    except (ValueError, DjangoValidationError) as e:
                        return JsonResponse({'error': f"Invalid glazing_id in layer: {layer.get('glazing_id')} - {str(e)}"}, status=400)

        return JsonResponse({'status': 'updated'})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])  # Allow unauthenticated access for now
def api_construction_sets(request):
    """Get all construction sets from database"""
    try:
        from database.models import ConstructionSet
        construction_sets = ConstructionSet.objects.using('materials_db').all()
        
        sets_data = []
        for cs in construction_sets:
            sets_data.append({
                'id': cs.id,
                'name': cs.name,
                'description': cs.description,
                'wall_construction_id': cs.wall_construction.id if cs.wall_construction else None,
                'wall_construction_name': cs.wall_construction.name if cs.wall_construction else None,
                'roof_construction_id': cs.roof_construction.id if cs.roof_construction else None,
                'roof_construction_name': cs.roof_construction.name if cs.roof_construction else None,
                'floor_construction_id': cs.floor_construction.id if cs.floor_construction else None,
                'floor_construction_name': cs.floor_construction.name if cs.floor_construction else None,
                'window_construction_id': cs.window_construction.id if cs.window_construction else None,
                'window_construction_name': cs.window_construction.name if cs.window_construction else None,
                'date_created': cs.date_created.isoformat() if cs.date_created else None,
                'date_modified': cs.date_modified.isoformat() if cs.date_modified else None,
                'source': cs.source
            })
        
        return JsonResponse(sets_data, safe=False)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': str(e)
        }, status=500)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def api_construction_set_detail(request, id):
    """Handle GET/PUT/DELETE for a single construction set."""
    try:
        from database.models import ConstructionSet

        try:
            cs = ConstructionSet.objects.using('materials_db').get(id=id)
        except ConstructionSet.DoesNotExist:
            return JsonResponse({'error': 'ConstructionSet not found'}, status=404)

        if request.method == 'GET':
            return JsonResponse({
                'id': cs.id,
                'name': cs.name,
                'description': cs.description,
                'wall_construction_id': cs.wall_construction.id if cs.wall_construction else None,
                'roof_construction_id': cs.roof_construction.id if cs.roof_construction else None,
                'floor_construction_id': cs.floor_construction.id if cs.floor_construction else None,
                'window_construction_id': cs.window_construction.id if cs.window_construction else None,
                'date_created': cs.date_created.isoformat() if cs.date_created else None,
                'date_modified': cs.date_modified.isoformat() if cs.date_modified else None,
                'source': cs.source
            })

        if request.method == 'DELETE':
            cs.delete()
            return JsonResponse({'status': 'deleted'})

        # PUT - update fields
        data = json.loads(request.body.decode('utf-8'))
        cs.name = data.get('name', cs.name)
        cs.description = data.get('description', cs.description)
        # Update foreign keys if provided
        if 'wall_construction_id' in data:
            from database.models import Construction
            try:
                cs.wall_construction = Construction.objects.using('materials_db').get(id=data['wall_construction_id']) if data['wall_construction_id'] else None
            except Construction.DoesNotExist:
                return JsonResponse({'error': 'Wall construction not found'}, status=400)
        if 'roof_construction_id' in data:
            from database.models import Construction
            try:
                cs.roof_construction = Construction.objects.using('materials_db').get(id=data['roof_construction_id']) if data['roof_construction_id'] else None
            except Construction.DoesNotExist:
                return JsonResponse({'error': 'Roof construction not found'}, status=400)
        if 'floor_construction_id' in data:
            from database.models import Construction
            try:
                cs.floor_construction = Construction.objects.using('materials_db').get(id=data['floor_construction_id']) if data['floor_construction_id'] else None
            except Construction.DoesNotExist:
                return JsonResponse({'error': 'Floor construction not found'}, status=400)
        if 'window_construction_id' in data:
            from database.models import Construction
            try:
                cs.window_construction = Construction.objects.using('materials_db').get(id=data['window_construction_id']) if data['window_construction_id'] else None
            except Construction.DoesNotExist:
                return JsonResponse({'error': 'Window construction not found'}, status=400)

        cs.save(using='materials_db')
        return JsonResponse({'status': 'updated'})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)