import logging
import requests
import gzip
import csv
import io
import os
import json
import time
from datetime import datetime
from typing import List, Dict, Optional, Any, cast, Sequence
from sqlalchemy import text, MetaData, Table, Column, Integer, String, Float, Date, DateTime, Index
from app.database import SessionLocal, sync_engine
from app.models.instrument import InstrumentMasterStatus, InstrumentAudit

# Configure logging
logger = logging.getLogger(__name__)

class InstrumentMasterService:
    # Kotak API Endpoints
    KOTAK_SCRIP_MASTER_URL = "/script-details/1.0/masterscrip/file-paths" # Relative to base_url
    
    @staticmethod
    def _log_audit(event, status, message=None, metadata=None):
        """Helper to log critical events to DB"""
        db = SessionLocal()
        try:
            audit = InstrumentAudit(
                event=event,
                status=status,
                message=message,
                metadata_info=json.dumps(metadata) if metadata else None
            )
            db.add(audit)
            db.commit()
        except Exception as e:
            logger.error(f"Audit log failed: {e}")
        finally:
            db.close()

    @staticmethod
    def _system_login(max_retries=3):
        """
        Performs a standalone login using .env credentials.
        Leverages KotakService for robust REST-based login if NeoAPI is missing.
        Returns a requests.Session with authenticated headers.
        """
        from app.execution.kotak_service import KotakService
        ks = KotakService()
        
        attempt = 0
        while attempt < max_retries:
            try:
                # 1. Load Creds
                userid = os.getenv("KOTAK_MOBILE") or os.getenv("KOTAK_USER_ID") # Mobile Number
                password = os.getenv("KOTAK_PASSWORD") or os.getenv("KOTAK_USER_PASSWORD") # MPIN or Password
                consumer_key = os.getenv("KOTAK_CONSUMER_KEY")
                consumer_secret = os.getenv("KOTAK_CONSUMER_SECRET")
                
                # Auto-generate TOTP using Secret if available (for system sync)
                totp_secret = os.getenv("KOTAK_TOTP_SECRET")
                otp = None
                if totp_secret:
                    try:
                        import pyotp
                        otp = pyotp.TOTP(totp_secret).now()
                    except:
                        pass
                
                if not otp:
                     # Fallback to static OTP or manual intervention (unlikely to work for background sync)
                     otp = os.getenv("KOTAK_OTP")

                logger.info(f"System Login Sync Attempt {attempt+1}...")

                # 2. Login via KotakService (Handles REST & NeoAPI fallback)
                # Step 1
                res1 = ks.login_step1(userid, os.getenv("KOTAK_UCC"), otp, consumer_key, consumer_secret)
                if res1.get("status") != "success":
                     raise Exception(f"Step 1 Failed: {res1.get('message')}")
                
                # Step 2
                mpin = (os.getenv("KOTAK_MPIN") or password).strip() # Robustness
                res2 = ks.login_step2(mpin) 
                if res2.get("status") != "success":
                     raise Exception(f"Step 2 Failed: {res2.get('message')}")
                
                # 3. Construct Session from KotakService state
                session = requests.Session()
                # Doc says: Authorization: <plain dashbaord token>
                # Dashboard token is usually the CONSUMER_KEY.
                session.headers.update({
                    "Authorization": consumer_key, 
                    "neo-fin-key": "neotradeapi"
                })
                
                # Store base_url in session for later use
                session.base_url = ks.base_url
                
                logger.info(f"System Login Successful via KotakService. BaseURL: {ks.base_url}")
                return session

            except Exception as e:
                attempt += 1
                logger.error(f"System Login Failed (Attempt {attempt}/{max_retries}): {e}")
                time.sleep(2)
                
        raise Exception("System Login Failed after max retries")

    @staticmethod
    def start_sync_job():
        """
        Main Entry Point for Background Sync.
        """
        if not os.getenv("KOTAK_CONSUMER_KEY"):
             logger.warning("Sync aborted: No Kotak credentials found.")
             InstrumentMasterService._log_audit("SYNC_ABORT", "FAILED", "Missing credentials")
             return False
             
        InstrumentMasterService._log_audit("SYNC_START", "INIT", "Starting daily sync job")
        
        # 1. Check Hard Lock
        db = SessionLocal()
        try:
            status = db.query(InstrumentMasterStatus).first()
            if status and status.is_locked:
                logger.error("Sync aborted: DB is HARD LOCKED.")
                InstrumentMasterService._log_audit("SYNC_ABORT", "FAILED", "Database is locked")
                return False
        finally:
            db.close()

        try:
            # 2. System Login
            session = InstrumentMasterService._system_login()
            
            # 3. Download with Retry
            content = InstrumentMasterService._download_file(session)
            
            # 4. Parse & Validate
            rows = InstrumentMasterService._parse_and_validate(content)
            
            # 5. Atomic Update
            InstrumentMasterService._atomic_update(rows)
            
            # 6. Refresh RAM Cache
            # Avoid circular import by importing here
            from app.services.contract_resolver import ContractResolver
            try:
                ContractResolver.reload_cache()
                logger.info("RAM Cache Reloaded via Sync")
            except Exception as e:
                logger.error(f"Cache reload failed: {e}")

            InstrumentMasterService._log_audit("SYNC_COMPLETE", "SUCCESS", f"Processed {len(rows)} rows")
            return True

        except Exception as e:
            logger.error(f"Sync Execution Failed: {e}")
            InstrumentMasterService._log_audit("SYNC_ERROR", "FAILED", str(e))
            return False

    @staticmethod
    def _download_file(session, max_retries=3):
        """
        Refactored to support Kotak's 2-step download:
        1. Fetch File Paths
        2. Download Each CSV
        """
        base_url = getattr(session, 'base_url', "https://neotradeapi.kotaksecurities.com")
        path_url = f"{base_url}{InstrumentMasterService.KOTAK_SCRIP_MASTER_URL}"
        
        attempt = 0
        while attempt < max_retries:
            try:
                logger.info(f"Fetching Scrip Master Paths... (Attempt {attempt+1})")
                resp = session.get(path_url, timeout=15)
                
                if resp.status_code != 200:
                    logger.warning(f"Path fetch failed: {resp.status_code} {resp.text}")
                    attempt += 1
                    continue
                
                data = resp.json()
                file_urls = data.get("data", {}).get("filesPaths", [])
                
                if not file_urls:
                    raise Exception(f"No file paths returned from API: {data}")
                
                all_contents = []
                for url in file_urls:
                    logger.info(f"Downloading segment from: {url.split('/')[-1]}")
                    # Note: Segment downloads might need a different header or be public
                    seg_resp = requests.get(url, timeout=30)
                    if seg_resp.status_code == 200:
                        all_contents.append(seg_resp.content)
                    else:
                        logger.warning(f"Failed to download segment {url}: {seg_resp.status_code}")
                
                if not all_contents:
                    raise Exception("No segments downloaded successfully")
                
                return all_contents

            except Exception as e:
                logger.error(f"Download error: {e}")
            
            attempt += 1
            time.sleep(3)
            
        raise Exception("Download failed after max retries")

    @staticmethod
    def _parse_and_validate(contents_list):
        """
        Parses multiple CSV contents and combines them.
        """
        all_rows = []
        for content in contents_list:
            # Check if gzipped (unlikely for new API but safe)
            if content.startswith(b'\x1f\x8b'):
                try:
                    decoded = gzip.decompress(content).decode('utf-8')
                except:
                    decoded = content.decode('utf-8', errors='ignore')
            else:
                decoded = content.decode('utf-8', errors='ignore')
            
            lines = decoded.splitlines()
            if len(lines) > 1:
                # Merge logic: We need to handle headers but bulk_insert uses DictReader
                # So we just collect raw strings for now or return list of contents
                all_rows.append(decoded)
        
        total_rough_rows = sum(len(c.splitlines()) for c in all_rows)
        logger.info(f"Combined total rough rows: {total_rough_rows}")
        
        # VALIDATION GATES
        if total_rough_rows < 80000:
             # Relaxing slightly as segments might vary
             if total_rough_rows < 50000:
                raise Exception(f"Validation Failed: Total row count {total_rough_rows} is too low")
        
        return all_rows

    @staticmethod
    def _atomic_update(csv_rows):
        """
        Creates new table, inserts data, and updates pointer.
        """
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_table_name = f"instruments_{ts}"
        
        # 1. Define New Table Dynamic Model
        metadata = MetaData()
        new_table = Table(
            new_table_name, metadata,
            Column("instrument_token", Integer, primary_key=True),
            Column("exchange_segment", String, primary_key=True),
            Column("symbol", String, index=True),
            Column("trading_symbol", String, index=True),
            Column("instrument_type", String, index=True),
            Column("lot_size", Integer),
            Column("tick_size", Float),
            Column("expiry", Date, nullable=True, index=True),
            Column("strike", Float, nullable=True),
            Column("option_type", String, nullable=True),
            Column("underlying_symbol", String, index=True),
            Column("exchange", String, index=True),
            Column("last_update", DateTime),
            Index(f'idx_token_seg_{ts}', 'instrument_token', 'exchange_segment'),
            Index(f'idx_seg_und_exp_{ts}', 'exchange_segment', 'underlying_symbol', 'expiry'),
            Index(f'idx_und_typ_exp_{ts}', 'underlying_symbol', 'instrument_type', 'expiry'),
        )
        
        # 2. Create Table
        with sync_engine.connect() as conn:
            metadata.create_all(conn)
            conn.execute(text("COMMIT")) # Ensure it's permanent
        
        # Helper for robust parsing
        def safe_int(val, default=0):
            try:
                if not val: return default
                # Remove any quote/space
                clean = str(val).strip().split('.')[0] # handle '123.0'
                if not clean: return default
                return int(clean)
            except: return default

        def safe_float(val, default=0.0):
            try:
                if not val: return default
                return float(str(val).strip())
            except: return default

        # 3. Bulk Insert
        bulk_data: list = []
        processed_tokens = set() # Prevent duplicate primary keys
        
        for csv_text in csv_rows:
            f = io.StringIO(csv_text)
            csv_reader = csv.DictReader(f)
            # Trim and clean keys (remove semicolons like in 'dStrikePrice;')
            fieldnames = csv_reader.fieldnames
            if fieldnames is not None:
                # Clean headers
                cleaned_headers = list([k.strip().split(';')[0].strip() if k else k for k in (fieldnames or [])])
                csv_reader.fieldnames = cleaned_headers
                # Use a local slice to avoid any ambiguity
                header_slice: List[str] = cleaned_headers[0:12]
                logger.info(f"Inserting segment. Headers: {header_slice}...")
            else:
                logger.info("Inserting segment. No headers found.")
            
            for row in csv_reader:
                # Trim values
                row = { (k.strip() if k else k): (v.strip() if v else v) for k, v in row.items() }
                
                # Mapping as per Kotak Debug Output
                # pSymbol = Token (numerical), pScripRefKey = Symbol/Name, pTrdSymbol = Trading Symbol
                token_raw = row.get('pSymbol')
                
                # Validation: must be numeric
                if not token_raw or not any(c.isdigit() for c in str(token_raw)):
                    continue
                
                token = safe_int(token_raw)
                seg = row.get('pExchSeg', 'nse_cm').lower()
                
                composite_key = (token, seg)
                if token == 0 or composite_key in processed_tokens: 
                    continue # Skip 0, invalid or duplicate in SAME segment
                
                processed_tokens.add(composite_key)
                
                # Standardize Equity Types
                inst_type = row.get('pInstType', '')
                if not inst_type and seg.endswith('_cm'):
                    inst_type = 'EQ'
                
                # Expiry Parsing
                expiry_raw = row.get('iExpiryDate', row.get('pExpDate', row.get('pExpiryDate')))
                expiry_date = None
                if expiry_raw and str(expiry_raw) not in ['0', 'None', '']:
                    # Check if epoch (MCX style: e.g. 1774396799)
                    val_str = str(expiry_raw).strip()
                    if val_str.replace('.', '').isdigit() and float(val_str) > 10**8:
                        try:
                            expiry_date = datetime.fromtimestamp(int(float(val_str))).date()
                        except: pass
                    
                    if not expiry_date:
                        for fmt in ["%d-%b-%Y", "%d%b%Y", "%Y-%m-%d"]:
                            try:
                                expiry_date = datetime.strptime(expiry_raw, fmt).date()
                                break
                            except: continue

                # Clean Symbol Logic for Equities
                raw_sym = row.get('pScripRefKey') or row.get('pSymbolName', '')
                clean_sym = raw_sym.replace('-EQ', '').strip() if seg.endswith('_cm') else raw_sym
                
                inst = {
                    "instrument_token": token,
                    "exchange_segment": seg,
                    "symbol": clean_sym,
                    "trading_symbol": row.get('pTrdSymbol', raw_sym),
                    "instrument_type": inst_type,
                    "lot_size": safe_int(row.get('lLotSize', row.get('pLotSize', 1)), 1),
                    "tick_size": safe_float(row.get('pTickSize', row.get('dTickSize', 0.05)), 0.05),
                    "expiry": expiry_date,
                    "strike": safe_float(row.get('pStrikePrice', row.get('dStrikePrice', 0.0))),
                    "option_type": row.get('pOptionType', ''),
                    "underlying_symbol": (row.get('pSymbolName') or row.get('pScripRefKey') or '').split(' ')[0],
                    "exchange": seg.split('_')[0].upper() if '_' in seg else "NSE", 
                    "last_update": datetime.now()
                }
                
                # MCX Strike Scaling: if dStrikePrice is used and segment is mcx_fo, scale by 100
                strike_val = inst.get("strike")
                if seg == 'mcx_fo' and strike_val is not None:
                     # Convert to float to be safe for comparison
                     try:
                         f_strike = float(strike_val)
                         if f_strike > 0:
                             d_strike = row.get('dStrikePrice')
                             if d_strike and f_strike > 5000: 
                                  inst["strike"] = float(f_strike / 100)
                     except (ValueError, TypeError):
                         pass

                bulk_data.append(inst)
            
                if len(bulk_data) >= 2000:
                    try:
                        with sync_engine.begin() as conn:
                            conn.execute(new_table.insert(), bulk_data)
                    except Exception as e:
                        logger.error(f"Bulk Insert Chunk Failed: {e}")
                        # Log one sample to see content
                        if bulk_data: logger.error(f"Sample data chunk 0: {bulk_data[0]}")
                        raise e
                    bulk_data = []
        
        if bulk_data:
             with sync_engine.begin() as conn:
                 conn.execute(new_table.insert(), bulk_data)
            
        # 4. Update Pointer (Atomic Swap)
        db = SessionLocal()
        try:
            status = db.query(InstrumentMasterStatus).first()
            if not status:
                status = InstrumentMasterStatus()
                db.add(status)
            
            # Keep backup history
            backups = json.loads(status.backup_tables) if status.backup_tables else []
            if status.active_table_name:
                backups.append(status.active_table_name)
            
            # Keep last 3
            while len(backups) > 3:
                oldest = backups.pop(0)
                # Drop oldest table
                try:
                    with sync_engine.connect() as conn:
                        conn.execute(text(f"DROP TABLE IF EXISTS {oldest}"))
                        conn.commit()
                except Exception as e:
                    logger.error(f"Failed to drop old table {oldest}: {e}")
            
            status.backup_tables = json.dumps(backups)
            status.active_table_name = new_table_name
            status.last_sync_time = datetime.now()
            db.commit()
            
            logger.info(f"Swapped to new table: {new_table_name}")
            
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()

    @staticmethod
    def get_active_table_name():
        db = SessionLocal()
        try:
            status = db.query(InstrumentMasterStatus).first()
            return status.active_table_name if status else "instruments" 
        finally:
            db.close()
