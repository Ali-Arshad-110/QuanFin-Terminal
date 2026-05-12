# pyre-ignore-all-errors
"""
Network Map Service — Quantitative Market Intelligence Engine
Fetches real index data from Yahoo Finance, computes:
  1. Pearson Correlation Matrix
  2. Lead-Lag (lagged cross-correlation)
  3. Market Regime Detection (rule-based from VIX + breadth)
  4. Sector Rotation (RS Momentum)
  5. Correlation Breakdown Detection
  6. Volatility Pressure (ATR ratio)
  7. Event Detection (abnormal moves)
  8. Market Breadth Strength Score
"""

import logging
import builtins
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set
from concurrent.futures import ThreadPoolExecutor
from app.data.index_constituents import INDEX_MAP

logger = logging.getLogger(__name__)

from app.data.constants import (
    INDEX_UNIVERSE, 
    SECTOR_DATA,
    NIFTY_50_MAPPING, 
    BANKNIFTY_MAPPING, 
    NIFTYIT_MAPPING, 
    NIFTYAUTO_MAPPING, 
    NIFTYFMCG_MAPPING,
    SENSEX_MAPPING
)

class NetworkMapService:
    """Computes the entire network map payload from real Yahoo Finance data."""

    _cache: Optional[Dict] = None
    _cache_ts: Optional[datetime] = None
    CACHE_TTL_SECONDS = 60  # 1-minute cache

    @classmethod
    def get_network_data(cls) -> Dict[str, Any]:
        """Main entry — returns the full networkmap JSON payload."""
        now = datetime.utcnow()
        try:
            payload = cls._compute()
            if payload is None:
                raise ValueError("Compute returned None")
            # Sanitize payload to remove NaNs which break JSON compliance
            payload = cls._sanitize_payload(payload)
            
            cls._cache = payload
            cls._cache_ts = now
            return payload
        except Exception as e:
            logger.error(f"NetworkMapService compute error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            # Return last cache if available, else empty
            if cls._cache:
                return cls._cache
            return {"nodes": {}, "links": [], "regime": "unknown", "timestamp": now.isoformat()}

    @classmethod
    def _sanitize_payload(cls, data: Any) -> Any:
        """Recursively replace NaN/Inf with None/0 for JSON safety."""
        import math
        if isinstance(data, dict):
            return {k: cls._sanitize_payload(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [cls._sanitize_payload(i) for i in data]
        elif isinstance(data, float):
            if math.isnan(data) or math.isinf(data):
                return 0.0
            return data
        return data

    @classmethod
    def get_constituents(cls, index_symbol: str) -> List[Dict[str, Any]]:
        """
        Fetches constituents for an index including Market Cap.
        For NIFTY 50, it groups them by SECTOR for the visual tree/sankey.
        """
        import yfinance as yf
        import pandas as pd
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        # 0. Normalize the input for robust lookup
        idx_upper = index_symbol.upper()
        idx_clean = idx_upper.replace(" ", "")

        # 1. Check expanded index mapping first
        # Try exact upper-case match (e.g. "NIFTY 50")
        if idx_upper in INDEX_MAP:
            target_sector_name = index_symbol
            stocks = INDEX_MAP[idx_upper]
            mapping = {stock: target_sector_name for stock in stocks}
        
        # Try clean match (e.g. "NIFTY50")
        elif idx_clean in INDEX_MAP:
            target_sector_name = index_symbol
            stocks = INDEX_MAP[idx_clean]
            mapping = {stock: target_sector_name for stock in stocks}

        # Check standard indices maps (backwards compatibility)
        elif idx_upper in ["^NSEI", "NIFTY 50", "INDIA_MARKET", "NIFTY50"]:
            mapping = NIFTY_50_MAPPING
        elif idx_upper in ["^BSESN", "SENSEX", "SENSEX.BO"]:
            mapping = SENSEX_MAPPING
        elif idx_upper in ["^NSEBANK", "BANKNIFTY", "BANK NIFTY"]:
            mapping = BANKNIFTY_MAPPING
        elif idx_upper in ["^CNXIT", "NIFTYIT", "NIFTY IT"]:
            mapping = NIFTYIT_MAPPING
        elif idx_upper in ["^CNXAUTO", "NIFTYAUTO", "NIFTY AUTO"]:
            mapping = NIFTYAUTO_MAPPING
        elif idx_upper in ["^CNXFMCG", "NIFTYFMCG", "NIFTY FMCG"]:
            mapping = NIFTYFMCG_MAPPING
        
        # Check if it's a known Sector in our SECTOR_DATA (e.g. "Metal", "Banking")
        elif index_symbol in SECTOR_DATA: # Original title case usually works here
            target_sector_name = index_symbol
            stocks = SECTOR_DATA[index_symbol]["stocks"]
            mapping = {stock: target_sector_name for stock in stocks}

        else:
            # Final fallback: Fuzzy match in INDEX_MAP keys (ignoring spaces)
            found = False
            for k in INDEX_MAP:
                if k.upper().replace(" ", "") == idx_clean:
                    stocks = INDEX_MAP[k]
                    mapping = {stock: index_symbol for stock in stocks}
                    found = True
                    break
            
            if not found:
                logger.warning(f"No constituents found for index: {index_symbol}")
                return []

        symbols = list(mapping.keys())
        
        # 2. Fetch Live Price Data (Batch)
        try:
            # yfinance download is efficient for OHLCV
            # We need 1mo to calculate 20-day average volume
            price_data = yf.download(symbols, period="1mo", progress=False)
            
            if isinstance(price_data.columns, pd.MultiIndex):
                close_df = price_data["Close"]
                volume_df = price_data["Volume"]
                high_df = price_data.get("High", close_df)
                low_df = price_data.get("Low", close_df)
                open_df = price_data.get("Open", close_df)
            else:
                close_df = price_data["Close"]
                volume_df = price_data["Volume"]
                high_df = price_data.get("High", close_df)
                low_df = price_data.get("Low", close_df)
                open_df = price_data.get("Open", close_df)
                
        except Exception as e:
            logger.error(f"Failed to fetch prices for {index_symbol}: {e}")
            return []

        # 3. Fetch Market Cap and 52W High/Low (Parallel)
        # fast_info is not batchable in current yf, so we thread it.
        additional_info = {}
        
        def fetch_fast_info(sym):
            try:
                # fast_info is an object, not a dict. Use attribute access.
                info = yf.Ticker(sym).fast_info
                return sym, {
                    "marketCap": info.market_cap if info.market_cap is not None else 0,
                    "yearHigh": info.year_high if info.year_high is not None else 0,
                    "yearLow": info.year_low if info.year_low is not None else 0
                }
            except:
                return sym, {"marketCap": 0, "yearHigh": 0, "yearLow": 0}

        with ThreadPoolExecutor(max_workers=10) as executor:
            future_to_sym = {executor.submit(fetch_fast_info, sym): sym for sym in symbols}
            for future in as_completed(future_to_sym):
                sym, info = future.result()
                additional_info[sym] = info
        
        # 4. Build Result
        results = []
        if not close_df.empty:
            # Handle single vs multi index
            latest_close = close_df.iloc[-1]
            prev_close = close_df.iloc[-2] if len(close_df) > 1 else latest_close
            
            # Intraday OHLC (today's row)
            latest_high = high_df.iloc[-1] if not high_df.empty else latest_close
            latest_low = low_df.iloc[-1] if not low_df.empty else latest_close
            latest_open = open_df.iloc[-1] if not open_df.empty else latest_close

            # Volume Data
            latest_volume = volume_df.iloc[-1] if not volume_df.empty else None
            
            # Calculate 20-day avg volume
            avg_volumes = volume_df.tail(21).iloc[:-1].mean() if len(volume_df) > 1 else volume_df.mean()

            for sym in symbols:
                try:

                    prices_val = float(latest_close[sym]) if sym in latest_close else 0
                    prev_close_val = float(prev_close[sym]) if sym in prev_close else prices_val
                    
                    # Ensure we don't have NaNs from yfinance before calculation
                    prices_val = cls.clean_float(prices_val)
                    prev_close_val = cls.clean_float(prev_close_val)
                    
                    # Volume - Defensive check for None and presence
                    vol_val = 0.0
                    if latest_volume is not None:
                        try:
                            # Use sym in latest_volume check to avoid KeyError if sym not in index
                            # Cast to float to avoid builtins.round overload issues
                            vol_val = cls.clean_float(float(latest_volume[sym]))
                        except: pass
                    
                    avg_vol_val = 0.0
                    if avg_volumes is not None:
                        try:
                            avg_vol_val = cls.clean_float(float(avg_volumes[sym]))
                        except: pass
                    
                    change = prices_val - prev_close_val
                    pct = (change / prev_close_val * 100) if prev_close_val != 0 else 0.0
                    
                    sector = mapping.get(sym, "Others")
                    
                    # Intraday range values
                    high_val = cls.clean_float(float(latest_high[sym])) if sym in latest_high else prices_val
                    low_val = cls.clean_float(float(latest_low[sym])) if sym in latest_low else prices_val
                    open_val = cls.clean_float(float(latest_open[sym])) if sym in latest_open else prices_val

                    # Additional data from fast_info
                    info = additional_info.get(sym, {"marketCap": 0, "yearHigh": 0, "yearLow": 0})
                    year_high = cls.clean_float(info.get("yearHigh", 0))
                    year_low = cls.clean_float(info.get("yearLow", 0))
                    m_cap = cls.clean_float(info.get("marketCap", 0))
                    
                    # Value Calculation in Crores: (LTP * Volume) / 10^7
                    value_crores = (prices_val * vol_val) / 10000000 if vol_val > 0 else 0

                    # 5-Day Volume History for Micro Charts
                    vol_history = []
                    if sym in volume_df.columns:
                        try:
                            # Get last 5 valid volume points
                            vol_history = [cls.clean_float(float(v)) for v in volume_df[sym].tail(5).tolist()]
                        except: 
                            vol_history = [0, 0, 0, 0, 0]

                    results.append({
                        "symbol": sym,
                        "name": sym.replace(".NS", "").replace(".BO", ""),
                        "sector": sector,
                        "ltp": round(prices_val, 2),
                        "open": round(open_val, 2),
                        "high": round(high_val, 2),
                        "low": round(low_val, 2),
                        "prevClose": round(prev_close_val, 2),
                        "indicativeClose": round(prices_val, 2), # Approximated from LTP
                        "change": round(cls.clean_float(change), 2),
                        "changePercent": round(cls.clean_float(pct), 2),
                        "marketCap": m_cap,
                        "volume": vol_val,
                        "valueCrores": round(value_crores, 2),
                        "yearHigh": round(year_high, 2),
                        "yearLow": round(year_low, 2),
                        "avgVolume": avg_vol_val,
                        "weight": 1.0,
                        "volumeHistory": vol_history
                    })
                except Exception:
                    continue
                    
        # Sort by Market Cap Descending
        results.sort(key=lambda x: x["marketCap"], reverse=True)
            
        return results

    @classmethod
    def _compute(cls) -> Dict[str, Any]:
        import yfinance as yf
        import pandas as pd
        from concurrent.futures import ThreadPoolExecutor, as_completed

        # ---- 1. Fetch Data in Parallel ----
        # We fetch each index independently to avoid "batch partial failure" ambiguity.
        # Inside each index fetch, we try candidates in order.
        
        daily_closes = {}
        intraday_closes = {}
        latest_data = {}  # Per-index latest OHLCV
        
        def fetch_index(idx, meta):
            candidates = meta["candidates"]
            for sym in candidates:
                try:
                    # Fetch Daily (30d) and Intraday (5d)
                    # We fetch separately to ensure clarity.
                    # Note: yfinance caches calls, so repeated calls for same ticker are fast if within cache time.
                    # But here we are likely calling different tickers.
                    
                    # 1. Daily Data
                    d_df = yf.download(sym, period="30d", interval="1d", progress=False)
                    if d_df.empty or len(d_df) < 5:
                        continue

                    # 2. Intraday Data
                    i_df = yf.download(sym, period="5d", interval="5m", progress=False)
                    # Intraday might be empty if market just opened or closed? No, usually valid.
                    # We allow intraday to be empty/partial but need daily for correlation.
                    
                    # Extract Data
                    # Handle yfinance MultiIndex return (Price, Ticker)
                    if isinstance(d_df.columns, pd.MultiIndex):
                        dc = d_df["Close"].iloc[:, 0]
                    else:
                        dc = d_df["Close"]

                    if i_df is not None and not i_df.empty:
                        if isinstance(i_df.columns, pd.MultiIndex):
                            ic = i_df["Close"].iloc[:, 0]
                        else:
                            ic = i_df["Close"]
                    else:
                        ic = None
                    
                    # Latest Info
                    latest_row = d_df.iloc[-1]
                    prev_row = d_df.iloc[-2] if len(d_df) >= 2 else latest_row
                    
                    ltp = cls._to_float(latest_row.get("Close", 0))
                    prev_close = cls._to_float(prev_row.get("Close", ltp))
                    change = ltp - prev_close
                    change_pct = (change / prev_close * 100) if prev_close != 0 else 0
                    
                    info = {
                        "ltp": round(ltp, 2),
                        "open": round(cls._to_float(latest_row.get("Open", 0)), 2),
                        "high": round(cls._to_float(latest_row.get("High", 0)), 2),
                        "low": round(cls._to_float(latest_row.get("Low", 0)), 2),
                        "volume": int(cls._to_float(latest_row.get("Volume", 0))),
                        "change": round(change, 2),
                        "changePercent": round(change_pct, 2),
                        "prevClose": round(prev_close, 2),
                    }
                    
                    return idx, dc, ic, info, sym
                    
                except Exception as e:
                    # logger.warning(f"Failed to fetch {idx} via {sym}: {e}")
                    continue
            
            return idx, None, None, None, None

        logger.info(f"[NetworkMap] Starting parallel fetch for {len(INDEX_UNIVERSE)} indices...")
        
        valid_ids = []
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(fetch_index, idx, meta) for idx, meta in INDEX_UNIVERSE.items()]
            
            for future in as_completed(futures):
                idx, dc, ic, info, source_sym = future.result()
                if dc is not None and info is not None:
                    daily_closes[idx] = dc
                    if ic is not None and len(ic) > 10:
                        intraday_closes[idx] = ic
                    latest_data[idx] = info
                    valid_ids.append(idx)
                    # logger.info(f"  + {idx} (via {source_sym})")
                else:
                    logger.warning(f"[NetworkMap] Failed to fetch data for {idx} (tried all candidates)")

        logger.info(f"[NetworkMap] Got valid data for {len(valid_ids)}/{len(INDEX_UNIVERSE)} indices")

        # ---- 3. Correlation Matrix (daily) ----
        import pandas as pd
        close_df = pd.DataFrame({k: daily_closes[k] for k in valid_ids})
        returns_df = close_df.pct_change().dropna()
        corr_matrix = returns_df.corr()

        # ---- 4. Lead-Lag via lagged cross-correlation (intraday) ----
        lead_lag = cls._compute_lead_lag(intraday_closes, valid_ids)

        # ---- 5. Rolling correlation breakdown (daily) ----
        breakdowns = cls._detect_correlation_breakdowns(returns_df, corr_matrix, valid_ids)

        # ---- 6. Volatility & Event Detection ----
        vol_data = cls._compute_volatility(returns_df, valid_ids)
        events = cls._detect_events(intraday_closes, valid_ids)

        # ---- 7. Market Regime ----
        vix_data = latest_data.get("INDIAVIX", {})
        avg_corr = corr_matrix.values[np.triu_indices_from(corr_matrix.values, k=1)].mean() if len(valid_ids) > 1 else 0
        regime = cls._classify_regime(vix_data, avg_corr, returns_df, valid_ids)

        # ---- 8. Sector Rotation (RS vs NIFTY50) ----
        rotation = cls._compute_sector_rotation(daily_closes, valid_ids)

        # ---- 9. Build Nodes ----
        nodes = []
        for idx in valid_ids:
            if idx == "INDIAVIX":
                continue  # VIX is used for regime, not as a graph node

            meta = INDEX_UNIVERSE[idx]
            price_data = latest_data.get(idx, {})
            vol_info = vol_data.get(idx, {"volRatio": 1.0, "atr": 0})
            rot_info = rotation.get(idx, {"rsRank": 0, "rsMomentum": 0, "rsDirection": "→"})
            is_event = idx in events

            # Strength Score = change% * (1 + volRatio) — simplified breadth proxy
            change_pct = price_data.get("changePercent", 0)
            strength = builtins.round(change_pct * (1 + vol_info["volRatio"]), 2)

            nodes.append({
                "id": idx,
                "name": meta["name"],
                "sector": meta["sector"],
                "marketCap": meta["marketCap"],
                "ltp": price_data.get("ltp", 0),
                "open": price_data.get("open", 0),
                "high": price_data.get("high", 0),
                "low": price_data.get("low", 0),
                "volume": price_data.get("volume", 0),
                "change": price_data.get("change", 0),
                "changePercent": change_pct,
                "prevClose": price_data.get("prevClose", 0),
                "strengthScore": strength,
                "volRatio": round(float(vol_info["volRatio"]), 2),
                "atr": round(float(vol_info["atr"]), 4),
                "isEvent": is_event,
                "rsRank": rot_info["rsRank"],
                "rsMomentum": round(float(rot_info["rsMomentum"]), 4),
                "rsDirection": rot_info["rsDirection"],
            })

        # ---- 10. Build Links ----
        links = []
        non_vix = [k for k in valid_ids if k != "INDIAVIX"]

        for i in range(len(non_vix)):
            for j in range(i + 1, len(non_vix)):
                src, tgt = non_vix[i], non_vix[j]
                r = corr_matrix.loc[src, tgt] if src in corr_matrix.index and tgt in corr_matrix.index else 0

                if abs(r) < 0.15:
                    continue  # Skip weak correlations

                r_val = round(float(r), 4)

                # Lead-lag info for this pair
                ll = lead_lag.get((src, tgt), lead_lag.get((tgt, src), None))
                ll_data = None
                if ll:
                    ll_data = {
                        "leader": ll["leader"],
                        "follower": ll["follower"],
                        "lagMinutes": ll["lagMinutes"],
                        "strength": round(float(ll["strength"]), 4),
                    }

                # Breakdown?
                is_breakdown = (src, tgt) in breakdowns or (tgt, src) in breakdowns

                links.append({
                    "source": src,
                    "target": tgt,
                    "correlation": r_val,
                    "absCorrelation": round(abs(r_val), 4),
                    "leadLag": ll_data,
                    "isBreakdown": is_breakdown,
                })

        # ---- 9. Build Hierarchical Graph (The "Market Intelligence Map") ----
        graph_data = cls._compute_hierarchy(nodes, links, lead_lag)
        
        payload = {
            "graph": graph_data,  # New Hierarchical Structure
            "regime": regime,
            "avgCorrelation": round(float(avg_corr), 4),
            "vix": vix_data.get("ltp", 0),
            "sectorRotation": [
                {"id": k, "name": INDEX_UNIVERSE[k]["name"], "rank": v["rsRank"],
                 "momentum": round(float(v["rsMomentum"]), 4), "direction": v["rsDirection"]}
                for k, v in sorted(rotation.items(), key=lambda x: x[1]["rsRank"])
                if k != "INDIAVIX" and k in non_vix
            ],
            "timestamp": datetime.utcnow().isoformat(),
        }

        logger.info(f"[NetworkMap] Payload built: {len(nodes)} nodes, {len(links)} links, regime={regime}")
        return payload

    @classmethod
    def _compute_hierarchy(cls, nodes: List[Dict], links: List[Dict], lead_lag: Dict) -> Dict:
        """
        Builds a hierarchical structure:
        India Market (Root) -> Sectors (L1) -> Indices (L2)
        Ensures all 'val' attributes are positive for Sunburst rendering.
        """
        
        # 1. Create Root Node
        root = {
            "id": "INDIA_MARKET",
            "name": "India Market",
            "type": "root",
            "val": 0, # Will be sum of sectors
            "color": "#fbbf24", # Neutral Yellow initially
            "children": []
        }
        
        # 2. Group Nodes by Sector
        sectors_map = {}
        
        for n in nodes:
            sec_name = n.get("sector", "Other")
            if sec_name not in sectors_map:
                sectors_map[sec_name] = {
                    "id": f"SECTOR_{sec_name.upper()}",
                    "name": sec_name,
                    "type": "sector",
                    "val": 0,
                    "color": "#64748b",
                    "children": [],
                    "marketCap": 0
                }
            
            # n is an Index node
            n["type"] = "index"
            sector_node = sectors_map[sec_name]
            
            # Use marketCap for sizing, fallback to 10 if 0
            m_cap = n.get("marketCap", 0)
            node_val = m_cap if m_cap > 0 else 10
            n["val"] = node_val
            
            sector_node["children"].append(n)
            sector_node["val"] += node_val
            sector_node["marketCap"] += m_cap

        # 3. Attach Sectors to Root and Calculate Colors
        total_market_val = 0
        for sec_name, sec_node in sectors_map.items():
            # Calculate Sector Color based on avg change of children
            child_count = len(sec_node["children"])
            if child_count > 0:
                avg_change = sum(c.get("changePercent", 0) for c in sec_node["children"]) / child_count
            else:
                avg_change = 0
            
            if avg_change > 0.5:
                sec_node["color"] = "#10b981"
            elif avg_change < -0.5:
                sec_node["color"] = "#ef4444"
            else:
                sec_node["color"] = "#fbbf24"
            
            root["children"].append(sec_node)
            total_market_val += sec_node["val"]

        # Ensure Root val is sum of children
        root["val"] = total_market_val if total_market_val > 0 else 100

        return root

        return root


    # -------------------- HELPERS --------------------

    @staticmethod
    def _to_float(val) -> float:
        import builtins
        if val is None:
            return 0.0
        if hasattr(val, 'item'):
            try:
                return builtins.float(val.item())
            except:
                return 0.0
        try:
            return builtins.float(val)
        except:
            return 0.0

    @staticmethod
    def clean_float(val) -> float:
        import math
        if val is None: return 0.0
        try:
            f = float(val)
            if math.isnan(f) or math.isinf(f): return 0.0
            return f
        except:
            return 0.0

    @classmethod
    def _compute_lead_lag(cls, intraday_closes: Dict, valid_ids: List[str]) -> Dict:
        """Compute lagged cross-correlation for each pair. Returns dict keyed by (src, tgt)."""
        result = {}
        non_vix = [k for k in valid_ids if k != "INDIAVIX" and k in intraday_closes]
        lags = [1, 2, 3]  # 5-min bars → 5, 10, 15 min lags

        for i in range(len(non_vix)):
            for j in range(i + 1, len(non_vix)):
                a, b = non_vix[i], non_vix[j]
                try:
                    import pandas as pd
                    sa = intraday_closes[a]
                    sb = intraday_closes[b]
                    # Align
                    aligned = pd.DataFrame({"a": sa, "b": sb}).dropna()
                    if len(aligned) < 20:
                        continue

                    ra = aligned["a"].pct_change().dropna()
                    rb = aligned["b"].pct_change().dropna()

                    best_lag = 0
                    best_corr = 0
                    best_leader = a

                    for lag in lags:
                        # a leads b: corr(a_t, b_{t+lag})
                        c1 = ra.iloc[:-lag].reset_index(drop=True).corr(rb.iloc[lag:].reset_index(drop=True))
                        # b leads a: corr(b_t, a_{t+lag})
                        c2 = rb.iloc[:-lag].reset_index(drop=True).corr(ra.iloc[lag:].reset_index(drop=True))

                        if not np.isnan(c1) and abs(c1) > abs(best_corr):
                            best_corr = c1
                            best_lag = lag
                            best_leader = a

                        if not np.isnan(c2) and abs(c2) > abs(best_corr):
                            best_corr = c2
                            best_lag = lag
                            best_leader = b

                    if abs(best_corr) > 0.3:  # Significant lead-lag
                        follower = b if best_leader == a else a
                        result[(a, b)] = {
                            "leader": best_leader,
                            "follower": follower,
                            "lagMinutes": best_lag * 5,
                            "strength": best_corr,
                        }
                except Exception as e:
                    pass  # Skip pair on error

        return result

    @classmethod
    def _detect_correlation_breakdowns(cls, returns_df, full_corr, valid_ids) -> set:
        """Detect pairs where recent correlation deviates significantly from 30-day average."""
        breakdowns = set()
        non_vix = [k for k in valid_ids if k != "INDIAVIX" and k in returns_df.columns]

        if len(returns_df) < 10:
            return breakdowns

        recent = returns_df.tail(5).corr()

        for i in range(len(non_vix)):
            for j in range(i + 1, len(non_vix)):
                a, b = non_vix[i], non_vix[j]
                try:
                    avg_r = full_corr.loc[a, b]
                    recent_r = recent.loc[a, b]
                    if abs(recent_r - avg_r) > 0.35:
                        breakdowns.add((a, b))
                except:
                    pass

        return breakdowns

    @classmethod
    def _compute_volatility(cls, returns_df, valid_ids) -> Dict:
        """Compute ATR proxy (std of returns) and vol ratio (recent vs avg)."""
        result = {}
        for idx in valid_ids:
            if idx not in returns_df.columns:
                result[idx] = {"volRatio": 1.0, "atr": 0}
                continue
            try:
                r = returns_df[idx].dropna()
                if len(r) < 10:
                    result[idx] = {"volRatio": 1.0, "atr": float(r.std())}
                    continue

                avg_vol = r.std()
                recent_vol = r.tail(5).std()
                ratio = (recent_vol / avg_vol) if avg_vol > 0 else 1.0
                result[idx] = {"volRatio": float(ratio), "atr": float(avg_vol)}
            except:
                result[idx] = {"volRatio": 1.0, "atr": 0}

        return result

    @classmethod
    def _detect_events(cls, intraday_closes, valid_ids) -> set:
        """Detect indices with abnormal intraday moves (> 2x intraday vol)."""
        events = set()
        for idx in valid_ids:
            if idx == "INDIAVIX" or idx not in intraday_closes:
                continue
            try:
                ic = intraday_closes[idx]
                rets = ic.pct_change().dropna()
                if len(rets) < 20:
                    continue
                vol = rets.std()
                last_move = abs(rets.iloc[-1])
                if last_move > 2 * vol and vol > 0:
                    events.add(idx)
            except:
                pass
        return events

    @classmethod
    def _classify_regime(cls, vix_data, avg_corr, returns_df, valid_ids) -> str:
        """
        Rule-based regime detection:
          - Panic:    VIX > 25 and avg_corr > 0.75
          - Risk-Off: VIX > 20 or avg_corr > 0.7
          - Rotation: avg_corr < 0.4
          - Expansion: default
        """
        vix = vix_data.get("ltp", 15)
        avg_corr = float(avg_corr) if not np.isnan(avg_corr) else 0.5

        if vix > 25 and avg_corr > 0.75:
            return "panic"
        elif vix > 20 or avg_corr > 0.7:
            return "risk-off"
        elif avg_corr < 0.4:
            return "rotation"
        else:
            return "expansion"

    @classmethod
    def _compute_sector_rotation(cls, daily_closes, valid_ids) -> Dict:
        """Compute Relative Strength vs NIFTY50 and momentum (ROC of RS)."""
        result = {}
        nifty_key = "NIFTY50"
        if nifty_key not in daily_closes:
            # Can't compute RS without NIFTY50
            for idx in valid_ids:
                result[idx] = {"rsRank": 0, "rsMomentum": 0, "rsDirection": "→"}
            return result

        nifty = daily_closes[nifty_key]

        rs_scores = {}
        for idx in valid_ids:
            if idx in ("NIFTY50", "SENSEX", "INDIAVIX") or idx not in daily_closes:
                continue
            try:
                import pandas as pd
                aligned = pd.DataFrame({"idx": daily_closes[idx], "nifty": nifty}).dropna()
                if len(aligned) < 10:
                    continue

                rs = aligned["idx"] / aligned["nifty"]
                rs_now = cls.clean_float(rs.iloc[-1])
                rs_prev = cls.clean_float(rs.iloc[-5] if len(rs) >= 5 else rs.iloc[0])
                
                momentum = (rs_now - rs_prev) / rs_prev if rs_prev != 0 else 0.0
                momentum = cls.clean_float(momentum)

                rs_scores[idx] = float(momentum)

                direction = "↑" if momentum > 0.005 else ("↓" if momentum < -0.005 else "→")
                result[idx] = {"rsRank": 0, "rsMomentum": momentum, "rsDirection": direction}
            except:
                result[idx] = {"rsRank": 0, "rsMomentum": 0, "rsDirection": "→"}

        # Rank by momentum
        sorted_ids = sorted(rs_scores.keys(), key=lambda k: rs_scores[k], reverse=True)
        for rank, idx in enumerate(sorted_ids, 1):
            if idx in result:
                result[idx]["rsRank"] = rank

        return result
