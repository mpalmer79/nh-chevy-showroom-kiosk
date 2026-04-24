"""
NH Chevy Showroom Kiosk - Authentication & Authorization

Provides multiple authentication methods:
1. JWT tokens for user sessions
2. API keys for service-to-service auth
3. Admin API keys for dashboard access

Usage:
    from app.core.auth import require_admin, require_api_key, get_current_user
    
    @router.get("/admin/stats")
    async def admin_stats(user: dict = Depends(require_admin)):
        ...
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from jose import JWTError, jwt
from passlib.context import CryptContext
import logging
import hashlib
import secrets

from app.core.settings import get_settings

logger = logging.getLogger("showroom_kiosk.auth")

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security schemes
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
admin_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)


# ---
# PASSWORD UTILITIES
# ---

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


# ---
# JWT TOKEN HANDLING
# ---

def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    settings = get_settings()
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_expiration_minutes)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    return jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )


def create_refresh_token(user_id: str) -> str:
    """Create a refresh token with longer expiration"""
    settings = get_settings()
    
    expire = datetime.utcnow() + timedelta(days=7)
    
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    }
    
    return jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    settings = get_settings()
    
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )


# ---
# API KEY VALIDATION
# ---

def generate_api_key() -> str:
    """Generate a new API key"""
    return secrets.token_hex(24)


def hash_api_key(api_key: str) -> str:
    """Hash an API key for storage"""
    return hashlib.sha256(api_key.encode()).hexdigest()


def verify_api_key(provided_key: str, stored_hash: str) -> bool:
    """Verify an API key against its stored hash"""
    return hash_api_key(provided_key) == stored_hash


def validate_admin_key(api_key: str) -> bool:
    """Validate an admin API key"""
    settings = get_settings()
    
    if not settings.admin_api_key:
        # If no admin key configured, allow in development only
        if settings.is_development:
            logger.warning("Admin key not configured - allowing in development mode")
            return True
        return False
    
    return secrets.compare_digest(api_key, settings.admin_api_key)


def validate_service_key(api_key: str) -> bool:
    """Validate a service-to-service API key"""
    settings = get_settings()
    
    if not settings.api_service_key:
        return False
    
    return secrets.compare_digest(api_key, settings.api_service_key)


# ---
# DEPENDENCY FUNCTIONS FOR ROUTE PROTECTION
# ---

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme)
) -> Optional[Dict[str, Any]]:
    """
    Get current user from JWT token (optional).
    
    Returns None if no token provided.
    Raises HTTPException if token is invalid.
    """
    if not credentials:
        return None
    
    return decode_token(credentials.credentials)


async def require_auth(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme)
) -> Dict[str, Any]:
    """
    Require valid JWT authentication.
    
    Raises HTTPException if no token or invalid token.
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return decode_token(credentials.credentials)


async def require_admin(
    request: Request,
    admin_key: Optional[str] = Security(admin_key_header),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme)
) -> Dict[str, Any]:
    """
    Require admin authentication.
    
    Accepts either:
    - X-Admin-Key header with valid admin API key
    - Bearer token with admin role
    
    Returns user info dict with role.
    """
    settings = get_settings()
    
    # Check admin API key first
    if admin_key:
        if validate_admin_key(admin_key):
            logger.info(f"Admin access granted via API key from {request.client.host}")
            return {
                "role": "admin",
                "auth_method": "api_key",
                "ip": request.client.host if request.client else "unknown"
            }
        else:
            logger.warning(f"Invalid admin key attempt from {request.client.host}")
            raise HTTPException(status_code=401, detail="Invalid admin key")
    
    # Check JWT token
    if credentials:
        payload = decode_token(credentials.credentials)
        if payload.get("role") == "admin":
            return payload
        raise HTTPException(status_code=403, detail="Admin role required")
    
    # Development mode bypass
    if settings.is_development and not settings.admin_api_key:
        logger.warning("Admin auth bypassed in development mode")
        return {"role": "admin", "auth_method": "dev_bypass"}
    
    raise HTTPException(
        status_code=401,
        detail="Admin authentication required",
        headers={"WWW-Authenticate": "Bearer"}
    )


async def require_api_key(
    api_key: Optional[str] = Security(api_key_header)
) -> Dict[str, Any]:
    """
    Require valid service API key.
    
    For service-to-service authentication.
    """
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="API key required"
        )
    
    if validate_service_key(api_key):
        return {"auth_method": "service_key"}
    
    raise HTTPException(status_code=401, detail="Invalid API key")


async def optional_api_key(
    api_key: Optional[str] = Security(api_key_header)
) -> Optional[Dict[str, Any]]:
    """
    Optional API key validation.
    
    Returns auth info if valid key provided, None otherwise.
    Does not raise exceptions.
    """
    if not api_key:
        return None
    
    if validate_service_key(api_key):
        return {"auth_method": "service_key"}
    
    return None


# ---
# SESSION TOKEN FOR KIOSK
# ---

def create_kiosk_session_token(session_id: str) -> str:
    """
    Create a signed session token for kiosk sessions.
    
    This is lighter weight than JWT, used for correlating
    requests from the same kiosk session.
    """
    settings = get_settings()
    
    # Create signature
    message = f"{session_id}:{datetime.utcnow().date().isoformat()}"
    signature = hashlib.sha256(
        f"{message}:{settings.jwt_secret_key}".encode()
    ).hexdigest()[:16]
    
    return f"{session_id}.{signature}"


def verify_kiosk_session_token(token: str) -> Optional[str]:
    """
    Verify a kiosk session token and return the session ID.
    
    Returns None if invalid.
    """
    settings = get_settings()
    
    try:
        parts = token.rsplit(".", 1)
        if len(parts) != 2:
            return None
        
        session_id, signature = parts
        
        # Verify signature for today
        message = f"{session_id}:{datetime.utcnow().date().isoformat()}"
        expected = hashlib.sha256(
            f"{message}:{settings.jwt_secret_key}".encode()
        ).hexdigest()[:16]
        
        if secrets.compare_digest(signature, expected):
            return session_id
        
        # Also check yesterday (for sessions spanning midnight)
        yesterday = (datetime.utcnow() - timedelta(days=1)).date().isoformat()
        message_yesterday = f"{session_id}:{yesterday}"
        expected_yesterday = hashlib.sha256(
            f"{message_yesterday}:{settings.jwt_secret_key}".encode()
        ).hexdigest()[:16]
        
        if secrets.compare_digest(signature, expected_yesterday):
            return session_id
        
        return None
        
    except Exception:
        return None


# ---
# ADMIN USER MANAGEMENT (Simple in-memory for now)
# ---

# In production, this would be a database table
ADMIN_USERS = {
    # "username": {"password_hash": "...", "role": "admin"}
}


def create_admin_user(username: str, password: str) -> bool:
    """Create an admin user (for initialization)"""
    if username in ADMIN_USERS:
        return False
    
    ADMIN_USERS[username] = {
        "password_hash": hash_password(password),
        "role": "admin",
        "created_at": datetime.utcnow().isoformat()
    }
    return True


def authenticate_admin(username: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate an admin user and return user info"""
    user = ADMIN_USERS.get(username)
    if not user:
        return None
    
    if not verify_password(password, user["password_hash"]):
        return None
    
    return {
        "username": username,
        "role": user["role"]
    }


def admin_login(username: str, password: str) -> Optional[str]:
    """
    Authenticate admin and return JWT token.
    
    Returns None if authentication fails.
    """
    user = authenticate_admin(username, password)
    if not user:
        return None
    
    return create_access_token({
        "sub": username,
        "role": "admin"
    })
