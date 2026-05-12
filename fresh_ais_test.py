import asyncio
import json
import websockets

async def fresh_test():
    # Hardcoded API Key for direct verification
    API_KEY = "c78d81826ff3e0f3167470431986d32166d5a2fd"
    uri = "wss://stream.aisstream.io/v0/stream"
    
    print(f"🌍 Starting Fresh AIS Satellite Test...")
    print(f"📡 Terminal -> {uri}")
    
    try:
        async with websockets.connect(uri) as websocket:
            # Broad subscription covering a large part of the ocean
            subscribe_msg = {
                "APIKey": API_KEY,
                "BoundingBoxes": [[[-90, -180], [90, 180]]], # Full World Box
                "FilterMessageTypes": ["PositionReport", "StandardClassBPositionReport"]
            }
            
            print(f"🚀 Sending Global Subscription...")
            await websocket.send(json.dumps(subscribe_msg))
            
            print(f"⏳ Listening for satellite pulses (Max 60s)...")
            
            # Listen for up to 60 seconds or 5 vessels
            vessels_found = 0
            start_time = asyncio.get_event_loop().time()
            while asyncio.get_event_loop().time() - start_time < 60 and vessels_found < 5:
                try:
                    # Wait for message with a shorter internal timeout
                    message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    data = json.loads(message)
                    meta = data.get('MetaData', {})
                    ship_name = meta.get('ShipName', 'Unknown Vessel').strip()
                    lat = meta.get('latitude')
                    lon = meta.get('longitude')
                    mmsi = meta.get('MMSI')

                    if lat is not None and lon is not None:
                        print(f"✅ DATA RECEIVED! [Vessel {vessels_found + 1}]")
                        print(f"🚢 Name: {ship_name or 'N/A'}")
                        print(f"🆔 MMSI: {mmsi}")
                        print(f"📍 Position: {lat}, {lon}")
                        print("-" * 30)
                        vessels_found += 1
                except asyncio.TimeoutError:
                    print("... Scanning Indian Ocean ...")
                    continue

            if vessels_found == 0:
                print("❌ TEST FAILED: Connection was successful, but no data was sent by the provider.")
            
    except Exception as e:
        print(f"❌ CONNECTION ERROR: {str(e)}")

if __name__ == "__main__":
    asyncio.run(fresh_test())
