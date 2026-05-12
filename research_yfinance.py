import yfinance as yf
import json

def explore_stock_data(symbol):
    print(f"Fetching data for {symbol}...")
    ticker = yf.Ticker(symbol)
    
    # 1. Info Dictionary (Fundamentals, Profile, etc.)
    print("\n--- TICKER INFO KEYS ---")
    try:
        info = ticker.info
        print(list(info.keys()))
        # Print some interesting sample values
        samples = ["longName", "sector", "industry", "marketCap", "trailingPE", "forwardPE", "dividendYield", "fiftyTwoWeekHigh", "heldPercentInsiders", "shortRatio"]
        print("\n--- SAMPLE INFO VALUES ---")
        for s in samples:
            if s in info:
                print(f"{s}: {info[s]}")
    except Exception as e:
        print(f"Error fetching info: {e}")

    # 2. Financials
    print("\n--- FINANCIALS ---")
    try:
        print("Income Statement Columns:", ticker.income_stmt.columns)
        print("Balance Sheet Columns:", ticker.balance_sheet.columns)
        print("Cash Flow Columns:", ticker.cashflow.columns)
    except Exception as e:
        print(f"Error fetching financials: {e}")

    # 3. Recommendations / Sustainability
    print("\n--- OTHER ---")
    try:
        print("Recommendations head:\n", ticker.recommendations.head() if ticker.recommendations is not None else "None")
    except Exception as e:
        print(f"Error recommendations: {e}")
        
    try:
        print("Sustainability:\n", ticker.sustainability if ticker.sustainability is not None else "None")
    except Exception as e:
        print(f"Error sustainability: {e}")

if __name__ == "__main__":
    explore_stock_data("RELIANCE.NS")
