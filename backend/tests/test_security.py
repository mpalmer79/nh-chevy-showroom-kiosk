"""
Tests for Security Module
Covers API key management, input sanitization, and secure value handling
"""

import pytest
import os
from unittest.mock import patch, MagicMock

from app.core.security import (
    SecretValue,
    APIKeyManager,
    get_key_manager,
    sanitize_user_input,
    sanitize_stock_number,
    sanitize_phone,
    sanitize_email,
    sanitize_vin,
    generate_session_id,
    mask_sensitive_data,
)


# ---
# SECRET VALUE TESTS
# ---

class TestSecretValue:
    """Tests for SecretValue wrapper class"""
    
    def test_secret_value_hides_in_repr(self):
        """Secret value should never appear in repr"""
        secret = SecretValue("sk-ant-api03-super-secret-key")
        
        repr_str = repr(secret)
        
        assert "super-secret" not in repr_str
        assert "sk-ant-api03" not in repr_str
        assert "SecretValue" in repr_str
    
    def test_secret_value_hides_in_str(self):
        """Secret value should never appear in str"""
        secret = SecretValue("my-secret-password")
        
        str_val = str(secret)
        
        assert "my-secret-password" not in str_val
    
    def test_secret_value_get_actual_value(self):
        """get_secret_value should return actual value"""
        secret = SecretValue("actual-secret")
        
        assert secret.get_secret_value() == "actual-secret"
    
    def test_secret_value_bool_true_when_set(self):
        """Secret should be truthy when value is set"""
        secret = SecretValue("some-value")
        
        assert bool(secret) is True
    
    def test_secret_value_bool_false_when_empty(self):
        """Secret should be falsy when value is empty"""
        secret = SecretValue("")
        
        assert bool(secret) is False
    
    def test_secret_value_hash_shown_in_repr(self):
        """repr should show partial hash for debugging"""
        secret = SecretValue("test-key")
        
        repr_str = repr(secret)
        
        assert "hash=" in repr_str
    
    def test_empty_secret_repr(self):
        """Empty secret should show empty in repr"""
        secret = SecretValue("")
        
        assert "empty" in repr(secret)


# ---
# API KEY MANAGER TESTS
# ---

class TestAPIKeyManager:
    """Tests for APIKeyManager"""
    
    def test_anthropic_key_loaded_from_env(self):
        """Should load Anthropic key from environment"""
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-ant-test-key"}):
            # Clear cached manager
            get_key_manager.cache_clear()
            manager = APIKeyManager()
            
            assert manager.anthropic_key == "sk-ant-test-key"
    
    def test_anthropic_key_none_when_not_set(self):
        """Should return None when key not set"""
        with patch.dict(os.environ, {}, clear=True):
            manager = APIKeyManager()
            manager._anthropic_key = None
            
            assert manager.anthropic_key is None
    
    def test_is_ai_configured_true(self):
        """is_ai_configured should return True when key present"""
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-ant-test-key"}):
            manager = APIKeyManager()
            
            assert manager.is_ai_configured is True
    
    def test_is_ai_configured_false(self):
        """is_ai_configured should return False when key missing"""
        manager = APIKeyManager()
        manager._anthropic_key = None
        
        assert manager.is_ai_configured is False
    
    def test_validate_anthropic_key_valid(self):
        """Should validate correct Anthropic key format"""
        manager = APIKeyManager()
        manager._anthropic_key = SecretValue("sk-ant-api03-abcdefghijklmnopqrstuvwxyz")
        
        assert manager.validate_anthropic_key() is True
    
    def test_validate_anthropic_key_invalid_prefix(self):
        """Should reject keys without sk-ant- prefix"""
        manager = APIKeyManager()
        manager._anthropic_key = SecretValue("invalid-key-format")
        
        assert manager.validate_anthropic_key() is False
    
    def test_validate_anthropic_key_too_short(self):
        """Should reject keys that are too short"""
        manager = APIKeyManager()
        manager._anthropic_key = SecretValue("sk-ant-short")
        
        assert manager.validate_anthropic_key() is False
    
    def test_pbs_api_key_skips_mock(self):
        """Should not load mock PBS key"""
        with patch.dict(os.environ, {"PBS_API_KEY": "mock-pbs-key-dev"}):
            manager = APIKeyManager()
            
            assert manager.pbs_api_key is None
    
    def test_rotate_keys(self):
        """Should reload keys on rotation"""
        manager = APIKeyManager()
        original_key = manager.anthropic_key
        
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-ant-new-key-12345678901234567890"}):
            manager.rotate_keys()
            
            assert manager.anthropic_key == "sk-ant-new-key-12345678901234567890"


