import sys
import os
import logging
import yfinance as yf

# Setup path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.pulse_service import PulseScannerService
from app.data.index_constituents import NIFTY_FNO

# Mocking logging for clean output
logging.basicConfig(level=logging.INFO)

def test_scanner():
    print("🚀 Initializing Pulse Scanner Test...")
    scanner = PulseScannerService()
    
    # Test a small subset for speed
    test_tickers = ["RELIANCE.NS", "HDFCBANK.NS", "TCS.NS", "INFY.NS", "ADANIPOWER.NS"]
    print(f"📡 Scanning sample tickers: {test_tickers}")
    
    results = []
    print("-" * 50)
    for ticker in test_tickers:
        try:
            print(f"📡 Requesting: {ticker}...")
            # Fetch 15m intervals for the last day
            data = yf.download(ticker, period="1d", interval="15m", progress=False)
            
            if data.empty:
                print(f"   ⚠️ No data returned for {ticker}")
                continue
            
            # Robust extraction regardless of MultiIndex or Single Index
            # (yfinance behavior varies based on ticker count)
            if isinstance(data.columns, pd.MultiIndex):
                # If MultiIndex, the first level is Ticker or Price type
                # Standard GroupBy='ticker' or default download
                df = data[ticker] if ticker in data.columns.levels[0] else data
            else:
                df = data

            latest = df.iloc[-1]
            # Convert to float securely
            ltp = float(latest['Close'].iloc[0]) if isinstance(latest['Close'], pd.Series) else float(latest['Close'])
            high = float(df['High'].max().iloc[0]) if hasattr(df['High'].max(), 'iloc') else float(df['High'].max())
            low = float(df['Low'].min().iloc[0]) if hasattr(df['Low'].min(), 'iloc') else float(df['Low'].min())
            open_p = float(df.iloc[0]['Open'].iloc[0]) if hasattr(df.iloc[0]['Open'], 'iloc') else float(df.iloc[0]['Open'])
            
            day_change = ((ltp - open_p) / open_p) * 100
            
            print(f"   ✅ SUCCESS: {ticker}")
            print(f"      LTP: {ltp:.2f} | Open: {open_p:.2f} | Change: {day_change:.2f}%")
            print(f"      HOD: {high:.2f} | LOD: {low:.2f}")

            # For the TEST, we trigger on ANY active data to prove connectivity
            results.append({
                "symbol": ticker,
                "ltp": ltp,
                "trigger": "System Test (Data Active)",
                "change": round(day_change, 2)
            })
            
        except Exception as e:
            print(f"   ❌ ERROR for {ticker}: {str(e)}")
    
    print("-" * 50)
    print(f"\n🚀 TEST RESULTS: Found {len(results)} active tickers.")
    for p in results:
        print(f"   🔥 {p['symbol']}: {p['trigger']} | {p['change']}% | LTP: {p['ltp']}")

if __name__ == "__main__":
    import pandas as pd
    test_scanner()
