# pyre-ignore-all-errors
"""
QuanMap Service — Global Market Intelligence Engine
Provides data for 5 QuanMap layers:
  1. Global Performance (benchmark index returns)
  2. HQ Cities (company headquarters by city)
  3. Market Cap (country equity market cap)
  4. Regulators (static data served via data file)
  5. Corporate Tree (parent→subsidiary relationships)
"""

import json
import os
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, cast
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

# ── 1. Global Benchmark Indices ────────────────────────────────────────────────
GLOBAL_BENCHMARKS = {
    "IN": [
        {"symbol": "^NSEI", "name": "NIFTY 50", "exchange": "NSE"},
        {"symbol": "^BSESN", "name": "BSE SENSEX", "exchange": "BSE"},
        {"symbol": "^NSEBANK", "name": "NIFTY Bank", "exchange": "NSE"}
    ],
    "US": [
        {"symbol": "^GSPC", "name": "S&P 500", "exchange": "NYSE"},
        {"symbol": "^IXIC", "name": "Nasdaq Composite", "exchange": "NASDAQ"},
        {"symbol": "^DJI", "name": "Dow Jones", "exchange": "NYSE"}
    ],
    "GB": [
        {"symbol": "^FTSE", "name": "FTSE 100", "exchange": "LSE"},
        {"symbol": "^FTMC", "name": "FTSE 250", "exchange": "LSE"}
    ],
    "CN": [
         {"symbol": "000001.SS", "name": "SSE Composite", "exchange": "SSE"},
         {"symbol": "399001.SZ", "name": "SZSE Component", "exchange": "SZSE"}
    ],
    "JP": [{"symbol": "^N225", "name": "Nikkei 225", "exchange": "TSE"}],
    "HK": [{"symbol": "^HSI", "name": "Hang Seng", "exchange": "HKEX"}],
    "DE": [{"symbol": "^GDAXI", "name": "DAX 40", "exchange": "FSE"}],
    "FR": [{"symbol": "^FCHI", "name": "CAC 40", "exchange": "Euronext"}],
    "AU": [{"symbol": "^AXJO", "name": "ASX 200", "exchange": "ASX"}],
    "CA": [{"symbol": "^GSPTSE", "name": "S&P/TSX", "exchange": "TSX"}],
    "BR": [{"symbol": "^BVSP", "name": "Bovespa", "exchange": "B3"}],
    "KR": [{"symbol": "^KS11", "name": "KOSPI", "exchange": "KRX"}],
    "SG": [{"symbol": "^STI", "name": "Straits Times", "exchange": "SGX"}],
    "ZA": [{"symbol": "^J203.JO", "name": "JSE All Share", "exchange": "JSE"}],
    "MX": [{"symbol": "^MXX", "name": "IPC Mexico", "exchange": "BMV"}],
    "IT": [{"symbol": "FTSEMIB.MI","name": "FTSE MIB", "exchange": "Borsa Italiana"}],
    "ES": [{"symbol": "^IBEX", "name": "IBEX 35", "exchange": "BME"}],
    "NL": [{"symbol": "^AEX", "name": "AEX", "exchange": "Euronext AMS"}],
    "CH": [{"symbol": "^SSMI", "name": "SMI", "exchange": "SIX"}],
    "SE": [{"symbol": "^OMX", "name": "OMX Stockholm 30", "exchange": "Nasdaq OMX"}],
    "RU": [{"symbol": "IMOEX.ME", "name": "MOEX Russia", "exchange": "MOEX"}],
    "ID": [{"symbol": "^JKSE", "name": "IDX Composite", "exchange": "IDX"}],
    "MY": [{"symbol": "^KLSE", "name": "FTSE Bursa Malaysia","exchange": "Bursa"}],
    "TH": [{"symbol": "^SET.BK", "name": "SET Index", "exchange": "SET"}],
    "TW": [{"symbol": "^TWII", "name": "TAIEX", "exchange": "TWSE"}],
    "PK": [{"symbol": "^KSE100", "name": "KSE 100", "exchange": "PSX"}],
    "PH": [{"symbol": "PSEI.PS", "name": "PSEi", "exchange": "PSE"}],
    "EG": [{"symbol": "^CASE30", "name": "EGX 30", "exchange": "EGX"}],
    "SA": [{"symbol": "^TASI.SR", "name": "Tadawul", "exchange": "Tadawul"}],
    "AE": [{"symbol": "^ADI", "name": "ADX General", "exchange": "ADX"}],
    "NG": [{"symbol": "^NGSEINDX","name": "NGX All-Share", "exchange": "NGX"}],
    "AR": [{"symbol": "^MERV", "name": "MERVAL", "exchange": "BYMA"}],
    "NZ": [{"symbol": "^NZ50", "name": "NZX 50", "exchange": "NZX"}],
    "NO": [{"symbol": "^OSEAX", "name": "Oslo OSEAX", "exchange": "Oslo Bors"}],
    "DK": [{"symbol": "^OMXC25", "name": "OMX Copenhagen 25","exchange": "Nasdaq Copenhagen"}],
}
 
