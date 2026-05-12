import os
from dotenv import load_dotenv

def test_env():
    load_dotenv()
    key = os.getenv("AIS_API_KEY")
    if key and key != "PASTE_YOUR_KEY_HERE":
        print(f"SUCCESS: AIS_API_KEY is configured (Length: {len(key)} chars)")
    else:
        print("FAILURE: AIS_API_KEY is NOT set correctly in .env")

if __name__ == "__main__":
    test_env()
