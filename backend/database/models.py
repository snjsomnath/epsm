from django.db import models
import uuid

class Author(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(null=True, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    class Meta:
        db_table = 'authors'
        managed = True  # Let Django manage this table

class Material(models.Model):
    ROUGHNESS_CHOICES = [
        ('Smooth', 'Smooth'),
        ('MediumSmooth', 'MediumSmooth'),
        ('MediumRough', 'MediumRough'),
        ('Rough', 'Rough'),
        ('VeryRough', 'VeryRough'),
    ]
    roughness = models.CharField(max_length=20, choices=ROUGHNESS_CHOICES, null=True, blank=True)
    density_kg_m3 = models.FloatField(null=True, blank=True)
    specific_heat_j_kgk = models.FloatField(null=True, blank=True)
    thermal_absorptance = models.FloatField(null=True, blank=True)
    solar_absorptance = models.FloatField(null=True, blank=True)
    visible_absorptance = models.FloatField(null=True, blank=True)
    wall_allowed = models.BooleanField(default=False)
    roof_allowed = models.BooleanField(default=False)
    floor_allowed = models.BooleanField(default=False)
    window_layer_allowed = models.BooleanField(default=False)
    author = models.ForeignKey('Author', on_delete=models.SET_NULL, null=True, blank=True)
    date_created = models.DateTimeField(null=True, blank=True)
    date_modified = models.DateTimeField(null=True, blank=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    thickness_m = models.FloatField(null=True, blank=True)
    conductivity_w_mk = models.FloatField(default=0.9, null=True, blank=True)
    solar_transmittance = models.FloatField(null=True, blank=True)
    front_solar_reflectance = models.FloatField(null=True, blank=True)
    back_solar_reflectance = models.FloatField(null=True, blank=True)
    visible_transmittance = models.FloatField(null=True, blank=True)
    front_visible_reflectance = models.FloatField(null=True, blank=True)
    back_visible_reflectance = models.FloatField(null=True, blank=True)
    infrared_transmittance = models.FloatField(default=0.0, null=True, blank=True)
    front_ir_emissivity = models.FloatField(default=0.84, null=True, blank=True)
    back_ir_emissivity = models.FloatField(default=0.84, null=True, blank=True)
    dirt_correction_factor = models.FloatField(default=1.0, null=True, blank=True)
    solar_diffusing = models.CharField(max_length=3, choices=[('Yes', 'Yes'), ('No', 'No')], default='No', null=True, blank=True)
    youngs_modulus_pa = models.FloatField(default=7.2e10, null=True, blank=True)
    poisson_ratio = models.FloatField(default=0.22, null=True, blank=True)
    angle_trans_table = models.TextField(null=True, blank=True)
    angle_front_refl_table = models.TextField(null=True, blank=True)
    angle_back_refl_table = models.TextField(null=True, blank=True)
    gwp_kgco2e_per_m2 = models.FloatField(null=True, blank=True)
    cost_sek_per_m2 = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    source = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'materials'
        managed = True  # Let Django manage this table

class WindowGlazing(models.Model):
    OPTICAL_DATA_CHOICES = [
        ('SpectralAverage', 'Spectral Average'),
        ('Spectral', 'Spectral'),
        ('BSDF', 'BSDF'),
        ('SpectralAndAngle', 'Spectral and Angle'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    optical_data_type = models.CharField(max_length=20, choices=OPTICAL_DATA_CHOICES, null=True, blank=True)
    spectral_data_set = models.CharField(max_length=255, null=True, blank=True)
    thickness_m = models.FloatField(null=True, blank=True)
    conductivity_w_mk = models.FloatField(default=0.9, null=True, blank=True)
    solar_transmittance = models.FloatField(null=True, blank=True)
    front_solar_reflectance = models.FloatField(null=True, blank=True)
    back_solar_reflectance = models.FloatField(null=True, blank=True)
    visible_transmittance = models.FloatField(null=True, blank=True)
    front_visible_reflectance = models.FloatField(null=True, blank=True)
    back_visible_reflectance = models.FloatField(null=True, blank=True)
    infrared_transmittance = models.FloatField(default=0.0, null=True, blank=True)
    front_ir_emissivity = models.FloatField(default=0.84, null=True, blank=True)
    back_ir_emissivity = models.FloatField(default=0.84, null=True, blank=True)
    dirt_correction_factor = models.FloatField(default=1.0, null=True, blank=True)
    solar_diffusing = models.CharField(max_length=3, choices=[('Yes', 'Yes'), ('No', 'No')], default='No', null=True, blank=True)
    youngs_modulus_pa = models.FloatField(default=7.2e10, null=True, blank=True)
    poisson_ratio = models.FloatField(default=0.22, null=True, blank=True)
    angle_trans_table = models.TextField(null=True, blank=True)
    angle_front_refl_table = models.TextField(null=True, blank=True)
    angle_back_refl_table = models.TextField(null=True, blank=True)
    gwp_kgco2e_per_m2 = models.FloatField(null=True, blank=True)
    cost_sek_per_m2 = models.FloatField(null=True, blank=True)
    author = models.ForeignKey(Author, on_delete=models.SET_NULL, null=True)
    date_created = models.DateField(auto_now_add=True)
    date_modified = models.DateField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    source = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'window_glazing'
        managed = True  # Let Django manage this table

class Construction(models.Model):
    ELEMENT_CHOICES = [
        ('wall', 'Wall'),
        ('roof', 'Roof'),
        ('floor', 'Floor'),
        ('ceiling', 'Ceiling'),
        ('window', 'Window'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    element_type = models.CharField(max_length=20, choices=ELEMENT_CHOICES)
    is_window = models.BooleanField(default=False)
    
    u_value_w_m2k = models.FloatField()
    gwp_kgco2e_per_m2 = models.FloatField()
    cost_sek_per_m2 = models.FloatField()
    
    author = models.ForeignKey(Author, on_delete=models.SET_NULL, null=True)
    date_created = models.DateField(auto_now_add=True)
    date_modified = models.DateField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    source = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'constructions'
        managed = True  # Let Django manage this table

class Layer(models.Model):
    construction = models.ForeignKey(Construction, on_delete=models.CASCADE, related_name='layers')
    material = models.ForeignKey(Material, on_delete=models.CASCADE, null=True)
    window = models.ForeignKey(WindowGlazing, on_delete=models.CASCADE, null=True)
    layer_order = models.IntegerField()
    is_glazing_layer = models.BooleanField(default=False)

    class Meta:
        db_table = 'layers'
        unique_together = ['construction', 'layer_order']
        ordering = ['layer_order']

class ConstructionSet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    wall_construction = models.ForeignKey(Construction, on_delete=models.SET_NULL, null=True, related_name='wall_sets')
    roof_construction = models.ForeignKey(Construction, on_delete=models.SET_NULL, null=True, related_name='roof_sets')
    floor_construction = models.ForeignKey(Construction, on_delete=models.SET_NULL, null=True, related_name='floor_sets')
    window_construction = models.ForeignKey(Construction, on_delete=models.SET_NULL, null=True, related_name='window_sets')
    description = models.TextField(null=True, blank=True)
    
    author = models.ForeignKey(Author, on_delete=models.SET_NULL, null=True)
    date_created = models.DateField(auto_now_add=True)
    date_modified = models.DateField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    source = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'construction_sets'
        managed = True  # Let Django manage this table

class UnitDescription(models.Model):
    field = models.CharField(max_length=50, primary_key=True)
    unit = models.CharField(max_length=20)
    description = models.TextField()

    class Meta:
        db_table = 'unit_descriptions'