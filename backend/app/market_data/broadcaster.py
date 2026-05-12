import asyncio
import logging
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

class TickBroadcaster:
    """
    In-memory pub/sub broadcaster for live ticks.
    Used as primary (Redis-free) channel from broker WS → FastAPI WS clients.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._queues: list[asyncio.Queue] = []
            cls._instance._lock = asyncio.Lock()
        return cls._instance

    async def publish(self, tick: dict):
        """Push tick to all connected WebSocket clients."""
        dead = []
        for q in self._queues:
            try:
                q.put_nowait(tick)
            except asyncio.QueueFull:
                dead.append(q)
        # Remove full/dead queues
        for q in dead:
            try:
                self._queues.remove(q)
            except ValueError:
                pass

    async def subscribe(self) -> AsyncGenerator[dict, None]:
        """Yields ticks for one connected WebSocket client."""
        q: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._queues.append(q)
        try:
            while True:
                tick = await q.get()
                yield tick
        finally:
            try:
                self._queues.remove(q)
            except ValueError:
                pass

    @property
    def subscriber_count(self) -> int:
        return len(self._queues)
