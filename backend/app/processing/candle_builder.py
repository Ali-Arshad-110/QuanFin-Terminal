import logging
import time
from typing import Dict, Any, Callable, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class Candle:
    def __init__(self, symbol: str, token: str, start_time: int, interval_seconds: int = 60):
        self.symbol = symbol
        self.token = token
        self.start_time = start_time
        self.interval_seconds = interval_seconds
        
        self.open = 0.0
        self.high = 0.0
        self.low = 0.0
        self.close = 0.0
        self.volume = 0
        self.ticks_count = 0
        self.last_update_time = time.time()
        self.is_closed = False

    def update(self, price: float, volume: int = 0):
        if self.ticks_count == 0:
            self.open = price
            self.high = price
            self.low = price
            self.close = price
        else:
            if price > self.high: self.high = price
            if price < self.low: self.low = price
            self.close = price
        
        self.volume += volume # This might need to be delta if stream is cumulative
        self.ticks_count += 1
        self.last_update_time = time.time()

    def to_dict(self):
        return {
            "s": self.symbol,
            "t": self.start_time,
            "o": self.open,
            "h": self.high,
            "l": self.low,
            "c": self.close,
            "v": self.volume,
            "x": self.is_closed # Close flag
        }

class CandleBuilder:
    def __init__(self, on_candle_update: Callable[[Dict], None]):
        self.candles: Dict[str, Candle] = {} # Key: Token
        self.on_candle_update = on_candle_update
        self.interval = 60 # 1 Minute fixed for now based on requirements

    def process_tick(self, tick: Dict):
        """
        Process incoming tick from Broker WS.
        Expected Tick Format: { "tk": "TOKEN", "ltp": 100.5, "v": 1000, "ts": 170000000 }
        """
        try:
            token = str(tick.get("tk", ""))
            if not token: return

            ltp = float(tick.get("ltp", 0.0))
            # Some brokers send cumulative volume, some send packet volume.
            # Assuming Kotak sends packet volume or we handle delta logic elsewhere if needed.
            # Usually 'v' in tick is Total Buy/Sell Qty or Last Traded Qty.
            # We will assume 'ltt' (Last Traded Quantity) if available, else 0 for now.
            vol = int(tick.get("qt", 0)) # qt = quantity traded in this tick if available

            current_time = int(time.time())
            candle_start = (current_time // self.interval) * self.interval

            # Check if we have an active candle for this token
            if token in self.candles:
                candle = self.candles[token]
                # Check active candle boundary
                if candle.start_time == candle_start:
                    candle.update(ltp, vol)
                    # Broadcast update (Snapshot)
                    self.on_candle_update(candle.to_dict())
                else:
                    # Time rolled over. Close previous candle.
                    candle.is_closed = True
                    self.on_candle_update(candle.to_dict()) # Final update
                    del self.candles[token]
                    
                    # Create new
                    new_candle = Candle(tick.get("symbol", token), token, candle_start, self.interval)
                    new_candle.update(ltp, vol)
                    self.candles[token] = new_candle
                    self.on_candle_update(new_candle.to_dict())
            else:
                # No candle exists, create new
                new_candle = Candle(tick.get("symbol", token), token, candle_start, self.interval)
                new_candle.update(ltp, vol)
                self.candles[token] = new_candle
                self.on_candle_update(new_candle.to_dict())

        except Exception as e:
            logger.error(f"Error processing tick: {e}")
