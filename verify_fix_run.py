import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"

def test_chart_data():
    print("Testing Chart Data API...")
    try:
        # Use a reliable ticker
        resp = requests.get(f"{BASE_URL}/analyze/RELIANCE", params={"interval": "1d"})
        if resp.status_code != 200:
            print(f"FAILED: Chart API returned {resp.status_code}")
            return False
            
        data = resp.json()
        candles = data.get("data", [])
        if not candles:
            print("FAILED: No candles returned")
            return False
            
        first_candle = candles[0]
        print(f"First candle keys: {first_candle.keys()}")
        
        if "time" not in first_candle:
            print("FAILED: 'time' field missing in candle data")
            print(f"Candle: {first_candle}")
            return False
            
        if "timestamp" in first_candle:
             if first_candle["time"] != first_candle["timestamp"]:
                 print(f"WARNING: time {first_candle['time']} != timestamp {first_candle['timestamp']}")
        
        print(f"SUCCESS: Chart Data has 'time' field. Source: {data.get('source')}")
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def test_quotes():
    print("\nTesting Quotes API (Live/Yahoo)...")
    try:
        payload = {"symbols": ["RELIANCE", "TCS"]}
        resp = requests.post(f"{BASE_URL}/quotes", json=payload)
        
        if resp.status_code != 200:
            print(f"FAILED: Quotes API returned {resp.status_code}")
            return False
            
        data = resp.json()
        print(f"Quotes received: {len(data)}")
        
        if "RELIANCE" not in data:
            print("FAILED: RELIANCE missing in response")
            return False
            
        rel = data["RELIANCE"]
        print(f"RELIANCE Data: {rel}")
        
        if rel.get("source") == "mock":
            print("FAILED: API still returning 'mock' data. Logic update failed?")
            return False
            
        if rel.get("ltp", 0) == 0:
             print("WARNING: LTP is 0. Market might be closed or fetch failed?")
             
        print("SUCCESS: Quotes API returned non-mock data")
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    c_ok = test_chart_data()
    q_ok = test_quotes()
    
    if c_ok and q_ok:
        print("\nALL CHECKS PASSED")
        sys.exit(0)
    else:
        print("\nCHECKS FAILED")
        sys.exit(1)
