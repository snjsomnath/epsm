from django.db import migrations, models


class Migration(migrations.Migration):

    initial = False

    dependencies = [
        ('simulation', '0003_remove_simulationresult_simulation__simulat_55e4dc_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='SimulationResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('simulation_id', models.UUIDField(blank=True, db_index=True, null=True)),
                ('run_id', models.CharField(max_length=100, db_index=True)),
                ('file_name', models.CharField(max_length=255)),
                ('building_name', models.CharField(max_length=255, blank=True)),
                ('total_energy_use', models.FloatField(null=True, blank=True)),
                ('heating_demand', models.FloatField(null=True, blank=True)),
                ('cooling_demand', models.FloatField(null=True, blank=True)),
                ('lighting_demand', models.FloatField(null=True, blank=True)),
                ('equipment_demand', models.FloatField(null=True, blank=True)),
                ('total_area', models.FloatField(null=True, blank=True)),
                ('run_time', models.FloatField(null=True, blank=True)),
                ('status', models.CharField(default='success', max_length=20)),
                ('error_message', models.TextField(blank=True)),
                ('raw_json', models.JSONField(null=True, blank=True)),
                ('variant_idx', models.IntegerField(null=True, blank=True)),
                ('idf_idx', models.IntegerField(null=True, blank=True)),
                ('construction_set_data', models.JSONField(null=True, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'simulation_results',
            },
        ),
        migrations.CreateModel(
            name='SimulationZone',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('zone_name', models.CharField(max_length=255)),
                ('area', models.FloatField(null=True, blank=True)),
                ('volume', models.FloatField(null=True, blank=True)),
                ('simulation_result', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='zones', to='simulation.simulationresult')),
            ],
            options={
                'db_table': 'simulation_zones',
            },
        ),
        migrations.CreateModel(
            name='SimulationEnergyUse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('end_use', models.CharField(max_length=100)),
                ('electricity', models.FloatField(default=0.0)),
                ('district_heating', models.FloatField(default=0.0)),
                ('total', models.FloatField(default=0.0)),
                ('simulation_result', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='energy_uses', to='simulation.simulationresult')),
            ],
            options={
                'db_table': 'simulation_energy_uses',
            },
        ),
        migrations.AddIndex(
            model_name='simulationresult',
            index=models.Index(fields=['simulation_id', 'run_id'], name='simulation__simulat_55e4dc_idx'),
        ),
        migrations.AddIndex(
            model_name='simulationresult',
            index=models.Index(fields=['variant_idx', 'idf_idx'], name='simulation__variant_707f67_idx'),
        ),
        migrations.AlterUniqueTogether(
            name='simulationenergyuse',
            unique_together={('simulation_result', 'end_use')},
        ),
    ]