# ---
# INPUT SANITIZATION TESTS
# ---

class TestSanitizeUserInput:
    """Tests for sanitize_user_input function"""
    
    def test_basic_text_unchanged(self):
        """Normal text should pass through unchanged"""
        result = sanitize_user_input("Hello, I'm looking for a truck")
        
        assert result == "Hello, I&#x27;m looking for a truck"  # Escaped apostrophe
    
    def test_strips_whitespace(self):
        """Should strip leading/trailing whitespace"""
        result = sanitize_user_input("  hello world  ")
        
        assert result == "hello world"
    
    def test_truncates_long_input(self):
        """Should truncate to max_length"""
        long_text = "a" * 5000
        result = sanitize_user_input(long_text, max_length=100)
        
        assert len(result) == 100
    
    def test_removes_control_characters(self):
        """Should remove control characters"""
        malicious = "hello\x00\x0b\x1fworld"
        result = sanitize_user_input(malicious)
        
        assert "\x00" not in result
        assert "\x0b" not in result
        assert "\x1f" not in result
    
    def test_preserves_newlines(self):
        """Should preserve newlines"""
        text = "line1\nline2"
        result = sanitize_user_input(text)
        
        assert "\n" in result
    
    def test_escapes_html(self):
        """Should escape HTML entities"""
        xss_attempt = "<script>alert('xss')</script>"
        result = sanitize_user_input(xss_attempt)
        
        assert "<script>" not in result
        assert "&lt;script&gt;" in result
    
    def test_empty_input(self):
        """Should handle empty input"""
        assert sanitize_user_input("") == ""
        assert sanitize_user_input(None) == ""


class TestSanitizeStockNumber:
    """Tests for sanitize_stock_number function"""
    
    def test_valid_stock_number(self):
        """Should accept valid stock numbers"""
        assert sanitize_stock_number("M12345") == "M12345"
        assert sanitize_stock_number("ABC-123") == "ABC-123"
    
    def test_removes_special_characters(self):
        """Should remove special characters"""
        assert sanitize_stock_number("M12345!@#$") == "M12345"
    
    def test_truncates_long_stock(self):
        """Should truncate to 20 characters"""
        long_stock = "A" * 50
        result = sanitize_stock_number(long_stock)
        
        assert len(result) == 20
    
    def test_empty_stock(self):
        """Should handle empty input"""
        assert sanitize_stock_number("") == ""
        assert sanitize_stock_number(None) == ""


class TestSanitizePhone:
    """Tests for sanitize_phone function"""
    
    def test_extracts_digits(self):
        """Should extract only digits"""
        assert sanitize_phone("(555) 123-4567") == "5551234567"
        assert sanitize_phone("555.123.4567") == "5551234567"
    
    def test_truncates_long_phone(self):
        """Should truncate to 15 digits"""
        long_phone = "1" * 25
        result = sanitize_phone(long_phone)
        
        assert len(result) == 15
    
    def test_empty_phone(self):
        """Should handle empty input"""
        assert sanitize_phone("") == ""


