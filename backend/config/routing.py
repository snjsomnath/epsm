from channels.routing import ProtocolTypeRouter, URLRouter
import simulation.routing

application = ProtocolTypeRouter({
    "websocket": URLRouter(
        simulation.routing.websocket_urlpatterns
    ),
})
