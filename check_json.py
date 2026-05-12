import asyncio
import json
import os
import websockets
from dotenv import load_dotenv

async def check():
    load_dotenv("backend/.env")
    api_key = os.getenv("AIS_API_KEY")
    uri = "wss://stream.aisstream.io/v0/stream"
    async with websockets.connect(uri) as websocket:
        msg = {"APIKey": api_key, "BoundingBoxes": [[[-90, -180], [90, 180]]]}
        await websocket.send(json.dumps(msg))
        message = await asyncio.wait_for(websocket.recv(), timeout=20.0)
        data = json.loads(message)
        print("KEYS IN MetaData:", data["MetaData"].keys())
        print("SAMPLE MetaData:", json.dumps(data["MetaData"], indent=2))

if __name__ == "__main__":
    asyncio.run(check())
