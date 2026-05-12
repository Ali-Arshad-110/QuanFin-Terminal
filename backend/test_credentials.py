import sys
import os
import traceback
import io
import contextlib

# Import Logic (same as fixed kotak_service.py)
try:
    current_file = os.path.abspath(__file__)
    backend_dir = os.path.dirname(current_file)
    project_root = os.path.dirname(backend_dir)
    site_packages = os.path.join(project_root, 'Lib', 'site-packages')
    
    if os.path.exists(site_packages) and site_packages not in sys.path:
        sys.path.insert(0, site_packages)
        print(f"Added {site_packages} to path")

    from neo_api_client import NeoAPI
    print("NeoAPI imported successfully.")
except ImportError:
    print("Failed to import NeoAPI. Exiting.")
    sys.exit(1)

from dotenv import load_dotenv

# Load .env
load_dotenv()

# TEST DATA - Loaded from Env
CONSUMER_KEY = os.getenv("KOTAK_CONSUMER_KEY", "placeholder_key")
CONSUMER_SECRET = os.getenv("KOTAK_CONSUMER_SECRET", None)
ENVIRONMENTS = ["PROD"]

print(f"\n--- Testing Credentials ---")
print(f"Key: {CONSUMER_KEY}")
print(f"Secret: {CONSUMER_SECRET}")

for env in ENVIRONMENTS:
    print(f"\nTesting Environment: {env}")
    try:
        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            client = NeoAPI(consumer_key=CONSUMER_KEY, consumer_secret=CONSUMER_SECRET, environment=env)
        
        output = f.getvalue()
        
        # Check bearer token
        token = getattr(client.configuration, 'bearer_token', None)
        if token:
            print(f"[SUCCESS] Connected to {env}!")
            print(f"Bearer Token: {token[:10]}...")
        else:
            print(f"[FAILED] Could not connect to {env}.")
            print(f"Library Output: {output.strip()}")
            
    except Exception as e:
        print(f"[ERROR] Exception during {env} init: {e}")

print("\n--- End Test ---")
