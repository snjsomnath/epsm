from django.urls import path
from . import views

urlpatterns = [
    # Make sure this is the first endpoint for easier debugging
    path('system-resources/', views.system_resources, name='system-resources'),
    
    # New simulation endpoints
    path('run/', views.run_simulation, name='run_simulation'),
    path('<uuid:simulation_id>/status/', views.simulation_status, name='simulation_status'),
    path('<uuid:simulation_id>/results/', views.simulation_results, name='simulation_results'),
    path('<uuid:simulation_id>/parallel-results/', views.parallel_simulation_results, name='parallel_simulation_results'),
    path('<uuid:simulation_id>/download/', views.simulation_download, name='simulation_download'),

    # Existing endpoints
    path('parse/idf/', views.parse_idf, name='parse_idf'),
    path('parse/idf/test/', views.parse_idf_test, name='parse_idf_test'),
    path('components/add/', views.add_components, name='add_components'),
]