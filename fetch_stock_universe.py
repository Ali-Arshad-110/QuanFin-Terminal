import requests
import pandas as pd
import io

def fetch_all_nse_stocks():
    url = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        print(f"Fetching full NSE Equity list from {url}...")
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        # EQUITY_L.csv uses capitalized headers like SYMBOL, NAME OF COMPANY, etc.
        df = pd.read_csv(io.StringIO(response.text))
        
        # Clean column names (strip whitespace)
        df.columns = [c.strip() for c in df.columns]
        
        # Filter for only Equity ('EQ') to avoid ETFs and other instruments
        df = df[df['SERIES'].astype(str).str.strip() == 'EQ']
        
        # Format for TypeScript
        ts_content = "export interface Stock {\n    label: string;\n    symbol: string;\n    name: string;\n}\n\nexport const stockUniverse: Stock[] = [\n"
        
        # Also prepare for Python backend update
        py_content = "STOCK_UNIVERSE = [\n"
        
        for _, row in df.iterrows():
            symbol = str(row['SYMBOL']).strip()
            name = str(row['NAME OF COMPANY']).strip()
            
            # Escape quotes in company name
            name_clean = name.replace('"', '\\"')
            label = f"{symbol} - {name_clean}"
            
            ts_content += f'    {{ symbol: "{symbol}", name: "{name_clean}", label: "{label}" }},\n'
            py_content += f'    {{"symbol": "{symbol}", "name": "{name_clean}", "label": "{label}"}},\n'
            
        ts_content += "];\n"
        py_content += "]\n"
        
        with open("frontend/src/data/stockUniverse.ts", "w", encoding="utf-8") as f:
            f.write(ts_content)
            
        with open("backend/app/data/stock_universe.py", "w", encoding="utf-8") as f:
            f.write(py_content)
            
        print(f"Successfully expanded universe to {len(df)} stocks.")
        print("Updated frontend/src/data/stockUniverse.ts and backend/app/data/stock_universe.py")
        
    except Exception as e:
        print(f"Error fetching/parsing NSE stocks: {e}")

if __name__ == "__main__":
    fetch_all_nse_stocks()
