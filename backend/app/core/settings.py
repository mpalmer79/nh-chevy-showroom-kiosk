"""
NH Chevy Showroom Kiosk - Application Settings
Pydantic-based configuration with validation and type safety.

All environment variables are validated at startup.
Missing required variables will prevent the application from starting.
"""

from functools import lru_cache
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
import secrets


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    Required variables will raise ValidationError if missing.
    Optional variables have sensible defaults.
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )
    
    #
    # ENVIRONMENT
    #
    
    environment: str = Field(
        default="production",
        description="Runtime environment: development or production"
    )
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    
    @property
    def is_development(self) -> bool:
        return self.environment.lower() == "development"
    
    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"
    
    #
    # AI SERVICE
    #
    
    anthropic_api_key: Optional[str] = Field(
        default=None,
        description="Anthropic API key for Claude AI"
    )
    
    @property
    def is_ai_configured(self) -> bool:
        return bool(self.anthropic_api_key and self.anthropic_api_key.startswith("sk-ant-"))
    
    #
    # AUTHENTICATION
    #
    
    jwt_secret_key: str = Field(
        default_factory=lambda: secrets.token_hex(32),
        description="Secret key for JWT token signing"
    )
    jwt_expiration_minutes: int = Field(
        default=480,
        description="JWT token expiration time in minutes"
    )
    jwt_algorithm: str = Field(default="HS256")
    
    # API Keys for service auth
    api_service_key: Optional[str] = Field(
        default=None,
        description="API key for service-to-service authentication"
    )
    admin_api_key: Optional[str] = Field(
        default=None,
        description="API key for admin dashboard access"
    )
    
    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret(cls, v: str, info) -> str:
        # In production, require a proper secret
        if len(v) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters")
        return v
    
    #
    # DATABASE
    #
    
    database_url: Optional[str] = Field(
        default=None,
        description="PostgreSQL connection URL"
    )
    sql_echo: bool = Field(default=False)
    
    redis_url: Optional[str] = Field(
        default=None,
        description="Redis connection URL"
    )

    @property
    def is_redis_configured(self) -> bool:
        return bool(self.redis_url)

    @property
    def database_url_async(self) -> Optional[str]:
        """Convert DATABASE_URL to async-compatible format"""
        if not self.database_url:
            return None
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url
    
    @property
    def is_database_configured(self) -> bool:
        return bool(self.database_url and "postgresql" in self.database_url)
    
    #
    # CORS
    #
    
    cors_origins: Optional[str] = Field(
        default=None,
        description="Comma-separated list of allowed CORS origins"
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins into list.

        Production deployments MUST supply CORS_ORIGINS via env var.
        The built-in defaults only cover local development — old production
        URLs have been removed to avoid leaking CORS access to infrastructure
        that may no longer be under the dealership's control.
        """
        if self.cors_origins:
            return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

        # Default CORS origins — production origins must be supplied via
        # CORS_ORIGINS env var.
        return [
            "http://localhost:3000",
            "http://localhost:8000",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8000",
        ]
    
    #
    # RATE LIMITING
    #
    
    ai_rate_limit_per_minute: int = Field(
        default=30,
        description="AI chat requests per minute per session"
    )
    api_rate_limit_per_minute: int = Field(
        default=100,
        description="General API requests per minute per IP"
    )
    
    #
    # EXTERNAL SERVICES
    #
    
    elevenlabs_api_key: Optional[str] = Field(default=None)
    elevenlabs_voice_id: Optional[str] = Field(default=None)
    
    pbs_api_key: Optional[str] = Field(default=None)
    pbs_api_url: Optional[str] = Field(default=None)
    
    crm_api_key: Optional[str] = Field(default=None)
    crm_api_url: Optional[str] = Field(default=None)
    
    #
    # STAFF NOTIFICATIONS (Slack & SMS)
    #
    
    # Slack webhook URLs for different notification types
    slack_webhook_sales: Optional[str] = Field(
        default=None,
        description="Slack webhook URL for sales team notifications"
    )
    slack_webhook_appraisal: Optional[str] = Field(
        default=None,
        description="Slack webhook URL for appraisal team notifications"
    )
    slack_webhook_finance: Optional[str] = Field(
        default=None,
        description="Slack webhook URL for finance team notifications"
    )
    slack_webhook_default: Optional[str] = Field(
        default=None,
        description="Default Slack webhook if team-specific not set"
    )
    slack_webhook_url: Optional[str] = Field(
        default=None,
        description="Primary Slack webhook URL (SLACK_WEBHOOK_URL env var)"
    )
    
    # Twilio SMS settings
    twilio_account_sid: Optional[str] = Field(default=None)
    twilio_auth_token: Optional[str] = Field(default=None)
    twilio_phone_number: Optional[str] = Field(
        default=None,
        description="Twilio phone number to send SMS from"
    )
    
    # Phone numbers for SMS notifications (comma-separated for multiple)
    sms_notify_sales: Optional[str] = Field(
        default=None,
        description="Phone number(s) for sales notifications"
    )
    sms_notify_appraisal: Optional[str] = Field(
        default=None,
        description="Phone number(s) for appraisal notifications"
    )
    sms_notify_finance: Optional[str] = Field(
        default=None,
        description="Phone number(s) for finance notifications"
    )
    
    @property
    def is_slack_configured(self) -> bool:
        return bool(self.slack_webhook_url or self.slack_webhook_default or self.slack_webhook_sales)
    
    @property
    def is_sms_configured(self) -> bool:
        return bool(
            self.twilio_account_sid and 
            self.twilio_auth_token and 
            self.twilio_phone_number
        )
    
    def get_slack_webhook(self, notification_type: str) -> Optional[str]:
        """Get the appropriate Slack webhook for notification type"""
        webhooks = {
            "sales": self.slack_webhook_sales,
            "vehicle_request": self.slack_webhook_sales,  # Vehicle bring-up goes to sales
            "appraisal": self.slack_webhook_appraisal,
            "finance": self.slack_webhook_finance,
        }
        # Try team-specific first, then SLACK_WEBHOOK_URL, then SLACK_WEBHOOK_DEFAULT
        return webhooks.get(notification_type) or self.slack_webhook_url or self.slack_webhook_default
    
    def get_sms_numbers(self, notification_type: str) -> List[str]:
        """Get phone numbers for notification type"""
        numbers_map = {
            "sales": self.sms_notify_sales,
            "vehicle_request": self.sms_notify_sales,  # Vehicle bring-up goes to sales
            "appraisal": self.sms_notify_appraisal,
            "finance": self.sms_notify_finance,
        }
        numbers_str = numbers_map.get(notification_type)
        if numbers_str:
            return [n.strip() for n in numbers_str.split(",") if n.strip()]
        return []
    
    #
    # EMAIL NOTIFICATIONS
    #
    
    # SendGrid (recommended)
    sendgrid_api_key: Optional[str] = Field(
        default=None,
        description="SendGrid API key for email notifications"
    )
    
    # Generic SMTP (alternative)
    smtp_host: Optional[str] = Field(default=None)
    smtp_port: int = Field(default=587)
    smtp_username: Optional[str] = Field(default=None)
    smtp_password: Optional[str] = Field(default=None)
    smtp_use_tls: bool = Field(default=True)
    
    # Email sender
    email_from_address: Optional[str] = Field(
        default="kiosk@example.com",
        description="From address for notification emails (configure per deployment)"
    )
    email_from_name: Optional[str] = Field(
        default="NH Chevy Showroom Kiosk",
        description="From name for notification emails"
    )
    
    # Email recipients by notification type (comma-separated)
    email_notify_sales: Optional[str] = Field(
        default=None,
        description="Email address(es) for sales notifications"
    )
    email_notify_appraisal: Optional[str] = Field(
        default=None,
        description="Email address(es) for appraisal notifications"
    )
    email_notify_finance: Optional[str] = Field(
        default=None,
        description="Email address(es) for finance notifications"
    )
    email_notify_default: Optional[str] = Field(
        default=None,
        description="Default email if team-specific not set"
    )
    
    @property
    def is_email_configured(self) -> bool:
        return bool(self.sendgrid_api_key or (self.smtp_host and self.smtp_username))
    
    def get_email_recipients(self, notification_type: str) -> List[str]:
        """Get email addresses for notification type"""
        emails_map = {
            "sales": self.email_notify_sales,
            "vehicle_request": self.email_notify_sales,  # Vehicle bring-up goes to sales
            "appraisal": self.email_notify_appraisal,
            "finance": self.email_notify_finance,
        }
        emails_str = emails_map.get(notification_type) or self.email_notify_default
        if emails_str:
            return [e.strip() for e in emails_str.split(",") if e.strip()]
        return []
    
    #
    # MONITORING
    #
    
    sentry_dsn: Optional[str] = Field(default=None)
    log_level: str = Field(default="INFO")
    json_logging: bool = Field(default=True)
    
    #
    # FEATURE FLAGS
    #
    
    enable_analytics: bool = Field(default=True)
    enable_tts: bool = Field(default=True)
    enable_photo_analysis: bool = Field(default=True)


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    Settings are loaded once and cached for performance.
    Call get_settings.cache_clear() to reload.
    """
    return Settings()


# Convenience function for checking configuration at startup
def validate_settings() -> dict:
    """
    Validate settings and return status report.
    
    Returns dict with configuration status for logging.
    """
    settings = get_settings()
    
    return {
        "environment": settings.environment,
        "ai_configured": settings.is_ai_configured,
        "database_configured": settings.is_database_configured,
        "auth_configured": bool(settings.admin_api_key),
        "tts_configured": bool(settings.elevenlabs_api_key),
        "monitoring_configured": bool(settings.sentry_dsn),
        "warnings": _get_config_warnings(settings),
    }


def _get_config_warnings(settings: Settings) -> List[str]:
    """Generate configuration warnings"""
    warnings = []
    
    if not settings.is_ai_configured:
        warnings.append("ANTHROPIC_API_KEY not configured - AI will use fallback responses")
    
    if settings.is_production and not settings.admin_api_key:
        warnings.append("ADMIN_API_KEY not set - dashboard endpoints are unprotected")
    
    if settings.is_development:
        warnings.append("Running in DEVELOPMENT mode - not for production use")
    
    if not settings.is_database_configured:
        warnings.append("DATABASE_URL not configured - using JSON file storage")
    
    return warnings