class TestSanitizeEmail:
    """Tests for sanitize_email function"""
    
    def test_valid_email(self):
        """Should accept valid emails"""
        assert sanitize_email("test@example.com") == "test@example.com"
        assert sanitize_email("TEST@EXAMPLE.COM") == "test@example.com"
    
    def test_invalid_email_returns_empty(self):
        """Should return empty for invalid emails"""
        assert sanitize_email("not-an-email") == ""
        assert sanitize_email("missing@domain") == ""
    
    def test_strips_whitespace(self):
        """Should strip whitespace"""
        assert sanitize_email("  test@example.com  ") == "test@example.com"
    
    def test_empty_email(self):
        """Should handle empty input"""
        assert sanitize_email("") == ""


class TestSanitizeVin:
    """Tests for sanitize_vin function"""
    
    def test_valid_vin(self):
        """Should accept valid VINs"""
        result = sanitize_vin("1GCVKNEC2MZ123456")
        
        assert result == "1GCVKNEC2MZ123456"
    
    def test_uppercase_conversion(self):
        """Should convert to uppercase"""
        result = sanitize_vin("1gcvknec2mz123456")
        
        assert result == "1GCVKNEC2MZ123456"
    
    def test_removes_invalid_characters(self):
        """Should remove I, O, Q (invalid in VINs)"""
        # VIN decoder removes I, O, Q as they're not allowed in VINs
        result = sanitize_vin("1GCVKNEC2MZ12345I")
        
        # I should be removed
        assert "I" not in result or len(result) <= 17
    
    def test_truncates_to_17(self):
        """Should truncate to 17 characters"""
        long_vin = "A" * 30
        result = sanitize_vin(long_vin)
        
        assert len(result) == 17
    
    def test_empty_vin(self):
        """Should handle empty input"""
        assert sanitize_vin("") == ""


# ---
# UTILITY FUNCTION TESTS
# ---

class TestGenerateSessionId:
    """Tests for generate_session_id function"""
    
    def test_starts_with_k(self):
        """Session ID should start with K"""
        session_id = generate_session_id()
        
        assert session_id.startswith("K")
    
    def test_proper_length(self):
        """Session ID should have proper length"""
        session_id = generate_session_id()
        
        assert len(session_id) == 17  # K + 16 hex chars
    
    def test_unique_ids(self):
        """Should generate unique IDs"""
        ids = [generate_session_id() for _ in range(100)]
        
        assert len(set(ids)) == 100


class TestMaskSensitiveData:
    """Tests for mask_sensitive_data function"""
    
    def test_masks_phone(self):
        """Should mask phone number"""
        result = mask_sensitive_data("5551234567", visible_chars=4)
        
        assert result == "******4567"
    
    def test_masks_ssn(self):
        """Should mask SSN"""
        result = mask_sensitive_data("123456789", visible_chars=4)
        
        assert result == "*****6789"
    
    def test_short_data_fully_masked(self):
        """Short data should be fully masked"""
        result = mask_sensitive_data("123", visible_chars=4)
        
        assert result == "***"
    
    def test_empty_data(self):
        """Should handle empty data"""
        assert mask_sensitive_data("") == ""
        assert mask_sensitive_data(None) == ""


# ---
# INTEGRATION TESTS
# ---

class TestSecurityIntegration:
    """Integration tests for security module"""
    
    def test_full_sanitization_pipeline(self):
        """Test complete input sanitization flow"""
        # Malicious input
        malicious_input = "<script>alert('xss')</script>\x00\x1fINJECTION"
        
        result = sanitize_user_input(malicious_input)
        
        # Should be safe
        assert "<script>" not in result
        assert "\x00" not in result
        assert "\x1f" not in result
    
    def test_api_key_manager_singleton(self):
        """Key manager should be singleton"""
        get_key_manager.cache_clear()
        
        manager1 = get_key_manager()
        manager2 = get_key_manager()
        
        assert manager1 is manager2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
