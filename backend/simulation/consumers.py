import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class SystemResourceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        print(f"New WebSocket connection from {self.scope.get('client', 'unknown')}")
        await self.accept()
        # Send a simple initial message that requires no dependencies
        await self.send(text_data=json.dumps({"message": "connected"}))
        self.keep_running = True
        self.send_task = asyncio.create_task(self.send_resource_updates())

    async def disconnect(self, close_code):
        print(f"WebSocket disconnecting, code: {close_code}")
        self.keep_running = False
        if hasattr(self, "send_task"):
            self.send_task.cancel()
            try:
                await self.send_task
            except asyncio.CancelledError:
                pass

    async def receive(self, text_data=None, bytes_data=None):
        # Optionally handle incoming messages
        pass

    async def send_resource_updates(self):
        try:
            # Import here to avoid AppRegistryNotReady error
            from .services import get_resource_utilisation
            
            while self.keep_running:
                try:
                    data = get_resource_utilisation()
                    await self.send(text_data=json.dumps(data))
                except Exception as e:
                    print(f"Error getting resource data: {e}")
                    # Send minimal data if full data collection fails

                    #await self.send(text_data=json.dumps({
                    #    "cpu": {"usage_percent": 0},
                    #    "memory": {"usage_percent": 0}
                    #}))

                await asyncio.sleep(1)  # Send update every second
        except asyncio.CancelledError:
            # Expected on disconnect, no need to do anything
            pass
        except Exception as e:
            print(f"Unexpected error in send_resource_updates: {e}")
            await self.close()


class SimulationProgressConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer that subscribes clients to a per-simulation progress group.

    Clients should connect to /ws/simulation-progress/<simulation_id>/ and will
    receive JSON messages of the form {"progress": 42, "status": "running"}
    as the backend writes progress updates to the group's channel_layer.
    """
    async def connect(self):
        # Expect simulation_id in the URL route kwargs
        self.simulation_id = self.scope.get('url_route', {}).get('kwargs', {}).get('simulation_id')
        if not self.simulation_id:
            await self.close()
            return

        self.group_name = f"simulation_progress_{self.simulation_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        except Exception:
            pass

    async def receive(self, text_data=None, bytes_data=None):
        # No incoming messages expected; ignore or optionally implement ping
        pass

    async def progress_update(self, event):
        # Event handler: forward event payload to client as JSON
        payload = event.get('payload') or {}
        await self.send(text_data=json.dumps(payload))