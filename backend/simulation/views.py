import os
import json
import uuid
import tempfile
from django.http import JsonResponse
from django.core.exceptions import ValidationError as DjangoValidationError
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .unified_idf_parser import EnergyPlusIDFParser
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
from django.http import FileResponse, Http404, HttpResponse
import mimetypes
import zipfile
import io

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
            # UnifiedIDFParser requires the raw content on construction.
            # Call parse() with no arguments to get the parsed dict.
            parser = EnergyPlusIDFParser(content)
            file_data = parser.parse()
            
            # Add database comparison for materials
            for material in file_data.get('materials', []):
                # Support both parser shapes:
                # - older idf_parser.py returns flat dicts with keys like 'thickness', 'conductivity', etc.
                # - unified_idf_parser returns dicts with a nested 'properties' dict containing those fields
                material_name = material.get('name') or material.get('Name') or 'Unknown'

                # Helper to read numeric fields from either top-level or nested properties
                def _get_numeric(obj, names):
                    # obj can be a dict with direct keys, or have obj['properties']
                    props = obj.get('properties') if isinstance(obj.get('properties'), dict) else obj
                    for n in names:
                        if n in props and props[n] is not None:
                            try:
                                return float(props[n])
                            except Exception:
                                try:
                                    return float(str(props[n]).replace(',', ''))
                                except Exception:
                                    continue
                    return None

                props = {}
                props['thickness'] = _get_numeric(material, ['thickness', 'Thickness', 'thickness_m', 'Thickness_m'])
                props['conductivity'] = _get_numeric(material, ['conductivity', 'Conductivity', 'conductivity_w_mk'])
                props['density'] = _get_numeric(material, ['density', 'Density', 'density_kg_m3', 'density_kg/m3'])
                props['specificHeat'] = _get_numeric(material, ['specific_heat', 'Specific_Heat', 'specificHeat', 'specific_heat_j_kgk'])

                # Non-numeric properties (fall back to nested properties as well)
                def _get_str(obj, keys):
                    props_src = obj.get('properties') if isinstance(obj.get('properties'), dict) else obj
                    for k in keys:
                        if k in props_src and props_src[k] is not None:
                            return props_src[k]
                    return None

                props['roughness'] = _get_str(material, ['roughness', 'Roughness'])
                props['thermalAbsorptance'] = _get_str(material, ['thermal_absorptance', 'Thermal_Absorptance'])
                props['solarAbsorptance'] = _get_str(material, ['solar_absorptance', 'Solar_Absorptance'])
                props['visibleAbsorptance'] = _get_str(material, ['visible_absorptance', 'Visible_Absorptance'])

                normalized_material = {
                    'name': material_name,
                    'type': material.get('type', 'Material'),
                    'properties': props,
                }

                # DB existence and source metadata
                exists = check_material_exists(material_name)
                normalized_material['existsInDatabase'] = exists
                if not exists:
                    normalized_material['source'] = f"Extracted from {file.name}"

                # Generate a unique key for this material
                normalized_material['uniqueKey'] = f"{material_name}_{file_index}_{file.name}"

                # Only add if not already added
                if material_name not in materials_dict:
                    materials_dict[material_name] = normalized_material
            
            # Add database comparison for constructions
            for construction in file_data.get('constructions', []):
                construction_name = construction.get('name') or construction.get('Name') or 'Unknown'

                # Layers may be provided directly under 'layers' or nested under properties
                layers = []
                # 1) unified parser: construction may be {'properties': {'layers': [...]}}
                props = construction.get('properties') if isinstance(construction.get('properties'), dict) else construction
                if isinstance(props.get('layers'), list) and props.get('layers'):
                    layers = props.get('layers')
                elif isinstance(construction.get('layers'), list):
                    layers = construction.get('layers')
                else:
                    # fallback to heuristic: fields list or keys like Layer_1, Layer_2
                    if isinstance(construction.get('fields'), list) and len(construction.get('fields')) > 1:
                        layers = construction.get('fields')[1:]
                    else:
                        for k, v in construction.items():
                            if isinstance(k, str) and k.lower().startswith('layer') and v:
                                layers.append(v)

                normalized_construction = {
                    'name': construction_name,
                    'type': construction.get('type', 'Construction'),
                    'properties': {
                        'layers': layers
                    }
                }

                exists = check_construction_exists(construction_name)
                normalized_construction['existsInDatabase'] = exists
                if not exists:
                    normalized_construction['source'] = f"Extracted from {file.name}"

                normalized_construction['uniqueKey'] = f"{construction_name}_{file_index}_{file.name}"

                if construction_name not in constructions_dict:
                    constructions_dict[construction_name] = normalized_construction
            
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
@permission_classes([AllowAny])
def parse_idf_test(request):
    """Lightweight test endpoint for the parser that accepts JSON with keys:
    - idf: string content of the IDF
    - construction_set: a single construction_set dict

    Returns the modified IDF content so it can be inspected via curl.
    """
    try:
        data = request.data if hasattr(request, 'data') else json.loads(request.body.decode('utf-8') or '{}')
        idf_content = data.get('idf')
        construction_set = data.get('construction_set')
        if not idf_content or not construction_set:
            return JsonResponse({'error': 'Missing idf or construction_set in JSON body'}, status=400)

        # Use the older parser for this lightweight test
        from .unified_idf_parser import IdfParser, generate_parametric_idfs
        parser = IdfParser(idf_content)
        parser.insert_construction_set(construction_set)

        # Save to a temp file and return content
        with tempfile.NamedTemporaryFile(delete=False, suffix='.idf', mode='w', encoding='utf-8') as tmp:
            try:
                idf_obj = getattr(parser, 'idf', None)
                if idf_obj is not None and hasattr(idf_obj, 'saveas'):
                    idf_obj.saveas(tmp.name)
                else:
                    tmp.write(parser.to_string())
            finally:
                tmp.close()
            with open(tmp.name, 'r', encoding='utf-8') as f:
                out = f.read()
            try:
                os.remove(tmp.name)
            except Exception:
                pass

        return JsonResponse({'modified_idf': out})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_components(request):
    """Add extracted components to database."""
    try:
        data = request.data
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
        
        # Parse optional runtime parameters from the request form (multipart form data)
        parallel = (request.POST.get('parallel') == 'true') or (request.data.get('parallel') == 'true') if hasattr(request, 'data') else (request.POST.get('parallel') == 'true')
        batch_mode = (request.POST.get('batch_mode') == 'true') or (request.data.get('batch_mode') == 'true') if hasattr(request, 'data') else (request.POST.get('batch_mode') == 'true')
        try:
            max_workers = int(request.POST.get('max_workers') or request.data.get('max_workers') or 4)
        except Exception:
            max_workers = 4

        # If a scenario_id was provided, construct a list of construction_sets
        scenario_id = request.POST.get('scenario_id') or (request.data.get('scenario_id') if hasattr(request, 'data') else None)
        # construction_mode controls how construction_sets are generated. Supported values:
        # - None or 'combinatorial' (default): build Cartesian product across element types
        # - 'per_construction': create one construction_set per element type (choose first construction for that type)
        construction_mode = request.POST.get('construction_mode') or (request.data.get('construction_mode') if hasattr(request, 'data') else None)
        construction_sets = None
        if scenario_id:
            try:
                from database.models import ScenarioConstruction, Layer
                import itertools

                sc_qs = ScenarioConstruction.objects.using('materials_db').filter(scenario_id=scenario_id)
                groups = {}
                for sc in sc_qs:
                    c = sc.construction
                    if not c:
                        continue
                    # collect ordered layer names for this construction
                    layers = []
                    for L in Layer.objects.using('materials_db').filter(construction=c).order_by('layer_order'):
                        if getattr(L, 'material', None):
                            layers.append(L.material.name)
                        elif getattr(L, 'window', None):
                            layers.append(L.window.name)

                    groups.setdefault(sc.element_type, []).append({
                        'name': c.name,
                        'layers': layers
                    })

                if groups:
                    # Two supported modes for creating construction sets:
                    # 1) combinatorial (default) -- build Cartesian product across element types
                    # 2) per_construction -- create one construction_set per element type (pick the first construction)
                    if construction_mode == 'per_construction':
                        # Create one construction_set per ScenarioConstruction row (preserve element type)
                        construction_sets = []
                        for sc in sc_qs:
                            c = sc.construction
                            if not c:
                                continue
                            layers = []
                            for L in Layer.objects.using('materials_db').filter(construction=c).order_by('layer_order'):
                                if getattr(L, 'material', None):
                                    layers.append(L.material.name)
                                elif getattr(L, 'window', None):
                                    layers.append(L.window.name)
                            construction_sets.append({sc.element_type: {'name': c.name, 'layers': layers}})
                    else:
                        # build cartesian product across element types to create construction_sets
                        # NOTE: frontend combinatorics counts (1 + count_per_type) - 1 to allow
                        # omitting a type (no-change). To match that, include a None option
                        # for each element type and skip the all-none case.
                        keys = list(groups.keys())
                        lists = [[None] + groups[k] for k in keys]
                        combos = list(itertools.product(*lists))
                        construction_sets = []
                        for combo in combos:
                            cs = {}
                            for k, chosen in zip(keys, combo):
                                if chosen is None:
                                    continue
                                cs[k] = {'name': chosen['name'], 'layers': chosen['layers']}
                            # skip the empty combination (all None) which represents baseline/no-change
                            if not cs:
                                continue
                            construction_sets.append(cs)

                    # If we found construction_sets, ensure batch_mode is enabled
                    if construction_sets:
                        batch_mode = True
            except Exception as e:
                print(f"Warning: failed to build construction_sets for scenario {scenario_id}: {e}")

        # Dispatch Celery task for async execution (replaces threading approach)
        from .tasks import run_energyplus_batch_task
        
        # Prepare file paths for Celery task
        idf_file_paths = [f.file_path for f in SimulationFile.objects.filter(
            simulation=simulation,
            file_type='idf'
        )]
        
        weather_file_obj = SimulationFile.objects.filter(
            simulation=simulation,
            file_type='weather'
        ).first()
        
        if not weather_file_obj:
            simulation.status = 'failed'
            simulation.error_message = 'Weather file not found'
            simulation.save()
            return JsonResponse({
                'error': 'Weather file not found'
            }, status=400)
        
        # Dispatch the Celery task asynchronously
        task = run_energyplus_batch_task.delay(
            simulation_id=str(simulation.id),
            idf_file_paths=idf_file_paths,
            weather_file_path=weather_file_obj.file_path,
            parallel=parallel,
            max_workers=max_workers,
            batch_mode=batch_mode,
            construction_sets=construction_sets
        )
        
        # Store the Celery task ID on the simulation for tracking
        simulation.celery_task_id = task.id
        simulation.save()
        
        return JsonResponse({
            'simulation_id': simulation.id,
            'task_id': task.id,
            'message': 'Simulation task queued successfully',
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
        
        # Prefer an explicit stored progress value updated by the simulator.
        # Only fall back to the previous time-based heuristic if progress is truly unset (None).
        # Respect a stored 0 value as a valid progress indicator (avoids an immediate jump to 99%).
        progress = getattr(simulation, 'progress', None)
        if progress is None:
            if simulation.status == 'running':
                # For backward compatibility, fall back to a simple time-based estimate
                from django.utils import timezone
                elapsed = (timezone.now() - simulation.updated_at).total_seconds()
                progress = min(int((elapsed / 5) * 100), 99)
            elif simulation.status == 'completed':
                progress = 100
            else:
                progress = 0
        else:
            # Use the stored progress value. Ensure it's an int and clamp reasonable bounds.
            try:
                progress = int(progress)
            except Exception:
                progress = 0
            if simulation.status == 'completed':
                progress = 100
        
        # Include any stored error message so the frontend can display it
        error_msg = simulation.error_message if getattr(simulation, 'error_message', None) else None

        # If simulation is failed but no DB-stored error message is present,
        # attempt to provide a short tail from any run logs to help debugging.
        if simulation.status == 'failed' and not error_msg:
            try:
                sim_dir = os.path.join(settings.MEDIA_ROOT, 'simulation_results', str(simulation_id))
                if os.path.exists(sim_dir):
                    # Look for common log filenames in the simulation results tree
                    candidates = ['run_output.log', 'output.err', 'eplusout.err']
                    found = None
                    for root, _, files in os.walk(sim_dir):
                        for fname in candidates:
                            if fname in files:
                                found = os.path.join(root, fname)
                                break
                        if found:
                            break
                    if found:
                        # Read a reasonably small tail to avoid huge responses
                        with open(found, 'rb') as f:
                            f.seek(0, os.SEEK_END)
                            size = f.tell()
                            tail_size = min(size, 2000)
                            if tail_size > 0:
                                f.seek(-tail_size, os.SEEK_END)
                            data = f.read().decode('utf-8', errors='replace')
                        error_msg = f"Log snippet from {os.path.basename(found)}:\n" + data
            except Exception:
                # Non-fatal; if this fails, we will simply return null error fields
                error_msg = None
        response = JsonResponse({
            'status': simulation.status,
            'progress': progress,
            'simulationId': simulation_id,
            'error': error_msg,
            'error_message': error_msg,
        })
        # Add CORS headers here to ensure browser requests from the frontend
        # receive the Access-Control-Allow-Origin header even if middleware
        # doesn't run for some error/early-response paths. Prefer echoing
        # the request Origin (if provided) so credentials can be used.
        origin = request.headers.get('Origin') or request.META.get('HTTP_ORIGIN')
        if origin:
            response["Access-Control-Allow-Origin"] = origin
            if getattr(settings, 'CORS_ALLOW_CREDENTIALS', False):
                response["Access-Control-Allow-Credentials"] = "true"
        else:
            # Non-browser clients or tests may not send Origin; fall back to wildcard
            response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response
        
    except Simulation.DoesNotExist:
        response = JsonResponse({
            'error': 'Simulation not found'
        }, status=404)
        response["Access-Control-Allow-Origin"] = "*"
        return response
    except Exception as e:
        # Print full traceback to server logs for easier debugging
        import traceback
        traceback.print_exc()
        response = JsonResponse({
            'error': str(e)
        }, status=500)
        response["Access-Control-Allow-Origin"] = "*"
        return response

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
                        # If hourly_timeseries was saved in the per-run JSON, keep it in the response
                        # (it will only be present when the parser detected an hourly file)
                        try:
                            if 'hourly_timeseries' in result:
                                # Ensure we don't return huge payloads unintentionally
                                # The frontend can request specific variables later if needed.
                                pass
                        except Exception:
                            pass
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
        from .models import SimulationResult, Simulation
        from .services import parse_simulation_results

        try:
            simulation = Simulation.objects.get(id=simulation_id)
        except Simulation.DoesNotExist:
            return JsonResponse({'error': 'Simulation not found'}, status=404)

        # Get all results for this simulation from the results database
        results = SimulationResult.objects.filter(simulation_id=simulation_id).select_related()

        if not results.exists():
            # Fallback #1: if simulation isn't marked completed yet, return a 202 so the
            # frontend keeps polling without logging an error.
            if simulation.status != 'completed':
                return JsonResponse({
                    'status': simulation.status,
                    'message': 'Simulation is still running. Results will be available once processing finishes.'
                }, status=202)

            # Fallback #2: try to read combined_results.json or per-IDF output on disk
            try:
                fallback = parse_simulation_results(simulation)
                if fallback:
                    return JsonResponse(fallback, safe=False)
            except Exception as parse_err:
                print(f"parallel_simulation_results fallback parse failed: {parse_err}")

            # If we still have nothing, respond with a soft failure to avoid breaking the UI.
            return JsonResponse({
                'status': 'processing',
                'message': 'Results are not yet available. The backend may still be consolidating output.',
                'retry_after_seconds': 2
            }, status=202)

        # Convert to list format similar to SQLite version
        results_data = []

        def _read_log_tail(path, max_chars=200000):
            try:
                if not os.path.exists(path):
                    return None
                size = os.path.getsize(path)
                with open(path, 'rb') as f:
                    if size > max_chars:
                        f.seek(-max_chars, os.SEEK_END)
                        raw = f.read()
                    else:
                        raw = f.read()
                return raw.decode('utf-8', errors='replace')
            except Exception as e:
                return f"Error reading log: {e}"

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

            # Attach hourly timeseries if present in DB (preferred) or on-disk JSON
            try:
                # Prefer DB-stored hourly timeseries
                from .models import SimulationHourlyTimeseries
                hourly_qs = SimulationHourlyTimeseries.objects.filter(simulation_result=result)
                if hourly_qs.exists():
                    ht = hourly_qs.order_by('-created_at').first()
                    result_dict['hourly_timeseries'] = ht.hourly_values
                else:
                    # Fallback: check on-disk output.json in the variant folder
                    try:
                        variant_folder = f"variant_{int(result.variant_idx) + 1}_idf_{int(result.idf_idx) + 1}"
                    except Exception:
                        variant_folder = f"variant_{result.variant_idx}_idf_{result.idf_idx}"
                    result_dir = os.path.join(settings.MEDIA_ROOT, 'simulation_results', str(simulation_id), variant_folder)
                    json_path = os.path.join(result_dir, 'output.json')
                    if os.path.exists(json_path):
                        try:
                            with open(json_path, 'r', encoding='utf-8') as jf:
                                jdata = json.load(jf)
                                if isinstance(jdata, dict) and jdata.get('hourly_timeseries'):
                                    result_dict['hourly_timeseries'] = jdata.get('hourly_timeseries')
                        except Exception:
                            pass
            except Exception:
                # Non-fatal: don't block returning other fields
                pass

            # Try to attach recent run logs for this variant. The folder naming used by the simulator
            # is 1-based (variant_1_idf_1), while DB stores 0-based indices, so add 1 when building path.
            try:
                variant_folder = f"variant_{int(result.variant_idx) + 1}_idf_{int(result.idf_idx) + 1}"
            except Exception:
                variant_folder = f"variant_{result.variant_idx}_idf_{result.idf_idx}"

            result_dir = os.path.join(settings.MEDIA_ROOT, 'simulation_results', str(simulation_id), variant_folder)
            run_output_path = os.path.join(result_dir, 'run_output.log')
            output_err_path = os.path.join(result_dir, 'output.err')

            result_dict['run_output_log'] = _read_log_tail(run_output_path)
            result_dict['output_err'] = _read_log_tail(output_err_path)

            results_data.append(result_dict)
            
        return JsonResponse(results_data, safe=False)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': str(e)
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def simulation_download(request, simulation_id):
    """Serve the primary HTML report (or .htm) for a simulation, or a zip of the result folder.

    Order of preference:
    1. media/simulation_results/<id>/base/output.html
    2. media/simulation_results/<id>/base/output.htm
    3. zip the entire simulation_results/<id>/ directory and return as attachment
    """
    try:
        # Build expected paths
        base_dir = os.path.join(settings.MEDIA_ROOT, 'simulation_results', str(simulation_id))
        base_sub = os.path.join(base_dir, 'base')

        # Prefer output.html, otherwise output.htm
        html_path = os.path.join(base_sub, 'output.html')
        htm_path = os.path.join(base_sub, 'output.htm')

        if os.path.exists(html_path):
            return FileResponse(open(html_path, 'rb'), content_type='text/html')
        if os.path.exists(htm_path):
            return FileResponse(open(htm_path, 'rb'), content_type='text/html')

        # If no HTML/HTM, create an in-memory zip of the simulation folder
        if os.path.exists(base_dir):
            mem_file = io.BytesIO()
            with zipfile.ZipFile(mem_file, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
                for root, dirs, files in os.walk(base_dir):
                    for f in files:
                        full = os.path.join(root, f)
                        arcname = os.path.relpath(full, base_dir)
                        zf.write(full, arcname)
            mem_file.seek(0)
            response = FileResponse(mem_file, as_attachment=True, filename=f'simulation_{simulation_id}_results.zip')
            return response

        raise Http404('Simulation results not found')

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def list_simulation_results(request):
    # Debugging: print the authenticated user and cookies received for troubleshooting AnonymousUser issues
    try:
        print(f"[DEBUG] list_simulation_results request.user={getattr(request, 'user', None)}, is_authenticated={getattr(request.user, 'is_authenticated', None)}")
        print(f"[DEBUG] request.COOKIES={request.COOKIES}")
    except Exception as _e:
        print(f"[DEBUG] Failed to print request.user or cookies: {_e}")
    """Return an aggregated list of simulation results across simulations.

    Supports optional query params:
      - user_id: filter by Simulation.user id
      - scenario_id: filter by Scenario id stored on Simulation.description (best-effort)
      - limit, offset: pagination
    """
    try:
        from .models import SimulationResult

        user_id = request.GET.get('user_id')
        scenario_id = request.GET.get('scenario_id')
        try:
            limit = min(500, int(request.GET.get('limit', 100)))
        except Exception:
            limit = 100
        try:
            offset = max(0, int(request.GET.get('offset', 0)))
        except Exception:
            offset = 0

        # SimulationResult now stores `simulation_id` (UUIDField) to avoid cross-db FK
        qs = SimulationResult.objects.all().order_by('-created_at')

        # Filters involving Simulation must be performed by querying the Simulation model
        if user_id:
            sims = Simulation.objects.filter(user__id=user_id).values_list('id', flat=True)
            qs = qs.filter(simulation_id__in=list(sims))
        if scenario_id:
            sims = Simulation.objects.filter(description__icontains=str(scenario_id)).values_list('id', flat=True)
            qs = qs.filter(simulation_id__in=list(sims))

        results = []
        for r in qs[offset:offset+limit]:
            # r.simulation_id is a UUID field referencing Simulation.id in the default DB
            sim_id = str(r.simulation_id) if getattr(r, 'simulation_id', None) else None
            sim_name = None
            user_id_val = None
            if sim_id:
                try:
                    sim_obj = Simulation.objects.filter(id=sim_id).first()
                    if sim_obj:
                        sim_name = sim_obj.name
                        user_id_val = str(sim_obj.user.id) if getattr(sim_obj, 'user', None) else None
                except Exception:
                    # Non-fatal; skip attaching simulation metadata if there's an error
                    pass

            # Try to include the user's email when available for frontend display
            user_email = None
            try:
                if sim_obj and getattr(sim_obj, 'user', None) and getattr(sim_obj.user, 'email', None):
                    user_email = str(sim_obj.user.email)
            except Exception:
                user_email = None
            # Determine weather filename for this simulation (if available)
            weather_name_local = None
            try:
                if sim_obj:
                    wf = sim_obj.files.filter(file_type='weather').first()
                    if wf:
                        weather_name_local = getattr(wf, 'original_name', None) or getattr(wf, 'file_name', None) or (os.path.basename(getattr(wf, 'file_path')) if getattr(wf, 'file_path', None) else None)
            except Exception:
                weather_name_local = None

            results.append({
                'id': str(getattr(r, 'id', None)),
                'simulation_id': sim_id,
                'simulation_name': sim_name,
                'user_id': user_id_val,
                'user_email': user_email,
                'weather_file': weather_name_local,
                'epw': weather_name_local,
                '_weatherKey': weather_name_local,
                'file_name': getattr(r, 'file_name', None),
                'building': getattr(r, 'building_name', None),
                'total_energy_use': getattr(r, 'total_energy_use', None),
                'heating_demand': getattr(r, 'heating_demand', None),
                'cooling_demand': getattr(r, 'cooling_demand', None),
                'run_time': getattr(r, 'run_time', None),
                'total_area': getattr(r, 'total_area', None),
                'status': getattr(r, 'status', None),
                'variant_idx': getattr(r, 'variant_idx', None),
                'idf_idx': getattr(r, 'idf_idx', None),
                'construction_set': getattr(r, 'construction_set_data', None),
                'created_at': getattr(r, 'created_at').isoformat() if getattr(r, 'created_at', None) else None,
            })

        response = JsonResponse(results, safe=False)
        origin = request.headers.get('Origin') or request.META.get('HTTP_ORIGIN')
        if origin:
            response['Access-Control-Allow-Origin'] = origin
            if getattr(settings, 'CORS_ALLOW_CREDENTIALS', False):
                response['Access-Control-Allow-Credentials'] = 'true'
        else:
            response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        response = JsonResponse({'error': str(e)}, status=500)
        response['Access-Control-Allow-Origin'] = '*'
        return response


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
            data = request.data
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
        data = request.data

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
            # Make DELETE idempotent: if client attempted DELETE on a missing resource,
            # treat it as successful (no-op). For non-DELETE methods, return 404.
            if request.method == 'DELETE':
                return HttpResponse(status=204)
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
            Construction.objects.using('materials_db').filter(id=construction.id).delete()
            return JsonResponse({'status': 'deleted'})

        # PUT - update construction and replace layers if provided
        data = request.data
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


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def api_scenarios(request):
    """List all scenarios or create a new scenario with its constructions."""
    try:
        from database.models import Scenario, ScenarioConstruction, Construction
        if request.method == 'GET':
            scenarios_qs = Scenario.objects.using('materials_db').all()
            scenarios = []
            for s in scenarios_qs:
                constructions = []
                sc_qs = ScenarioConstruction.objects.using('materials_db').filter(scenario=s)
                for sc in sc_qs:
                    constructions.append({
                        'id': str(sc.id),
                        'construction_id': str(sc.construction.id) if sc.construction else None,
                        'element_type': sc.element_type,
                        'created_at': sc.created_at.isoformat() if getattr(sc, 'created_at', None) else None
                    })

                scenarios.append({
                    'id': str(s.id),
                    'name': s.name,
                    'description': s.description,
                    'total_simulations': getattr(s, 'total_simulations', None),
                    'author_id': getattr(s.author, 'id', None) if getattr(s, 'author', None) else None,
                    'date_created': s.date_created.isoformat() if getattr(s, 'date_created', None) else None,
                    'date_modified': s.date_modified.isoformat() if getattr(s, 'date_modified', None) else None,
                    'scenario_constructions': constructions
                })
            return JsonResponse(scenarios, safe=False)

        # POST - create scenario and its scenario_constructions
        data = request.data
        name = data.get('name')
        description = data.get('description')
        total_simulations = data.get('total_simulations')
        author_id = data.get('author_id')
        constructions = data.get('constructions', [])

        # Resolve author if provided (Author.id is UUID). Ignore invalid values.
        author_obj = None
        if author_id:
            try:
                from database.models import Author
                author_uuid = uuid.UUID(str(author_id))
                author_obj = Author.objects.using('materials_db').filter(id=author_uuid).first()
            except Exception:
                author_obj = None

        # Compute total_simulations. By default use combinatorial logic, but allow
        # a creation mode 'per_construction' which creates one sim per provided construction.
        construction_mode = data.get('construction_mode') or data.get('creation_mode')
        def compute_combinatorial(constructions_list):
            # group by element type
            counts = {}
            for sc in constructions_list:
                et = sc.get('elementType') or sc.get('element_type')
                if not et:
                    continue
                counts[et] = counts.get(et, 0) + 1
            if not counts:
                return 0
            product = 1
            for c in counts.values():
                product *= (1 + int(c))
            return max(0, product - 1)

        if total_simulations is None:
            if construction_mode == 'per_construction':
                # one simulation per provided construction row
                try:
                    total_simulations = max(0, int(len(constructions)))
                except Exception:
                    total_simulations = 0
            else:
                total_simulations = compute_combinatorial(constructions)

        # Create scenario
        scenario = Scenario.objects.using('materials_db').create(
            name=name,
            description=description,
            total_simulations=total_simulations,
            author=author_obj
        )

        # Create scenario_constructions rows
        for sc in constructions:
            try:
                construction_obj = Construction.objects.using('materials_db').get(id=sc.get('constructionId'))
            except Exception:
                construction_obj = None
            ScenarioConstruction.objects.using('materials_db').create(
                scenario=scenario,
                construction=construction_obj,
                element_type=sc.get('elementType')
            )

        return JsonResponse({'id': str(scenario.id)}, status=201)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def api_scenario_detail(request, id):
    """Get, update or delete a single scenario and manage its constructions."""
    try:
        from database.models import Scenario, ScenarioConstruction, Construction
        try:
            s = Scenario.objects.using('materials_db').get(id=id)
        except Scenario.DoesNotExist:
            if request.method == 'DELETE':
                return HttpResponse(status=204)
            return JsonResponse({'error': 'Scenario not found'}, status=404)

        if request.method == 'GET':
            constructions = []
            sc_qs = ScenarioConstruction.objects.using('materials_db').filter(scenario=s)
            for sc in sc_qs:
                constructions.append({
                    'id': str(sc.id),
                    'construction_id': str(sc.construction.id) if sc.construction else None,
                    'element_type': sc.element_type,
                })

            return JsonResponse({
                'id': str(s.id),
                'name': s.name,
                'description': s.description,
                'total_simulations': getattr(s, 'total_simulations', None),
                'scenario_constructions': constructions
            })

        if request.method == 'DELETE':
            # Delete scenario and related scenario_constructions explicitly on materials_db
            ScenarioConstruction.objects.using('materials_db').filter(scenario=s).delete()
            Scenario.objects.using('materials_db').filter(id=s.id).delete()

            # Option B: update historical simulation results so UI no longer groups them
            # by the deleted scenario id. We nullify SimulationResult.simulation_id for any
            # results that reference this id directly, and also for results whose owning
            # Simulation has a description that mentions the scenario id (best-effort).
            try:
                from .models import SimulationResult, Simulation

                # Nullify direct matches where a result's simulation_id equals the deleted scenario id
                try:
                    SimulationResult.objects.filter(simulation_id=str(s.id)).update(simulation_id=None)
                except Exception:
                    # Try matching using UUID object if string failed
                    try:
                        SimulationResult.objects.filter(simulation_id=s.id).update(simulation_id=None)
                    except Exception as _:
                        print(f"Warning: failed to nullify SimulationResult.simulation_id for direct matches of scenario {s.id}")

                # Also find Simulation objects whose description mentions the scenario id
                try:
                    sims = Simulation.objects.filter(description__icontains=str(s.id)).values_list('id', flat=True)
                    sims_list = list(sims)
                    if sims_list:
                        SimulationResult.objects.filter(simulation_id__in=sims_list).update(simulation_id=None)
                except Exception:
                    print(f"Warning: failed to nullify SimulationResult rows for Simulations referencing scenario {s.id} in description")
            except Exception as e:
                print(f"Warning: cleanup of SimulationResult references failed after deleting scenario {s.id}: {e}")

            return JsonResponse({'status': 'deleted'})

        # PUT - update scenario and replace constructions
        data = request.data
        s.name = data.get('name', s.name)
        s.description = data.get('description', s.description)
        # Update author if provided and valid
        if 'author_id' in data:
            try:
                from database.models import Author
                aid = data.get('author_id')
                author_uuid = uuid.UUID(str(aid))
                s.author = Author.objects.using('materials_db').filter(id=author_uuid).first()
            except Exception:
                # ignore invalid author id and leave author unchanged
                pass
        # If total_simulations not provided, compute combinatorial from constructions payload
        if 'total_simulations' in data:
            try:
                s.total_simulations = int(data.get('total_simulations'))
            except Exception:
                pass
        else:
            # compute from provided constructions list if available
            if 'constructions' in data:
                def compute_combinatorial_from_payload(constructions_list):
                    counts = {}
                    for sc in constructions_list:
                        et = sc.get('elementType') or sc.get('element_type')
                        if not et:
                            continue
                        counts[et] = counts.get(et, 0) + 1
                    if not counts:
                        return 0
                    product = 1
                    for c in counts.values():
                        product *= (1 + int(c))
                    return max(0, product - 1)

                try:
                    s.total_simulations = compute_combinatorial_from_payload(data.get('constructions', []))
                except Exception:
                    pass
        s.save(using='materials_db')

        if 'constructions' in data:
            ScenarioConstruction.objects.using('materials_db').filter(scenario=s).delete()
            for sc in data.get('constructions', []):
                try:
                    construction_obj = Construction.objects.using('materials_db').get(id=sc.get('constructionId'))
                except Exception:
                    construction_obj = None
                ScenarioConstruction.objects.using('materials_db').create(
                    scenario=s,
                    construction=construction_obj,
                    element_type=sc.get('elementType')
                )

        return JsonResponse({'status': 'updated'})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': str(e)}, status=500)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([AllowAny])
def api_construction_set_detail(request, id):
    """Handle GET/PUT/DELETE for a single construction set."""
    try:
        from database.models import ConstructionSet

        try:
            cs = ConstructionSet.objects.using('materials_db').get(id=id)
        except ConstructionSet.DoesNotExist:
            if request.method == 'DELETE':
                return HttpResponse(status=204)
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
            ConstructionSet.objects.using('materials_db').filter(id=cs.id).delete()
            return JsonResponse({'status': 'deleted'})

        # PUT - update fields
        data = request.data
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


@api_view(['GET'])
@permission_classes([AllowAny])
def celery_task_status(request, task_id):
    """
    Check the status of a Celery task by its task ID.
    Returns task state, progress, and result if available.
    """
    try:
        from celery.result import AsyncResult
        from .models import Simulation
        
        task = AsyncResult(task_id)
        
        response_data = {
            'task_id': task_id,
            'state': task.state,
            'ready': task.ready(),
        }
        
        # Add state-specific information
        if task.state == 'PENDING':
            response_data['status'] = 'pending'
            response_data['progress'] = 0
        elif task.state == 'PROGRESS':
            # Get progress info from task meta
            info = task.info
            response_data['status'] = 'running'
            response_data['current'] = info.get('current', 0)
            response_data['total'] = info.get('total', 100)
            response_data['progress'] = int((info.get('current', 0) / info.get('total', 100)) * 100) if info.get('total', 100) > 0 else 0
            response_data['message'] = info.get('status', 'Processing...')
        elif task.state == 'SUCCESS':
            response_data['status'] = 'completed'
            response_data['progress'] = 100
            response_data['result'] = task.result
        elif task.state == 'FAILURE':
            response_data['status'] = 'failed'
            response_data['error'] = str(task.info)
        else:
            response_data['status'] = task.state.lower()
        
        # Try to get simulation info if available
        try:
            sim = Simulation.objects.filter(celery_task_id=task_id).first()
            if sim:
                response_data['simulation_id'] = str(sim.id)
                response_data['simulation_status'] = sim.status
                response_data['simulation_progress'] = sim.progress
        except Exception:
            pass
        
        return JsonResponse(response_data)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': str(e),
            'task_id': task_id
        }, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def cancel_task(request, task_id):
    """
    Cancel a running Celery task.
    """
    try:
        from celery.result import AsyncResult
        from .models import Simulation
        
        task = AsyncResult(task_id)
        
        # Revoke the task
        task.revoke(terminate=True, signal='SIGKILL')
        
        # Update simulation status
        try:
            sim = Simulation.objects.filter(celery_task_id=task_id).first()
            if sim:
                sim.status = 'failed'
                sim.error_message = 'Task cancelled by user'
                sim.save()
        except Exception as e:
            print(f"Failed to update simulation status: {e}")
        
        return JsonResponse({
            'status': 'cancelled',
            'task_id': task_id,
            'message': 'Task cancellation requested'
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': str(e),
            'task_id': task_id
        }, status=500)