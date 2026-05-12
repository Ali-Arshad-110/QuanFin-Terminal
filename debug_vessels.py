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
            # Try broadly with just APIKey and BoundingBox
            subscribe_msg = {
                "APIKey": api_key,
                "BoundingBoxes": [[[6.0, 65.0], [25.0, 98.0]]]
            }
            
            print("Sending broad subscription...")
            await websocket.send(json.dumps(subscribe_msg))
            
            print("Waiting for messages (60s timeout)...")
            count = 0
            while count < 5:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=60.0)
                    print(f"Received Packet {count+1}:")
                    data = json.loads(message)
                    print(json.dumps(data, indent=2)[:500])
                    count += 1
                except asyncio.TimeoutError:
                    print("Timeout reached. No packets.")
                    break
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    asyncio.run(check_vessels())
