from django.db import migrations
import uuid

def load_construction_sets(apps, schema_editor):
    ConstructionSet = apps.get_model('database', 'ConstructionSet')
    construction_sets_data = [
        {
            'id': uuid.UUID('1c2c57d4-d4c4-4d5f-af43-86954de76aae'),
            'name': 'High Performance Set',
            'description': 'Energy efficient construction set for passive buildings',
            'wall_construction_id': uuid.UUID('a4c41564-1c09-4e6d-9095-19cd8bf64a21'),
            'roof_construction_id': uuid.UUID('90aea649-ab68-42d0-b872-45ed04c05b21'),
            'floor_construction_id': uuid.UUID('fb21aa60-710b-4936-ae23-50201f0f65bb'),
            'window_construction_id': uuid.UUID('2e9c7fce-6a34-4d77-9535-b7cfef22e61a'),
            'author_id': None,
            'created_at': '2025-05-25T14:56:06.655458+02:00',
        },
        {
            'id': uuid.UUID('993f7e5c-ab68-44aa-9199-af60251d5195'),
            'name': 'Standard Construction Set',
            'description': 'Basic construction set for typical buildings',
            'wall_construction_id': uuid.UUID('a4c41564-1c09-4e6d-9095-19cd8bf64a21'),
            'roof_construction_id': uuid.UUID('90aea649-ab68-42d0-b872-45ed04c05b21'),
            'floor_construction_id': uuid.UUID('fb21aa60-710b-4936-ae23-50201f0f65bb'),
            'window_construction_id': uuid.UUID('f0c2b05b-758f-49ce-97ba-2a0067c25fd2'),
            'author_id': None,
            'created_at': '2025-05-25T14:56:06.655458+02:00',
        },
        {
            'id': uuid.UUID('19b166f6-9746-4099-be02-e436ee6e297b'),
            'name': 'Budget Friendly Set',
            'description': 'Cost-effective construction set with moderate performance',
            'wall_construction_id': uuid.UUID('a4c41564-1c09-4e6d-9095-19cd8bf64a21'),
            'roof_construction_id': uuid.UUID('90aea649-ab68-42d0-b872-45ed04c05b21'),
            'floor_construction_id': None,
            'window_construction_id': uuid.UUID('f0c2b05b-758f-49ce-97ba-2a0067c25fd2'),
            'author_id': None,
            'created_at': '2025-05-25T14:56:06.655458+02:00',
        },
    ]
    for construction_set in construction_sets_data:
        ConstructionSet.objects.update_or_create(id=construction_set['id'], defaults=construction_set)

class Migration(migrations.Migration):
    dependencies = [
        ('database', '0007_seed_constructions'),
    ]
    operations = [
        migrations.RunPython(load_construction_sets),
    ]
