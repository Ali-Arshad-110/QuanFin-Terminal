
import sys
import os
import json
import traceback

# Setup path to backend
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
site_packages = os.path.join(project_root, 'Lib', 'site-packages')
if os.path.exists(site_packages) and site_packages not in sys.path:
    sys.path.insert(0, site_packages)

try:
    from neo_api_client import NeoAPI
except ImportError:
    print("NeoAPI not found")
    sys.exit(1)

# Credentials from test_credentials.py (hardcoded here for simplicity based on previous read)
CONSUMER_KEY = "f7f1fbb5-3875-4798-ad7b-c6b6e6018a44" 
CONSUMER_SECRET = "NA" # Using NA as per valid patterns seen in debug_kotak_import

def test_search():
    print(f"Initializing NeoAPI with key: {CONSUMER_KEY[:5]}...")
    client = NeoAPI(consumer_key=CONSUMER_KEY, consumer_secret=CONSUMER_SECRET, environment='PROD')
    
    # Test Cases
    test_cases = [
        {"seg": "nse_cm", "sym": "MRF"},
        {"seg": "nse_cm", "sym": "RELIANCE"},
        {"seg": "mcx_fo", "sym": "CRUDEOIL"},
        {"seg": "mcx_fo", "sym": "GOLD"}
    ]
    
    print("\n--- Starting Search Tests ---")
    
    for case in test_cases:
        seg = case["seg"]
        sym = case["sym"]
        print(f"\nSearching for {sym} in {seg}...")
        try:
            # Note: search_scrip arguments: exchange_segment, symbol, expiry, option_type, strike_price
            res = client.search_scrip(exchange_segment=seg, symbol=sym)
            
            print(f"Result Type: {type(res)}")
            print(f"Result Raw: {res}")
                
        except Exception as e:
            print(f"Error searching {sym}: {e}")


if __name__ == "__main__":
    test_search()
