import asyncio
import sys
import os

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.network_map_service import NetworkMapService

def test_sensex_constituents():
    print("Testing SENSEX constituents fetching...")
    try:
        data = NetworkMapService.get_constituents("SENSEX")
        if data:
            print(f"SUCCESS: Fetched {len(data)} constituents for SENSEX.")
            print("Top 5 constituents:")
            for item in data[:5]:
                print(f" - {item['symbol']} ({item['name']}): Market Cap {item['marketCap']}")
        else:
            print("FAILURE: No constituents returned for SENSEX.")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_sensex_constituents()
