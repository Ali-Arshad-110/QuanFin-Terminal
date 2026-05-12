import yfinance as yf
from urllib.parse import urlparse

def check_logo_logic(symbol):
    print(f"--- Checking for {symbol} ---")
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        website = info.get('website', '')
        print(f"Website found: '{website}'")
        
        if website:
            domain = urlparse(website).netloc.replace('www.', '')
            print(f"Extracted Domain: '{domain}'")
            logo_url = f"https://logo.clearbit.com/{domain}"
            print(f"Generated Logo URL: {logo_url}")
        else:
            print("No website found in yfinance info.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_logo_logic("RELIANCE.NS")
    check_logo_logic("TCS.NS")
