from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('simulation', '0004_create_results_tables'),
    ]

    operations = [
        migrations.AddField(
            model_name='simulationresult',
            name='user_id',
            field=models.IntegerField(blank=True, db_index=True, null=True),
        ),
        migrations.CreateModel(
            name='SimulationHourlyTimeseries',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('has_hourly', models.BooleanField(default=False, db_index=True)),
                ('hourly_values', models.JSONField(null=True, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('simulation_result', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='hourly_timeseries', to='simulation.simulationresult')),
            ],
            options={
                'db_table': 'simulation_hourly_timeseries',
            },
        ),
    ]
