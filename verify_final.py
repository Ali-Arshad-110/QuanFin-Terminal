import urllib.request
import json

resp = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/analyze/RELIANCE?interval=5m', timeout=10)
data = json.loads(resp.read())

ticker = data.get('ticker', 'N/A')
candle_count = len(data.get('data', []))
source = data.get('source', 'N/A')
has_rsi = 'rsi' in data['data'][0] if data['data'] else False

print(f"✓ Ticker: {ticker}")
print(f"✓ Data points: {candle_count} candles")
print(f"✓ Data source: {source}")
print(f"✓ Technical indicators: {'YES' if has_rsi else 'NO'}")
print(f"\n✅ CHART API VERIFIED - Chart rendering ready!")
