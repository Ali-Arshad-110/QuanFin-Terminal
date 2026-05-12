import asyncio
import json
import os
import websockets
from dotenv import load_dotenv

async def verify_ais():
    load_dotenv("backend/.env")
    api_key = os.getenv("AIS_API_KEY")
    
    if not api_key:
        print("❌ ERROR: AIS_API_KEY not found in backend/.env")
        return

    uri = "wss://stream.aisstream.io/v0/stream"
    print(f"📡 Connecting to {uri}...")
    
    try:
        # Naked connection (no custom SSL/headers)
        async with websockets.connect(uri) as websocket:
            # Subscription with the EXACT first working format
            subscribe_msg = {
                "Apikey": api_key,
                "BoundingBoxes": [[[6.0, 65.0], [25.0, 98.0]]],
                "FilterMessageTypes": ["PositionReport"]
            }
            
            print("🚀 Sending Original Subscription...")
            await websocket.send(json.dumps(subscribe_msg))
            
            print("⏳ Waiting for data (Max 30s)...")
            try:
                # Wait for first packet
                message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                print(f"✅ SUCCESS! Received Data Packet:")
                print(f"{str(message)[:500]}...")
            except asyncio.TimeoutError:
                print("❌ TIMEOUT: No data packets received after 30 seconds.")
                
    except Exception as e:
        print(f"❌ CONNECTION FAILED: {str(e)}")

if __name__ == "__main__":
    asyncio.run(verify_ais())
