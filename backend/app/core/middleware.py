"""
Quirk AI Kiosk - Production Middleware

Provides:
1. Request ID / Correlation ID tracking
2. Security headers (CSP, HSTS, etc.)
3. Request/Response logging
4. Performance timing
5. Error tracking integration
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp
import time
import uuid
import logging
from typing import Optional, Callable
import json

from app.core.settings import get_settings

logger = logging.getLogger("quirk_kiosk.middleware")


# ---
# REQUEST ID MIDDLEWARE
# ---

class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Add unique request ID to all requests for tracing.
    
    Request ID is:
    - Generated if not provided
    - Propagated in X-Request-ID header
    - Added to request.state for use in handlers
    - Included in all log messages
    """
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Get or generate request ID
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())[:8]
        
        # Store in request state
        request.state.request_id = request_id
        
        # Process request
        response = await call_next(request)
        
        # Add to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response


# ---
# TIMING MIDDLEWARE
# ---

class TimingMiddleware(BaseHTTPMiddleware):
    """
    Track request processing time.
    
    Adds X-Process-Time header with timing in seconds.
    """
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start_time = time.perf_counter()
        
        response = await call_next(request)
        
        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}"
        
        return response


# ---
# SECURITY HEADERS MIDDLEWARE
# ---

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.
    
    Implements OWASP security best practices.
    """
    
    def __init__(self, app: ASGIApp, csp_policy: Optional[str] = None):
        super().__init__(app)
        self.csp_policy = csp_policy or self._default_csp()
    
    def _default_csp(self) -> str:
        """Default Content Security Policy"""
        return "; ".join([
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https://api.anthropic.com https://api.elevenlabs.io https://*.railway.app",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ])
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        
        settings = get_settings()
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # HSTS in production only
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # CSP header
        response.headers["Content-Security-Policy"] = self.csp_policy
        
        # Permissions Policy
        response.headers["Permissions-Policy"] = (
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
            "magnetometer=(), microphone=(self), payment=(), usb=()"
        )
        
        return response


# ---
# REQUEST LOGGING MIDDLEWARE
# ---

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured logging for all requests.
    
    Logs:
    - Request method, path, status
    - Processing time
    - Request ID for correlation
    - Client IP
    """
    
    # Paths to skip logging (reduce noise)
    SKIP_PATHS = {"/api/health", "/api/health/live", "/api/health/ready", "/favicon.ico"}
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Skip noisy endpoints
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)
        
        start_time = time.perf_counter()
        
        # Get request metadata
        request_id = getattr(request.state, "request_id", "unknown")
        client_ip = self._get_client_ip(request)
        
        # Process request
        response = await call_next(request)
        
        # Calculate timing
        process_time = time.perf_counter() - start_time
        
        # Build log entry
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(process_time * 1000, 2),
            "client_ip": client_ip,
        }
        
        # Add query params for non-sensitive endpoints
        if request.query_params and not self._is_sensitive_path(request.url.path):
            log_data["query"] = str(request.query_params)
        
        # Log level based on status
        if response.status_code >= 500:
            logger.error(f"Request failed: {json.dumps(log_data)}")
        elif response.status_code >= 400:
            logger.warning(f"Client error: {json.dumps(log_data)}")
        else:
            logger.info(f"Request completed: {json.dumps(log_data)}")
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP, considering proxies"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _is_sensitive_path(self, path: str) -> bool:
        """Check if path contains sensitive data"""
        sensitive_patterns = ["/auth", "/login", "/token", "/password"]
        return any(p in path.lower() for p in sensitive_patterns)


# ---
# ERROR TRACKING MIDDLEWARE (Sentry Integration)
# ---

class ErrorTrackingMiddleware(BaseHTTPMiddleware):
    """
    Capture and report errors to Sentry.
    
    Adds context like request ID and user info to error reports.
    """
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        settings = get_settings()
        
        try:
            response = await call_next(request)
            return response
            
        except Exception as e:
            # Add context to error
            request_id = getattr(request.state, "request_id", "unknown")
            
            # If Sentry is configured, add context
            if settings.sentry_dsn:
                try:
                    import sentry_sdk
                    sentry_sdk.set_tag("request_id", request_id)
                    sentry_sdk.set_context("request", {
                        "method": request.method,
                        "path": request.url.path,
                        "client_ip": request.client.host if request.client else None,
                    })
                except ImportError:
                    pass
            
            # Re-raise to let FastAPI handle it
            raise


# ---
# RATE LIMIT HEADERS MIDDLEWARE
# ---

class RateLimitHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add rate limit information headers to responses.
    
    Works with slowapi rate limiter to provide:
    - X-RateLimit-Limit
    - X-RateLimit-Remaining
    - X-RateLimit-Reset
    """
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        
        # slowapi adds rate limit info to request state
        rate_limit = getattr(request.state, "_rate_limit", None)
        if rate_limit:
            response.headers["X-RateLimit-Limit"] = str(rate_limit.get("limit", ""))
            response.headers["X-RateLimit-Remaining"] = str(rate_limit.get("remaining", ""))
            response.headers["X-RateLimit-Reset"] = str(rate_limit.get("reset", ""))
        
        return response


# ---
# HELPER: Setup all middleware
# ---

def setup_middleware(app) -> None:
    """
    Setup all production middleware in correct order.
    
    Order matters! Middleware is executed in reverse order of addition.
    """
    settings = get_settings()
    
    # Add middleware (last added = first executed)
    
    # 1. Error tracking (innermost - catches all errors)
    if settings.sentry_dsn:
        app.add_middleware(ErrorTrackingMiddleware)
    
    # 2. Request logging
    app.add_middleware(RequestLoggingMiddleware)
    
    # 3. Rate limit headers
    app.add_middleware(RateLimitHeadersMiddleware)
    
    # 4. Security headers
    if settings.is_production:
        app.add_middleware(SecurityHeadersMiddleware)
    
    # 5. Timing
    app.add_middleware(TimingMiddleware)
    
    # 6. Request ID (outermost - ensures ID available to all)
    app.add_middleware(RequestIDMiddleware)
    
    logger.info(f"Middleware configured for {settings.environment} environment")
