
import yfinance as yf
try:
    t = yf.Ticker("RELIANCE.NS")
    print(f"Type of fast_info: {type(t.fast_info)}")
    
    try:
        print(f"fast_info.get('market_cap'): {t.fast_info.get('market_cap')}")
    except Exception as e:
        print(f"fast_info.get failed: {e}")
        
    try:
        print(f"fast_info['marketCap']: {t.fast_info['marketCap']}")
    except Exception as e:
        print(f"fast_info['marketCap'] failed: {e}")

    try:
        print(f"fast_info.market_cap: {t.fast_info.market_cap}")
    except Exception as e:
        print(f"fast_info.market_cap failed: {e}")
        
except Exception as e:
    print(f"Error: {e}")
