import logging
import json
import threading
import time
from typing import List, Callable
from app.processing.candle_builder import CandleBuilder

logger = logging.getLogger(__name__)

class MarketDataStream:
    def __init__(self, kotak_service, broadcast_callback: Callable[[Dict], None]):
        self.kotak = kotak_service
        self.broadcast_callback = broadcast_callback
        self.builder = CandleBuilder(on_candle_update=self.broadcast_callback)
        self.token_map = {} # Token -> Symbol
        self.subscribed_tokens = set()
        self.is_running = False
        self._thread = None
        
        # Kotak Neo API Instance
        self.client = None

    def register_symbol(self, token, symbol):
        """Map a token to a readable symbol for frontend broadcasting."""
        self.token_map[str(token)] = symbol

    def start(self):
        if self.is_running: return
        self.is_running = True
        
        # We need the initialized client from KotakService
        # This might be tricky if KotakService logs in LATER.
        # We'll poll or wait for login.
        self._thread = threading.Thread(target=self._monitor_connection, daemon=True)
        self._thread.start()
        logger.info("MarketDataStream Background Monitor Started")

    def _monitor_connection(self):
        """
        Watches for KotakService login and initializes WS when ready.
        """
        backoff = 2
        while self.is_running:
            if self.kotak.is_logged_in and self.kotak.client:
                # Login detected
                if not self.client:
                    logger.info("MarketDataStream: 🟢 Kotak Login Detected. Initiating WebSocket Connection...")
                    try:
                        self.client = self.kotak.client
                        # Register callbacks
                        # Verify NeoAPI callback structure from docs/codebase 
                        # Assuming standard on_message, on_error etc.
                        self.client.on_message = self.on_message
                        self.client.on_error = self.on_error
                        self.client.on_close = self.on_close
                        self.client.on_open = self.on_open
                        
                        logger.info("MarketDataStream: WS Callbacks Registered.")

                        # Subscribe to retained tokens if any (reconnect logic)
                        if self.subscribed_tokens:
                            logger.info(f"MarketDataStream: Re-subscribing to {len(self.subscribed_tokens)} retained tokens...")
                            self.subscribe(list(self.subscribed_tokens))
                        else:
                            logger.info("MarketDataStream: No initial tokens to subscribe.")
                            
                    except Exception as e:
                        logger.error(f"MarketDataStream: 🔴 Failed to attach WS callbacks: {e}")
                        import traceback
                        logger.error(traceback.format_exc())
                
            time.sleep(backoff)

    def subscribe(self, tokens: List[str]):
        """
        Subscribe to a list of tokens.
        Tokens should be in format expected by Kotak WS (usually Token ID).
        """
        if not tokens: return
        
        # Update set
        new_tokens = [t for t in tokens if t not in self.subscribed_tokens]
        if not new_tokens: return
        
        self.subscribed_tokens.update(new_tokens)
        
        if self.client:
            try:
                # Neo API subscribe format
                # inst_tokens = [{"instrument_token": "123", "exchange_segment": "nse_cm"}]
                # We assume 'tokens' passed here are pure IDs. We might need mapping.
                # Actually, NeoAPI usually takes list of instruments.
                
                # Check if we have received raw tokens or "Exchange|Token" format
                instruments = []
                for t in new_tokens:
                    # Heuristic: if contains underscore, might be "nse_cm|123"
                    if "|" in t:
                        seg, tok = t.split("|")
                        instruments.append({"instrument_token": tok, "exchange_segment": seg})
                    else:
                        # Default to NSE CM if just number
                        instruments.append({"instrument_token": t, "exchange_segment": "nse_cm"})
                
                logger.info(f"MarketDataStream: Sending Subscribe Command for {len(instruments)} instruments: {[i['instrument_token'] for i in instruments]}")
                self.client.subscribe(instrument_tokens=instruments, isIndex=False, isCham=False)
                
            except Exception as e:
                logger.error(f"MarketDataStream: Subscription Error: {e}")

    def on_message(self, message):
        """
        Raw message handler.
        """
        # logger.debug(f"WS Raw Message: {str(message)[:100]}...") # Verbose
        try:
            # Parse message. NeoAPI often sends list of dicts.
            # Review message structure. Usually:
            # {'type': 'live_feed', 'feeds': [{'instrument_token': ..., 'ltp': ...}]}
            
            # Since we don't have exact structure docs handy, we wrap generically.
            # Assuming 'message' is a List or Dict.
            
            # NOTE: NeoAPI client might pass 'message' as a raw string or object.
            # If it's a string, json parse it.
            if isinstance(message, str):
                message = json.loads(message)
                
            # Process
            if isinstance(message, list):
                for m in message:
                    self._handle_tick(m)
            elif isinstance(message, dict):
                 # Check if wrapped in 'feeds'
                if "feeds" in message:
                    for m in message["feeds"]:
                        self._handle_tick(m)
                else:
                    self._handle_tick(message)
                    
        except Exception as e:
            # Keep log quiet in massive feed
             logger.error(f"WS Message Parse Error: {e}")

    def _handle_tick(self, tick):
        # Translate NeoAPI tick keys to our CandleBuilder keys
        # NeoAPI: instrument_token, ltp, last_traded_qty (qt)
        
        token = tick.get("instrument_token")
        ltp = tick.get("ltp")
        
        if token and ltp:
            # Resolve Symbol name if available in map
            sym = self.token_map.get(str(token), tick.get("trading_symbol", tick.get("symbol", "")))
            
            # logger.info(f"Tick: {token} -> {ltp}") # Debug sample
            wtick = {
                "tk": token,
                "ltp": float(ltp),
                "qt": int(tick.get("ltt", tick.get("last_traded_qty", 0))), # Quantity Traded
                "symbol": sym
            }
            # Use extra lookup if symbol missing and we have it in memory? 
            # For now rely on Kotak sending it or CandleBuilder not needing it immediate.
            # Actually CandleBuilder needs 'symbol' in init.
            
            self.builder.process_tick(wtick)

    def on_error(self, error):
        logger.error(f"MarketDataStream WS Error Callback: {error}")

    def on_close(self, message):
        logger.warning(f"MarketDataStream WS Closed: {message}")

    def on_open(self, message):
        logger.info(f"MarketDataStream WS Connection Opened Successfully: {message}")
