"""
URL configuration for geojson_processor app
"""

from django.urls import path
from . import views

urlpatterns = [
    path('process-geojson/', views.process_geojson, name='process_geojson'),
    path('health/', views.health_check, name='geojson_health'),
]
