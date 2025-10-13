from django.db import migrations
import uuid

def load_example_scenarios(apps, schema_editor):
    """
    Seed two example scenarios to demonstrate the system:
    1. CS (Combinatorial Scenario) - 23 simulations
    2. SS (Stacked Scenario) - 3 simulations
    """
    Scenario = apps.get_model('database', 'Scenario')
    ScenarioConstruction = apps.get_model('database', 'ScenarioConstruction')
    Construction = apps.get_model('database', 'Construction')
    
    # Construction IDs from 0007_seed_constructions
    brick_wall_id = uuid.UUID('a4c41564-1c09-4e6d-9095-19cd8bf64a21')
    concrete_floor_id = uuid.UUID('fb21aa60-710b-4936-ae23-50201f0f65bb')
    insulated_roof_id = uuid.UUID('90aea649-ab68-42d0-b872-45ed04c05b21')
    double_glazed_window_id = uuid.UUID('f0c2b05b-758f-49ce-97ba-2a0067c25fd2')
    triple_glazed_window_id = uuid.UUID('2e9c7fce-6a34-4d77-9535-b7cfef22e61a')
    
    # Define scenarios
    scenarios_data = [
        {
            'id': uuid.UUID('ac377804-0c24-4803-8107-b7d05e82cbd3'),
            'name': 'CS',
            'description': 'Combinatorial Scenario',
            'total_simulations': 23,
            'constructions': [
                {'construction_id': brick_wall_id, 'element_type': 'wall'},
                {'construction_id': insulated_roof_id, 'element_type': 'roof'},
                {'construction_id': concrete_floor_id, 'element_type': 'floor'},
                {'construction_id': triple_glazed_window_id, 'element_type': 'window'},
                {'construction_id': double_glazed_window_id, 'element_type': 'window'},
            ]
        },
        {
            'id': uuid.UUID('dec8cefc-bd64-4a40-a429-8a32528fffb6'),
            'name': 'SS',
            'description': 'Stacked Scenario',
            'total_simulations': 3,
            'constructions': [
                {'construction_id': brick_wall_id, 'element_type': 'wall'},
                {'construction_id': insulated_roof_id, 'element_type': 'roof'},
                {'construction_id': concrete_floor_id, 'element_type': 'floor'},
                {'construction_id': triple_glazed_window_id, 'element_type': 'window'},
                {'construction_id': double_glazed_window_id, 'element_type': 'window'},
            ]
        },
    ]
    
    # Create scenarios and their construction associations
    for scenario_data in scenarios_data:
        scenario_id = scenario_data['id']
        name = scenario_data['name']
        description = scenario_data['description']
        total_simulations = scenario_data['total_simulations']
        constructions = scenario_data['constructions']
        
        # Create or update the scenario
        scenario, created = Scenario.objects.update_or_create(
            id=scenario_id,
            defaults={
                'name': name,
                'description': description,
                'total_simulations': total_simulations,
                'author_id': None,
            }
        )
        
        # Delete existing scenario constructions for idempotency
        ScenarioConstruction.objects.filter(scenario=scenario).delete()
        
        # Create scenario construction associations
        for construction_data in constructions:
            construction_id = construction_data['construction_id']
            element_type = construction_data['element_type']
            
            try:
                construction = Construction.objects.get(id=construction_id)
                ScenarioConstruction.objects.create(
                    scenario=scenario,
                    construction=construction,
                    element_type=element_type,
                )
            except Construction.DoesNotExist:
                print(f"Warning: Construction {construction_id} not found for scenario {name}")

class Migration(migrations.Migration):
    dependencies = [
        ('database', '0009_seed_construction_layers'),
    ]
    operations = [
        migrations.RunPython(load_example_scenarios),
    ]
