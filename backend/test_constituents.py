
import sys
import os

# Add project root to path
sys.path.append(os.getcwd())

from app.services.network_map_service import NetworkMapService, BANKNIFTY_MAPPING

def test_fetch():
    print("Testing BANKNIFTY fetch...")
    data = NetworkMapService.get_constituents("BANKNIFTY")
    print(f"Fetched {len(data)} constituents for BANKNIFTY")
    for item in data[:3]:
        print(item)

    print("\nTesting NIFTYIT fetch...")
    data_it = NetworkMapService.get_constituents("NIFTYIT")
    print(f"Fetched {len(data_it)} constituents for NIFTYIT")

if __name__ == "__main__":
    test_fetch()
