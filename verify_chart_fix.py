#!/usr/bin/env python3
import urllib.request
import urllib.parse
import json

# Test with proper URL encoding for "NIFTY 50"
ticker = "NIFTY 50"
encoded_ticker = urllib.parse.quote(ticker)
url = f'http://localhost:8000/api/v1/analyze/{encoded_ticker}?interval=5m'

print(f"Testing chart data fetch for '{ticker}'")
print(f"Encoded URL: {url}\n")

try:
    response = urllib.request.urlopen(url, timeout=10)
    data = json.load(response)
    
    print(f"✓ API Status: {response.status}")
    print(f"✓ Response keys: {list(data.keys())}")
    print(f"✓ Data source: {data.get('source', 'unknown')}")
    print(f"✓ Number of data points: {len(data.get('data', []))}")
    
    if data.get('data') and len(data['data']) > 0:
        print(f"✓ First candle: {data['data'][0]}")
        print(f"\n✅ CHART DATA SUCCESSFULLY FETCHED!")
        print(f"The chart should now render on the frontend with {len(data['data'])} candles.")
    else:
        print("✗ No data in response")
        
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")
    print("\nThis would have been the error the frontend faced without URL encoding!")
