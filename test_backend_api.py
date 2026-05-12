import urllib.request
import json
import sys

def test_api():
    ticker = "NIFTY 50"
    encoded_ticker = urllib.parse.quote(ticker)
    url = f"http://localhost:8000/api/v1/analyze/{encoded_ticker}?interval=5m"
    
    print(f"Fetching data from {url}...")
    try:
        with urllib.request.urlopen(url) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                print("Response received successfully.")
                
                if "data" in data and len(data["data"]) > 0:
                    print(f"Total records: {len(data['data'])}")
                    first_item = data["data"][0]
                    print("First record structure:")
                    print(json.dumps(first_item, indent=2))
                    
                    keys = first_item.keys()
                    print(f"Available keys: {list(keys)}")
                    
                    if "Date" not in keys and "date" not in keys and "Datetime" not in keys:
                         print("CRITICAL: No Date/Datetime key found!")
                    else:
                         print("Date key found.")
                else:
                    print("Response 'data' is empty or missing.")
            else:
                print(f"Error: Status Code {response.status}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_api()
