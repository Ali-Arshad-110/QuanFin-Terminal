import logging
import time
import threading
import yfinance as yf
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.data.index_constituents import NIFTY_FNO, INDEX_MAP
from app.services.network_map_service import NetworkMapService

logger = logging.getLogger(__name__)

class PulseScannerService:
    """
    High-density momentum scanner that prioritizes liquidity (FnO) 
    and detects price breakouts across 2100+ stocks.
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(PulseScannerService, cls).__new__(cls)
                cls._instance._init_service()
        return cls._instance

    def _init_service(self):
        self.active_pulses: List[Dict[str, Any]] = []
        self.last_scan_time: Optional[datetime] = None
        self.is_running = False
        self.scan_thread: Optional[threading.Thread] = None
        
        # 52W Cache: {ticker: {"high": val, "low": val, "last_updated": datetime}}
        self.milestone_cache: Dict[str, Dict[str, Any]] = {}
        
        # Segment definitions
        self.fno_tickers = NIFTY_FNO
        self.nifty500_tickers = list(set(INDEX_MAP.get("NIFTY100", []) + INDEX_MAP.get("NIFTYALPHA50", [])))
        self.global_tickers = INDEX_MAP.get("MARKET_UNIVERSE", [])

    def start(self):
        """Starts the background scanning loop."""
        if self.is_running:
            return
        
        # Initial 52W Warmup
        threading.Thread(target=self._warmup_milestones, daemon=True).start()
        
        self.is_running = True
        self.scan_thread = threading.Thread(target=self._run_loop, daemon=True)
        self.scan_thread.start()
        logger.info("PulseScannerService: Background loop started.")

    def stop(self):
        """Stops the background scanning loop."""
        self.is_running = False
        if self.scan_thread:
            self.scan_thread.join(timeout=5)
        logger.info("PulseScannerService: Background loop stopped.")

    def _warmup_milestones(self):
        """Fetches 52-week High/Low for FnO stocks on startup."""
        logger.info("PulseScan: Warming up 52-Week High/Low Data...")
        try:
            batch_str = " ".join(self.fno_tickers)
            # Fetch 1 year of daily data to calculate 52W milestones
            data = yf.download(batch_str, period="1y", interval="1d", progress=False, group_by='ticker')
            
            with self._lock:
                for ticker in self.fno_tickers:
                    try:
                        if ticker not in data.columns.levels[0]: continue
                        t_data = data[ticker].dropna()
                        self.milestone_cache[ticker] = {
                            "h52": float(t_data['High'].max()),
                            "l52": float(t_data['Low'].min()),
                            "updated_at": datetime.now()
                        }
                    except: continue
            logger.info(f"PulseScan: 52-Week milestones cached for {len(self.milestone_cache)} symbols.")
        except Exception as e:
            logger.error(f"PulseScan Warmup Failed: {e}")

    def _run_loop(self):
        """Main execution loop with a 10s gap (Phase 2: Advanced Triggers)."""
        while self.is_running:
            try:
                start_ts = time.time()
                
                # Scan FnO with Advanced Logic
                new_pulses = self._scan_segment(self.fno_tickers, "FnO")
                
                with self._lock:
                    self.active_pulses = new_pulses
                    self.last_scan_time = datetime.now()
                
                elapsed = time.time() - start_ts
                sleep_time = max(1, 10 - elapsed)
                time.sleep(sleep_time)
                
            except Exception as e:
                logger.error(f"PulseScan Loop Error: {e}")
                time.sleep(10)

    def _detect_pattern(self, open_p, high, low, close, prev_close, avg_vol, vol) -> Optional[str]:
        """Heuristic Candlestick & Volume Pattern Detection."""
        body = abs(close - open_p)
        total_range = high - low
        if total_range == 0: return None
        
        # 1. Marubozu (Strong Trend)
        if (body / total_range) > 0.9:
            return "Marubozu (Strong Trend)"
            
        # 2. Volume Shocker
        if avg_vol > 0 and vol > (avg_vol * 3):
            return "Volume Shocker"
            
        # 3. Hammer (Potential Reversal)
        lower_shadow = min(open_p, close) - low
        upper_shadow = high - max(open_p, close)
        if lower_shadow > (2 * body) and upper_shadow < (0.2 * body):
            return "Hammer (Bottom Fish)"
            
        # 4. Bullish Engulfing
        if close > prev_close and open_p < prev_close and body > (total_range * 0.6):
            return "Bullish Attack"
            
        return None

    def _scan_segment(self, tickers: List[str], segment_name: str) -> List[Dict[str, Any]]:
        """Phase 2: Refined scanning with 52W and Candle diagnostics."""
        if not tickers: return []
            
        pulses = []
        batch_size = 50
        
        for i in range(0, len(tickers), batch_size):
            if not self.is_running: break
            batch = tickers[i : i + batch_size]
            batch_str = " ".join(batch)
            
            try:
                data = yf.download(batch_str, period="1d", interval="5m", progress=False, group_by='ticker')
                
                for ticker in batch:
                    try:
                        if ticker not in data.columns.levels[0]: continue
                        t_data = data[ticker].dropna()
                        if len(t_data) < 2: continue
                        
                        latest = t_data.iloc[-1]
                        prev = t_data.iloc[-2]
                        ltp = float(latest['Close'])
                        
                        # 1. Day High/Low Break (HOD/LOD)
                        day_high = t_data['High'].max()
                        day_low = t_data['Low'].min()
                        change_pct = ((ltp - t_data.iloc[0]['Open']) / t_data.iloc[0]['Open']) * 100
                        
                        trigger = None
                        intensity = "Normal"
                        
                        # HOD/LOD Check
                        if ltp >= day_high:
                            trigger = "New Day High"
                            intensity = "High" if change_pct > 2 else "Medium"
                        elif ltp <= day_low:
                            trigger = "New Day Low"
                            intensity = "High" if change_pct < -2 else "Medium"
                        
                        # 2. 52-Week Milestone
                        if ticker in self.milestone_cache:
                            h52 = self.milestone_cache[ticker]['h52']
                            if ltp >= h52:
                                trigger = "52-Week Breakout"
                                intensity = "Legendary"
                            elif ltp >= h52 * 0.98:
                                trigger = "Near 52W High"
                                intensity = "Aggressive"

                        # 3. Pattern Detection
                        if not trigger:
                            pattern = self._detect_pattern(
                                latest['Open'], latest['High'], latest['Low'], ltp,
                                prev['Close'], t_data['Volume'].mean(), latest['Volume']
                            )
                            if pattern:
                                trigger = pattern
                                intensity = "Tactical"

                        if trigger:
                            pulses.append({
                                "symbol": ticker,
                                "ltp": round(ltp, 2),
                                "change": round(float(change_pct), 2),
                                "trigger": trigger,
                                "intensity": intensity,
                                "segment": segment_name,
                                "timestamp": datetime.now().isoformat()
                            })
                            
                    except: continue
                time.sleep(0.5)
            except: continue
            
        pulses.sort(key=lambda x: abs(x['change']), reverse=True)
        return pulses[:50]
                
        # Sort pulses by absolute change
        pulses.sort(key=lambda x: abs(x['change']), reverse=True)
        return pulses[:50] # Top 50 active pulses

    def get_active_pulses(self) -> Dict[str, Any]:
        """Returns the current cached active pulses."""
        with self._lock:
            return {
                "pulses": self.active_pulses,
                "count": len(self.active_pulses),
                "last_updated": self.last_scan_time.isoformat() if self.last_scan_time else None
            }

# Global instance
pulse_scanner = PulseScannerService()
