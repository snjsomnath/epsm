from django.urls import path, include
from .views import SimulationListCreate, SimulationRetrieveUpdateDestroy, SimulationRun, SimulationStatus, SimulationResults

app_name = 'simulation'

urlpatterns = [
    path('', SimulationListCreate.as_view(), name='simulation-list-create'),
    path('<int:pk>/', SimulationRetrieveUpdateDestroy.as_view(), name='simulation-detail'),
    path('run/', SimulationRun.as_view(), name='simulation-run'),
    path('<int:pk>/status/', SimulationStatus.as_view(), name='simulation-status'),
    path('<int:pk>/results/', SimulationResults.as_view(), name='simulation-results'),
]