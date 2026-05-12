
import logging
import json
from app.processing.engine import MarketDataService, TechnicalAnalysisEngine

# Mock logger
logging.basicConfig(level=logging.DEBUG)

def test_fetch_no_pandas():
    mds = MarketDataService()
    ta = TechnicalAnalysisEngine()
    
    print("Fetching data for ICICIBANK...")
    try:
        data = mds.fetch_data("ICICIBANK.NS", interval="15m", period="5d")
        print(f"Data fetched! Count: {len(data)}")
        
        if not data:
            print("DATA IS EMPTY")
        else:
            print("First Record Raw:")
            print(data[0])
            
            analyzed = ta.analyze(data)
            print("Analyzed First Record:")
            print(analyzed[0])
            print("Analyzed Last Record:")
            print(analyzed[-1])
            
            # JSON Serializability Check
            json_str = json.dumps(analyzed[0])
            print("JSON Check PASS")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_fetch_no_pandas()
