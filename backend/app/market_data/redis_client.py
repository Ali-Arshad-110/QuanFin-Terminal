import redis.asyncio as redis
import json
import logging
import os

logger = logging.getLogger(__name__)

class RedisClient:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisClient, cls).__new__(cls)
            cls._instance.redis = None
        return cls._instance

    def __init__(self):
        if hasattr(self, "redis") and self.redis: return
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis = redis.from_url(self.redis_url, decode_responses=True)

    async def set_tick(self, token, data):
        """
        Store latest tick for a token.
        Key: tick:{token}
        """
        try:
            await self.redis.set(f"tick:{token}", json.dumps(data))
            # Also publish to PubSub channel for real-time consumers
            await self.redis.publish("ticks", json.dumps(data))
        except Exception as e:
            logger.error(f"Redis Set Error: {e}")

    async def get_tick(self, token):
        try:
            data = await self.redis.get(f"tick:{token}")
            return json.loads(data) if data else None
        except Exception as e:
            logger.error(f"Redis Get Error: {e}")
            return None

    async def get_all_ticks(self, tokens: list):
        try:
            keys = [f"tick:{t}" for t in tokens]
            if not keys: return {}
            values = await self.redis.mget(keys)
            result = {}
            for i, val in enumerate(values):
                if val:
                    result[tokens[i]] = json.loads(val)
            return result
        except Exception as e:
            logger.error(f"Redis MGET Error: {e}")
            return {}
            
    async def close(self):
        if self.redis:
            await self.redis.close()
