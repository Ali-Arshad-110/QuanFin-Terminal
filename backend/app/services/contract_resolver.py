import logging
import re
from datetime import datetime, date, timedelta
from typing import Optional, Tuple, Dict, Union, List, Any
from sqlalchemy import text, and_, func # type: ignore
from sqlalchemy.orm import Session # type: ignore
from cachetools import TTLCache, cached # type: ignore
from app.database import SessionLocal, engine  # type: ignore
from app.models.instrument import InstrumentMasterStatus, InstrumentBase  # type: ignore
from app.services.instrument_master import InstrumentMasterService  # type: ignore

logger = logging.getLogger(__name__)

# Cache: 1000 items, expires in 1 hour (or until explicit clear)
resolver_cache = TTLCache(maxsize=1000, ttl=3600)

# RAM Cache (Global Dict)
# Format: { "TRADINGSYMBOL": (token, segment, lot_size), "TOKEN": "TRADINGSYMBOL" }
RAM_INSTRUMENT_CACHE: Dict[str, Any] = {}
RAM_TOKEN_MAP: Dict[Union[int, str], str] = {}

class SymbolNormalizer:
    """
    Normalizes user input to standard trading symbols.
    e.g., "banknifty" -> "BANKNIFTY", "reliance" -> "RELIANCE"
    """
    ALIAS_MAP = {
        "NIFTY": "NIFTY 50",
        "BANKNIFTY": "NIFTY BANK",
        "FINNIFTY": "NIFTY FIN SERVICE",
        "CRUDE": "CRUDEOIL",
        "GOLD": "GOLD",
        "SILVER": "SILVER",
        "NATURALGAS": "NATURALGAS",
        "NATGAS": "NATURALGAS",
        "COPPER": "COPPER",
        "ZINC": "ZINC",
        "LEAD": "LEAD",
        "ALUMINIUM": "ALUMINIUM",
        "ALUM": "ALUMINIUM",
        "MENTHAOIL": "MENTHAOIL",
        "COTTON": "COTTON",
        "CPO": "CPO",
        "USDINR": "USDINR",
        "EURINR": "EURINR",
        "GBPINR": "GBPINR",
        "JPYINR": "JPYINR"
    }

    @staticmethod
    def normalize(symbol: str) -> str:
        s = symbol.upper().strip()
        # Handle aliases
        return SymbolNormalizer.ALIAS_MAP.get(s, s)

