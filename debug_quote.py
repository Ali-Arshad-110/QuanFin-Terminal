import yfinance as yf
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_fetch_quote(ticker):
    print(f"Testing quote fetch for: {ticker}")
    try:
        if not ticker.endswith(".NS") and not ticker.endswith(".BO"):
            ticker = f"{ticker}.NS"
        
        print(f"Formatted Ticker: {ticker}")
        stock = yf.Ticker(ticker)
        
        # This is the call that might be failing
        print("Fetching info...")
        info = stock.info
        
        print("Success! Keys found:", list(info.keys())[:5])
        print(f"Name: {info.get('longName')}")
        print(f"Sector: {info.get('sector')}")
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_fetch_quote("RELIANCE")
    test_fetch_quote("TCS")