# Country Metadata for Map Labels
COUNTRY_METADATA = {
    "IN": {"name": "India", "capital": "New Delhi", "lat": 28.6139, "lng": 77.2090},
    "US": {"name": "United States", "capital": "Washington, D.C.", "lat": 38.8951, "lng": -77.0364},
    "GB": {"name": "United Kingdom", "capital": "London", "lat": 51.5074, "lng": -0.1278},
    "CN": {"name": "China", "capital": "Beijing", "lat": 39.9042, "lng": 116.4074},
    "JP": {"name": "Japan", "capital": "Tokyo", "lat": 35.6762, "lng": 139.6503},
    "HK": {"name": "Hong Kong", "capital": "Hong Kong", "lat": 22.3193, "lng": 114.1694},
    "DE": {"name": "Germany", "capital": "Berlin", "lat": 52.5200, "lng": 13.4050},
    "FR": {"name": "France", "capital": "Paris", "lat": 48.8566, "lng": 2.3522},
    "AU": {"name": "Australia", "capital": "Canberra", "lat": -35.2809, "lng": 149.1300},
    "CA": {"name": "Canada", "capital": "Ottawa", "lat": 45.4215, "lng": -75.6972},
    "BR": {"name": "Brazil", "capital": "Brasilia", "lat": -15.7975, "lng": -47.8919},
    "KR": {"name": "South Korea", "capital": "Seoul", "lat": 37.5665, "lng": 126.9780},
    "SG": {"name": "Singapore", "capital": "Singapore", "lat": 1.3521, "lng": 103.8198},
    "ZA": {"name": "South Africa", "capital": "Pretoria", "lat": -25.7479, "lng": 28.2293},
    "MX": {"name": "Mexico", "capital": "Mexico City", "lat": 19.4326, "lng": -99.1332},
    "IT": {"name": "Italy", "capital": "Rome", "lat": 41.9028, "lng": 12.4964},
    "ES": {"name": "Spain", "capital": "Madrid", "lat": 40.4168, "lng": -3.7038},
    "NL": {"name": "Netherlands", "capital": "Amsterdam", "lat": 52.3676, "lng": 4.9041},
    "CH": {"name": "Switzerland", "capital": "Bern", "lat": 46.9480, "lng": 7.4474},
    "SE": {"name": "Sweden", "capital": "Stockholm", "lat": 59.3293, "lng": 18.0686},
    "RU": {"name": "Russia", "capital": "Moscow", "lat": 55.7558, "lng": 37.6173},
    "ID": {"name": "Indonesia", "capital": "Jakarta", "lat": -6.2088, "lng": 106.8456},
    "MY": {"name": "Malaysia", "capital": "Kuala Lumpur", "lat": 3.1390, "lng": 101.6869},
    "TH": {"name": "Thailand", "capital": "Bangkok", "lat": 13.7563, "lng": 100.5018},
    "TW": {"name": "Taiwan", "capital": "Taipei", "lat": 25.0330, "lng": 121.5654},
    "PK": {"name": "Pakistan", "capital": "Islamabad", "lat": 33.6844, "lng": 73.0479},
    "PH": {"name": "Philippines", "capital": "Manila", "lat": 14.5995, "lng": 120.9842},
    "EG": {"name": "Egypt", "capital": "Cairo", "lat": 30.0444, "lng": 31.2357},
    "SA": {"name": "Saudi Arabia", "capital": "Riyadh", "lat": 24.7136, "lng": 46.6753},
    "AE": {"name": "UAE", "capital": "Abu Dhabi", "lat": 24.4539, "lng": 54.3773},
    "NG": {"name": "Nigeria", "capital": "Abuja", "lat": 9.0765, "lng": 7.3986},
    "AR": {"name": "Argentina", "capital": "Buenos Aires", "lat": -34.6037, "lng": -58.3816},
    "NZ": {"name": "New Zealand", "capital": "Wellington", "lat": -41.2865, "lng": 174.7762},
    "NO": {"name": "Norway", "capital": "Oslo", "lat": 59.9139, "lng": 10.7522},
    "DK": {"name": "Denmark", "capital": "Copenhagen", "lat": 55.6761, "lng": 12.5683},
}

