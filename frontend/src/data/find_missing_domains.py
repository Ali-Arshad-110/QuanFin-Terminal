import json
import re

with open('industrial_zones.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

with open('stockDomains.ts', 'r', encoding='utf-8') as f:
    domains_text = f.read()

symbols = set()
for item in data:
    sym = item['id'].replace('hq_', '').replace('plant_', '').upper()
    symbols.add(sym)

existing = set(re.findall(r'"([A-Z0-9]+)":', domains_text))

missing = sorted(symbols - existing)
print(f'Total symbols in zones: {len(symbols)}')
print(f'Already mapped: {len(symbols) - len(missing)}')
print(f'Missing: {len(missing)}')
print()
for s in missing:
    print(s)
