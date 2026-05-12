import asyncio
import json
import os
import websockets
from dotenv import load_dotenv

async def check():
    load_dotenv("backend/.env")
    api_key = os.getenv("AIS_API_KEY")
    uri = "wss://stream.aisstream.io/v0/stream"
    try:
        async with websockets.connect(uri) as websocket:
            # TRY Swapped Order: [Lon, Lat]
            msg = {
                "APIKey": api_key, 
                "BoundingBoxes": [[[65.0, 6.0], [98.0, 25.0]]] # LON, LAT order
            }
            print(f"Testing [Lon, Lat] order: {json.dumps(msg)}")
            await websocket.send(json.dumps(msg))
            
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=20.0)
                print(f"SUCCESS! Received Data with [Lon, Lat] order!")
                print(message[:200])
            except asyncio.TimeoutError:
                print("FAILED: Timeout with [Lon, Lat] order.")

            # RE-TRY [Lat, Lon] but with fixed Max Lat
            msg = {
                "APIKey": api_key, 
                "BoundingBoxes": [[[6.0, 65.0], [25.0, 90.0]]] # LAT, LON order (capped at 90)
            }
            print(f"\nTesting [Lat, Lon] order: {json.dumps(msg)}")
            await websocket.send(json.dumps(msg))
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=20.0)
                print(f"SUCCESS! Received Data with [Lat, Lon] order!")
                print(message[:200])
            except asyncio.TimeoutError:
                print("FAILED: Timeout with [Lat, Lon] order.")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())
