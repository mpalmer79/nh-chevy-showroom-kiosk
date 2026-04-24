"""
NH Chevy Showroom Kiosk - Security Utilities

Provides secure handling of:
- API keys with masking
- Input sanitization
- Request validation
"""

from functools import lru_cache
from typing import Optional
import os
import re
import logging
import secrets
import hashlib
from html import escape

logger = logging.getLogger("showroom_kiosk.security")


class SecretValue:
    """
    Wrapper for sensitive values that prevents accidental logging.
    
    The actual value is never exposed in __repr__ or __str__.
    """
    
    def __init__(self, value: str):
        self._value = value
        self._hash = hashlib.sha256(value.encode()).hexdigest()[:8] if value else None
    
    def get_secret_value(self) -> str:
        """Get the actual secret value"""
        return self._value
    
    def __repr__(self) -> str:
        if self._value:
            return f"SecretValue(hash={self._hash}...)"
        return "SecretValue(empty)"
    
    def __str__(self) -> str:
        return self.__repr__()
    
    def __bool__(self) -> bool:
        return bool(self._value)


class APIKeyManager:
    """
    Secure API key management with rotation support.
    
    Features:
    - Keys are never logged in plain text
    - Supports runtime key rotation
    - Validates key format
    """
    
    def __init__(self):
        self._anthropic_key: Optional[SecretValue] = None
        self._pbs_api_key: Optional[SecretValue] = None
        self._crm_api_key: Optional[SecretValue] = None
        self._load_keys()
    
    def _load_keys(self):
        """Load API keys from environment variables"""
        
        # Anthropic API Key
        anthropic = os.getenv("ANTHROPIC_API_KEY")
        if anthropic:
            self._anthropic_key = SecretValue(anthropic)
            logger.info(f"Anthropic API key loaded: {self._anthropic_key}")
        else:
            logger.warning("ANTHROPIC_API_KEY not configured - AI will use fallback mode")
        
        # PBS DMS API Key
        pbs = os.getenv("PBS_API_KEY")
        if pbs and pbs != "mock-pbs-key-dev":
            self._pbs_api_key = SecretValue(pbs)
            logger.info(f"PBS API key loaded: {self._pbs_api_key}")
        
        # CRM API Key  
        crm = os.getenv("CRM_API_KEY")
        if crm and crm != "mock-crm-key-dev":
            self._crm_api_key = SecretValue(crm)
            logger.info(f"CRM API key loaded: {self._crm_api_key}")
    
    @property
    def anthropic_key(self) -> Optional[str]:
        """Get Anthropic API key (actual value)"""
        return self._anthropic_key.get_secret_value() if self._anthropic_key else None
    
    @property
    def pbs_api_key(self) -> Optional[str]:
        """Get PBS API key (actual value)"""
        return self._pbs_api_key.get_secret_value() if self._pbs_api_key else None
    
    @property
    def crm_api_key(self) -> Optional[str]:
        """Get CRM API key (actual value)"""
        return self._crm_api_key.get_secret_value() if self._crm_api_key else None
    
    @property
    def is_ai_configured(self) -> bool:
        """Check if AI service is properly configured"""
        return bool(self._anthropic_key)
    
    def rotate_keys(self):
        """
        Reload keys from environment.
        Call this after updating secrets in production.
        """
        logger.info("Rotating API keys...")
        self._load_keys()
        logger.info("API key rotation complete")
    
    def validate_anthropic_key(self) -> bool:
        """Validate Anthropic key format (starts with sk-ant-)"""
        if not self._anthropic_key:
            return False
        key = self._anthropic_key.get_secret_value()
        return key.startswith("sk-ant-") and len(key) > 20


@lru_cache()
def get_key_manager() -> APIKeyManager:
    """Get singleton APIKeyManager instance"""
    return APIKeyManager()


# ---
# INPUT SANITIZATION
# ---

def sanitize_user_input(text: str, max_length: int = 2000) -> str:
    """
    Sanitize user input before processing.
    
    Args:
        text: Raw user input
        max_length: Maximum allowed length
        
    Returns:
        Sanitized text safe for processing
    """
    if not text:
        return ""
    
    # Truncate to max length
    text = text[:max_length]
    
    # Remove control characters (except newlines and tabs)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    
    # Remove null bytes
    text = text.replace('\x00', '')
    
    # Basic XSS prevention - escape HTML entities
    text = escape(text)
    
    return text.strip()


def sanitize_stock_number(stock: str) -> str:
    """
    Sanitize stock number input.
    
    Only allows alphanumeric characters and hyphens.
    """
    if not stock:
        return ""
    return re.sub(r'[^A-Za-z0-9\-]', '', stock)[:20]


def sanitize_phone(phone: str) -> str:
    """
    Sanitize phone number - digits only.
    
    Returns only numeric characters.
    """
    if not phone:
        return ""
    return re.sub(r'[^\d]', '', phone)[:15]


def sanitize_email(email: str) -> str:
    """
    Basic email sanitization.
    
    Note: For full validation, use pydantic EmailStr.
    """
    if not email:
        return ""
    # Remove whitespace and lowercase
    email = email.strip().lower()
    # Basic pattern check
    if not re.match(r'^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$', email):
        return ""
    return email[:254]  # Max email length per RFC


def sanitize_vin(vin: str) -> str:
    """
    Sanitize VIN (Vehicle Identification Number).
    
    VINs are exactly 17 alphanumeric characters (no I, O, Q).
    """
    if not vin:
        return ""
    # Uppercase and remove invalid characters
    vin = re.sub(r'[^A-HJ-NPR-Z0-9]', '', vin.upper())
    return vin[:17]


def generate_session_id() -> str:
    """Generate a secure session ID"""
    return f"K{secrets.token_hex(8).upper()}"


def mask_sensitive_data(data: str, visible_chars: int = 4) -> str:
    """
    Mask sensitive data for logging.
    
    Example: "1234567890" -> "******7890"
    """
    if not data or len(data) <= visible_chars:
        return "*" * len(data) if data else ""
    return "*" * (len(data) - visible_chars) + data[-visible_chars:]
