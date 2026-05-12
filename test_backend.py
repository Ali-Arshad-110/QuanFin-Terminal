import sys
import os

# Add backend to path
sys.path.append(os.path.abspath("backend"))

from app.processing.engine import MarketDataService, TechnicalAnalysisEngine

def test_backend():
    print("Testing MarketDataService...")
    service = MarketDataService()
    try:
        df = service.fetch_data("RELIANCE.NS", interval="5m", period="1d")
        print(f"Data Fetched: {len(df)} rows")
        print(df.head())
        
        if df.empty:
            print("ERROR: No data fetched.")
            return

        print("\nTesting TechnicalAnalysisEngine...")
        engine = TechnicalAnalysisEngine()
        analyzed = engine.analyze(df)
        print("Analysis Complete.")
        print(analyzed[['close', 'rsi', 'vwap']].tail())
        
    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    test_backend()
