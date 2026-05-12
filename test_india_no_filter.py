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
        # TEST India Box [Lat, Lon] WITHOUT filters
        msg = {
            "APIKey": api_key,
            "BoundingBoxes": [[[6.0, 65.0], [25.0, 98.0]]]
        }
        await websocket.send(json.dumps(msg))
        try:
            message = await asyncio.wait_for(websocket.recv(), timeout=20.0)
            print("SUCCESS with India Box [Lat, Lon], No Filters!")
            print(message[:200])
        except:
            print("FAILED with India Box [Lat, Lon], No Filters.")

        # TEST India Box [Lon, Lat] WITHOUT filters
        msg = {
            "APIKey": api_key,
            "BoundingBoxes": [[[65.0, 6.0], [98.0, 25.0]]]
        }
        await websocket.send(json.dumps(msg))
        try:
            message = await asyncio.wait_for(websocket.recv(), timeout=20.0)
            print("\nSUCCESS with India Box [Lon, Lat], No Filters!")
            print(message[:200])
        except:
            print("FAILED with India Box [Lon, Lat], No Filters.")

if __name__ == "__main__":
    asyncio.run(check())
