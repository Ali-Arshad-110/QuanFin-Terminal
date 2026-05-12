
import yfinance as yf
import pandas as pd

print("Testing yfinance...")
symbol = "RELIANCE.NS"

print(f"\n1. Testing yf.download('{symbol}')...")
try:
    df = yf.download(symbol, period="1d", progress=False)
    print("Download result:")
    print(df)
    if df.empty:
        print("!! DataFrame is empty !!")
except Exception as e:
    print(f"!! Download failed: {e}")

print(f"\n2. Testing yf.Ticker('{symbol}').fast_info...")
try:
    t = yf.Ticker(symbol)
    fi = t.fast_info
    print(f"fast_info type: {type(fi)}")
    # Print all keys/attributes if possible or just standard ones
    try:
        print(f"market_cap: {fi.market_cap}")
    except:
        print("market_cap attribute missing")
    try:
        print(f"last_price: {fi.last_price}")
    except:
        print("last_price attribute missing")
except Exception as e:
    print(f"!! Ticker/fast_info failed: {e}")

print(f"\n3. Testing yf.Ticker('{symbol}').info (Slow)...")
try:
    info = t.info
    print(f"marketCap from info: {info.get('marketCap')}")
    print(f"currentPrice from info: {info.get('currentPrice')}")
except Exception as e:
    print(f"!! info failed: {e}")
