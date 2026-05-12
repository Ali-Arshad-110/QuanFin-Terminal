import asyncio
import websockets
import json

async def test_feed():
    uri = "ws://localhost:8000/ws/universe"
    async with websockets.connect(uri) as websocket:
        print(f"Connected to {uri}")
        
        # Keep listening
        while True:
            try:
                message = await websocket.recv()
                print(f"Received: {message}")
            except Exception as e:
                print(f"Error: {e}")
                break

if __name__ == "__main__":
    try:
        asyncio.run(test_feed())
    except KeyboardInterrupt:
        print("Test stopped")
