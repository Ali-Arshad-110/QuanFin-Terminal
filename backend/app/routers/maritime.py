import json
import asyncio
import os
import websockets
import traceback
import ssl
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

AIS_API_KEY = os.getenv("AIS_API_KEY")

@router.websocket("/ws")
async def maritime_proxy(websocket: WebSocket):
    """
    Institutional WebSocket Proxy for AIS Satellite Stream.
    Connects to AISStream.io and relays data to the frontend while
    keeping the API Key secure on the server.
    """
    await websocket.accept()
    
    if not AIS_API_KEY or AIS_API_KEY == "PASTE_YOUR_KEY_HERE":
        await websocket.send_text(json.dumps({
            "error": "AIS_API_KEY not configured on server. Please add it to backend/.env"
        }))
        await websocket.close()
        return

    # Connection to the External Satellite Source
    uri = "wss://stream.aisstream.io/v0/stream"
    
    try:
        while True: # Outer reconnect loop
            try:
                async with websockets.connect(uri) as ais_socket:
                    # Optimized Trade Corridor Box (North Indian Ocean, Middle East, SE Asia)
                    subscription = {
                        "APIKey": AIS_API_KEY,
                        "BoundingBoxes": [[[0.0, 50.0], [30.0, 105.0]]]
                    }
                    await ais_socket.send(json.dumps(subscription))
                    print(f"✓ Satellite Hub Linked (Corridor: Gulf to SE Asia)")
                    
                    # Capture First Message for UI Handshake
                    try:
                        first_raw = await asyncio.wait_for(ais_socket.recv(), timeout=20.0)
                        first_text = first_raw.decode('utf-8') if isinstance(first_raw, bytes) else first_raw
                        print(f"📡 AIS HANDSHAKE: {first_text[:120]}...")
                        await websocket.send_text(first_text)
                    except asyncio.TimeoutError:
                        print("⚠️ Handshake Timeout: No immediate AIS traffic in corridor.")

                    # Periodic Status Update & Payload Enrichment
                    count = 0
                    async for message in ais_socket:
                        count += 1
                        message_text = message.decode('utf-8') if isinstance(message, bytes) else message
                        
                        try:
                            # Payload Enrichment (Only process 1 in 10 for performance, relay all)
                            if count % 10 == 0:
                                data = json.loads(message_text)
                                msg = data.get("Message", {})
                                meta = data.get("MetaData", {})
                                ship_name = (meta.get("ShipName") or meta.get("ship_name") or "Vessel").strip()

                                # Handle ShipStaticData (Type 5/24)
                                static = msg.get("ShipStaticData") or msg.get("StaticDataReport")
                                if static:
                                    # Identity Enrichment
                                    imo = static.get("ImoNumber", 0)
                                    callsign = (static.get("CallSign") or "").strip()
                                    raw_type = static.get("ShipType", 0)
                                    
                                    # Physical Enrichment (Dimensions A/B/C/D)
                                    # A=Bow to GPS, B=Stern to GPS, C=Port to GPS, D=Starboard to GPS
                                    dim = static.get("Dimension", {})
                                    length = (dim.get("A", 0) + dim.get("B", 0))
                                    width = (dim.get("C", 0) + dim.get("D", 0))

                                    # Map Type to Human Readable
                                    type_map = {30: "Fishing", 35: "Military", 36: "Sailing", 37: "Pleasure", 52: "Tug", 60: "Passenger", 70: "Cargo", 80: "Tanker"}
                                    vessel_type = type_map.get(raw_type, "Other Vessel")

                                    print(f"📦 ENRICHED: {ship_name} [IMO: {imo}] Type: {vessel_type} {length}x{width}m")
                        except Exception as e:
                            pass

                        await websocket.send_text(message_text)
                        
            except (websockets.exceptions.ConnectionClosed, websockets.exceptions.InvalidMessage):
                # Only retry if the FRONTEND is still connected
                print("⚠️ Satellite Link Dropped. Reconnecting in 5s...")
                await asyncio.sleep(5)
            except Exception as e:
                err_msg = str(e)
                # Check if the error is due to the FRONTEND (Browser) disconnecting
                if "close message" in err_msg or "4000" in err_msg:
                    print("🔌 Proxy Stopped: Frontend terminal was closed.")
                    return # Exit the entire function
                
                print(f"❌ Socket Bridge Error: {err_msg}")
                await asyncio.sleep(5)
                
    except (WebSocketDisconnect, RuntimeError):
        print("🔌 Frontend Terminal Disconnected")
    except Exception as e:
        print(f"❌ BRIDGE FATAL ERROR: {str(e)}")
    finally:
        # Final cleanup
        try:
            await websocket.close()
        except:
            pass
