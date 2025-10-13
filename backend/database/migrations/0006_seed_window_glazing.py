from django.db import migrations
import uuid

def load_window_glazing(apps, schema_editor):
    WindowGlazing = apps.get_model('database', 'WindowGlazing')
    window_glazing_data = [
        {
            'id': uuid.UUID('48216371-51d2-4277-a6a9-e3821c98fcd3'),
            'name': 'Clear 3mm',
            'thickness_m': 0.003,
            'conductivity_w_mk': 0.9,
            'solar_transmittance': 0.837,
            'visible_transmittance': 0.898,
            'infrared_transmittance': 0,
            'front_ir_emissivity': 0.84,
            'back_ir_emissivity': 0.84,
            'gwp_kgco2e_per_m2': 25.5,
            'cost_sek_per_m2': 350,
            'author_id': None,
            'created_at': '2025-05-25T12:40:12.901990+02:00',
        },
        {
            'id': uuid.UUID('a515212d-b18b-4944-992a-c4d70a13e6a6'),
            'name': 'Low-E 6mm',
            'thickness_m': 0.006,
            'conductivity_w_mk': 0.9,
            'solar_transmittance': 0.42,
            'visible_transmittance': 0.71,
            'infrared_transmittance': 0,
            'front_ir_emissivity': 0.84,
            'back_ir_emissivity': 0.84,
            'gwp_kgco2e_per_m2': 35.8,
            'cost_sek_per_m2': 620,
            'author_id': None,
            'created_at': '2025-05-25T12:40:12.901990+02:00',
        },
        {
            'id': uuid.UUID('c3e031ee-d9f3-4069-a712-d241ebeedfc8'),
            'name': 'Triple Low-E 4mm',
            'thickness_m': 0.004,
            'conductivity_w_mk': 0.9,
            'solar_transmittance': 0.33,
            'visible_transmittance': 0.65,
            'infrared_transmittance': 0,
            'front_ir_emissivity': 0.84,
            'back_ir_emissivity': 0.84,
            'gwp_kgco2e_per_m2': 42.3,
            'cost_sek_per_m2': 780,
            'author_id': None,
            'created_at': '2025-05-25T14:56:06.655458+02:00',
        },
    ]
    for glazing in window_glazing_data:
        WindowGlazing.objects.update_or_create(id=glazing['id'], defaults=glazing)

class Migration(migrations.Migration):
    dependencies = [
        ('database', '0005_create_scenario_tables'),
    ]
    operations = [
        migrations.RunPython(load_window_glazing),
    ]
