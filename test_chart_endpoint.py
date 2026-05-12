#!/usr/bin/env python3
import urllib.request
import json

try:
    response = urllib.request.urlopen('http://localhost:8000/api/v1/analyze/RELIANCE?interval=5m', timeout=10)
    data = json.load(response)
    print(f"✓ API Status: {response.status}")
    print(f"✓ Response keys: {list(data.keys())}")
    print(f"✓ Data source: {data.get('source', 'unknown')}")
    print(f"✓ Number of data points: {len(data.get('data', []))}")
    if data.get('data'):
        print(f"✓ First data point: {data['data'][0]}")
        print(f"✓ Last data point: {data['data'][-1]}")
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")
