from django.urls import path
from . import views

urlpatterns = [
    # New simulation endpoints
    path('run/', views.run_simulation, name='run_simulation'),
    path('<int:simulation_id>/status/', views.simulation_status, name='simulation_status'),
    path('<int:simulation_id>/results/', views.simulation_results, name='simulation_results'),

    # Existing endpoints
    path('parse/idf/', views.parse_idf, name='parse_idf'),
    path('components/add/', views.add_components, name='add_components'),
]