# Global Financial Hubs (FII Sources)
GLOBAL_HUBS = {
    "NY": {"name": "New York", "lat": 40.7128, "lng": -74.0060, "benchmark": "^GSPC"},
    "LD": {"name": "London", "lat": 51.5074, "lng": -0.1278, "benchmark": "^FTSE"},
    "TK": {"name": "Tokyo", "lat": 35.6762, "lng": 139.6503, "benchmark": "^N225"},
    "SG": {"name": "Singapore", "lat": 1.3521, "lng": 103.8198, "benchmark": "^STI"},
    "HK": {"name": "Hong Kong", "lat": 22.3193, "lng": 114.1694, "benchmark": "^HSI"},
}

# Domestic Financial Hubs (DII Sources)
DOMESTIC_HUBS = {
    "BLR": {"name": "Bengaluru", "lat": 12.9716, "lng": 77.5946},
    "MUM": {"name": "Mumbai", "lat": 19.0760, "lng": 72.8777},
    "HYD": {"name": "Hyderabad", "lat": 17.3850, "lng": 78.4867},
}

MUMBAI_SINK = {"lat": 18.9220, "lng": 72.8347} # Gateway of India / NSE Proximity


class QuanMapService:

    @classmethod
    def get_global_performance(cls) -> List[Dict[str, Any]]:
        """Fetch 1-day and YTD % change for all global benchmark indices."""
        import yfinance as yf

        results = {}

        def fetch_one(country_code: str, meta: Dict) -> Optional[Dict]:
            try:
                ticker = yf.Ticker(meta["symbol"])
                hist = ticker.history(period="5d", interval="1d")
                if hist.empty or len(hist) < 2:
                    return None
                closes = hist["Close"].dropna().tolist()
                if len(closes) < 2:
                    return None
                current = closes[-1]
                prev    = closes[-2]
                change1d = round((current - prev) / prev * 100, 2) if prev else 0.0
                change_points = round(current - prev, 2) if prev else 0.0

                # Extract last trade date
                last_trade_date = hist.index[-1].strftime("%Y-%m-%d")

                # YTD Logic
                hist_ytd = ticker.history(period="ytd", interval="1d")
                ytd_change = 0.0
                if not hist_ytd.empty and len(hist_ytd) >= 2:
                    ytd_closes = hist_ytd["Close"].dropna().tolist()
                    ytd_first = ytd_closes[0]
                    ytd_change = round((current - ytd_first) / ytd_first * 100, 2) if ytd_first else 0.0

                return {
                    "countryCode": country_code,
                    "indexName":   meta["name"],
                    "exchange":    meta["exchange"],
                    "symbol":      meta["symbol"],
                    "ltp":         round(current, 2),
                    "change1d":    change1d,
                    "changePoints": change_points,
                    "ytd":         ytd_change,
                    "lastTradeDate": last_trade_date
                }
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                logger.warning(f"QuanMap: failed to fetch {meta['symbol']}: {e}\n{error_trace}")
                with open("yf_errors.log", "a") as f:
                    f.write(f"FAILED {meta['symbol']} - {str(e)}\n{error_trace}\n\n")
                return None

        # Limit max_workers to 5 to prevent aggressive Yahoo throttling during dashboard mount
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {}
            for cc, indices in GLOBAL_BENCHMARKS.items():
                for m in indices:
                    futures[executor.submit(fetch_one, cc, m)] = cc

            for future in as_completed(futures):
                result = future.result()
                if result:
                    cc = result["countryCode"]
                    if cc not in results:
                        meta = COUNTRY_METADATA.get(cc, {})
                        results[cc] = {
                            "countryCode": cc, 
                            "name": str(meta.get("name", cc)).upper(),
                            "capital": meta.get("capital", ""),
                            "capitalCoords": {"lat": meta.get("lat", 0), "lng": meta.get("lng", 0)},
                            "indices": []
                        }
                    # results[cc] is guaranteed to be a dict with "indices" list
                    cast(List, results[cc]["indices"]).append(result)

        # Convert dict to array and sort indices within each country to maintain primary index first
        output = []
        for cc, data in results.items():
            # Sort indices based on their order in GLOBAL_BENCHMARKS
            symbol_order = [m["symbol"] for m in GLOBAL_BENCHMARKS.get(cc, [])]
            # cast data["indices"] to list to resolve lint error
            indices_list = cast(List, data["indices"])
            indices_list.sort(key=lambda x: symbol_order.index(x["symbol"]) if x["symbol"] in symbol_order else 99)
            output.append(data)
        for c in output:
            # Sort indices inside the country so primary is first
            # Since primary was the first submitted, it might not return first due to async.
            pass # Keep as is, React will handle display.
            
        output.sort(key=lambda x: x["indices"][0]["change1d"] if len(x["indices"]) > 0 else 0, reverse=True)
        return output
    @staticmethod
    def _fetch_hq_one(symbol: str) -> Optional[Dict[str, Any]]:
        """Fetch single company metadata for HQ map."""
        import yfinance as yf
        try:
            t = yf.Ticker(symbol)
            info = t.info
            city = info.get("city")
            if not city: return None
            
            def extract_domain(url: str) -> str:
                if not url: return ""
                return url.replace("https://", "").replace("http://", "").replace("www.", "").split("/")[0]

            website = info.get("website", "")
            domain = extract_domain(website)
            return {
                "symbol":    symbol,
                "name":      info.get("longName", symbol),
                "city":      city,
                "country":   info.get("country", "India"),
                "sector":    info.get("sector", "N/A"),
                "industry":  info.get("industry", "N/A"),
                "website":   website,
                "logo_url":  f"https://logo.clearbit.com/{domain}" if domain else "",
                "employees": info.get("fullTimeEmployees", 0),
                "marketCap": info.get("marketCap", 0),
            }
        except:
            return None

    @classmethod
    def get_hq_cities(cls) -> List[Dict[str, Any]]:
        """
        Fetch city info for 500+ NSE/Global constituents.
        Uses a local cache (hq_cache.json) for instant performance.
        """
        from app.data.index_constituents import NIFTY_500 as NSE_STOCKS
        cache_path = os.path.join(os.path.dirname(__file__), "..", "data", "hq_cache.json")
        
        # 1. Quick Cache Return
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r") as f:
                    cached = json.load(f)
                    if len(cached) > 100: return cast(List[Dict[str, Any]], cached)
            except: pass

        city_map: Dict[str, List[Dict[str, Any]]] = {}
        GLOBAL_TOP = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "BRK-B", "LLY", "AVGO", "JPM", "V", "WMT", "JNJ", "TSM", "NVO", "ASML", "BABA", "HDB", "INFY"]
        sample = GLOBAL_TOP + list(NSE_STOCKS)

        # 2. Parallel Fetch Phase
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_sym = {executor.submit(cls._fetch_hq_one, s): s for s in sample}
            for future in as_completed(future_to_sym):
                res = future.result()
                if res and res.get("city"):
                    c = res["city"]
                    if c not in city_map: city_map[c] = []
                    city_map[c].append(res)

        # 3. Aggregation Phase
        output: List[Dict[str, Any]] = []
        for city, companies in city_map.items():
            if not companies: continue
            sorted_comps = sorted(companies, key=lambda x: x.get("marketCap", 0), reverse=True)
            output.append({
                "city":       city,
                "country":    sorted_comps[0].get("country", "Unknown"),
                "count":      len(companies),
                "companies":  sorted_comps[:20],
            })
        
        output.sort(key=lambda x: x["count"], reverse=True)

        # 4. Save to Persistent Cache
        try:
            os.makedirs(os.path.dirname(cache_path), exist_ok=True)
            with open(cache_path, "w") as f: json.dump(output, f, indent=2)
        except: pass

        return output

    @classmethod
    def get_market_cap_by_country(cls) -> List[Dict[str, Any]]:
        """
        Return total equity market cap by country.
        Uses WFE 2024 data (static, updated periodically).
        Source: World Federation of Exchanges 2024 Annual Statistics
        """
        # USD Trillion — WFE data 2024
        MARKET_CAP_DATA = [
            {"countryCode": "US", "country": "United States", "marketCapUSDT": 46.2,  "exchange": "NYSE + Nasdaq"},
            {"countryCode": "CN", "country": "China",         "marketCapUSDT": 8.4,   "exchange": "SSE + SZSE"},
            {"countryCode": "JP", "country": "Japan",         "marketCapUSDT": 6.5,   "exchange": "TSE"},
            {"countryCode": "IN", "country": "India",         "marketCapUSDT": 4.9,   "exchange": "BSE + NSE"},
            {"countryCode": "GB", "country": "United Kingdom","marketCapUSDT": 3.1,   "exchange": "LSE"},
            {"countryCode": "CA", "country": "Canada",        "marketCapUSDT": 2.9,   "exchange": "TSX"},
            {"countryCode": "FR", "country": "France",        "marketCapUSDT": 2.8,   "exchange": "Euronext Paris"},
            {"countryCode": "DE", "country": "Germany",       "marketCapUSDT": 2.3,   "exchange": "FSE"},
            {"countryCode": "AU", "country": "Australia",     "marketCapUSDT": 2.0,   "exchange": "ASX"},
            {"countryCode": "TW", "country": "Taiwan",        "marketCapUSDT": 1.9,   "exchange": "TWSE"},
            {"countryCode": "KR", "country": "South Korea",   "marketCapUSDT": 1.6,   "exchange": "KRX"},
            {"countryCode": "HK", "country": "Hong Kong",     "marketCapUSDT": 1.5,   "exchange": "HKEX"},
            {"countryCode": "SA", "country": "Saudi Arabia",  "marketCapUSDT": 2.7,   "exchange": "Tadawul"},
            {"countryCode": "SE", "country": "Sweden",        "marketCapUSDT": 0.9,   "exchange": "Nasdaq OMX"},
            {"countryCode": "CH", "country": "Switzerland",   "marketCapUSDT": 1.8,   "exchange": "SIX"},
            {"countryCode": "NL", "country": "Netherlands",   "marketCapUSDT": 1.0,   "exchange": "Euronext AMS"},
            {"countryCode": "ES", "country": "Spain",         "marketCapUSDT": 0.8,   "exchange": "BME"},
            {"countryCode": "IT", "country": "Italy",         "marketCapUSDT": 0.7,   "exchange": "Borsa Italiana"},
            {"countryCode": "BR", "country": "Brazil",        "marketCapUSDT": 0.8,   "exchange": "B3"},
            {"countryCode": "SG", "country": "Singapore",     "marketCapUSDT": 0.6,   "exchange": "SGX"},
            {"countryCode": "ZA", "country": "South Africa",  "marketCapUSDT": 0.5,   "exchange": "JSE"},
            {"countryCode": "MY", "country": "Malaysia",      "marketCapUSDT": 0.4,   "exchange": "Bursa"},
            {"countryCode": "ID", "country": "Indonesia",     "marketCapUSDT": 0.5,   "exchange": "IDX"},
            {"countryCode": "TH", "country": "Thailand",      "marketCapUSDT": 0.5,   "exchange": "SET"},
            {"countryCode": "PH", "country": "Philippines",   "marketCapUSDT": 0.2,   "exchange": "PSE"},
            {"countryCode": "MX", "country": "Mexico",        "marketCapUSDT": 0.4,   "exchange": "BMV"},
            {"countryCode": "AE", "country": "UAE",           "marketCapUSDT": 0.8,   "exchange": "ADX + DFM"},
            {"countryCode": "RU", "country": "Russia",        "marketCapUSDT": 0.5,   "exchange": "MOEX"},
            {"countryCode": "NO", "country": "Norway",        "marketCapUSDT": 0.5,   "exchange": "Oslo Bors"},
            {"countryCode": "DK", "country": "Denmark",       "marketCapUSDT": 0.5,   "exchange": "Nasdaq Copenhagen"},
            {"countryCode": "NZ", "country": "New Zealand",   "marketCapUSDT": 0.1,   "exchange": "NZX"},
            {"countryCode": "PK", "country": "Pakistan",      "marketCapUSDT": 0.05,  "exchange": "PSX"},
            {"countryCode": "EG", "country": "Egypt",         "marketCapUSDT": 0.05,  "exchange": "EGX"},
            {"countryCode": "NG", "country": "Nigeria",       "marketCapUSDT": 0.04,  "exchange": "NGX"},
            {"countryCode": "AR", "country": "Argentina",     "marketCapUSDT": 0.1,   "exchange": "BYMA"},
        ]
        return sorted(MARKET_CAP_DATA, key=lambda x: x["marketCapUSDT"], reverse=True)

    @classmethod
    def get_corporate_tree(cls, parent_symbol: str) -> Dict[str, Any]:
        """
        Return parent + subsidiaries for a given conglomerate symbol.
        Uses static conglomerate map + live yfinance market caps.
        """
        import yfinance as yf
        from app.data.conglomerates import CONGLOMERATE_MAP

        # Find by symbol or group name
        key = parent_symbol.upper().replace(".NS", "")
        group = None
        for g_key, g_data in CONGLOMERATE_MAP.items():
            if g_key == key or g_data.get("symbol", "").replace(".NS", "") == key:
                group = g_data
                break

        if not group:
            return {"error": f"No conglomerate data found for {parent_symbol}"}

        # Fetch live market cap for parent
        def fetch_mcap(sym: str) -> float:
            try:
                t = yf.Ticker(sym if sym.endswith(".NS") else f"{sym}.NS")
                mc = t.fast_info.market_cap
                return mc if mc else 0.0
            except:
                return 0.0

        subsidiaries = []
        all_symbols = [s["symbol"] for s in group.get("subsidiaries", [])]

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(fetch_mcap, s): s for s in all_symbols}
            mcap_map: Dict[str, float] = {}
            for future in as_completed(futures):
                sym = futures[future]
                mcap_map[sym] = future.result()

        for sub in group.get("subsidiaries", []):
            sym = sub["symbol"]
            mcap = mcap_map.get(sym, 0)
            subsidiaries.append({
                "symbol":    sym,
                "name":      sub["name"],
                "sector":    sub.get("sector", "N/A"),
                "ownership": sub.get("ownership", 0),
                "marketCap": mcap,
            })

        return {
            "parent": {
                "symbol":  group["symbol"],
                "name":    group["name"],
                "sector":  group.get("sector", "Conglomerate"),
                "marketCap": fetch_mcap(group["symbol"]),
            },
            "subsidiaries": sorted(subsidiaries, key=lambda x: x["marketCap"], reverse=True),
            "group": key,
        }

    @classmethod
    def get_institutional_flows(cls) -> Dict[str, Any]:
        """
        Calculates institutional flows (FII/DII) based on real NSE data,
        supplemented by global sentiment for visual flow intensity.
        """
        from app.services.institutional_intelligence_service import InstitutionalIntelligenceService
        import yfinance as yf
        
        flows = []
        
        # 1. Global Sentiment (FII Flows) - Real Time 1D Change (For Visual Lines)
        def fetch_sentiment(hub_id: str, hub: Dict) -> Dict:
            try:
                t = yf.Ticker(hub["benchmark"])
                hist = t.history(period="1d", interval="1m")
                if not hist.empty:
                    current = hist["Close"].iloc[-1]
                    prev = hist["Open"].iloc[0]
                    change = round((current - prev) / prev * 100, 2)
                else:
                    hist_d = t.history(period="2d")
                    change = round((hist_d["Close"].iloc[-1] - hist_d["Close"].iloc[-2]) / hist_d["Close"].iloc[-2] * 100, 2) if len(hist_d) >= 2 else 0.0
                
                return {
                    "id": hub_id,
                    "name": hub["name"],
                    "origin": {"lat": hub["lat"], "lng": hub["lng"]},
                    "destination": MUMBAI_SINK,
                    "intensity": abs(change),
                    "sentiment": "positive" if change >= 0 else "negative",
                    "type": "FII",
                    "value": change
                }
            except:
                return {
                    "id": hub_id, "name": hub["name"], "origin": {"lat": hub["lat"], "lng": hub["lng"]},
                    "destination": MUMBAI_SINK, "intensity": 0.5, "sentiment": "neutral", "type": "FII", "value": 0
                }

        with ThreadPoolExecutor(max_workers=5) as executor:
            fii_futures = [executor.submit(fetch_sentiment, h_id, h) for h_id, h in GLOBAL_HUBS.items()]
            for future in as_completed(fii_futures):
                flows.append(future.result())

        # 2. Domestic Sentiment (DII Flows - Real Time Nifty Tick)
        try:
            nifty = yf.Ticker("^NSEI")
            n_hist = nifty.history(period="1d", interval="1m")
            n_change = 0.0
            if not n_hist.empty:
                n_change = round((n_hist["Close"].iloc[-1] - n_hist["Open"].iloc[0]) / n_hist["Open"].iloc[0] * 100, 2)
            
            last_tick_time = n_hist.index[-1] if not n_hist.empty else datetime.now()
            is_market_open = (datetime.now() - last_tick_time.replace(tzinfo=None)).total_seconds() < 300
            
            for hub_id, hub in DOMESTIC_HUBS.items():
                flows.append({
                    "id": hub_id,
                    "name": hub["name"],
                    "origin": {"lat": hub["lat"], "lng": hub["lng"]},
                    "destination": MUMBAI_SINK,
                    "intensity": abs(n_change) * 1.5,
                    "sentiment": "positive" if n_change >= 0 else "negative",
                    "type": "DII",
                    "value": n_change
                })
        except: 
            is_market_open = False

        # 3. Authentic Exchange Data Fetching
        real_activity = InstitutionalIntelligenceService.get_fii_dii_activity()
        big_deals = InstitutionalIntelligenceService.get_big_deals()
        
        return {
            "flows": flows,
            "big_deals": big_deals,
            "summary": {
                "date": real_activity.get("date", datetime.now().strftime("%Y-%m-%d")),
                "fii_net_cr": real_activity.get("fii_net", 0.0),
                "dii_net_cr": real_activity.get("dii_net", 0.0),
                "fii_buy": real_activity.get("fii_buy", 0.0),
                "fii_sell": real_activity.get("fii_sell", 0.0),
                "dii_buy": real_activity.get("dii_buy", 0.0),
                "dii_sell": real_activity.get("dii_sell", 0.0),
                "sentiment": "BULLISH" if (real_activity.get("fii_net", 0) + real_activity.get("dii_net", 0)) > 0 else "BEARISH",
                "market_pulse": "ACTIVE" if is_market_open else "IDLE",
                "real_time": True,
                "is_provisional": real_activity.get("is_provisional", True)
            }
        }
