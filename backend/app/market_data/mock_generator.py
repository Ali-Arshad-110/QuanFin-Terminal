import asyncio
import logging
import random
import time
import json
from typing import Dict, Set

logger = logging.getLogger(__name__)

class MockTickGenerator:
    """
    Simulates real-time market ticks for subscribed tokens.
    Pushes data to Redis to mimic live broker feed.
    """
    def __init__(self, redis_client):
        self.redis = redis_client
        self.subscribed_tokens: Dict[str, float] = {}  # token -> last_price
        self.running = False
        self._lock = asyncio.Lock()

    async def start(self):
        if self.running:
            return
        self.running = True
        logger.info("Mock Tick Generator Started")
        asyncio.create_task(self._generator_loop())

    async def stop(self):
        self.running = False
        logger.info("Mock Tick Generator Stopped")

    async def subscribe(self, tokens: list):
        """
        Expects list of dicts: {"instrument_token": "...", "exchange_segment": "..."}
        """
        async with self._lock:
            for t in tokens:
                token = str(t.get("instrument_token"))
                symbol = t.get("symbol", token)
                if token not in self.subscribed_tokens:
                    # Initialize with a random base price if not exists
                    self.subscribed_tokens[token] = {
                        "price": random.uniform(100, 5000),
                        "symbol": symbol
                    }
                    logger.info(f"Mock Subscribed: {symbol} ({token}) at base {self.subscribed_tokens[token]['price']}")

    async def _generator_loop(self):
        while self.running:
            try:
                if not self.subscribed_tokens:
                    await asyncio.sleep(1)
                    continue

                async with self._lock:
                    tokens = list(self.subscribed_tokens.keys())

                # Pick a subset of tokens to update in this tick cycle (simulating activity)
                # To keep it active, update about 30% of tokens per second
                num_to_update = max(1, int(len(tokens) * 0.3))
                update_subset = random.sample(tokens, num_to_update)

                for token in update_subset:
                    data = self.subscribed_tokens[token]
                    price = data["price"]
                    symbol = data["symbol"]
                    
                    # Random walk: +/- 0.05% change
                    change_pct = random.uniform(-0.0005, 0.0005)
                    new_price = price * (1 + change_pct)
                    
                    # Store back
                    self.subscribed_tokens[token]["price"] = new_price
                    
                    # Build tick matching frontend/CandleBuilder format: s=symbol, c=close, v=volume
                    tick = {
                        "s": symbol,
                        "token": token, # for internal track
                        "c": round(new_price, 2),
                        "v": random.randint(10, 500),
                        "oi": random.randint(1000, 100000),
                        "ts": int(time.time() * 1000)
                    }
                    
                    # Push to Redis channel "ticks"
                    await self.redis.redis.publish("ticks", json.dumps(tick))
                    await self.redis.set_tick(token, tick)

                # Control tick frequency (e.g., 500ms for responsiveness)
                # Control tick frequency (e.g., 500ms for responsiveness)
                await asyncio.sleep(0.5)

            except Exception as e:
                logger.error(f"Mock Generator Loop Error: {e}")
                await asyncio.sleep(5)
