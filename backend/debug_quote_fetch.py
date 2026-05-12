
import sys
import os
import logging
import asyncio

# Setup path to backend
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir) # backend via parent of file? No, file is in backend/ probably.
# Actually let's just add the current dir
if current_dir not in sys.path:
    sys.path.append(current_dir)

from app.execution.kotak_service import KotakService
try:
    from test_credentials import MOBILE, UCC, CONSUMER_KEY, CONSUMER_SECRET, PASSWORD
except ImportError:
    print("Error: test_credentials.py not found or missing variables")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_quotes():
    ks = KotakService()
    
    # 1. Login
    print("--- 1. Logging In ---")
    res1 = ks.login_step1(MOBILE, UCC, PASSWORD, CONSUMER_KEY, CONSUMER_SECRET) # Using PASSWORD as TOTP/MPIN surrogate based on commonly seen pattern
    # Wait, usually test_credentials might have TOTP or MPIN separates. 
    # Let's assume PASSWORD is the MPIN/TOTP needed.
    # Actually login_step1 needs TOTP. login_step2 needs MPIN.
    # I'll check test_credentials content from view_file output to be sure.
    
    print(f"Step 1 Result: {res1}")
    
    if res1.get("status") != "success":
        print("Login Step 1 Failed. Aborting.")
        return

    # Mocking MPIN as the same password for testing if needed, or we might need manual input?
    # For now let's try to proceed if Step 1 succeeded.
    
    # 2. Get Quotes
    print("\n--- 2. Fetching Quotes ---")
    symbols = ["RELIANCE", "HDFCBANK", "nse_idx|Nifty 50"]
    quotes = ks.get_quotes(symbols)
    
    print("\n--- RAW RESULT ---")
    import json
    print(json.dumps(quotes, indent=2))

if __name__ == "__main__":
    debug_quotes()
