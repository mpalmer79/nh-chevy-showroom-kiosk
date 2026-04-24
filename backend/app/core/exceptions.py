"""
NH Chevy Showroom Kiosk - Custom Exception Classes

Provides consistent error handling across the application with:
- Structured error responses
- Error codes for client handling
- Appropriate HTTP status codes
- Optional details for debugging
"""

from typing import Optional, Dict, Any


class AppException(Exception):
    """
    Base application exception for consistent error responses.
    
    All custom exceptions should inherit from this class to ensure
    consistent error formatting across the API.
    
    Attributes:
        message: Human-readable error message
        code: Machine-readable error code for client handling
        status_code: HTTP status code
        details: Additional context (hidden in production)
    """
    
    def __init__(
        self, 
        message: str, 
        code: str = "INTERNAL_ERROR", 
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self, include_details: bool = False) -> Dict[str, Any]:
        """Convert exception to dictionary for JSON response"""
        result = {
            "error": self.code,
            "message": self.message,
        }
        if include_details and self.details:
            result["details"] = self.details
        return result


class AIServiceException(AppException):
    """
    Raised when AI service is unavailable or fails.
    
    This includes:
    - Anthropic API errors
    - Timeout errors
    - Rate limiting from AI provider
    """
    
    def __init__(
        self, 
        message: str = "AI service temporarily unavailable",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            code="AI_SERVICE_ERROR",
            status_code=503,
            details=details
        )


class ValidationException(AppException):
    """
    Raised for input validation failures.
    
    Use this when user input doesn't meet requirements.
    """
    
    def __init__(
        self, 
        message: str,
        field: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        error_details = details or {}
        if field:
            error_details["field"] = field
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=400,
            details=error_details
        )


class RateLimitException(AppException):
    """
    Raised when rate limit is exceeded.
    
    Includes retry_after information for clients.
    """
    
    def __init__(
        self, 
        message: str = "Too many requests. Please slow down.",
        retry_after: int = 60
    ):
        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details={"retry_after": retry_after}
        )


class NotFoundError(AppException):
    """
    Raised when a requested resource is not found.
    """
    
    def __init__(
        self, 
        resource: str,
        identifier: Optional[str] = None
    ):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} '{identifier}' not found"
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=404,
            details={"resource": resource, "identifier": identifier}
        )


class DatabaseError(AppException):
    """
    Raised when database operations fail.
    """
    
    def __init__(
        self, 
        message: str = "Database operation failed",
        operation: Optional[str] = None
    ):
        super().__init__(
            message=message,
            code="DATABASE_ERROR",
            status_code=500,
            details={"operation": operation} if operation else {}
        )


class AuthenticationError(AppException):
    """
    Raised when authentication fails.
    """
    
    def __init__(
        self, 
        message: str = "Authentication required"
    ):
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
            status_code=401
        )


class AuthorizationError(AppException):
    """
    Raised when user lacks permission.
    """
    
    def __init__(
        self, 
        message: str = "Permission denied",
        required_permission: Optional[str] = None
    ):
        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
            status_code=403,
            details={"required_permission": required_permission} if required_permission else {}
        )


class ExternalServiceError(AppException):
    """
    Raised when an external service (PBS, CRM, etc.) fails.
    """
    
    def __init__(
        self, 
        service: str,
        message: Optional[str] = None
    ):
        super().__init__(
            message=message or f"External service '{service}' is unavailable",
            code="EXTERNAL_SERVICE_ERROR",
            status_code=502,
            details={"service": service}
        )
