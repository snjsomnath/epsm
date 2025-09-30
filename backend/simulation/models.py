from django.db import models
from django.conf import settings
from django.contrib.auth.models import User
import uuid


class Simulation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Use Django's built-in User model instead of custom User
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    start_time = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True)
    file_count = models.IntegerField(default=0)  # Track how many files are being simulated
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Progress percentage 0-100. Updated by simulator as runs complete.
    progress = models.IntegerField(default=0)

    class Meta:
        db_table = 'simulation_runs'

    def __str__(self):
        return f"{self.name} - {self.status}"

class SimulationFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    simulation = models.ForeignKey(Simulation, on_delete=models.CASCADE, related_name='files', db_column='simulation_id')
    file_type = models.CharField(max_length=50)  # 'idf', 'epw', 'output', 'report'
    file_name = models.CharField(max_length=255, default='unknown_file')
    file_path = models.CharField(max_length=500, default='')
    file_size = models.IntegerField(null=True, blank=True)
    original_name = models.CharField(max_length=255, default='', blank=True)  # Store original filename
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    class Meta:
        db_table = 'simulation_files'

    def __str__(self):
        return f"{self.file_type} file for {self.simulation.name}"

class SimulationResult(models.Model):
    """Store individual simulation results replacing SQLite files

    Note: store the owning Simulation's UUID in `simulation_id` (UUIDField) rather
    than a cross-database ForeignKey so results can live in a separate Postgres
    database without cross-db FK enforcement issues.
    """
    # Store simulation UUID explicitly to avoid cross-database FK constraints
    # Make nullable to allow adding this field via migrations without a one-off default
    simulation_id = models.UUIDField(db_index=True, null=True, blank=True)
    run_id = models.CharField(max_length=100, db_index=True)
    file_name = models.CharField(max_length=255)
    building_name = models.CharField(max_length=255, blank=True)
    
    # Energy metrics
    total_energy_use = models.FloatField(null=True, blank=True)  # kWh/m²
    heating_demand = models.FloatField(null=True, blank=True)    # kWh/m²
    cooling_demand = models.FloatField(null=True, blank=True)    # kWh/m²
    lighting_demand = models.FloatField(null=True, blank=True)   # kWh/m²
    equipment_demand = models.FloatField(null=True, blank=True)  # kWh/m²
    
    # Building metrics
    total_area = models.FloatField(null=True, blank=True)        # m²
    run_time = models.FloatField(null=True, blank=True)          # seconds
    
    # Status and metadata
    status = models.CharField(max_length=20, default='success')
    error_message = models.TextField(blank=True)
    raw_json = models.JSONField(null=True, blank=True)  # Store complete results
    
    # Variant tracking for parametric studies
    variant_idx = models.IntegerField(null=True, blank=True)
    idf_idx = models.IntegerField(null=True, blank=True)
    construction_set_data = models.JSONField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    # Reference the owning user by id (nullable) rather than a cross-db FK
    user_id = models.IntegerField(null=True, blank=True, db_index=True)
    
    class Meta:
        db_table = 'simulation_results'
        indexes = [
            models.Index(fields=['simulation_id', 'run_id']),
            models.Index(fields=['variant_idx', 'idf_idx']),
            models.Index(fields=['user_id']),
        ]
    
    def __str__(self):
        return f"Result for {self.file_name} - simulation {self.simulation_id}"

class SimulationZone(models.Model):
    """Store zone-specific results"""
    simulation_result = models.ForeignKey(SimulationResult, on_delete=models.CASCADE, related_name='zones')
    zone_name = models.CharField(max_length=255)
    area = models.FloatField(null=True, blank=True)      # m²
    volume = models.FloatField(null=True, blank=True)    # m³
    
    class Meta:
        db_table = 'simulation_zones'
    
    def __str__(self):
        return f"Zone {self.zone_name} - {self.simulation_result.file_name}"

class SimulationEnergyUse(models.Model):
    """Store detailed energy use breakdown by end use"""
    simulation_result = models.ForeignKey(SimulationResult, on_delete=models.CASCADE, related_name='energy_uses')
    end_use = models.CharField(max_length=100)  # Heating, Cooling, Lighting, etc.
    electricity = models.FloatField(default=0.0)       # kWh
    district_heating = models.FloatField(default=0.0)  # kWh
    total = models.FloatField(default=0.0)              # kWh
    
    class Meta:
        db_table = 'simulation_energy_uses'
        unique_together = ['simulation_result', 'end_use']
    
    def __str__(self):
        return f"{self.end_use}: {self.total} kWh - {self.simulation_result.file_name}"


class SimulationHourlyTimeseries(models.Model):
    """Optional hourly timeseries for a simulation result (e.g., 8760 values)

    Stored as a JSON array of numeric values. Kept optional to avoid forcing
    large payloads when not required.
    """
    simulation_result = models.ForeignKey(SimulationResult, on_delete=models.CASCADE, related_name='hourly_timeseries')
    has_hourly = models.BooleanField(default=False, db_index=True)
    # Expect a list/array of floats length ~8760 when present
    hourly_values = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'simulation_hourly_timeseries'

    def __str__(self):
        return f"Hourly timeseries for {self.simulation_result.file_name} (has_hourly={self.has_hourly})"