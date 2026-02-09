"""
Quirk AI Kiosk - Caching Layer

Provides:
- Redis caching for production
- In-memory fallback for development
- Automatic serialization
- TTL support
"""

from typing import Optional, Any, TypeVar, Callable
from functools import wraps
import json
import os
import logging
import asyncio
from datetime import datetime, timedelta

logger = logging.getLogger("quirk_kiosk.cache")

T = TypeVar('T')


class InMemoryCache:
    """
    Simple in-memory cache for development/fallback.
    
    Not suitable for production with multiple workers.
    """
    
    def __init__(self):
        self._cache: dict = {}
        self._expiry: dict = {}
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key not in self._cache:
            return None
        
        # Check expiry
        if key in self._expiry and datetime.now() > self._expiry[key]:
            del self._cache[key]
            del self._expiry[key]
            return None
        
        return self._cache[key]
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in cache with TTL in seconds"""
        self._cache[key] = value
        self._expiry[key] = datetime.now() + timedelta(seconds=ttl)
        return True
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
            if key in self._expiry:
                del self._expiry[key]
            return True
        return False
    
    async def clear(self) -> bool:
        """Clear all cache"""
        self._cache.clear()
        self._expiry.clear()
        return True
    
    async def exists(self, key: str) -> bool:
        """Check if key exists and not expired"""
        return await self.get(key) is not None


class RedisCache:
    """
    Redis cache for production.
    
    Requires REDIS_URL environment variable.
    """
    
    def __init__(self):
        self._redis = None
        self._connected = False
    
    async def connect(self) -> bool:
        """Connect to Redis"""
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            logger.warning("REDIS_URL not configured - using in-memory cache")
            return False
        
        try:
            import redis.asyncio as redis
            self._redis = await redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self._redis.ping()
            self._connected = True
            logger.info("Redis cache connected")
            return True
        except ImportError:
            logger.warning("redis package not installed - using in-memory cache")
            return False
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self._redis:
            await self._redis.close()
            self._connected = False
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self._connected:
            return None
        try:
            data = await self._redis.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set value in cache with TTL in seconds"""
        if not self._connected:
            return False
        try:
            await self._redis.setex(key, ttl, json.dumps(value, default=str))
            return True
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self._connected:
            return False
        try:
            await self._redis.delete(key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    async def clear(self) -> bool:
        """Clear all cache (use with caution)"""
        if not self._connected:
            return False
        try:
            await self._redis.flushdb()
            return True
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        if not self._connected:
            return False
        try:
            return await self._redis.exists(key) > 0
        except Exception:
            return False


class CacheService:
    """
    Unified cache service that uses Redis if available, falls back to memory.
    """
    
    def __init__(self):
        self._redis_cache = RedisCache()
        self._memory_cache = InMemoryCache()
        self._use_redis = False
    
    async def initialize(self):
        """Initialize cache - try Redis first, fall back to memory"""
        self._use_redis = await self._redis_cache.connect()
        if self._use_redis:
            logger.info("Using Redis cache")
        else:
            logger.info("Using in-memory cache (development mode)")
    
    async def shutdown(self):
        """Shutdown cache connections"""
        if self._use_redis:
            await self._redis_cache.disconnect()
    
    @property
    def _cache(self):
        """Get active cache implementation"""
        return self._redis_cache if self._use_redis else self._memory_cache
    
    async def get(self, key: str) -> Optional[Any]:
        return await self._cache.get(key)
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        return await self._cache.set(key, value, ttl)
    
    async def delete(self, key: str) -> bool:
        return await self._cache.delete(key)
    
    async def get_or_set(
        self, 
        key: str, 
        factory: Callable[[], Any],
        ttl: int = 300
    ) -> Any:
        """
        Get from cache or compute and cache the result.
        
        Args:
            key: Cache key
            factory: Async function to compute value if not cached
            ttl: Time to live in seconds
        """
        cached = await self.get(key)
        if cached is not None:
            return cached
        
        # Compute value
        if asyncio.iscoroutinefunction(factory):
            value = await factory()
        else:
            value = factory()
        
        # Cache it
        await self.set(key, value, ttl)
        return value


# ---
# CACHE KEYS
# ---

class CacheKeys:
    """
    Standardized cache key generators.
    
    Use these to ensure consistent key naming.
    """
    
    @staticmethod
    def inventory_all() -> str:
        return "inventory:all"
    
    @staticmethod
    def inventory_by_model(model: str) -> str:
        return f"inventory:model:{model.lower()}"
    
    @staticmethod
    def inventory_stats() -> str:
        return "inventory:stats"
    
    @staticmethod
    def session(session_id: str) -> str:
        return f"session:{session_id}"
    
    @staticmethod
    def active_sessions() -> str:
        return "sessions:active"
    
    @staticmethod
    def traffic_stats() -> str:
        return "traffic:stats"


# ---
# SINGLETON
# ---

_cache_service: Optional[CacheService] = None


async def get_cache() -> CacheService:
    """Get singleton cache service"""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
        await _cache_service.initialize()
    return _cache_service


async def shutdown_cache():
    """Shutdown cache service"""
    global _cache_service
    if _cache_service:
        await _cache_service.shutdown()
        _cache_service = None
