from django.urls import re_path
from .consumers import SystemResourceConsumer, SimulationProgressConsumer

websocket_urlpatterns = [
    re_path(r'^ws/system-resources/?$', SystemResourceConsumer.as_asgi()),
    re_path(r'^ws/simulation-progress/(?P<simulation_id>[0-9a-fA-F-]+)/?$', SimulationProgressConsumer.as_asgi()),
]