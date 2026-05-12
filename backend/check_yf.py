
import yfinance as yf

indices = [
    "^NSEI", "NIFTYBEES.NS", 
    "^BSESN", 
    "^NSEBANK", "BANKBEES.NS", 
    "^CNXIT", "ITBEES.NS"
]

print(f"Checking data for: {indices}")

data = yf.download(" ".join(indices), period="2d", interval="1d", group_by="ticker", progress=False)

for ticker in indices:
    try:
        # Handle single ticker result vs multi
        if len(indices) == 1:
            df = data
        else:
            if ticker in data.columns.levels[0]:
                df = data[ticker]
            else:
                print(f"[FAIL] {ticker}: Not found in columns")
                continue
        
        if not df.empty and len(df) > 0:
            last_close = df['Close'].iloc[-1]
            print(f"[OK] {ticker}: {last_close}")
        else:
            print(f"[FAIL] {ticker}: Empty data")
    except Exception as e:
        print(f"[ERROR] {ticker}: {e}")
