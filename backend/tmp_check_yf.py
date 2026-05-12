import yfinance as yf
try:
    t = yf.Ticker('RELIANCE.NS')
    info = t.info
    print(f"Ticker: RELIANCE.NS")
    print(f"regularMarketPrice: {info.get('regularMarketPrice')}")
    print(f"currentPrice: {info.get('currentPrice')}")
    print(f"previousClose: {info.get('previousClose')}")
    print(f"regularMarketPreviousClose: {info.get('regularMarketPreviousClose')}")
    print(f"All Keys: {list(info.keys())[:50]}")
except Exception as e:
    print(f"Error: {e}")
