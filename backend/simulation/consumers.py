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