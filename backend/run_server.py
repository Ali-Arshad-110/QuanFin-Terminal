import sys
import os

# 1. Setup Path to include local Lib/site-packages PRE-IMPORT
current_dir = os.path.dirname(os.path.abspath(__file__)) # backend
project_root = os.path.dirname(current_dir) # QuanFin_Terminal
site_packages = os.path.join(project_root, 'Lib', 'site-packages')

print(f"--- Starting Server with custom path ---")
print(f"Adding to sys.path: {site_packages}")

if os.path.exists(site_packages) and site_packages not in sys.path:
    sys.path.insert(0, site_packages)

# 2. Import Uvicorn AFTER path setup
try:
    import uvicorn
    print("Success: uvicorn imported.")
except ImportError as e:
    print(f"Critical Error: Could not import uvicorn even after path setup. {e}")
    sys.exit(1)

if __name__ == "__main__":
    # Referencing app.main:app
    # Production-grade: reload=False to prevent loop restarts
    # Listen on localhost so both localhost:8000 and 127.0.0.1:8000 work
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
