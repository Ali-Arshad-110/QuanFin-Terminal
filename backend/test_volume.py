from app.services.network_map_service import NetworkMapService
import logging

# Configure logger
logging.basicConfig(level=logging.INFO)

def test_get_constituents_volume():
    # Test with SENSEX
    symbol = "SENSEX"
    print(f"Fetching constituents for {symbol}...")
    constituents = NetworkMapService.get_constituents(symbol)
    
    if not constituents:
        print("No constituents found!")
        return

    print(f"Found {len(constituents)} constituents.")
    print("-" * 50)
    print(f"{'Symbol':<15} {'LTP':<10} {'Volume':<15} {'Avg Vol (20d)':<15} {'Market Cap':<15}")
    print("-" * 50)
    
    for c in constituents[:5]:  # Show first 5
        print(f"{c['symbol']:<15} {c['ltp']:<10} {c.get('volume', 'N/A'):<15} {c.get('avgVolume', 'N/A'):<15} {c['marketCap']:<15}")

    # Check if volume data is present
    has_volume = all('volume' in c for c in constituents)
    has_avg_vol = all('avgVolume' in c for c in constituents)
    
    if has_volume and has_avg_vol:
        print("\nSUCCESS: Volume and Avg Volume data present for all constituents.")
    else:
        print("\nFAILURE: Missing volume data for some constituents.")

if __name__ == "__main__":
    test_get_constituents_volume()
