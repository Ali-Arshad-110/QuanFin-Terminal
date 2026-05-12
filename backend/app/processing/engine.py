# pyre-ignore-all-errors
import urllib.request
import urllib.parse
import urllib.error
import json
import logging
from datetime import datetime, timedelta
from functools import lru_cache
from typing import Any, cast, List, Dict, Optional

logger = logging.getLogger(__name__)

INDEX_MAP = {
    "NIFTY 50": "^NSEI",
    "NIFTY BANK": "^NSEBANK",
    "BANK NIFTY": "^NSEBANK",
    "NIFTY IT": "^CNXIT",
    "NIFTY AUTO": "^CNXAUTO",
    "NIFTY METAL": "^CNXMETAL",
    "NIFTY MIDCAP 50": "^NSEMDCP50",
    "NIFTY FIN SERVICE": "^CNXFIN",
    "NIFTY FMCG": "^CNXFMCG",
    "SENSEX": "^BSESN",
    "BSE BANKEX": "BSE-BANK.BO",
    "BSE IT": "BSE-IT.BO",
    "BSE AUTO": "BSE-AUTO.BO",
    "BSE FMCG": "BSE-FMCG.BO",
    "BSE METAL": "BSE-METAL.BO"
}

class MarketDataService:
    @lru_cache(maxsize=128)
    def _fetch_yahoo_chart_data(self, ticker: str, interval: str = "5m", range_str: str = "5d"):
        """
        Private helper to fetch raw chart JSON from Yahoo Finance Query API v8 using urllib.
        Cached to improve performance.
        """
        try:
            # Yahoo Finance Index Mapping
            if ticker in INDEX_MAP:
                ticker = INDEX_MAP[ticker]
                
            # Ensure extension
            if not ticker.endswith(".NS") and not ticker.endswith(".BO") and not ticker.startswith("^"):
                ticker = f"{ticker}.NS"
            
            # Map parameters
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval={interval}&range={range_str}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode('utf-8'))
        except Exception as e:
            logger.error(f"Yahoo API request failed for {ticker}: {e}")
            return None

    def fetch_data(self, ticker: str, interval: str = "5m", period: str = "5d") -> list:
        """
        Fetches OHLCV data using direct Yahoo API call (no pandas).
        Returns list of dicts: [{date, open, high, low, close, volume}, ...]
        """
        try:
            yahoo_range = period
            if interval == "1m": yahoo_range = "5d" 
            if interval in ["5m", "15m", "30m", "1h"]: 
                if period == "5d": yahoo_range = "5d"
                else: yahoo_range = "1mo" 
            
            data = self._fetch_yahoo_chart_data(ticker, interval, yahoo_range)
            
            if data is None or "chart" not in data:
                return []
            
            _chart = data.get("chart")
            if not isinstance(_chart, dict) or "result" not in _chart or not _chart["result"]:
                return []
                 
            _res_list = cast(List[Optional[Dict[str, Any]]], _chart.get("result", [{}]))
            chart_result = cast(Dict[str, Any], _res_list[0] or {}) if _res_list else {}
            indicators_dict = cast(Dict[str, Any], chart_result.get("indicators") or {})
            _quotes_list = cast(List[Optional[Dict[str, Any]]], indicators_dict.get("quote", [{}]))
            indicators = cast(Dict[str, Any], _quotes_list[0] or {}) if _quotes_list else {}
            timestamps = cast(List[int], chart_result.get("timestamp") or [])
            
            if not timestamps:
                return []
            
            # Extract lists
            opens = indicators.get("open") or []  # type: ignore
            highs = indicators.get("high") or []  # type: ignore
            lows = indicators.get("low") or []  # type: ignore
            closes = indicators.get("close") or []  # type: ignore
            volumes = indicators.get("volume") or []  # type: ignore
            
            records = []
            for i, ts in enumerate(timestamps):
                _opens = cast(List[Any], opens)
                if i >= len(_opens) or _opens[i] is None: continue
                
                # Format: match frontend expectation
                # Frontend checks: index, Date, date
                # We will send 'date' as ISO string or timestamp
                # Let's send ISO string for readability, or just timestamp if frontend logic uses 'Date' from df usually.
                # Previous df output had 'datetime' column. 
                # Frontend checks: d.index || d.Date || d.date || d.Datetime
                # Let's provide 'date' as ISO string.
                
                # Standard UTC ISO format - SINGLE SOURCE OF TRUTH
                # IMPORTANT: Must include 'Z' suffix so js new Date() treats it as UTC,
                # otherwise the browser interprets as local time causing a +5.5h double-shift.
                dt_utc = datetime.utcfromtimestamp(ts)
                dt_iso = dt_utc.isoformat() + "Z"  # e.g. "2025-03-01T03:45:00Z"
                
                records.append({
                    "date": dt_iso,  # Standard UTC ISO with Z suffix
                    "open": cast(Any, opens)[i],
                    "high": cast(Any, highs)[i],
                    "low": cast(Any, lows)[i],
                    "close": cast(Any, closes)[i],
                    "volume": cast(Any, volumes)[i],
                    "timestamp": ts  # Keep original UTC timestamp as backup
                })
            
            return records

        except Exception as e:
            logger.error(f"Error serving data for {ticker}: {e}")
            return []

    def fetch_indices(self, indices: list[str]) -> dict:
        results = {}
        for index in indices:
            try:
                data = self._fetch_yahoo_chart_data(index, interval="1d", range_str="5d")
                
                if data and "chart" in data and "result" in data["chart"]:
                    res = data["chart"]["result"][0]
                    quote = res["indicators"]["quote"][0]
                    closes = quote.get("close", [])
                    closes = [c for c in closes if c is not None]
                    
                    if len(closes) < 1: continue
                    
                    latest_price = closes[-1]
                    prev_price = closes[-2] if len(closes) >= 2 else latest_price
                    
                    change = latest_price - prev_price
                    pct = (change / prev_price * 100) if prev_price else 0
                    
                    results[index] = {
                        "symbol": index,
                        "price": latest_price,
                        "change": change,
                        "change_percent": pct
                    }
            except Exception as e:
                logger.error(f"Error fetching index {index}: {e}")
                continue
        return results

    def fetch_quote(self, ticker: str) -> dict:
        """
        Fetch comprehensive quote data using yfinance.Ticker.info.
        Returns full price data, fundamentals, logo URL, sector, and description.
        """
        try:
            import yfinance as yf
            from urllib.parse import urlparse

            yf_ticker = ticker
            if ticker in INDEX_MAP:
                yf_ticker = INDEX_MAP[ticker]
            # Ensure extension for Indian stocks if not mapped and not index
            elif not yf_ticker.endswith(".NS") and not yf_ticker.endswith(".BO") and not yf_ticker.startswith("^"):
                yf_ticker = f"{yf_ticker}.NS"

            t = yf.Ticker(yf_ticker)
            info = t.info

            if not info or info.get('trailingPegRatio') is None and info.get('regularMarketPrice') is None:
                # Minimal fallback: try chart API for basic price
                return self._fetch_quote_lite(ticker)

            # Logo URL from website domain
            logo_url = None
            website = info.get('website', '')
            if website:
                try:
                    if not website.startswith('http'):
                        website = 'http://' + website
                    domain = urlparse(website).netloc.replace('www.', '')
                    if domain:
                        logo_url = f"https://www.google.com/s2/favicons?domain={domain}&sz=128"
                except:
                    pass

            current_price = info.get('currentPrice', info.get('regularMarketPrice', 0.0))
            prev_close = info.get('previousClose', info.get('regularMarketPreviousClose', 0.0))
            change = (current_price - prev_close) if current_price and prev_close else 0.0
            change_pct = (change / prev_close * 100) if prev_close else 0.0

            return {
                "symbol": ticker,
                "name": info.get('longName', info.get('shortName', ticker)),
                "shortName": info.get('shortName', ticker),
                "sector": info.get('sector', 'N/A'),
                "industry": info.get('industry', 'N/A'),
                "logoUrl": logo_url,
                "website": info.get('website', ''),
                "ltp": current_price,
                "change": float(f"{float(change):.2f}"),
                "changePercent": float(f"{float(change_pct):.2f}"),
                "open": info.get('open', info.get('regularMarketOpen', 0.0)),
                "prevClose": prev_close,
                "high": info.get('dayHigh', info.get('regularMarketDayHigh', 0.0)),
                "low": info.get('dayLow', info.get('regularMarketDayLow', 0.0)),
                "fiftyTwoWeekHigh": info.get('fiftyTwoWeekHigh', 0.0),
                "fiftyTwoWeekLow": info.get('fiftyTwoWeekLow', 0.0),
                "volume": info.get('volume', info.get('regularMarketVolume', 0)),
                "averageVolume": info.get('averageVolume', 0),
                "marketCap": info.get('marketCap', 0),
                "peRatio": info.get('trailingPE', 0.0),
                "forwardPE": info.get('forwardPE', 0.0),
                "priceToBook": info.get('priceToBook', 0.0),
                "dividendYield": float(f"{(float(info.get('dividendYield', 0.0)) * 100):.2f}") if info.get('dividendYield') else 0.0,
                "eps": info.get('trailingEps', 0.0),
                "beta": info.get('beta', 0.0),
                "description": info.get('longBusinessSummary', 'No description available.'),
                "employees": info.get('fullTimeEmployees', 0),
            }
        except Exception as e:
            logger.error(f"Error fetching quote for {ticker}: {e}")
            # Fallback to lite mode
            res = self._fetch_quote_lite(ticker)
            if not res:
                return {
                    "symbol": ticker, "name": ticker,
                    "ltp": 0.0, "change": 0.0, "changePercent": 0.0,
                    "open": 0.0, "prevClose": 0.0, "high": 0.0, "low": 0.0,
                    "fiftyTwoWeekHigh": 0.0, "fiftyTwoWeekLow": 0.0,
                    "volume": 0, "marketCap": 0, "peRatio": 0.0,
                    "sector": "N/A", "industry": "N/A",
                    "description": "Data unavailable. Yahoo Finance API timed out (Deep Fallback).",
                }
            return res

    def _fetch_quote_lite(self, ticker: str) -> dict:
        """Lightweight fallback using chart API when yfinance.info fails."""
        try:
            data = self._fetch_yahoo_chart_data(ticker, interval="1d", range_str="1d")
            _chart = data.get("chart", {})
            _res_list = _chart.get("result")
            if not _res_list or not isinstance(_res_list, list):
                return {
                    "symbol": ticker, "name": ticker,
                    "ltp": 0.0, "change": 0.0, "changePercent": 0.0,
                    "open": 0.0, "prevClose": 0.0, "high": 0.0, "low": 0.0,
                    "fiftyTwoWeekHigh": 0.0, "fiftyTwoWeekLow": 0.0,
                    "volume": 0, "marketCap": 0, "peRatio": 0.0,
                    "sector": "N/A", "industry": "N/A",
                    "description": "Data unavailable. Yahoo Finance result missing.",
                }
            res = cast(Dict[str, Any], _res_list[0] or {})
            meta = res.get("meta", {})
            price = meta.get("regularMarketPrice", 0.0)
            prev = meta.get("chartPreviousClose", 0.0)
            change = price - prev if price and prev else 0.0
            pct = (change / prev * 100) if prev else 0.0
            return {
                "symbol": ticker,
                "name": ticker,
                "ltp": price,
                "change": float(f"{float(change):.2f}"),
                "changePercent": float(f"{float(pct):.2f}"),
                "open": price,
                "prevClose": prev,
                "high": 0.0,
                "low": 0.0,
                "fiftyTwoWeekHigh": 0.0,
                "fiftyTwoWeekLow": 0.0,
                "volume": 0,
                "marketCap": 0,
                "peRatio": 0.0,
                "sector": "N/A",
                "industry": "N/A",
                "description": "Data unavailable (Lite Mode).",
            }
        except Exception as e:
            logger.error(f"Lite quote fetch failed for {ticker}: {e}")
            return {
                "symbol": ticker, "name": ticker,
                "ltp": 0.0, "change": 0.0, "changePercent": 0.0,
                "open": 0.0, "prevClose": 0.0, "high": 0.0, "low": 0.0,
                "fiftyTwoWeekHigh": 0.0, "fiftyTwoWeekLow": 0.0,
                "volume": 0, "marketCap": 0, "peRatio": 0.0,
                "sector": "N/A", "industry": "N/A",
                "description": "Data unavailable. Yahoo Finance API timed out.",
            }

    def fetch_quotes(self, tickers: list[str]) -> dict:
        results = {}
        if not tickers: return results
        norm_tickers = []
        for t in tickers:
            if not t.endswith(".NS") and not t.endswith(".BO") and not t.startswith("^"):
                t = f"{t}.NS"
            norm_tickers.append(t)
        for t in norm_tickers:
            try:
                data = self._fetch_yahoo_chart_data(t, interval="1d", range_str="5d")
                if data and "chart" in data and "result" in data["chart"]:
                    res = data["chart"]["result"][0]
                    meta = res.get("meta", {})
                    
                    # 1. Try Metadata (Best for "Change from Prev Close")
                    price = meta.get("regularMarketPrice")
                    prev_close = meta.get("chartPreviousClose")
                    
                    # 2. Fallback to Candle Data if meta missing
                    if price is None or prev_close is None:
                        quote = res["indicators"]["quote"][0]
                        closes = [c for c in quote.get("close", []) if c is not None]
                        if not closes: continue
                        price = closes[-1]
                        prev_close = closes[-2] if len(closes) >= 2 else price

                    # 3. Calculate Change
                    if price is not None and prev_close is not None:
                        change = price - prev_close
                        pct = (change / prev_close * 100) if prev_close else 0
                        
                        # Volume
                        # Meta often doesn't have live volume, use last candle
                        quote = res["indicators"]["quote"][0]
                        volumes = [v for v in quote.get("volume", []) if v is not None]
                        vol = volumes[-1] if volumes else 0

                        original_key = t.replace(".NS", "")
                        results[original_key] = {
                            "price": float(f"{float(price):.2f}"),
                            "change": float(f"{float(change):.2f}"),
                            "changePercent": float(f"{float(pct):.2f}"),
                            "volume": int(float(vol)),
                            "close": float(f"{float(price):.2f}")
                        }
                        results[t] = results[original_key]
            except Exception as e:
                logger.error(f"Quote fetch failed for {t}: {e}")
                continue
        return results

