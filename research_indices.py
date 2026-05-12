import requests
import io
import pandas as pd

def check_indices():
    indices = {
        "Nifty 500": "https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv",
        "Nifty Total Market": "https://nsearchives.nseindia.com/content/indices/ind_niftytotalmarketlist.csv",
        "Nifty Microcap 250": "https://nsearchives.nseindia.com/content/indices/ind_niftymicrocap250list.csv",
        "Equity L (All)": "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    for name, url in indices.items():
        try:
            print(f"Checking {name}...")
            r = requests.get(url, headers=headers)
            r.raise_for_status()
            df = pd.read_csv(io.StringIO(r.text))
            print(f"  - Count: {len(df)}")
            print(f"  - Columns: {df.columns.tolist()}")
        except Exception as e:
            print(f"  - Error: {e}")

if __name__ == "__main__":
    check_indices()
