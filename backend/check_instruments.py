import sys
import os

# Setup path
current_dir = os.path.dirname(os.path.abspath(__file__)) # backend
site_packages = os.path.join(current_dir, 'Lib', 'site-packages')
if os.path.exists(site_packages):
    sys.path.insert(0, site_packages)
sys.path.insert(0, current_dir)

from sqlalchemy import text
from app.database import SessionLocal
from app.services.instrument_master import InstrumentMasterService

def check_db():
    db = SessionLocal()
    try:
        table = InstrumentMasterService.get_active_table_name()
        print(f"Active Table: {table}")
        
        # Check count of NSE EQ
        sql = f"SELECT count(*) FROM {table} WHERE exchange_segment = 'nse_cm' AND instrument_type = 'EQ'"
        count = db.execute(text(sql)).scalar()
        print(f"NSE EQ Count: {count}")
        
        # Check a sample Nifty 500 stock (Clean symbol)
        sample = "RELIANCE"
        sql_sample = f"SELECT instrument_token, symbol, trading_symbol, exchange_segment, instrument_type FROM {table} WHERE symbol = :s AND exchange_segment = 'nse_cm' AND instrument_type = 'EQ'"
        res = db.execute(text(sql_sample), {"s": sample}).first()
        print(f"Sample '{sample}': {res if res else 'Not Found'}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_db()
