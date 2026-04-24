"""
Core utilities and services for the NH Chevy Showroom Kiosk backend.
"""

from .exceptions import (
    AppException,
    AIServiceException,
    ValidationException,
    RateLimitException,
    NotFoundError,
    DatabaseError,
)
from .security import get_key_manager, APIKeyManager
from .logging import setup_logging, get_logger
from .cache import CacheService, get_cache
from .settings import get_settings, Settings, validate_settings
from .auth import (
    require_admin,
    require_auth,
    require_api_key,
    get_current_user,
    create_access_token,
    decode_token,
)
from .middleware import setup_middleware

__all__ = [
    # Exceptions
    "AppException",
    "AIServiceException", 
    "ValidationException",
    "RateLimitException",
    "NotFoundError",
    "DatabaseError",
    # Security
    "get_key_manager",
    "APIKeyManager",
    # Logging
    "setup_logging",
    "get_logger",
    # Cache
    "CacheService",
    "get_cache",
    # Settings
    "get_settings",
    "Settings",
    "validate_settings",
    # Auth
    "require_admin",
    "require_auth",
    "require_api_key",
    "get_current_user",
    "create_access_token",
    "decode_token",
    # Middleware
    "setup_middleware",
]
