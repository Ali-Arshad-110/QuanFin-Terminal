#!/usr/bin/env python3
"""
Test script to verify chart API is working
"""
import sys
import os
import time

# Add the backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Increase timeout for startup
time.sleep(2)

import urllib.request
import json

url = 'http://127.0.0.1:8000/api/v1/analyze/DLF?interval=5m'

print("=" * 80)
print("Testing Chart API Endpoint")
print("=" * 80)
print(f"URL: {url}")
print()

try:
    print("Sending request...")
    with urllib.request.urlopen(url, timeout=10) as response:
        status = response.status
        data = json.loads(response.read().decode('utf-8'))
        
        print(f"✓ SUCCESS!")
        print(f"  Status Code: {status}")
        print()
        
        print(f"Response Structure:")
        print(f"  Keys: {list(data.keys())}")
        print(f"  Ticker: {data.get('ticker', 'N/A')}")
        print(f"  Interval: {data.get('interval', 'N/A')}")
        print(f"  Source: {data.get('source', 'N/A')}")
        print()
        
        if 'data' in data:
            print(f"Data Analysis:")
            print(f"  Total candles: {len(data['data'])}")
            
            if len(data['data']) > 0:
                first = data['data'][0]
                last = data['data'][-1]
                
                print(f"  First record keys: {list(first.keys())}")
                print(f"  Last close price: {last.get('close', 'N/A')}")
                print(f"  Last RSI: {last.get('rsi', 'N/A')}")
                print(f"  Last MACD: {last.get('MACD_12_26_9', 'N/A')}")
                print(f"  Last VWAP: {last.get('vwap', 'N/A')}")
                
                # Check for NaN or invalid values
                invalid_count = 0
                for i, record in enumerate(data['data']):
                    if not isinstance(record.get('close'), (int, float)) or record.get('close') is None:
                        invalid_count += 1
                        if invalid_count <= 3:
                            print(f"  ⚠ Record {i} has invalid close: {record.get('close')}")
                
                if invalid_count > 0:
                    print(f"  ⚠ Total invalid records: {invalid_count}")
                else:
                    print(f"  ✓ All records have valid OHLCV data")
        
        print()
        print("=" * 80)
        print("✓ TEST PASSED - Chart API is working correctly!")
        print("=" * 80)

except urllib.error.HTTPError as e:
    print(f"✗ HTTP ERROR {e.code}")
    try:
        body = e.read().decode('utf-8')
        error_data = json.loads(body)
        print(f"  Detail: {error_data.get('detail', body)}")
    except:
        print(f"  Response: {body}")
    print()
    print("=" * 80)
    print("✗ TEST FAILED - Check backend logs above")
    print("=" * 80)
    
except Exception as e:
    print(f"✗ ERROR: {type(e).__name__}: {e}")
    print()
    print("=" * 80)
    print("✗ TEST FAILED - Connection error")
    print("=" * 80)