class TechnicalAnalysisEngine:
    def analyze(self, data: list) -> list:
        """
        Applies Technical Indicators: RSI, MACD, VWAP manually on list of dicts.
        """
        if not data:
            return []
        
        # Defensive: Log data structure
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"TechnicalAnalysisEngine.analyze() called with {len(data)} records")
        
        if len(data) > 0:
            logger.info(f"First record keys: {list(data[0].keys())}")
            logger.info(f"First record sample: {data[0]}")
            
        # Extract series with defensive checks
        try:
            closes = [float(d.get('close') or 0.0) for d in data if 'close' in d]
            volumes = [int(d.get('volume') or 0) for d in data if 'volume' in d]
            highs = [float(d.get('high') or 0.0) for d in data if 'high' in d]
            lows = [float(d.get('low') or 0.0) for d in data if 'low' in d]
        except Exception as e:
            logger.error(f"Error extracting OHLCV data: {e}")
            logger.error(f"Data sample: {data[0] if data else 'empty'}")
            return []
        
        logger.info(f"Extracted {len(closes)} closes, {len(volumes)} volumes, {len(highs)} highs, {len(lows)} lows")
        
        # Validate we have data
        if not closes or not volumes or not highs or not lows:
            logger.error(f"Missing OHLCV data: closes={len(closes)}, volumes={len(volumes)}, highs={len(highs)}, lows={len(lows)}")
            return []
            
        # Helpers
        def calculate_ema(values, window):
            if not values: return []
            ema = []
            k = 2 / (window + 1)
            # Init with sma

            if len(values) < window: return [0.0] * len(values)
            sma = sum(values[:window]) / window  # type: ignore
            ema = [0.0] * (window - 1) + [sma]
            
            for i in range(window, len(values)):
                val = (values[i] * k) + (ema[-1] * (1-k))
                ema.append(val)
            return ema

        # 1. RSI (14)
        rsi = [0.0] * len(closes)
        if len(closes) > 14:
            deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
            avg_gain = sum([d for d in deltas[:14] if d > 0]) / 14  # type: ignore
            avg_loss = sum([-d for d in deltas[:14] if d < 0]) / 14  # type: ignore
            
            # Initial RSI
            if avg_loss == 0: rsi[14] = 100
            else:
                rs = avg_gain / avg_loss
                rsi[14] = 100 - (100 / (1 + rs))
            
            # Wilder's Smoothing
            for i in range(15, len(closes)):
                d = deltas[i-1]
                gain = d if d > 0 else 0
                loss = -d if d < 0 else 0
                
                avg_gain = ((avg_gain * 13) + gain) / 14
                avg_loss = ((avg_loss * 13) + loss) / 14
                
                if avg_loss == 0: rsi[i] = 100
                else:
                    rs = avg_gain / avg_loss
                    rsi[i] = 100 - (100 / (1 + rs))
        
        # 2. MACD (12, 26, 9)
        ema12 = calculate_ema(closes, 12)
        ema26 = calculate_ema(closes, 26)
        macd_line = [(e12 - e26) if i >= 26 else 0 for i, (e12, e26) in enumerate(zip(ema12, ema26))]
        signal_line = calculate_ema(macd_line, 9)
        
        # 3. VWAP
        # Cumulative (Price * Volume) / Cumulative Volume
        cum_pv = 0
        cum_vol = 0
        vwap = []
        for i in range(len(closes)):
            tp = (highs[i] + lows[i] + closes[i]) / 3
            cum_pv += tp * volumes[i]
            cum_vol += volumes[i]
            if cum_vol == 0: vwap.append(0.0)
            else: vwap.append(float(cum_pv / cum_vol))
            
        # 4. SMA (20, 50, 200)
        def calculate_sma(values, window):
            if not values or len(values) < window: return [0.0] * len(values)
            sma = [0.0] * (window - 1)
            # Efficient sliding window
            current_sum = sum(values[:window])
            sma.append(current_sum / window)
            
            for i in range(window, len(values)):
                current_sum = current_sum - values[i-window] + values[i]
                sma.append(current_sum / window)
            return sma

        sma20 = calculate_sma(closes, 20)
        sma50 = calculate_sma(closes, 50)
        sma200 = calculate_sma(closes, 200)

        # Merge back
        for i, d in enumerate(data):
            d['rsi'] = rsi[i] if i < len(rsi) else 0
            d['MACD_12_26_9'] = macd_line[i] if i < len(macd_line) else 0
            d['MACDs_12_26_9'] = signal_line[i] if i < len(signal_line) else 0
            d['MACDh_12_26_9'] = d['MACD_12_26_9'] - d['MACDs_12_26_9']
            d['vwap'] = vwap[i]
            d['sma20'] = sma20[i]
            d['sma50'] = sma50[i]
            d['sma200'] = sma200[i]
            
        return data
