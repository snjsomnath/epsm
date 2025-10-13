from django.db import migrations
import uuid

def load_construction_layers(apps, schema_editor):
    """
    Seed realistic layer compositions for the 5 constructions.
    Each construction is composed of materials/glazing in a specific order.
    """
    Construction = apps.get_model('database', 'Construction')
    Material = apps.get_model('database', 'Material')
    WindowGlazing = apps.get_model('database', 'WindowGlazing')
    Layer = apps.get_model('database', 'Layer')
    
    # Material IDs from 0004_seed_initial_materials
    brick_id = uuid.UUID('c4cc73d9-ff3e-4ef4-b5b5-cf4eb517c1ab')
    insulation_id = uuid.UUID('482ea462-0e92-4a97-aad4-a4af99dfc9df')
    concrete_id = uuid.UUID('647d1be6-7899-4ac5-8b4c-05551db16b6d')
    gypsum_id = uuid.UUID('c16e762e-08b4-4221-84d8-5def42b6e2c7')
    wood_siding_id = uuid.UUID('9a29b2a4-8eba-4c86-9dbd-829014c09765')
    
    # WindowGlazing IDs from 0006_seed_window_glazing
    clear_3mm_id = uuid.UUID('48216371-51d2-4277-a6a9-e3821c98fcd3')
    triple_lowe_id = uuid.UUID('c3e031ee-d9f3-4069-a712-d241ebeedfc8')
    
    # Construction IDs from 0007_seed_constructions
    brick_wall_id = uuid.UUID('a4c41564-1c09-4e6d-9095-19cd8bf64a21')
    concrete_floor_id = uuid.UUID('fb21aa60-710b-4936-ae23-50201f0f65bb')
    insulated_roof_id = uuid.UUID('90aea649-ab68-42d0-b872-45ed04c05b21')
    double_glazed_window_id = uuid.UUID('f0c2b05b-758f-49ce-97ba-2a0067c25fd2')
    triple_glazed_window_id = uuid.UUID('2e9c7fce-6a34-4d77-9535-b7cfef22e61a')
    
    # Define layer compositions (outside to inside order)
    layer_compositions = [
        # Brick Wall with Insulation: Brick → Insulation → Gypsum Board
        {
            'construction_id': brick_wall_id,
            'layers': [
                {'order': 1, 'material_id': brick_id, 'is_glazing': False},
                {'order': 2, 'material_id': insulation_id, 'is_glazing': False},
                {'order': 3, 'material_id': gypsum_id, 'is_glazing': False},
            ]
        },
        # Concrete Floor: Concrete Block → Insulation
        {
            'construction_id': concrete_floor_id,
            'layers': [
                {'order': 1, 'material_id': concrete_id, 'is_glazing': False},
                {'order': 2, 'material_id': insulation_id, 'is_glazing': False},
            ]
        },
        # Insulated Roof: Wood Siding → Insulation → Gypsum Board
        {
            'construction_id': insulated_roof_id,
            'layers': [
                {'order': 1, 'material_id': wood_siding_id, 'is_glazing': False},
                {'order': 2, 'material_id': insulation_id, 'is_glazing': False},
                {'order': 3, 'material_id': gypsum_id, 'is_glazing': False},
            ]
        },
        # Double Glazed Window: Clear 3mm glazing
        {
            'construction_id': double_glazed_window_id,
            'layers': [
                {'order': 1, 'glazing_id': clear_3mm_id, 'is_glazing': True},
            ]
        },
        # Triple Glazed Low-E Window: Triple Low-E 4mm glazing
        {
            'construction_id': triple_glazed_window_id,
            'layers': [
                {'order': 1, 'glazing_id': triple_lowe_id, 'is_glazing': True},
            ]
        },
    ]
    
    # Create layers for each construction
    for composition in layer_compositions:
        construction_id = composition['construction_id']
        construction = Construction.objects.get(id=construction_id)
        
        for layer_data in composition['layers']:
            layer_order = layer_data['order']
            is_glazing = layer_data['is_glazing']
            
            if is_glazing:
                # Window glazing layer
                glazing_id = layer_data['glazing_id']
                window_glazing = WindowGlazing.objects.get(id=glazing_id)
                Layer.objects.update_or_create(
                    construction=construction,
                    layer_order=layer_order,
                    defaults={
                        'material': None,
                        'window': window_glazing,
                        'is_glazing_layer': True,
                    }
                )
            else:
                # Material layer
                material_id = layer_data['material_id']
                material = Material.objects.get(id=material_id)
                Layer.objects.update_or_create(
                    construction=construction,
                    layer_order=layer_order,
                    defaults={
                        'material': material,
                        'window': None,
                        'is_glazing_layer': False,
                    }
                )

class Migration(migrations.Migration):
    dependencies = [
        ('database', '0008_seed_construction_sets'),
    ]
    operations = [
        migrations.RunPython(load_construction_layers),
    ]
