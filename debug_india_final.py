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
        # TEST India Box [Lat, Lon] - BROAD
        # (8, 68) to (25, 95)
        msg = {
            "APIKey": api_key,
            "BoundingBoxes": [[[8.0, 68.0], [25.0, 95.0]]]
        }
        await websocket.send(json.dumps(msg))
        print(f"Testing India [Lat, Lon] Broad: {json.dumps(msg)}")
        try:
            message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
            print("✅ SUCCESS with India Broad [Lat, Lon]!")
            data = json.loads(message)
            print(f"Ship: {data['MetaData']['ShipName']} at {data['MetaData']['latitude']}, {data['MetaData']['longitude']}")
        except:
            print("❌ FAILED with India Broad [Lat, Lon].")

        # TEST India Box [Lon, Lat] - BROAD
        # (68, 8) to (95, 25)
        msg = {
            "APIKey": api_key,
            "BoundingBoxes": [[[68.0, 8.0], [95.0, 25.0]]]
        }
        await websocket.send(json.dumps(msg))
        print(f"\nTesting India [Lon, Lat] Broad: {json.dumps(msg)}")
        try:
            message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
            print("✅ SUCCESS with India Broad [Lon, Lat]!")
            data = json.loads(message)
            print(f"Ship: {data['MetaData']['ShipName']} at {data['MetaData']['latitude']}, {data['MetaData']['longitude']}")
        except:
            print("❌ FAILED with India Broad [Lon, Lat].")

if __name__ == "__main__":
    asyncio.run(check())
