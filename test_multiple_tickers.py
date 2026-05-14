#!/usr/bin/env python3
import urllib.request
import json
import sys

tickers = ['NIFTY 50', 'RELIANCE', 'TCS', 'INFY', 'SBIN', 'HDFCBANK', 'ITC', 'BAJFINANCE']

for ticker in tickers:
    try:
        url = f'http://localhost:8000/api/v1/analyze/{ticker}?interval=5m'
        print(f"\n📊 Testing: {ticker}")
        print(f"   URL: {url}")
        
        response =  urllib.request.urlopen(url, timeout=10)
        data = json.load(response)
        
        print(f"   ✓ Status: {response.status}")
        print(f"   ✓ Source: {data.get('source', 'unknown')}")
        print(f"   ✓ Data points: {len(data.get('data', []))}")
        
        if data.get('data') and len(data['data']) > 0:
            print(f"   ✓ First: {data['data'][0]['date']} @ {data['data'][0]['close']}")
            print(f"   ✓ Last: {data['data'][-1]['date']} @ {data['data'][-1]['close']}")
        else:
            print(f"   ✗ No data returned!")
            
    except Exception as e:
        print(f"   ✗ Error: {type(e).__name__}: {e}")
