from app.database import AsyncSessionLocal
from app.market_data.redis_client import RedisClient
from sqlalchemy import text
from datetime import date
from typing import List, Dict, Any, Optional
import builtins
import logging

logger = logging.getLogger(__name__)

class OptionChainService:
    def __init__(self):
        self.redis = RedisClient()
        self._table_name = None

    async def get_chain(self, symbol: str, expiry: Optional[str] = None):
        try:
            if not self._table_name:
                from app.services.instrument_master import InstrumentMasterService
                self._table_name = InstrumentMasterService.get_active_table_name()
            
            table_name = self._table_name
            logger.info(f"Building option chain for {symbol} using table {table_name}")
            
            async with AsyncSessionLocal() as session:
                logger.debug("Resolving spot price...")
                spot_query = f"""
                    SELECT instrument_token, instrument_type, expiry, trading_symbol FROM {table_name}
                    WHERE symbol = :symbol 
                    AND instrument_type IN ('EQ', 'INDEX', 'FUT', 'FUTCOM')
                    AND exchange IN ('NSE', 'BSE', 'MCX')
                    ORDER BY 
                        CASE 
                            WHEN instrument_type = 'INDEX' THEN 1
                            WHEN instrument_type = 'EQ' THEN 2
                            WHEN instrument_type IN ('FUT', 'FUTCOM') THEN 3
                        END ASC,
                        expiry ASC NULLS LAST
                """
                spot_res = await session.execute(text(spot_query), {"symbol": symbol})
                spot_item = spot_res.fetchone()
                
                token = spot_item[0] if spot_item else None
                logger.info(f"Spot Token: {token}")
                
                spot_price = 0
                if token:
                    ltp_data = await self.redis.get_tick(str(token))
                    spot_price = ltp_data.get("ltp", 0) if ltp_data else 0
                
                logger.info(f"Spot Price: {spot_price}")
                
                # 2. Get Nearest Expiry if not provided
                if not expiry:
                    logger.debug("Fetching nearest expiry...")
                    expiry_query = text(f"SELECT DISTINCT expiry FROM {table_name} WHERE symbol = :symbol AND expiry IS NOT NULL AND expiry >= CURRENT_DATE ORDER BY expiry ASC LIMIT 1")
                    exp_res = await session.execute(expiry_query, {"symbol": symbol})
                    expiry_date = exp_res.scalar()
                else:
                    expiry_date = expiry

                logger.info(f"Expiry Date: {expiry_date}")
                
                atm_strike = round(float(spot_price / 100)) * 100 if spot_price > 0 else 0
                logger.info(f"ATM Strike: {atm_strike}")
                
                # Fetch Options near ATM
                options_query = text(f"""
                    SELECT instrument_token, trading_symbol, strike, option_type, expiry
                    FROM {table_name}
                    WHERE symbol = :symbol 
                    AND expiry = :expiry
                    AND instrument_type IN ('OPTIDX', 'OPTSTK', 'OPTFUT')
                    AND strike BETWEEN :lower AND :upper
                    ORDER BY strike ASC
                """)
                
                lower = atm_strike - 1000
                upper = atm_strike + 1000
                res_opt = await session.execute(options_query, {
                    "symbol": symbol,
                    "expiry": expiry_date,
                    "lower": lower,
                    "upper": upper
                })
                options = res_opt.fetchall()
                
                if not options:
                    return {"symbol": symbol, "error": f"No options found for {symbol} at {expiry_date}"}
                
                # Merge with Live Ticks
                tokens = [str(o[0]) for o in options] # o[0] is instrument_token
                ticks: Dict[str, Dict[str, Any]] = await self.redis.get_all_ticks(tokens)
                logger.info(f"Fetched {len(ticks)} ticks from Redis")
                
                chain_data = []
                strikes = sorted(list(set(o[2] for o in options))) # o[2] is strike
                
                for k in strikes:
                    ce = next((o for o in options if o[2] == k and o[3] == "CE"), None) # o[2] is strike, o[3] is option_type
                    pe = next((o for o in options if o[2] == k and o[3] == "PE"), None)
                    
                    ce_data = {"symbol": "", "token": "", "ltp": 0, "volume": 0, "oi": 0}
                    pe_data = {"symbol": "", "token": "", "ltp": 0, "volume": 0, "oi": 0}
                    
                    if ce:
                        t = ticks.get(str(ce[0]), {}) # ce[0] is instrument_token
                        ce_data = {
                            "symbol": ce[1], # o[1] is trading_symbol
                            "token": str(ce[0]),
                            "ltp": t.get("ltp", 0),
                            "volume": t.get("vol") or t.get("v") or 0,
                            "oi": t.get("oi", 0)
                        }
                    if pe:
                        t = ticks.get(str(pe[0]), {})
                        pe_data = {
                            "symbol": pe[1],
                            "token": str(pe[0]),
                            "ltp": t.get("ltp", 0),
                            "volume": t.get("vol") or t.get("v") or 0,
                            "oi": t.get("oi", 0)
                        }
                        
                    chain_data.append({
                        "strike_price": k,
                        "ce_token": ce_data.get("token"),
                        "ce_ltp": ce_data.get("ltp", 0),
                        "ce_oi": ce_data.get("oi", 0),
                        "ce_oi_change": 0,
                        "ce_volume": ce_data.get("volume", 0),
                        "ce_iv": 0,
                        "ce_delta": 0,
                        "pe_token": pe_data.get("token"),
                        "pe_ltp": pe_data.get("ltp", 0),
                        "pe_oi": pe_data.get("oi", 0),
                        "pe_oi_change": 0,
                        "pe_volume": pe_data.get("volume", 0),
                        "pe_iv": 0,
                        "pe_delta": 0
                    })
                    
                total_ce_oi = int(sum([float(c["ce_oi"]) for c in chain_data]))
                total_pe_oi = int(sum([float(c["pe_oi"]) for c in chain_data]))
                pcr = round(float(total_pe_oi / total_ce_oi), ndigits=4) if total_ce_oi > 0 else 0.0
                
                sentiment = "Neutral"

                if pcr > 1.2:
                    sentiment = "Bullish"
                elif pcr < 0.8:
                    sentiment = "Bearish"
                else:
                    sentiment = "Neutral"

                return {
                    "symbol": symbol,
                    "ltp": spot_price,
                    "expiry": str(expiry_date) if expiry_date else "No Expiry",
                    "atm_strike": atm_strike,
                    "pcr": pcr,
                    "sentiment": sentiment,
                    "total_ce_oi": total_ce_oi,
                    "total_pe_oi": total_pe_oi,
                    "strikes": chain_data
                }
        except Exception as e:
            logger.error(f"Error building option chain for {symbol}: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {"error": str(e)}
