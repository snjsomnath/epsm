import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class SystemResourceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        # Optionally send a hello message for debugging
        await self.send(text_data=json.dumps({"message": "connected"}))
        self.keep_running = True
        self.send_task = asyncio.create_task(self.send_resource_updates())

    async def disconnect(self, close_code):
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
        # Import here to avoid AppRegistryNotReady error
        from .services import get_resource_utilisation
        try:
            while self.keep_running:
                data = get_resource_utilisation()
                await self.send(text_data=json.dumps(data))
                await asyncio.sleep(1)  # Send update every second
        except asyncio.CancelledError:
            pass
        except Exception as e:
            # Optionally log the error
            await self.close()