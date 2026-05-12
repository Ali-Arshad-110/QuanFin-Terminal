import asyncio
import logging
import time
import os
import builtins
from typing import Optional, Dict, List, Any
from app.market_data.redis_client import RedisClient
from app.market_data.broadcaster import TickBroadcaster

logger = logging.getLogger(__name__)

class MarketDataService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MarketDataService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized"): return
        self._initialized = True
        self.running = False
        self.ws_connected = False
        self.polling_task: Optional[asyncio.Task] = None
        self.redis = RedisClient()
        self.broadcaster = TickBroadcaster()
        self._token_symbol_map: Dict[str, str] = {}   # token → symbol
        self._symbol_token_map: Dict[str, str] = {}   # symbol → token
        self._last_prices: Dict[str, float] = {}        # symbol → last ltp (for change calculation)
        self.kotak_service: Any = None           # Will be injected after login
        self.subscribed_symbols: List[str] = []  # Symbols to poll
        self.poll_interval = float(os.getenv("TICK_POLL_INTERVAL", "1.5"))  # seconds between polls

    def set_client(self, kotak_service_instance):
        """
        Inject the authenticated KotakService instance.
        Called after broker login succeeds at startup.
        Uses KotakService.get_quotes() (REST-based) for live prices.
        This avoids NeoAPI WebSocket which requires a separate OTP.
        """
        if kotak_service_instance is None:
            logger.warning("MarketDataService.set_client: received None — skipping")
            return
        self.kotak_service = kotak_service_instance
        self.ws_connected = True
        logger.info("✓ MarketDataService: KotakService injected. REST polling mode active.")

    async def subscribe(self, tokens: list):
        """
        Add symbols to the polling list.
        tokens: list of dicts with {instrument_token, exchange_segment, symbol}
        """
        if not tokens:
            return
        new_syms = []
        for t in tokens:
            sym = t.get("symbol", "")
            tok = str(t.get("instrument_token", ""))
            if sym and sym not in self.subscribed_symbols:
                self.subscribed_symbols.append(sym)
                new_syms.append(sym)
                if tok:
                    self._token_symbol_map[tok] = sym
                    self._symbol_token_map[sym] = tok
        if new_syms:
            logger.info(f"✓ MarketDataService: Added {len(new_syms)} symbols to poll: {new_syms}")

    async def start(self):
        """Start the polling loop."""
        if self.running:
            return
        self.running = True
        logger.info("Starting Market Data Service (REST Polling Mode)...")
        self.polling_task = asyncio.create_task(self._polling_loop())

    async def _polling_loop(self):
        """
        Poll Kotak REST API for live quotes every poll_interval seconds.
        Pushes results through TickBroadcaster to all frontend WS clients.
        """
        logger.info("MarketDataService polling loop started.")
        while self.running:
            try:
                if self.kotak_service and self.subscribed_symbols:
                    await self._fetch_and_broadcast()
                else:
                    if not self.kotak_service:
                        logger.debug("Polling paused: KotakService not injected yet")
                    await asyncio.sleep(self.poll_interval)
                    continue
            except Exception as e:
                logger.error(f"Polling loop error: {e}")
            await asyncio.sleep(self.poll_interval)

    async def _fetch_and_broadcast(self):
        """Fetch quotes via REST and broadcast ticks."""
        try:
            # Run synchronous REST call in thread pool to avoid blocking event loop
            loop = asyncio.get_event_loop()
            # Properly pass func and args to run_in_executor
            result = await loop.run_in_executor(
                None,
                self.kotak_service.get_quotes,
                self.subscribed_symbols
            )

            if not result or result.get("status") != "success":
                return

            quotes = result.get("data", {})
            now_ms = int(time.time() * 1000)

            for sym, q in quotes.items():
                ltp = float(q.get("price") or q.get("ltp") or 0)
                if ltp == 0:
                    continue

                # Calculate change from previous tick
                prev_ltp = float(self._last_prices.get(sym, 0))
                prev_close = float(q.get("close") or q.get("prevClose") or prev_ltp or ltp)
                
                change = round(float(ltp - prev_close), 2) if prev_close > 0 else 0.0
                change_pct = round(float((change / prev_close) * 100), 2) if prev_close > 0 else 0.0
                self._last_prices[sym] = ltp

                tick = {
                    "token": self._symbol_token_map.get(sym, ""),
                    "symbol": sym,
                    "ltp": ltp,
                    "change": change if q.get("change") is None else float(q.get("change", change)),
                    "changePercent": change_pct if q.get("changePercent") is None else float(q.get("changePercent", change_pct)),
                    "vol": int(q.get("volume") or 0),
                    "open": float(q.get("open") or 0),
                    "high": float(q.get("high") or 0),
                    "low": float(q.get("low") or 0),
                    "ts": now_ms
                }

                # Broadcast to all WS clients
                await self.broadcaster.publish(tick)

                # Also store in Redis (for /quote snapshot)
                try:
                    await self.redis.set_tick(tick["token"], tick)
                except Exception:
                    pass  # Redis is optional

        except Exception as e:
            logger.error(f"Quote fetch/broadcast error: {e}")

    def _process_tick(self, tick: dict):
        """Legacy callback handler - kept for compatibility."""
        pass
