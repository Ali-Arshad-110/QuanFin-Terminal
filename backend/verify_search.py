import sys
import os

# Setup path
current_dir = os.path.dirname(os.path.abspath(__file__)) # backend
site_packages = os.path.join(current_dir, 'Lib', 'site-packages')
if os.path.exists(site_packages):
    sys.path.insert(0, site_packages)
sys.path.insert(0, current_dir)

from app.services.contract_resolver import ContractResolver

def verify():
    print("Testing Search for 'TCS'...")
    results = ContractResolver.search_instruments("TCS", limit=5)
    print(f"Found {len(results)} results.")
    for r in results:
        print(f" - {r['symbol']} ({r['trading_symbol']}) [Token: {r['token']}]")

    print("\nTesting Search for 'RELIANCE' (should be in DB)...")
    results = ContractResolver.search_instruments("RELIANCE", limit=5)
    for r in results:
         print(f" - {r['symbol']} ({r['trading_symbol']}) [Token: {r['token']}]")

if __name__ == "__main__":
    verify()
