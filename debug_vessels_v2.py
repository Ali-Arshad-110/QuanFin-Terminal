import asyncio
import json
import os
import websockets
from dotenv import load_dotenv

async def check_vessels():
    load_dotenv("backend/.env")
    api_key = os.getenv("AIS_API_KEY")
    
    if not api_key:
        print("Error: AIS_API_KEY NOT FOUND")
        return

    uri = "wss://stream.aisstream.io/v0/stream"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            # TRY Apikey (PascalCase with lowercase p) and Global Box
            subscribe_msg = {
                "Apikey": api_key,
                "BoundingBoxes": [[[-90.0, -180.0], [90.0, 180.0]]]
            }
            
            print("Sending Apikey + World subscription...")
            await websocket.send(json.dumps(subscribe_msg))
            
            print("Waiting for messages (30s timeout)...")
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                print(f"Received Packet:")
                print(json.dumps(json.loads(message), indent=2)[:500])
            except asyncio.TimeoutError:
                print("Apikey + World: TIMEOUT")

            # TRY APIKey (PascalCase with uppercase PI) and Global Box
            subscribe_msg = {
                "APIKey": api_key,
                "BoundingBoxes": [[[-90.0, -180.0], [90.0, 180.0]]]
            }
            print("\nSending APIKey + World subscription...")
            await websocket.send(json.dumps(subscribe_msg))
            
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                print(f"Received Packet:")
                print(json.dumps(json.loads(message), indent=2)[:500])
            except asyncio.TimeoutError:
                print("APIKey + World: TIMEOUT")
                
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    asyncio.run(check_vessels())
