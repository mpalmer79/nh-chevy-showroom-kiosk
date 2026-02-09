"""
Quirk AI Kiosk - Structured Logging Configuration

Provides:
- JSON logging for production (machine-readable)
- Pretty console logging for development
- Request context tracking
- Sensitive data masking
"""

import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict, Optional
from contextvars import ContextVar
import os

# Context variable for request tracking
request_context: ContextVar[Dict[str, Any]] = ContextVar('request_context', default={})


class JSONFormatter(logging.Formatter):
    """
    JSON formatter for production logging.
    
    Outputs one JSON object per line for easy parsing by
    log aggregation tools (CloudWatch, Datadog, etc.)
    """
    
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add request context if available
        ctx = request_context.get()
        if ctx:
            log_entry["request_id"] = ctx.get("request_id")
            log_entry["session_id"] = ctx.get("session_id")
            log_entry["path"] = ctx.get("path")
        
        # Add exception info
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, 'extra_fields'):
            log_entry.update(record.extra_fields)
        
        return json.dumps(log_entry, default=str)


class PrettyFormatter(logging.Formatter):
    """
    Pretty formatter for development.
    
    Color-coded output for easy reading in terminal.
    """
    
    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'CRITICAL': '\033[35m',  # Magenta
    }
    RESET = '\033[0m'
    
    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.RESET)
        
        # Format timestamp
        timestamp = datetime.now().strftime('%H:%M:%S')
        
        # Get request context
        ctx = request_context.get()
        request_id = ctx.get("request_id", "")[:8] if ctx else ""
        
        # Build message
        prefix = f"{color}[{timestamp}] {record.levelname:8}{self.RESET}"
        if request_id:
            prefix += f" [{request_id}]"
        
        message = f"{prefix} {record.name}: {record.getMessage()}"
        
        # Add exception
        if record.exc_info:
            message += f"\n{self.formatException(record.exc_info)}"
        
        return message


class ContextLogger(logging.LoggerAdapter):
    """
    Logger adapter that automatically includes context.
    """
    
    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple:
        # Merge extra fields
        extra = kwargs.get('extra', {})
        ctx = request_context.get()
        if ctx:
            extra.update(ctx)
        kwargs['extra'] = extra
        return msg, kwargs


def setup_logging(environment: str = "production", log_level: str = "INFO"):
    """
    Configure application logging.
    
    Args:
        environment: 'production' for JSON, 'development' for pretty
        log_level: Minimum log level
    """
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Remove existing handlers
    root_logger.handlers.clear()
    
    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    
    # Set formatter based on environment
    if environment == "production":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(PrettyFormatter())
    
    root_logger.addHandler(handler)
    
    # Reduce noise from third-party libraries
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    return root_logger


def get_logger(name: str) -> ContextLogger:
    """
    Get a context-aware logger.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        ContextLogger that includes request context
    """
    base_logger = logging.getLogger(name)
    return ContextLogger(base_logger, {})


def set_request_context(
    request_id: Optional[str] = None,
    session_id: Optional[str] = None,
    path: Optional[str] = None,
    **kwargs
):
    """
    Set context for the current request.
    
    Call this at the start of request handling.
    """
    ctx = {
        "request_id": request_id,
        "session_id": session_id,
        "path": path,
        **kwargs
    }
    request_context.set({k: v for k, v in ctx.items() if v is not None})


def clear_request_context():
    """Clear request context after request completes."""
    request_context.set({})


# ---
# AUDIT LOGGING
# ---

class AuditLogger:
    """
    Specialized logger for audit events.
    
    Use this for tracking:
    - Lead submissions
    - Vehicle requests
    - Customer handoffs
    - Admin actions
    """
    
    def __init__(self):
        self.logger = get_logger("quirk_kiosk.audit")
    
    def log_lead_created(
        self,
        session_id: str,
        customer_name: Optional[str],
        phone: Optional[str],
        vehicle_stock: Optional[str] = None
    ):
        """Log lead creation"""
        self.logger.info(
            "lead_created",
            extra={
                "event_type": "lead_created",
                "session_id": session_id,
                "customer_name": customer_name,
                "phone_masked": phone[-4:] if phone and len(phone) >= 4 else None,
                "vehicle_stock": vehicle_stock,
            }
        )
    
    def log_vehicle_request(
        self,
        session_id: str,
        stock_number: str,
        customer_name: Optional[str] = None
    ):
        """Log vehicle request (bring to front)"""
        self.logger.info(
            "vehicle_requested",
            extra={
                "event_type": "vehicle_request",
                "session_id": session_id,
                "stock_number": stock_number,
                "customer_name": customer_name,
            }
        )
    
    def log_ai_chat(
        self,
        session_id: str,
        message_length: int,
        response_length: int,
        latency_ms: int
    ):
        """Log AI chat interaction"""
        self.logger.info(
            "ai_chat",
            extra={
                "event_type": "ai_chat",
                "session_id": session_id,
                "message_length": message_length,
                "response_length": response_length,
                "latency_ms": latency_ms,
            }
        )


# Singleton audit logger
audit_logger = AuditLogger()
