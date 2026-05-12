
import yfinance as yf
import pandas as pd
import logging

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

INDEX_UNIVERSE = {
    "NIFTY50":      {"candidates": ["^NSEI", "NIFTYBEES.NS", "NIFTY.NS"],      "name": "NIFTY 50",        "marketCap": 350,  "sector": "Broad"},
    "SENSEX":       {"candidates": ["^BSESN", "SENSEX.BO"],     "name": "SENSEX",          "marketCap": 320,  "sector": "Broad"},
}

def check():
    # Collect all unique candidate tickers
    all_candidates = set()
    for v in INDEX_UNIVERSE.values():
        for c in v["candidates"]:
            all_candidates.add(c)
    
    # Add a KNOWN BAD ticker to test partial failure
    all_candidates.add("INVALID_TICKER_XYZ")
    
    yahoo_tickers = list(all_candidates)
    ticker_str = " ".join(yahoo_tickers)
    
    print(f"Downloading tickers: {ticker_str}")
    
    # Fetch 5 days of data
    df = yf.download(ticker_str, period="5d", interval="1d", group_by="ticker", progress=False)
    
    print(f"Data Shape: {df.shape}")
    print(f"Columns Type: {type(df.columns)}")
    
    if isinstance(df.columns, pd.MultiIndex):
        print("Columns Levels:", df.columns.levels)
    else:
        print("Columns:", df.columns)
        
    # Simulation of extraction logic
    print("\n--- Testing Extraction Logic ---")
    for idx, meta in INDEX_UNIVERSE.items():
        found = False
        for yf_sym in meta["candidates"]:
            print(f"Checking {idx} candidate: {yf_sym}")
            
            dc = None
            if isinstance(df.columns, pd.MultiIndex):
                if yf_sym in df.columns.levels[0]:
                    print(f"  -> Found in MultiIndex")
                    dc = df[yf_sym]["Close"]
                else:
                    print(f"  -> Not Level 0")
            elif len(yahoo_tickers) == 1:
                print(f"  -> Single requested, taking all")
                dc = df["Close"]
            else:
                 print(f"  -> FLAT DF BUT MULTIPLE REQUESTED. AMBIGUOUS!")
            
            if dc is not None and not dc.empty:
                print(f"  -> SUCCESS! Got {len(dc)} rows")
                found = True
                break
        
        if not found:
            print(f"FAILED to find data for {idx}")

if __name__ == "__main__":
    check()
