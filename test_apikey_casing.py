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
        # TEST Apikey (small p)
        msg = {
            "Apikey": api_key,
            "BoundingBoxes": [[[6.0, 65.0], [25.0, 98.0]]],
            "FilterMessageTypes": ["PositionReport"]
        }
        print(f"Testing Apikey: {json.dumps(msg)}")
        await websocket.send(json.dumps(msg))
        try:
            message = await asyncio.wait_for(websocket.recv(), timeout=20.0)
            print("SUCCESS with Apikey!")
        except:
            print("FAILED with Apikey.")

if __name__ == "__main__":
    asyncio.run(check())
