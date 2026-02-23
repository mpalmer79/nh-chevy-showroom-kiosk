"""
Quirk AI Kiosk - FastAPI Main Application
Entry point for the kiosk backend API

Production-hardened with:
- Rate limiting
- Structured logging
- Global exception handling
- Secure CORS configuration
- Comprehensive health checks
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import datetime
import logging
import time
import uuid

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Core modules — single source of truth (no more duplicated code in main.py)
from app.core.settings import get_settings
from app.core.exceptions import (
    AppException,
    AIServiceException,
    ValidationException,
    RateLimitException,
)
from app.core.security import (
    sanitize_user_input,
    sanitize_stock_number,
    sanitize_phone,
)

# Configure structured logging
settings = get_settings()
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
LOG_LEVEL = logging.DEBUG if settings.is_development else logging.INFO

logging.basicConfig(level=LOG_LEVEL, format=LOG_FORMAT)
logger = logging.getLogger("quirk_kiosk")

# Import routers
from app.routers import inventory, recommendations, leads, analytics, traffic
from app.routers import recommendations_v2
from app.routers import smart_recommendations, ai_v3
from app.routers import photo_analysis
from app.routers import trade_in
from app.routers import tts
from app.routers import worksheet

# Import database
from app.database import init_database, close_database, is_database_configured


# ---
# RATE LIMITER SETUP
# ---

def get_client_identifier(request: Request) -> str:
    """
    Get client identifier for rate limiting.
    Uses X-Forwarded-For header if behind proxy, otherwise remote address.
    Also considers session ID for kiosk-specific limiting.
    """
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"

    session_id = request.headers.get("X-Session-ID", "")
    if session_id:
        return f"{client_ip}:{session_id}"

    return client_ip


limiter = Limiter(key_func=get_client_identifier)


# Lifespan handler

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown handler"""
    logger.info("Quirk AI Kiosk API starting...")
    logger.info(f"Environment: {settings.environment}")
    logger.info("Loading inventory enrichment service...")
    logger.info("Initializing entity extraction service...")
    logger.info("Initializing intelligent AI services (v3)...")
    logger.info("Initializing Digital Worksheet service...")

    # Initialize database
    if is_database_configured():
        logger.info("Connecting to PostgreSQL database...")
        db_success = await init_database()
        if db_success:
            logger.info("PostgreSQL database connected")
        else:
            logger.warning("PostgreSQL connection failed - using JSON fallback")
    else:
        logger.info("No DATABASE_URL configured - using JSON file storage")

    # Initialize cache (Redis or in-memory fallback)
    from app.core.cache import get_cache, shutdown_cache
    try:
        cache = await get_cache()
        cache_type = "Redis" if hasattr(cache, '_use_redis') and cache._use_redis else "In-memory"
        logger.info(f"Cache initialized: {cache_type}")
    except Exception as e:
        logger.warning(f"Cache initialization failed, will use in-memory fallback: {e}")

    # Verify critical configuration
    if not settings.is_ai_configured:
        logger.warning("ANTHROPIC_API_KEY not configured - AI chat will use fallback responses")
    else:
        logger.info("Anthropic API key configured")

    logger.info("All services initialized")
    yield

    # Shutdown
    logger.info("Quirk AI Kiosk API shutting down...")
    await shutdown_cache()
    await close_database()
    logger.info("Cleanup complete")


# App initialization

app = FastAPI(
    title="Quirk AI Kiosk API",
    description="AI-powered vehicle recommendation and customer interaction system for Quirk Auto Dealers",
    version="3.0.0",
    docs_url="/docs" if settings.is_development else None,
    redoc_url="/redoc" if settings.is_development else None,
    openapi_url="/openapi.json" if settings.is_development else None,
    lifespan=lifespan
)

# Add rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS — uses settings.cors_origins_list (single source of truth)
cors_origins = settings.cors_origins_list if settings.is_production else ["*"]
if not settings.is_production:
    logger.warning("⚠️  Running in DEVELOPMENT mode - CORS allows all origins")
else:
    logger.info(f"✅ CORS configured with {len(cors_origins)} origins")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"]
)


# ---
# EXCEPTION HANDLERS
# ---

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Handle application-specific exceptions"""
    logger.warning(f"AppException: {exc.code} - {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.code,
            "message": exc.message,
            "details": exc.details
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all exception handler"""
    logger.error(f"Unhandled exception: {type(exc).__name__} - {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
            "details": {"type": type(exc).__name__} if settings.is_development else {}
        }
    )


@app.middleware("http")
async def add_request_metadata(request: Request, call_next):
    """Add request ID and timing to all requests"""
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()

    request.state.request_id = request_id

    response = await call_next(request)

    process_time = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.3f}s"

    # Log request (skip health checks to reduce noise)
    if not request.url.path.endswith("/health"):
        logger.info(
            f"{request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s",
            extra={"request_id": request_id}
        )

    return response


# ---
# ROUTES
# ---

# V1 Routes (Core functionality)
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["inventory"])
app.include_router(recommendations.router, prefix="/api/v1/recommendations", tags=["recommendations"])
app.include_router(leads.router, prefix="/api/v1/leads", tags=["leads"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])
app.include_router(traffic.router, prefix="/api/v1/traffic", tags=["traffic"])

# V2 Routes (Enhanced recommendations)
app.include_router(recommendations_v2.router, prefix="/api/v2/recommendations", tags=["recommendations-v2"])

# V3 Routes (Smart Recommendations + Intelligent AI with Tools/Memory/RAG)
app.include_router(smart_recommendations.router, prefix="/api/v3/smart", tags=["smart-recommendations"])
app.include_router(ai_v3.router, prefix="/api/v3/ai", tags=["ai"])

