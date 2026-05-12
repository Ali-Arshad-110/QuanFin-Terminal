import urllib.request
import json

resp = urllib.request.urlopen('http://127.0.0.1:8000/api/v1/indices', timeout=5)
data = json.loads(resp.read())

print(f"\n📊 API returning {len(data)} indices:\n")
for i, idx in enumerate(data, 1):
    print(f"{i}. {idx.get('name'):20} - ₹{idx.get('price', 0):.0f} ({idx.get('change_percent', 0):+.2f}%)")

print(f"\n✓ All {len(data)} indices loaded from API")
