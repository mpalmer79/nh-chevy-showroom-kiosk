"""
NH Chevy Showroom Kiosk - Authentication Router

Provides endpoints for:
- Admin login
- Token refresh
- API key validation
- Admin user management (protected)
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
import logging

from app.core.auth import (
    require_admin,
    create_access_token,
    create_refresh_token,
    decode_token,
    authenticate_admin,
    create_admin_user,
    hash_password,
    ADMIN_USERS,
)
from app.core.settings import get_settings

router = APIRouter()
logger = logging.getLogger("showroom_kiosk.auth_router")


# ---
# REQUEST/RESPONSE MODELS
# ---

class LoginRequest(BaseModel):
    """Admin login request"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)


class LoginResponse(BaseModel):
    """Login response with tokens"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    """Token refresh request"""
    refresh_token: str


class CreateAdminRequest(BaseModel):
    """Create admin user request"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    email: Optional[EmailStr] = None


class AdminUserResponse(BaseModel):
    """Admin user info response"""
    username: str
    role: str
    created_at: Optional[str] = None


class APIKeyValidationRequest(BaseModel):
    """API key validation request"""
    api_key: str


# ---
# PUBLIC ENDPOINTS
# ---

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, req: Request):
    """
    Authenticate admin user and return JWT tokens.
    
    Returns access token (short-lived) and refresh token (long-lived).
    """
    settings = get_settings()
    
    # Authenticate
    user = authenticate_admin(request.username, request.password)
    
    if not user:
        logger.warning(f"Failed login attempt for user: {request.username} from {req.client.host}")
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )
    
    # Create tokens
    access_token = create_access_token({
        "sub": user["username"],
        "role": user["role"]
    })
    
    refresh_token = create_refresh_token(user["username"])
    
    logger.info(f"Successful login for user: {request.username}")
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.jwt_expiration_minutes * 60
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(request: RefreshRequest):
    """
    Refresh access token using refresh token.
    
    Returns new access token. Refresh token remains valid.
    """
    settings = get_settings()
    
    try:
        payload = decode_token(request.refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Verify user still exists
        if username not in ADMIN_USERS:
            raise HTTPException(status_code=401, detail="User not found")
        
        user = ADMIN_USERS[username]
        
        # Create new access token
        access_token = create_access_token({
            "sub": username,
            "role": user["role"]
        })
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=request.refresh_token,  # Return same refresh token
            token_type="bearer",
            expires_in=settings.jwt_expiration_minutes * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/validate-key")
async def validate_api_key(request: APIKeyValidationRequest):
    """
    Validate an API key.
    
    Returns key type and validity status.
    """
    settings = get_settings()
    
    # Check admin key
    if settings.admin_api_key and request.api_key == settings.admin_api_key:
        return {"valid": True, "type": "admin"}
    
    # Check service key
    if settings.api_service_key and request.api_key == settings.api_service_key:
        return {"valid": True, "type": "service"}
    
    return {"valid": False, "type": None}


# ---
# PROTECTED ENDPOINTS (Require Admin)
# ---

@router.get("/me", response_model=AdminUserResponse)
async def get_current_admin(admin: dict = Depends(require_admin)):
    """
    Get current authenticated admin user info.
    """
    return AdminUserResponse(
        username=admin.get("sub", admin.get("username", "api_key_user")),
        role=admin.get("role", "admin")
    )


@router.post("/users", response_model=AdminUserResponse)
async def create_admin(
    request: CreateAdminRequest,
    admin: dict = Depends(require_admin)
):
    """
    Create a new admin user.
    
    Requires admin authentication.
    """
    if request.username in ADMIN_USERS:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )
    
    success = create_admin_user(request.username, request.password)
    
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to create user"
        )
    
    logger.info(f"Admin user created: {request.username} by {admin.get('sub', 'api_key')}")
    
    return AdminUserResponse(
        username=request.username,
        role="admin",
        created_at=datetime.utcnow().isoformat()
    )


@router.get("/users")
async def list_admins(admin: dict = Depends(require_admin)):
    """
    List all admin users.
    
    Requires admin authentication.
    """
    return {
        "users": [
            {
                "username": username,
                "role": data["role"],
                "created_at": data.get("created_at")
            }
            for username, data in ADMIN_USERS.items()
        ]
    }


@router.delete("/users/{username}")
async def delete_admin(
    username: str,
    admin: dict = Depends(require_admin)
):
    """
    Delete an admin user.
    
    Cannot delete yourself.
    """
    current_user = admin.get("sub")
    
    if username == current_user:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete yourself"
        )
    
    if username not in ADMIN_USERS:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    del ADMIN_USERS[username]
    
    logger.info(f"Admin user deleted: {username} by {current_user}")
    
    return {"status": "deleted", "username": username}


# ---
# INITIALIZATION ENDPOINT (Only works once)
# ---

_initialized = False

@router.post("/init")
async def initialize_admin(request: CreateAdminRequest):
    """
    Initialize first admin user.
    
    This endpoint only works ONCE when no admin users exist.
    Use this to bootstrap the system.
    """
    global _initialized
    
    if _initialized or ADMIN_USERS:
        raise HTTPException(
            status_code=403,
            detail="System already initialized"
        )
    
    success = create_admin_user(request.username, request.password)
    
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to create initial admin"
        )
    
    _initialized = True
    
    logger.info(f"System initialized with admin user: {request.username}")
    
    return {
        "status": "initialized",
        "message": f"Admin user '{request.username}' created. Please save your credentials securely.",
        "next_steps": [
            "Use POST /api/v1/auth/login to get access token",
            "Use token in Authorization header: Bearer <token>",
            "Or set ADMIN_API_KEY env var for API key auth"
        ]
    }
