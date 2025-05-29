from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
import simulation.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter(
        simulation.routing.websocket_urlpatterns
    ),
})
