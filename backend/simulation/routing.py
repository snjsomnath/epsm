from django.urls import re_path
from .consumers import SystemResourceConsumer

websocket_urlpatterns = [
    re_path(r'^ws/system-resources/?$', SystemResourceConsumer.as_asgi()),
]