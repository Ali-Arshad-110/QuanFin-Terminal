import asyncio
import json
import os
import websockets
from dotenv import load_dotenv

async def check_vessels():
    load_dotenv("backend/.env")
    api_key = os.getenv("AIS_API_KEY")
    
    uri = "wss://stream.aisstream.io/v0/stream"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            # EXACT BOX FROM MARITIME.PY
            subscribe_msg = {
                "APIKey": api_key,
                "BoundingBoxes": [[[6.0, 65.0], [25.0, 98.0]]],
                "FilterMessageTypes": ["PositionReport", "StandardClassBPositionReport"]
            }
            
            print(f"Sending sub: {json.dumps(subscribe_msg)}")
            await websocket.send(json.dumps(subscribe_msg))
            
            print("Waiting for messages (30s)...")
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                print(f"✅ Received: {message[:100]}...")
            except asyncio.TimeoutError:
                print("❌ TIMEOUT: No data with this box/filter.")
                
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    asyncio.run(check_vessels())
