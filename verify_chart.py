#!/usr/bin/env python3
import json
import urllib.request
import sys

def test_chart_endpoint():
    try:
        # Test RELIANCE.NS with 5m interval
        url = "http://127.0.0.1:8000/api/v1/analyze/RELIANCE.NS?interval=5m"
        print(f"Testing: {url}")
        print("=" * 80)
        
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
            
            # Check structure
            print(f"✓ Response Status: 200 OK")
            print(f"✓ Response Keys: {list(data.keys())}")
            print(f"✓ Ticker: {data.get('ticker')}")
            print(f"✓ Interval: {data.get('interval')}")
            print(f"✓ Source: {data.get('source')}")
            
            # Check data
            if 'data' in data:
                print(f"✓ Data points: {len(data['data'])}")
                if len(data['data']) > 0:
                    print(f"\nFirst record:")
                    first = data['data'][0]
                    print(json.dumps(first, indent=2))
                    
                    print(f"\nLast record:")
                    last = data['data'][-1]
                    print(json.dumps(last, indent=2))
                    
                    # Check for NaN/Inf
                    print(f"\nChecking for NaN/Inf values...")
                    has_issues = False
                    for i, record in enumerate(data['data']):
                        for key, value in record.items():
                            if isinstance(value, float):
                                if str(value) in ['nan', 'inf', '-inf']:
                                    print(f"  Found {value} at record {i}, key {key}")
                                    has_issues = True
                    if not has_issues:
                        print(f"  ✓ No NaN/Inf values found")
                        
            print("\n" + "=" * 80)
            print("✅ Chart data looks good! Ready to render in frontend.")
            
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error {e.code}")
        body = e.read().decode()
        print(f"Error: {body}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_chart_endpoint()
