import sys
import argparse
import logging
import os
import time
from sqlalchemy import text, inspect

# Ensure we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load Env
from dotenv import load_dotenv
load_dotenv()

from app.database import sync_engine as engine, SessionLocal, check_lock
from app.models.instrument import Instrument, InstrumentMasterStatus
from app.services.instrument_master import InstrumentMasterService
from app.services.contract_resolver import ContractResolver

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_db_connection():
    logger.info("1. Testing DB Connection...")
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("   [OK] Connection Successful")
        
        # Create Tables
        from app.database import Base
        Base.metadata.create_all(bind=engine)
        logger.info("   [OK] Tables Created/Verified")
        
        return True
    except Exception as e:
        logger.error(f"   [FAIL] Connection Failed: {e}")
        return False

def test_table_status():
    logger.info("2. Checking Instrument Master Status...")
    db = SessionLocal()
    try:
        status = db.query(InstrumentMasterStatus).first()
        if status:
            logger.info(f"   [OK] Active Table: {status.active_table_name}")
            logger.info(f"   [OK] Hard Lock: {status.is_locked}")
            logger.info(f"   [OK] Last Sync: {status.last_sync_time}")
            return status.active_table_name
        else:
            logger.warning("   [WARN] No Status Row Found (Fresh DB?)")
            return None
    finally:
        db.close()

def test_resolver(active_table):
    logger.info("3. Testing Contract Resolver...")
    if not active_table:
        logger.warning("   [SKIP] No active table to resolve against.")
        return

    test_cases = [
        ("NIFTY 50", "EQ"), 
        ("RELIANCE", "EQ"), 
        ("CRUDEOIL", "FUT") # Will likely fail if data mock/missing
    ]
    
    for sym, type_ in test_cases:
        try:
            # We use the internal resolver logic
            # Note: Resolver logic depends on data being present
            logger.info(f"   Resolving {sym} ({type_})...")
            res = ContractResolver.resolve(sym, instrument_type=type_)
            if res:
                logger.info(f"   [OK] Resolved: {res}")
            else:
                logger.warning(f"   [MISS] Could not resolve {sym}")
        except Exception as e:
            logger.error(f"   [FAIL] Resolver Error: {e}")

def trigger_system_sync():
    logger.info("4. Triggering SYSTEM SYNC (Manual)...")
    try:
        logger.info("   Calling start_sync_job()...")
        success = InstrumentMasterService.start_sync_job()
        
        if success:
             logger.info("   [OK] Sync Job Returned Success")
        else:
             logger.error("   [FAIL] Sync Job Returned Failure")
             
    except Exception as e:
        logger.error(f"   [FAIL] Sync Execution Error: {e}")

def test_hard_lock():
    logger.info("5. Testing Hard Lock Mechanism...")
    # 1. Manually Lock
    db = SessionLocal()
    try:
        status = db.query(InstrumentMasterStatus).first()
        if not status: 
            status = InstrumentMasterStatus()
            db.add(status)
        
        status.is_locked = True
        db.commit()
        logger.info("   [INFO] DB Manually Locked")
        
        # 2. Try Check
        try:
            check_lock()
            logger.error("   [FAIL] check_lock() DID NOT raise exception!")
        except Exception as e:
             if "MARKET LOCK ACTIVE" in str(e):
                 logger.info("   [OK] check_lock() raised expected exception")
             else:
                 logger.error(f"   [FAIL] check_lock() raised wrong exception: {e}")
                 
        # 3. Unlock
        status.is_locked = False
        db.commit()
        logger.info("   [INFO] DB Unlocked")
        
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify Production Instrument Master")
    parser.add_argument("--sync", action="store_true", help="Trigger System Sync (Real)")
    parser.add_argument("--lock-test", action="store_true", help="Test Hard Lock")
    args = parser.parse_args()
    
    if test_db_connection():
        active_table = test_table_status()
        
        if active_table:
            test_resolver(active_table)
            
        if args.lock_test:
            test_hard_lock()
            
        if args.sync:
            trigger_system_sync()
