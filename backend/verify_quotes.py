import sys
import os

# 1. Setup Path to include local Lib/site-packages
current_dir = os.path.dirname(os.path.abspath(__file__)) # backend
project_root = os.path.dirname(current_dir) # QuanFin_Terminal
site_packages = os.path.join(project_root, 'Lib', 'site-packages')

if os.path.exists(site_packages) and site_packages not in sys.path:
    sys.path.insert(0, site_packages)

import requests
import json

url = "http://127.0.0.1:8000/api/v1/quotes"
payload = {"symbols": ["RELIANCE", "TCS"]}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Request failed: {e}")
