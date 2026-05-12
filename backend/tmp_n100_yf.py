import yfinance as yf
import pandas as pd
from app.data.index_constituents import INDEX_MAP

symbols = INDEX_MAP.get("NIFTY100", [])
print(f"Symbols Count: {len(symbols)}")

data = yf.download(symbols, period="1mo", progress=False)
if "Close" in data:
    close_df = data["Close"]
    print(f"Close DF Shape: {close_df.shape}")
    print(f"Last 5 rows of first 5 symbols:\n{close_df.iloc[:, :5].tail()}")
    
    # Check for NaNs in iloc[-2]
    if len(close_df) > 1:
        prev_close = close_df.iloc[-2]
        nan_count = prev_close.isna().sum()
        print(f"NaN count in prev_close: {nan_count} out of {len(symbols)}")
else:
    print("Close not in data")
