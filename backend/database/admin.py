from django.contrib import admin
from .models import (
    Author, Material, WindowGlazing, Construction,
    Layer, ConstructionSet, UnitDescription
)

@admin.register(Author)
class AuthorAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'email')
    search_fields = ('first_name', 'last_name', 'email')

@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('name', 'roughness', 'thickness_m', 'conductivity_w_mk', 'author')
    list_filter = ('roughness', 'wall_allowed', 'roof_allowed', 'floor_allowed')
    search_fields = ('name', 'source')

@admin.register(WindowGlazing)
class WindowGlazingAdmin(admin.ModelAdmin):
    list_display = ('name', 'thickness_m', 'conductivity_w_mk', 'solar_transmittance')
    list_filter = ('optical_data_type', 'solar_diffusing')
    search_fields = ('name', 'source')

@admin.register(Construction)
class ConstructionAdmin(admin.ModelAdmin):
    list_display = ('name', 'element_type', 'is_window', 'u_value_w_m2k')
    list_filter = ('element_type', 'is_window')
    search_fields = ('name', 'source')

@admin.register(Layer)
class LayerAdmin(admin.ModelAdmin):
    list_display = ('construction', 'material', 'window', 'layer_order')
    list_filter = ('is_glazing_layer',)

@admin.register(ConstructionSet)
class ConstructionSetAdmin(admin.ModelAdmin):
    list_display = ('name', 'wall_construction', 'roof_construction', 'floor_construction')
    search_fields = ('name', 'description')

@admin.register(UnitDescription)
class UnitDescriptionAdmin(admin.ModelAdmin):
    list_display = ('field', 'unit', 'description')
    search_fields = ('field', 'description')