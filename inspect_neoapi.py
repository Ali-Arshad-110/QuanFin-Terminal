import sys
import os

# Setup path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
try:
    from backend.app.execution.kotak_service import KotakService # Just to get path setup if needed
except:
    pass

# Direct import attempt
try:
    # Add site-packages manually if needed
    site_packages = os.path.join(os.getcwd(), 'backend', 'Lib', 'site-packages')
    if os.path.exists(site_packages) and site_packages not in sys.path:
        sys.path.insert(0, site_packages)
        
    from neo_api_client import NeoAPI
    
    print("\n--- NeoAPI Methods ---")
    methods = [m for m in dir(NeoAPI) if not m.startswith("_")]
    for m in methods:
        print(m)
        
    print("\n--- Checking for scrip_master ---")
    if "scrip_master" in methods:
        print("YES! scrip_master exists.")
    else:
        print("NO scrip_master method found.")

except ImportError as e:
    print(f"Import Failed: {e}")
except Exception as e:
    print(f"Error: {e}")
