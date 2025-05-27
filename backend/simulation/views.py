import os
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from .idf_parser import IdfParser
from database.models import Material, Construction
from .services import EnergyPlusSimulator
from .models import Simulation, SimulationFile
import threading
import traceback
from django.conf import settings

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def parse_idf(request):
    """Parse uploaded IDF files and compare with database."""
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
        
        for file in files:
            print("Processing file:", file.name)
            content = file.read().decode('utf-8')
            parser = IdfParser(content)
            file_data = parser.parse()
            
            # Add database comparison for materials
            for material in file_data['materials']:
                material['existsInDatabase'] = Material.objects.filter(
                    name__iexact=material['name']
                ).exists()
                
                if not material['existsInDatabase']:
                    material['source'] = f"Extracted from {file.name}"
            
            # Add database comparison for constructions
            for construction in file_data['constructions']:
                construction['existsInDatabase'] = Construction.objects.filter(
                    name__iexact=construction['name']
                ).exists()
                
                if not construction['existsInDatabase']:
                    construction['source'] = f"Extracted from {file.name}"
            
            # Merge data from all files
            parsed_data['materials'].extend(file_data['materials'])
            parsed_data['constructions'].extend(file_data['constructions'])
            parsed_data['zones'].extend(file_data['zones'])

        return JsonResponse(parsed_data)

    except Exception as e:
        print("Exception in parse_idf:", str(e))
        return JsonResponse({
            'error': str(e)
        }, status=500)

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
                    author=request.user,
                    source=comp.get('source', '')
                )
                material.save()
                added_components.append(material.id)
        
        elif component_type == 'construction':
            for comp in components:
                construction = Construction(
                    name=comp['name'],
                    element_type=comp['type'],
                    author=request.user,
                    source=comp.get('source', '')
                )
                construction.save()
                
                # Add layers
                for i, layer_name in enumerate(comp['properties']['layers']):
                    material = Material.objects.get(name=layer_name)
                    construction.layers.create(
                        material=material,
                        layer_order=i + 1
                    )
                
                added_components.append(construction.id)

        return JsonResponse({
            'message': f'Successfully added {len(added_components)} {component_type}s',
            'added_components': added_components
        })

    except Exception as e:
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
            status='pending'
        )
        
        print(f"Created simulation with ID: {simulation.id}")
        
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
                file=file_path,
                file_type='idf'
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
            file=weather_path,
            file_type='weather'
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
            'message': 'Simulation started successfully'
        })
        
    except Exception as e:
        import traceback
        print(f"ERROR in run_simulation view: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])  # For testing; change to IsAuthenticated in production
def simulation_status(request, simulation_id):
    """Get the status of a running simulation."""
    try:
        simulation = Simulation.objects.get(id=simulation_id)
        
        # Calculate approximate progress if running
        progress = 0
        if simulation.status == 'running':
            # For demo, generate a progress based on time elapsed
            from django.utils import timezone
            elapsed = (timezone.now() - simulation.updated_at).total_seconds()
            # Assume a simulation takes about 5 seconds for demo
            progress = min(int((elapsed / 5) * 100), 99)
        elif simulation.status == 'completed':
            progress = 100
        
        return JsonResponse({
            'status': simulation.status,
            'progress': progress,
            'error_message': simulation.error_message
        })
        
    except Simulation.DoesNotExist:
        return JsonResponse({
            'error': 'Simulation not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])  # For testing; change to IsAuthenticated in production
def simulation_results(request, simulation_id):
    """Get the results of a completed simulation."""
    try:
        simulation = Simulation.objects.get(id=simulation_id)
        
        if simulation.status != 'completed':
            return JsonResponse({
                'error': 'Simulation not yet completed'
            }, status=400)
        
        # Use the actual saved results file if it exists
        if simulation.results_file:
            from .services import parse_simulation_results
            results = parse_simulation_results(simulation)
            return JsonResponse(results)
        
        # Fall back to mock results if no results file is available
        return JsonResponse({
            'summary': {
                'total_site_energy': 125.5,
                'energy_use_intensity': 45.8
            },
            'energy_use': {
                'Electricity': 75.2,
                'NaturalGas': 50.3
            },
            'zones': [
                {
                    'name': 'Zone 1',
                    'area': 120.5,
                    'volume': 361.5,
                    'peak_load': 5.2
                },
                {
                    'name': 'Zone 2',
                    'area': 85.3,
                    'volume': 255.9,
                    'peak_load': 3.8
                }
            ]
        })
        
    except Simulation.DoesNotExist:
        return JsonResponse({
            'error': 'Simulation not found'
        }, status=404)
    except Exception as e:
        import traceback
        print(f"ERROR in simulation_results view: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({
            'error': str(e)
        }, status=500)