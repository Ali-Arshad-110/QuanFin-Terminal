import sys
import os
import logging

# Setup path to include backend app
current_dir = os.path.dirname(os.path.abspath(__file__)) # should be backend
site_packages = os.path.join(current_dir, 'Lib', 'site-packages')
if os.path.exists(site_packages):
    sys.path.insert(0, site_packages)
sys.path.insert(0, current_dir)

# Configure logging to console
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

from app.services.instrument_master import InstrumentMasterService
from dotenv import load_dotenv

def run_sync():
    print("--- Starting Manual Instrument Sync ---")
    load_dotenv() 
    
    # Wait for OTP if missing (User coordination)
    import time
    if not os.getenv("KOTAK_OTP"):
        print("KOTAK_OTP is missing in .env. Please enter it now and save the file.")
        print("Waiting...")
        while not os.getenv("KOTAK_OTP"):
            time.sleep(2)
            load_dotenv(override=True)
        otp = os.getenv("KOTAK_OTP")
        print(f"✓ KOTAK_OTP detected: {otp}")
        
        # Clear OTP from .env file to prevent reuse
        try:
            with open(".env", "r") as f:
                lines = f.readlines()
            with open(".env", "w") as f:
                for line in lines:
                    if line.startswith("KOTAK_OTP="):
                        f.write("KOTAK_OTP=\n")
                    else:
                        f.write(line)
            print("✓ OTP cleared from .env (one-time use)")
        except Exception as e:
            print(f"Warning: Could not clear OTP from .env: {e}")

    success = InstrumentMasterService.start_sync_job()
    
    if success:
        print("\nSUCCESS: Instrument Master Synced successfully!")
        # Verify the new table
        table = InstrumentMasterService.get_active_table_name()
        print(f"New Active Table: {table}")
    else:
        print("\nFAILURE: Sync job failed. Check logs above for details.")

if __name__ == "__main__":
    run_sync()
