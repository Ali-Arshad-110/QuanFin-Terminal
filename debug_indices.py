# pyre-ignore-all-errors
import yfinance as yf
import pandas as pd

print("--- Debugging Indices Fetching ---")

# Copying lists exactly from main.py
NIFTY_50_STOCKS = [
    "ADANIENT.NS", "ADANIPORTS.NS", "APOLLOHOSP.NS", "ASIANPAINT.NS", "AXISBANK.NS",
    "BAJAJ-AUTO.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS", "BPCL.NS", "BHARTIARTL.NS",
    "BRITANNIA.NS", "CIPLA.NS", "COALINDIA.NS", "DIVISLAB.NS", "DRREDDY.NS",
    "EICHERMOT.NS", "GRASIM.NS", "HCLTECH.NS", "HDFCBANK.NS", "HDFCLIFE.NS",
    "HEROMOTOCO.NS", "HINDALCO.NS", "HINDUNILVR.NS", "ICICIBANK.NS", "INDUSINDBK.NS",
    "INFY.NS", "ITC.NS", "JSWSTEEL.NS", "KOTAKBANK.NS", "LT.NS",
    "LTM.NS", "M&M.NS", "MARUTI.NS", "NESTLEIND.NS", "NTPC.NS",
    "ONGC.NS", "POWERGRID.NS", "RELIANCE.NS", "SBILIFE.NS", "SBIN.NS",
    "SUNPHARMA.NS", "TMCV.NS", "TATASTEEL.NS", "TCS.NS", "TATACONSUM.NS",
    "TECHM.NS", "TITAN.NS", "ULTRACEMCO.NS", "UPL.NS", "WIPRO.NS"
]

BANK_NIFTY_STOCKS = [
    "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "AXISBANK.NS",
    "INDUSINDBK.NS", "BANKBARODA.NS", "PUNJABNB.NS", "IDFCFIRSTB.NS", "AUBANK.NS",
    "FEDERALBNK.NS", "BANDHANBNK.NS"
]

def test_fetch(name, stocks):
    print(f"\nTesting {name} ({len(stocks)} stocks)...")
    tickers_str = " ".join(stocks)
    try:
        data = yf.download(tickers_str, period="2d", interval="1d", progress=True, group_by='ticker')
        print(f"Fetch success. Data Shape: {data.shape}")
        
        # Simulate parsing logic
        success_count = 0
        for stock_symbol in stocks:
            try:
                if len(stocks) == 1:
                    df = data
                else:
                    df = data[stock_symbol]
                
                if not df.empty and len(df) >= 1:
                    success_count += 1
                else:
                    print(f"WARN: No data for {stock_symbol}")
            except Exception as e:
                print(f"ERROR processing {stock_symbol}: {e}")
        
        print(f"Successfully parsed {success_count}/{len(stocks)} stocks.")
        
    except Exception as e:
        print(f"FATAL ERROR downloading {name}: {e}")

test_fetch("BANK NIFTY", BANK_NIFTY_STOCKS)
test_fetch("NIFTY 50", NIFTY_50_STOCKS)
