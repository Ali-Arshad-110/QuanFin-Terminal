from app.services.symbol_resolver import SymbolResolver
from app.services.instrument_master import InstrumentMasterService
from app.database import SessionLocal, engine
from app.models.instrument import Base, Instrument
from datetime import date, timedelta

def test_resolver():
    print("-> Starting Test Script...")
    print("-> Initializing In-Memory DB for Testing Logic...")
    
    # Override DB for Testing (Use SQLite)
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.models.instrument import Base
    
    # Create In-Memory SQLite Engine
    test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestSession = sessionmaker(bind=test_engine)
    
    try:
        # Create Tables
        Base.metadata.create_all(bind=test_engine)
        print("OK: Check Tables Created")
    except Exception as e:
        print(f"ERROR: DB Init Failed: {e}")
        return

    # Insert Dummy Data for Testing
    session = TestSession()
    try:
        print("-> Inserting Mock Data...")
        
        # 1. Equity: RELIANCE
        rel = Instrument(
            instrument_token="12345", exchange_segment="nse_cm",
            trading_symbol="RELIANCE-EQ", name="RELIANCE", 
            instrument_type="EQ", lot_size=1, tick_size=0.05
        )
        
        # 2. Index: NIFTY 50 (Index Token)
        nifty_idx = Instrument(
            instrument_token="9999", exchange_segment="nse_cm",
            trading_symbol="Nifty 50", name="Nifty 50",
            instrument_type="INDEX", lot_size=0, tick_size=0.05
        )
        
        # 3. Future: NIFTY 27FEB FUT (Nearest)
        today = date.today()
        expiry_near = today + timedelta(days=20)
        expiry_far = today + timedelta(days=50)
        
        nifty_fut1 = Instrument(
            instrument_token="10001", exchange_segment="nse_fo",
            trading_symbol="NIFTY27FEBFUT", name="NIFTY",
            expiry=expiry_near, instrument_type="FUTIDX", underlying_symbol="NIFTY",
            lot_size=50, tick_size=0.05
        )
        
        nifty_fut2 = Instrument(
            instrument_token="10002", exchange_segment="nse_fo",
            trading_symbol="NIFTY27MARFUT", name="NIFTY",
            expiry=expiry_far, instrument_type="FUTIDX", underlying_symbol="NIFTY",
            lot_size=50, tick_size=0.05
        )
        
        # 4. Commodity: CRUDEOIL
        crude = Instrument(
            instrument_token="20001", exchange_segment="mcx_fo",
            trading_symbol="CRUDEOIL19FEBFUT", name="CRUDEOIL",
            expiry=expiry_near, instrument_type="FUT", underlying_symbol="CRUDEOIL",
            lot_size=100, tick_size=1.0
        )
        
        # Upsert
        for item in [rel, nifty_idx, nifty_fut1, nifty_fut2, crude]:
            session.merge(item)
        session.commit()
        print("OK: Mock Data Inserted")
        
        # Monkey Patch the session in SymbolResolver for this test context if needed?
        # SymbolResolver uses `SessionLocal()` from app.database
        # We need to mock SessionLocal to return our TestSession
        
        import app.services.symbol_resolver
        app.services.symbol_resolver.SessionLocal = TestSession
        
        # TEST CASES
        test_cases = [
            ("RELIANCE", "12345"),
            ("Nifty 50", "9999"), # Exact name match for index
            ("NIFTY 27FEB FUT", "10001"), 
            ("NIFTY FUT", "10001"),
            ("CRUDEOIL", "20001")
        ]
        
        print("\n-> Running Resolution Tests...")
        for sym, expected_token in test_cases:
            print(f"Resolving '{sym}'...")
            res = SymbolResolver.resolve_symbol(sym)
            if res:
                token = res['token']
                print(f"  -> Found: {res['trading_symbol']} (Token: {token})")
                if token == expected_token:
                    print("  PASS")
                else:
                    print(f"  FAIL (Expected {expected_token})")
            else:
                print("  FAIL (Not Found)")
                
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    test_resolver()
