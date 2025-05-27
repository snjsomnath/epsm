import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.uploadedfile import UploadedFile
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from .idf_parser import IdfParser
from database.models import Material, Construction

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