class ContractResolver:
    """
    Resolves symbols to Instrument Tokens using the Active Instrument Table.
    """
    
    @staticmethod
    def _get_active_table():
        """Returns the Table object for the currently active instrument table."""
        table_name = InstrumentMasterService.get_active_table_name()
        return table_name

    @staticmethod
    def clear_cache():
        global RAM_INSTRUMENT_CACHE, RAM_TOKEN_MAP
        resolver_cache.clear()
        RAM_INSTRUMENT_CACHE.clear()
        RAM_TOKEN_MAP.clear()
        logger.info("Resolver Cache & RAM Cache Cleared")

    @staticmethod
    def reload_cache():
        """
        Loads ALL instruments into RAM for O(1) lookup.
        Target: All rows from the active instrument table (80,000+).
        This includes NSE, BSE, MCX, CDS — equities, futures, options, indices.
        """
        global RAM_INSTRUMENT_CACHE, RAM_TOKEN_MAP
        table_name = ContractResolver._get_active_table()
        logger.info(f"Reloading RAM Cache from {table_name} (ALL instruments)...")
        
        db = SessionLocal()
        try:
            # Load ALL instruments — no WHERE filter
            sql = f"""
                SELECT trading_symbol, symbol, instrument_token, exchange_segment, lot_size 
                FROM {table_name}
            """
            
            results = db.execute(text(sql)).fetchall()
            
            # Rebuild caches atomically
            new_cache: Dict[str, Any] = {}
            new_token_map: Dict[Union[int, str], str] = {}
            
            for r in results:
                tsym = r.trading_symbol
                symbol = r.symbol
                token = r.instrument_token
                seg = r.exchange_segment
                lot = r.lot_size
                
                # Forward Map: trading_symbol → (token, segment, lot_size)
                if tsym:
                    new_cache[tsym] = (token, seg, lot)
                
                # Also map by plain symbol (for equities like RELIANCE → token)
                # Only if not already present (first match wins, usually EQ)
                if symbol and symbol not in new_cache:
                    new_cache[symbol] = (token, seg, lot)
                
                # Reverse Map: token → trading_symbol
                if token and tsym:
                    new_token_map[int(token)] = tsym  # type: ignore
                    new_token_map[str(token)] = tsym  # type: ignore
            
            # Atomic swap
            RAM_INSTRUMENT_CACHE = new_cache
            RAM_TOKEN_MAP = new_token_map  # type: ignore
            
            logger.info(f"RAM Cache Reloaded: {len(RAM_INSTRUMENT_CACHE)} items, {len(results)} total rows")
            
        except Exception as e:
            logger.error(f"Failed to reload RAM cache: {e}")
        finally:
            db.close()

    @staticmethod
    @cached(cache=resolver_cache)
    def resolve(symbol: str, segment_hint: Optional[str] = None, instrument_type: Optional[str] = None, expiry: Optional[date] = None) -> Optional[Tuple[int, str, int]]:
        """
        Resolves a symbol to (instrument_token, exchange_segment, lot_size).
        
        Logic:
        0. RAM Cache Check
        1. Exact Match on trading_symbol
        2. Underlying Match (Equity)
        3. Derivatives Logic (Nearest Expiry)
        """
        normalized_symbol = SymbolNormalizer.normalize(symbol)
        
        # 0. RAM Cache Check (Fast Path)
        if normalized_symbol in RAM_INSTRUMENT_CACHE:
            return RAM_INSTRUMENT_CACHE[normalized_symbol]

        table_name = ContractResolver._get_active_table()
        db = SessionLocal()
        try:
            # 1. Exact Match (Trading Symbol)
            # e.g. RELIANCE-EQ, NIFTY24FEBFUT
            query = text(f"SELECT instrument_token, exchange_segment, lot_size FROM {table_name} WHERE trading_symbol = :sym")
            result = db.execute(query, {"sym": normalized_symbol}).first()
            if result:
                return result[0], result[1], result[2]
            
            # 1b. Case-Insensitive Match (Fallback for Indices like 'Nifty 50')
            query = text(f"SELECT instrument_token, exchange_segment, lot_size FROM {table_name} WHERE trading_symbol ILIKE :sym LIMIT 1")
            result = db.execute(query, {"sym": normalized_symbol}).first()
            if result:
                return result[0], result[1], result[2]

            # 2. Equity Match (Underlying)
            # e.g. RELIANCE -> NSE-EQ
            if not instrument_type and not expiry:
                query = text(f"SELECT instrument_token, exchange_segment, lot_size FROM {table_name} WHERE symbol = :sym AND instrument_type = 'EQ' LIMIT 1")
                result = db.execute(query, {"sym": normalized_symbol}).first()
                if result:
                    return result[0], result[1], result[2]

            # 3. Derivatives Match (Futures/Options)
            # e.g. NIFTY -> Nearest Future
            if not instrument_type:
                 # Default to FUT if no type specified for Index/Commodity
                 instrument_type = "FUT"
            
            # Expiry Logic
            today = date.today()
            
            # Construct Query for Derivatives
            # Rule: Filter by underlying, type, expiry >= today
            # Sort by expiry ASC
            
            base_query = f"""
                SELECT instrument_token, exchange_segment, lot_size, expiry 
                FROM {table_name} 
                WHERE underlying_symbol = :und 
                AND instrument_type = :type 
                AND expiry >= :today
            """
            params = {"und": normalized_symbol, "type": instrument_type, "today": today}
            
            if expiry:
                base_query += " AND expiry = :exp"
                params["exp"] = expiry
            
            base_query += " ORDER BY expiry ASC"
            
            results = db.execute(text(base_query), params).fetchall()
            
            if not results:
                return None
                
            # Selection Logic
            # The first result IS the nearest expiry
            res = results[0]
            return res[0], res[1], res[2]

        except Exception as e:
            logger.error(f"Resolution Failed for {symbol}: {e}")
            return None
        finally:
            db.close()

    @staticmethod
    def get_instrument_details(symbol: str) -> Optional[dict]:
        """
        Returns full instrument details: token, segment, lot_size, tick_size, expiry.
        """
        normalized_symbol = SymbolNormalizer.normalize(symbol)
        
        # Check RAM for token to reverse lookup? No, we need full details.
        
        table_name = ContractResolver._get_active_table()
        db = SessionLocal()
        
        try:
             # Common query logic (reusing similar path to resolve)
             # This is a bit duplicative but safer to keep separate for now.
             
             # 1. Exact Match
             query = text(f"SELECT * FROM {table_name} WHERE trading_symbol = :sym")
             result = db.execute(query, {"sym": normalized_symbol}).first()
             
             # 1b. Case-Insensitive Match (Fallback)
             if not result:
                query = text(f"SELECT * FROM {table_name} WHERE trading_symbol ILIKE :sym LIMIT 1")
                result = db.execute(query, {"sym": normalized_symbol}).first()

             # 2. Underlying Match (EQ)
             if not result:
                  query = text(f"SELECT * FROM {table_name} WHERE symbol = :sym AND instrument_type = 'EQ' LIMIT 1")
                  result = db.execute(query, {"sym": normalized_symbol}).first()
             
             # 3. Derivatives Match (FUT default)
             if not result:
                  today = date.today()
                  base_query = f"""
                    SELECT * 
                    FROM {table_name} 
                    WHERE underlying_symbol = :und 
                    AND instrument_type = 'FUT' 
                    AND expiry >= :today
                    ORDER BY expiry ASC
                    LIMIT 1
                  """
                  result = db.execute(text(base_query), {"und": normalized_symbol, "today": today}).first()
             
             if result:
                 return {
                     "instrument_token": result.instrument_token,
                     "exchange_segment": result.exchange_segment,
                     "symbol": result.symbol,
                     "trading_symbol": result.trading_symbol,
                     "lot_size": result.lot_size,
                     "tick_size": result.tick_size,
                     "expiry": result.expiry,
                     "instrument_type": result.instrument_type,
                     "underlying_symbol": result.underlying_symbol
                 }
                 
             return None

        except Exception as e:
            logger.error(f"Detail Resolution Failed for {symbol}: {e}")
            return None
        finally:
            db.close()

    @staticmethod
    def search_instruments(query_str: str, limit: int = 10):
        """
        Search for instruments by symbol or trading_symbol.
        """
        table_name = ContractResolver._get_active_table()
        db = SessionLocal()
        
        results = []
        seen_symbols = set()
        
        try:
            # Simple ILIKE search with priority
            # Sanitized query
            q = f"%{query_str}%"
            
            # Prioritize NSE EQ
            sql = f"""
                SELECT symbol, trading_symbol, instrument_token, exchange_segment 
                FROM {table_name} 
                WHERE (symbol ILIKE :q OR trading_symbol ILIKE :q)
                AND (instrument_type = 'EQ') AND exchange_segment = 'nse_cm'
                ORDER BY length(symbol) ASC
                LIMIT :limit
            """
            db_results = db.execute(text(sql), {"q": q, "limit": limit}).fetchall()
            
            for r in db_results:
                results.append({
                    "symbol": r.symbol,
                    "trading_symbol": r.trading_symbol,
                    "token": r.instrument_token,
                    "segment": r.exchange_segment,
                    "name": r.symbol # Fallback name
                })
                seen_symbols.add(r.symbol)
            
            # If fewer results, try Commodities/Futures
            if len(results) < limit:
                 limit_rem = limit - len(results)
                 sql_fo = f"""
                    SELECT symbol, trading_symbol, instrument_token, exchange_segment 
                    FROM {table_name} 
                    WHERE (symbol ILIKE :q OR trading_symbol ILIKE :q)
                    AND (instrument_type LIKE 'FUT%' OR exchange_segment = 'mcx_fo')
                    AND expiry >= CURRENT_DATE
                    ORDER BY length(symbol) ASC, expiry ASC
                    LIMIT :limit
                """
                 results_fo = db.execute(text(sql_fo), {"q": q, "limit": limit_rem}).fetchall()
                 for r in results_fo:
                     if r.symbol not in seen_symbols:
                         results.append({
                            "symbol": r.symbol,
                            "trading_symbol": r.trading_symbol,
                            "token": r.instrument_token,
                            "segment": r.exchange_segment,
                            "name": r.symbol
                         })
                         seen_symbols.add(r.symbol)
            
            # --- Fallback to NIFTY 500 Static List ---
            # If still fewer results, search in static Nifty 500 list
            # This ensures users can find stocks even if DB sync is incomplete
            if len(results) < limit:
                try:
                    from app.data.stock_universe import STOCK_UNIVERSE  # type: ignore
                    query_upper = query_str.upper()
                    
                    count: int = 0
                    needed = limit - len(results)
                    
                    for stock in STOCK_UNIVERSE:
                        if count >= needed:
                            break
                        
                        sym = stock["symbol"]
                        name = stock["name"]
                        
                        # Partial Match Check
                        if query_upper in sym or query_upper in name.upper():
                            if sym not in seen_symbols:
                                results.append({
                                    "symbol": sym,
                                    "trading_symbol": f"{sym}-EQ", # Guess standard format
                                    "token": None, # Unknown, will force Yahoo fallback
                                    "segment": "nse_cm",
                                    "name": name
                                })
                                seen_symbols.add(sym)
                                count = count + 1  # type: ignore
                                
                except ImportError:
                    logger.warning("STOCK_UNIVERSE data not found for fallback search")
                except Exception as e:
                    logger.error(f"Fallback search error: {e}")

            return results
            
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
        finally:
            db.close()

    @staticmethod
    def get_token(symbol):
        # Compatibility wrapper
        res = ContractResolver.resolve(symbol)
        if res:
            return res[0]
        return None
