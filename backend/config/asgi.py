import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
import simulation.routing

# Add a print to confirm ASGI is loaded (for debugging)
print("ASGI application loaded. Make sure you are running with daphne/uvicorn and channels is installed.")

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": URLRouter(
        simulation.routing.websocket_urlpatterns
    ),
})