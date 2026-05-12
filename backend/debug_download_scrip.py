import requests
import gzip
import io
import os
from dotenv import load_dotenv

load_dotenv()
URL1 = "https://lapi.kotaksecurities.com/wso2-scrip-master/s_scrip_master.csv.gz"
URL2 = "https://neotradeapi.kotaksecurities.com/apim/otrade/control/1.0/scrip_master"
URL3 = "https://nsearch.kotaksecurities.com/api/v2/neotrade/scripMaster/download"
CONSUMER_KEY = os.getenv("KOTAK_CONSUMER_KEY")

def test_download(mode, url, headers=None):
    print(f"\n--- Testing Download Mode: {mode} ---")
    print(f"URL: {url}")
    try:
        response = requests.get(url, headers=headers, timeout=15)
        print(f"Status Code: {response.status_code}")
        print(f"Content Length: {len(response.content)}")
        
        if response.status_code == 200 and len(response.content) > 100:
            if response.content.strip().startswith(b"<HTML") or response.content.strip().startswith(b"<!DOCTYPE") or response.content.strip().startswith(b"\n\n<HTML"):
                print("Result: HTML detected. Snippet:")
                print(response.text[:200].replace("\n", " ").strip())
                return False
            try:
                with gzip.GzipFile(fileobj=io.BytesIO(response.content)) as f:
                    first_line = f.readline().decode('utf-8')
                    print(f"Decompression Success! Header: {first_line[:50]}")
                    return True
            except Exception as e:
                print(f"Decompression Failed: {e}")
                print(f"First 20 bytes: {response.content[:20]}")
        else:
            print(f"Result: Failed. Snippet: {response.text[:200].replace('\n', ' ').strip()}")
        return False
    except Exception as e:
        print(f"Request Failed: {e}")
        return False

if __name__ == "__main__":
    if not CONSUMER_KEY:
        print("ERROR: KOTAK_CONSUMER_KEY not found in .env")
    else:
        # Test 1: Raw Key (No Bearer) @ LAPI
        h1 = {"Authorization": CONSUMER_KEY, "User-Agent": "Mozilla/5.0"}
        test_download("Raw Key @ LAPI", URL1, h1)
        
        # Test 2: Public @ SEARCH
        test_download("Public @ SEARCH", URL3, {"User-Agent": "Mozilla/5.0"})

        # Test 3: Raw Key @ SEARCH
        h3 = {"Authorization": CONSUMER_KEY, "User-Agent": "Mozilla/5.0"}
        test_download("Raw Key @ SEARCH", URL3, h3)
        
        # Test 4: Bearer @ SEARCH
        h4 = {"Authorization": f"Bearer {CONSUMER_KEY}", "User-Agent": "Mozilla/5.0"}
        test_download("Bearer @ SEARCH", URL3, h4)
