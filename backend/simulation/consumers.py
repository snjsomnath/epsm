import asyncio
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from .services import get_resource_utilisation

class SystemResourceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.keep_running = True
        asyncio.create_task(self.send_resource_updates())

    async def disconnect(self, close_code):
        self.keep_running = False

    async def send_resource_updates(self):
        while self.keep_running:
            data = get_resource_utilisation()
            await self.send(text_data=json.dumps(data))
            await asyncio.sleep(1)  # Send update every second