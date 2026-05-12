import requests
import os
import csv
import io
from dotenv import load_dotenv

load_dotenv()
CONSUMER_KEY = os.getenv("KOTAK_CONSUMER_KEY")
BASE_URL = "https://e41.kotaksecurities.com" # From logs
PATH_URL = f"{BASE_URL}/script-details/1.0/masterscrip/file-paths"

def debug_columns():
    headers = {"Authorization": CONSUMER_KEY, "neo-fin-key": "neotradeapi"}
    print(f"Fetching Paths from {PATH_URL}...")
    resp = requests.get(PATH_URL, headers=headers)
    if resp.status_code != 200:
        print(f"Failed: {resp.status_code}")
        return

    file_urls = resp.json().get("data", {}).get("filesPaths", [])
    for url in file_urls:
        fn = url.split('/')[-1]
        print(f"\n--- Segment: {fn} ---")
        try:
            r = requests.get(url, timeout=15)
            if r.status_code == 200:
                f = io.StringIO(r.text)
                reader = csv.DictReader(f)
                print(f"Headers: {reader.fieldnames}")
                for i, row in enumerate(reader):
                    if fn in ['cde_fo.csv', 'nse_com.csv']:
                        print(f"Row {i+1}: {row}")
                    else:
                        print(f"Row {i+1} pSymbol: {row.get('pSymbol')} pTrdSymbol: {row.get('pTrdSymbol')}")
                    if i >= 1: break
            else:
                print(f"Failed: {r.status_code}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    debug_columns()
