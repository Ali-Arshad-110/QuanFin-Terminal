
import yfinance as yf
import pandas as pd

def test_fetch():
    sym = "^NSEI"
    print(f"Downloading {sym}...")
    d_df = yf.download(sym, period="30d", interval="1d", progress=False)
    
    print("Type:", type(d_df))
    print("Shape:", d_df.shape)
    print("Columns:", d_df.columns)
    
    if hasattr(d_df.columns, 'levels'):
        print("MultiIndex Levels:", d_df.columns.levels)
        
    try:
        dc = d_df["Close"]
        print("dc type:", type(dc))
        print("dc shape:", dc.shape)
        print("dc head:", dc.head())
    except Exception as e:
        print(f"Error accessing ['Close']: {e}")

    # Test DataFrame construction
    try:
        df = pd.DataFrame({"test": dc})
        print("DataFrame construction success")
    except Exception as e:
        print(f"DataFrame construction died: {e}")

if __name__ == "__main__":
    test_fetch()
