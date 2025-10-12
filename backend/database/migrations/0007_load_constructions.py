from django.db import migrations
import uuid

def load_constructions(apps, schema_editor):
    Construction = apps.get_model('database', 'Construction')
    constructions_data = [
        {
            'id': uuid.UUID('a4c41564-1c09-4e6d-9095-19cd8bf64a21'),
            'name': 'Brick Wall with Insulation',
            'element_type': 'wall',
            'is_window': False,
            'u_value_w_m2k': 0.35,
            'gwp_kgco2e_per_m2': 95.5,
            'cost_sek_per_m2': 620,
            'author_id': None,
            'created_at': '2025-05-25T14:56:06.655458+02:00',
        },
        {
            'id': uuid.UUID('fb21aa60-710b-4936-ae23-50201f0f65bb'),
            'name': 'Concrete Floor',
            'element_type': 'floor',
            'is_window': False,
            'u_value_w_m2k': 0.4,
            'gwp_kgco2e_per_m2': 125.8,
            'cost_sek_per_m2': 480,
            'author_id': None,
            'created_at': '2025-05-25T14:56:06.655458+02:00',
        },
        {
            'id': uuid.UUID('90aea649-ab68-42d0-b872-45ed04c05b21'),
            'name': 'Insulated Roof',
            'element_type': 'roof',
            'is_window': False,
            'u_value_w_m2k': 0.25,
            'gwp_kgco2e_per_m2': 65.3,
            'cost_sek_per_m2': 550,
            'author_id': None,
            'created_at': '2025-05-25T14:56:06.655458+02:00',
        },
        {
            'id': uuid.UUID('f0c2b05b-758f-49ce-97ba-2a0067c25fd2'),
            'name': 'Double Glazed Window',
            'element_type': 'window',
            'is_window': True,
            'u_value_w_m2k': 1.8,
            'gwp_kgco2e_per_m2': 55.2,
            'cost_sek_per_m2': 1200,
            'author_id': None,
            'created_at': '2025-05-25T14:56:06.655458+02:00',
        },
        {
            'id': uuid.UUID('2e9c7fce-6a34-4d77-9535-b7cfef22e61a'),
            'name': 'Triple Glazed Low-E Window',
            'element_type': 'window',
            'is_window': True,
            'u_value_w_m2k': 0.8,
            'gwp_kgco2e_per_m2': 85.6,
            'cost_sek_per_m2': 2200,
            'author_id': None,
            'created_at': '2025-05-25T14:56:06.655458+02:00',
        },
    ]
    for construction in constructions_data:
        Construction.objects.update_or_create(id=construction['id'], defaults=construction)

class Migration(migrations.Migration):
    dependencies = [
        ('database', '0006_load_window_glazing'),
    ]
    operations = [
        migrations.RunPython(load_constructions),
    ]
