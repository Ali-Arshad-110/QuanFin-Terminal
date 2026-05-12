import sys
import os
import traceback

print("--- Starting Import Debug ---")
print(f"Current Working Directory: {os.getcwd()}")

# 1. Setup Logic mimicking kotak_service.py
try:
    # Assuming this script is at backend/debug_kotak_import.py
    current_file = os.path.abspath(__file__)
    print(f"Script File: {current_file}")
    
    # We want to reach QuanFin_Terminal root
    # If file is in backend/, then dirname -> backend. dirname(backend) -> QuanFin_Terminal
    backend_dir = os.path.dirname(current_file)
    project_root = os.path.dirname(backend_dir)
    
    print(f"Project Root (Calculated): {project_root}")
    
    site_packages = os.path.join(project_root, 'Lib', 'site-packages')
    print(f"Looking for site-packages at: {site_packages}")
    
    if os.path.exists(site_packages):
        print("site-packages directory EXISTS")
        if site_packages not in sys.path:
            sys.path.insert(0, site_packages) # Try inserting at front
            print("Inserted site-packages to sys.path[0]")
        else:
            print("site-packages already in sys.path")
    else:
        print("site-packages directory NOT FOUND")

except Exception as e:
    print(f"Path logic exception: {e}")
    traceback.print_exc()

print(f"sys.path: {sys.path[:3]} ...")

# 2. Try Import
try:
    print("Attempting 'import neo_api_client'...")
    import neo_api_client
    print(f"SUCCESS. neo_api_client file: {neo_api_client.__file__}")
    
    print("Attempting 'from neo_api_client import NeoAPI'...")
    from neo_api_client import NeoAPI
    print("SUCCESS. NeoAPI class imported.")
    
    print("\n--- Listing NeoAPI attributes ---")
    print([x for x in dir(NeoAPI) if not x.startswith('_')])
    
    print("\n--- Initializing Client ---")
    try:
        # Try init with dummy values
        # We use a dummy secret "NA" as per recent fix
        client = NeoAPI(consumer_key="test_key", consumer_secret="NA", environment="UAT")
        print("Client initialized.")
        
        print("Attempting login()...")
        # Simulating what we do in kotak_service.py
        # login(mobilenumber=mobile_number, password=totp, userid=ucc)
        try:
            client.login(mobilenumber="9876543210", password="dummy_pass", userid="test_user")
            print("Login called (expected to fail on network/auth, but check for TypeError)")
        except TypeError as te:
            print(f"CAUGHT TYPE ERROR: {te}")
            traceback.print_exc(file=sys.stdout)
        except Exception as e:
            print(f"Login method raised: {e}")
            traceback.print_exc(file=sys.stdout)
            
    except Exception as e:
        print(f"Client init failed: {e}")
    
except Exception:
    print("FAIL. Traceback:")
    traceback.print_exc()

print("--- End Import Debug ---")
