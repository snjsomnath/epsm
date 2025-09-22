from django.urls import path, include
from .views import SimulationListCreate, SimulationRetrieveUpdateDestroy, SimulationRun, SimulationStatus, SimulationResults

app_name = 'simulation'

urlpatterns = [
    path('', SimulationListCreate.as_view(), name='simulation-list-create'),
    path('<uuid:pk>/', SimulationRetrieveUpdateDestroy.as_view(), name='simulation-detail'),
    path('run/', SimulationRun.as_view(), name='simulation-run'),
    path('<uuid:pk>/status/', SimulationStatus.as_view(), name='simulation-status'),
    path('<uuid:pk>/results/', SimulationResults.as_view(), name='simulation-results'),
]