# V3 Worksheet Routes (Digital Worksheet for deal structuring)
app.include_router(worksheet.router, prefix="/api/v3", tags=["worksheet"])

# Photo analysis router
app.include_router(photo_analysis.router, prefix="/api/v1/trade-in-photos", tags=["photo-analysis"])

# Trade-in router (VIN decode, valuation)
app.include_router(trade_in.router, prefix="/api/v1/trade-in", tags=["trade-in"])

# TTS Router (ElevenLabs)
app.include_router(tts.router, prefix="/api/v1/tts", tags=["tts"])


# ---
# CORE ENDPOINTS
# ---

@app.get("/")
async def root():
    """API root - service information"""
    return {
        "service": "Quirk AI Kiosk API",
        "status": "running",
        "version": "3.0.0",
        "environment": settings.environment,
        "docs": "/docs" if settings.is_development else "disabled",
        "features": {
            "v1": ["inventory", "recommendations", "leads", "analytics", "traffic", "trade-in", "tts"],
            "v2": ["enhanced-recommendations"],
            "v3": ["smart-recommendations", "intelligent-ai-chat", "digital-worksheet"]
        },
        "storage": "postgresql" if is_database_configured() else "json"
    }


@app.get("/api/health")
async def health_check():
    """
    Comprehensive health check endpoint.
    Checks all service dependencies and returns detailed status.
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "quirk-kiosk-api",
        "version": "3.0.0",
        "environment": settings.environment,
        "checks": {}
    }

    overall_healthy = True

    # Database check
    try:
        if is_database_configured():
            from app.database import test_connection
            db_ok = await test_connection()
            health_status["checks"]["database"] = {
                "status": "healthy" if db_ok else "unhealthy",
                "type": "postgresql"
            }
            if not db_ok:
                overall_healthy = False
        else:
            health_status["checks"]["database"] = {
                "status": "healthy",
                "type": "json_fallback"
            }
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e) if settings.is_development else "connection_failed"
        }
        overall_healthy = False

    # Redis check
    try:
        from app.core.cache import get_cache
        cache = await get_cache()
        if hasattr(cache, '_use_redis') and cache._use_redis:
            health_status["checks"]["redis"] = {"status": "healthy", "type": "redis"}
        else:
            health_status["checks"]["redis"] = {"status": "healthy", "type": "in_memory_fallback"}
    except Exception as e:
        health_status["checks"]["redis"] = {
            "status": "unavailable",
            "error": str(e) if settings.is_development else "connection_failed"
        }

    # AI Service check
    health_status["checks"]["ai_service"] = {
        "status": "configured" if settings.is_ai_configured else "fallback_mode",
        "provider": "anthropic",
        "model": "claude-sonnet-4-5-20250929"
    }

    # Inventory check
    try:
        from app.routers.inventory import get_vehicle_count
        vehicle_count = get_vehicle_count()
        health_status["checks"]["inventory"] = {
            "status": "healthy",
            "vehicle_count": vehicle_count
        }
    except Exception as e:
        health_status["checks"]["inventory"] = {
            "status": "degraded",
            "error": str(e) if settings.is_development else "load_error"
        }

    # V3 Intelligent AI check
    try:
        from app.services.vehicle_retriever import get_vehicle_retriever
        retriever = get_vehicle_retriever()
        health_status["checks"]["intelligent_ai"] = {
            "status": "healthy" if retriever._is_fitted else "not_fitted",
            "inventory_indexed": len(retriever.inventory) if retriever._is_fitted else 0
        }
    except Exception as e:
        health_status["checks"]["intelligent_ai"] = {
            "status": "degraded",
            "error": str(e) if settings.is_development else "init_error"
        }

    # Worksheet service check
    try:
        from app.services.worksheet_service import get_worksheet_service
        ws_service = get_worksheet_service()
        active_worksheets = len([w for w in ws_service._worksheets.values()])
        health_status["checks"]["worksheet_service"] = {
            "status": "healthy",
            "active_worksheets": active_worksheets
        }
    except Exception as e:
        health_status["checks"]["worksheet_service"] = {
            "status": "degraded",
            "error": str(e) if settings.is_development else "init_error"
        }

    # Set overall status
    if not overall_healthy:
        health_status["status"] = "unhealthy"
    elif not settings.is_ai_configured:
        health_status["status"] = "degraded"

    return health_status


@app.get("/api/health/live")
async def liveness_check():
    """Kubernetes liveness probe."""
    return {"status": "alive"}


@app.get("/api/health/ready")
async def readiness_check():
    """Kubernetes readiness probe."""
    if is_database_configured():
        try:
            from app.database import test_connection
            if not await test_connection():
                return JSONResponse(
                    status_code=503,
                    content={"status": "not_ready", "reason": "database_unavailable"}
                )
        except Exception:
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "reason": "database_error"}
            )

    return {"status": "ready"}


# ---
# UTILITY EXPORTS (for use in routers)
# Re-exports from core modules so existing imports continue to work
# ---

__all__ = [
    "app",
    "limiter",
    # Re-exported from core.exceptions
    "AppException",
    "AIServiceException",
    "ValidationException",
    "RateLimitException",
    # Re-exported from core.security
    "sanitize_user_input",
    "sanitize_stock_number",
    "sanitize_phone",
]


# ---
# MAIN ENTRY POINT
# ---

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.is_development,
        log_level="debug" if settings.is_development else "info",
        access_log=settings.is_development,
    )
