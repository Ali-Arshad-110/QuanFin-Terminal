#!/usr/bin/env python3
import json
import urllib.request
import urllib.error

def test_api():
    try:
        # Test without broker login - should use Yahoo Finance fallback
        url = "http://127.0.0.1:8000/api/v1/analyze/RELIANCE"
        print(f"Testing URL: {url}")
        
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            
            print("\n✅ SUCCESS - API Response received")
            print(f"Response Keys: {list(data.keys())}")
            
            if 'data' in data:
                print(f"Data array length: {len(data['data'])}")
                if len(data['data']) > 0:
                    print(f"First record: {json.dumps(data['data'][0], indent=2)}")
                    print(f"Last record: {json.dumps(data['data'][-1], indent=2)}")
            
            print(f"\nFull response: {json.dumps(data, indent=2)[:500]}...")
            
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error {e.code}")
        body = e.read().decode()
        print(f"Error body: {body[:500]}")
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")

if __name__ == "__main__":
    test_api()
