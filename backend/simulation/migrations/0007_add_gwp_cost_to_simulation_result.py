# Generated manually on 2025-10-05
# Adds GWP and cost calculation fields to SimulationResult

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('simulation', '0006_auto_20251001_1132'),
    ]

    operations = [
        migrations.AddField(
            model_name='simulationresult',
            name='gwp_total',
            field=models.FloatField(blank=True, null=True, help_text='Total embodied carbon in kg CO2e'),
        ),
        migrations.AddField(
            model_name='simulationresult',
            name='cost_total',
            field=models.FloatField(blank=True, null=True, help_text='Total construction cost in SEK'),
        ),
    ]
