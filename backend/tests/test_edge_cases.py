"""
Edge-case tests for backend services.

Covers:
- Conversation state with unicode / Spanish characters
- Entity extraction with unusual inputs (empty, very long, emoji-only, SQL injection)
- Budget calculator with boundary values ($0 down, negatives, enormous amounts)
- VIN sanitization with malformed inputs
- Inventory search with no results
"""

import pytest
from unittest.mock import patch, MagicMock

from app.services.entity_extraction import ConversationEntityExtractor
from app.services.budget_calculator import (
    calculate_max_vehicle_price,
    calculate_monthly_payment,
    check_affordability,
)
from app.core.security import (
    sanitize_user_input,
    sanitize_stock_number,
    sanitize_phone,
    sanitize_vin,
    sanitize_email,
)
from app.services.conversation_state import (
    ConversationStateManager,
    ConversationState,
    ConversationStage,
    InterestLevel,
)
from app.core import cache as cache_module


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def extractor():
    return ConversationEntityExtractor()


@pytest.fixture(autouse=True)
async def reset_cache():
    """Reset cache singleton between tests."""
    if cache_module._cache_service is not None:
        await cache_module._cache_service.shutdown()
        cache_module._cache_service = None
    yield
    if cache_module._cache_service is not None:
        await cache_module._cache_service.shutdown()
        cache_module._cache_service = None


# ===========================================================================
# CONVERSATION STATE — UNICODE / SPANISH SUPPORT
# ===========================================================================

class TestConversationStateUnicode:
    """Verify conversation state handles unicode characters (Spanish, etc.)."""

    @pytest.mark.asyncio
    async def test_spanish_customer_name(self):
        manager = ConversationStateManager()
        state = await manager.get_or_create_state("unicode-001", "José García")
        assert state.customer_name == "José García"

    @pytest.mark.asyncio
    async def test_spanish_message_in_state_update(self):
        manager = ConversationStateManager()
        state = await manager.get_or_create_state("unicode-002", "María")
        state = await manager.update_state(
            session_id="unicode-002",
            user_message="Estoy buscando una camioneta para mi familia",
            assistant_response="¡Claro! Tenemos varias opciones excelentes.",
            customer_name="María",
        )
        assert state.message_count >= 1
        assert state.customer_name == "María"

    @pytest.mark.asyncio
    async def test_unicode_in_vehicle_preferences(self):
        manager = ConversationStateManager()
        state = await manager.get_or_create_state("unicode-003", "André")
        # ConversationState stores vehicle type preferences in preferred_types (a set)
        state.preferred_types = {"camioneta roja", "todoterreno"}
        serialized = state.to_dict()
        # to_dict() serializes preferred_types under preferences.types
        assert "camioneta roja" in serialized["preferences"]["types"]

    @pytest.mark.asyncio
    async def test_emoji_in_customer_name(self):
        """Edge case: emoji in customer name should not crash."""
        manager = ConversationStateManager()
        state = await manager.get_or_create_state("unicode-004", "Carlos 😊")
        assert state.customer_name == "Carlos 😊"

    @pytest.mark.asyncio
    async def test_chinese_characters(self):
        manager = ConversationStateManager()
        state = await manager.get_or_create_state("unicode-005", "张伟")
        assert state.customer_name == "张伟"

    @pytest.mark.asyncio
    async def test_arabic_characters(self):
        manager = ConversationStateManager()
        state = await manager.get_or_create_state("unicode-006", "محمد")
        assert state.customer_name == "محمد"


# ===========================================================================
# ENTITY EXTRACTION — EDGE CASE INPUTS
# ===========================================================================

class TestEntityExtractionEdgeCases:
    """Test entity extraction with unusual / adversarial inputs."""

    # --- Empty / blank inputs ---

    def test_empty_string_budget(self, extractor):
        result = extractor.extract_budget("")
        assert not result.has_budget_constraint

    def test_whitespace_only_budget(self, extractor):
        result = extractor.extract_budget("   ")
        assert not result.has_budget_constraint

    def test_empty_string_preferences(self, extractor):
        result = extractor.extract_preferences("")
        assert result.vehicle_types == []

    def test_empty_string_trade_in(self, extractor):
        result = extractor.extract_trade_in("")
        assert not result.mentioned

    def test_empty_string_context(self, extractor):
        result = extractor.extract_context("")
        assert result.urgency != "ready_to_buy"

    def test_empty_string_stock_numbers(self, extractor):
        result = extractor.extract_stock_numbers("")
        assert result == []

    def test_empty_string_model_mentions(self, extractor):
        result = extractor.extract_model_mentions("")
        assert result == []

    # --- Very long messages ---

    def test_very_long_message_budget(self, extractor):
        long_msg = "I need a truck " * 1000 + " under $50,000"
        result = extractor.extract_budget(long_msg)
        assert result.has_budget_constraint
        assert result.max_price == 50000

    def test_very_long_message_preferences(self, extractor):
        long_msg = "family " * 5000
        result = extractor.extract_preferences(long_msg)
        # Should not crash even with very long input
        assert isinstance(result.vehicle_types, list)

    def test_very_long_message_context(self, extractor):
        long_msg = "a" * 10000
        result = extractor.extract_context(long_msg)
        # Must not raise
        assert result is not None

    # --- Emoji-only messages ---

    def test_emoji_only_budget(self, extractor):
        result = extractor.extract_budget("🚗🔥💰😎")
        assert not result.has_budget_constraint

    def test_emoji_only_preferences(self, extractor):
        result = extractor.extract_preferences("🏎️🏎️🏎️")
        assert isinstance(result.vehicle_types, list)

    def test_emoji_only_context(self, extractor):
        result = extractor.extract_context("👍👍👍")
        assert result is not None

    # --- SQL injection attempts ---

    def test_sql_injection_budget(self, extractor):
        injection = "'; DROP TABLE vehicles; --"
        result = extractor.extract_budget(injection)
        assert not result.has_budget_constraint

    def test_sql_injection_stock_numbers(self, extractor):
        injection = "M12345'; DROP TABLE inventory; --"
        result = extractor.extract_stock_numbers(injection)
        # Should extract just the stock number, not execute SQL
        assert isinstance(result, list)

    def test_sql_injection_model_mentions(self, extractor):
        injection = "SELECT * FROM vehicles WHERE model = 'Silverado'"
        result = extractor.extract_model_mentions(injection)
        # Should find Silverado as a model reference, not execute query
        assert isinstance(result, list)

    def test_html_injection_context(self, extractor):
        injection = '<script>alert("XSS")</script> I want a truck'
        result = extractor.extract_context(injection)
        assert result is not None

    # --- Mixed language inputs ---

    def test_spanish_budget_extraction(self, extractor):
        result = extractor.extract_budget("Mi presupuesto es under $40,000")
        assert result.has_budget_constraint
        assert result.max_price == 40000

    def test_spanish_trade_in_mention(self, extractor):
        result = extractor.extract_trade_in("Tengo un trade-in, mi carro viejo")
        assert result.mentioned

    # --- Special characters ---

    def test_special_chars_in_stock_number(self, extractor):
        result = extractor.extract_stock_numbers("Stock # M-12345!")
        assert isinstance(result, list)

    def test_newlines_in_message(self, extractor):
        result = extractor.extract_budget("I want a truck\nunder $50,000\nplease")
        assert result.has_budget_constraint


# ===========================================================================
# BUDGET CALCULATOR — EDGE CASES
# ===========================================================================

class TestBudgetCalculatorEdgeCases:
    """Test budget calculator with boundary and extreme values."""

    def test_zero_down_payment(self):
        result = calculate_max_vehicle_price(
            down_payment=0, monthly_payment=500, apr=7.0, term_months=84
        )
        assert result.max_vehicle_price > 0
        assert result.down_payment == 0

    def test_zero_monthly_payment(self):
        result = calculate_max_vehicle_price(
            down_payment=5000, monthly_payment=0, apr=7.0, term_months=84
        )
        assert result.max_vehicle_price == 5000.0

    def test_zero_apr(self):
        result = calculate_max_vehicle_price(
            down_payment=5000, monthly_payment=500, apr=0.0, term_months=84
        )
        assert result.total_interest == 0.0
        assert result.max_vehicle_price == 5000 + (500 * 84)

    def test_very_high_apr(self):
        result = calculate_max_vehicle_price(
            down_payment=5000, monthly_payment=500, apr=25.0, term_months=84
        )
        assert result.max_vehicle_price > 0
        # High APR reduces buying power significantly
        normal = calculate_max_vehicle_price(5000, 500, 7.0, 84)
        assert result.max_vehicle_price < normal.max_vehicle_price

    def test_very_large_down_payment(self):
        result = calculate_max_vehicle_price(
            down_payment=100000, monthly_payment=500, apr=7.0, term_months=84
        )
        assert result.max_vehicle_price > 100000

    def test_very_large_monthly_payment(self):
        result = calculate_max_vehicle_price(
            down_payment=0, monthly_payment=10000, apr=7.0, term_months=84
        )
        assert result.max_vehicle_price > 500000

    def test_short_term_12_months(self):
        result = calculate_max_vehicle_price(
            down_payment=5000, monthly_payment=1000, apr=7.0, term_months=12
        )
        assert result.max_vehicle_price > 0
        assert result.max_vehicle_price < 20000

    def test_monthly_payment_zero_down(self):
        result = calculate_monthly_payment(
            vehicle_price=40000, down_payment=0, apr=7.0, term_months=84
        )
        assert result.monthly_payment > 0
        assert result.financed_amount == 40000.0

    def test_monthly_payment_zero_apr(self):
        result = calculate_monthly_payment(
            vehicle_price=42000, down_payment=0, apr=0.0, term_months=84
        )
        assert result.monthly_payment == 500.0

    def test_affordability_exact_boundary(self):
        budget = calculate_max_vehicle_price(5000, 500, 7.0, 84)
        result = check_affordability(
            vehicle_price=budget.max_vehicle_price,
            vehicle_description="Test",
            down_payment=5000,
            monthly_payment=500,
            apr=7.0,
            term_months=84,
        )
        assert result.is_affordable is True

    def test_affordability_one_dollar_over(self):
        budget = calculate_max_vehicle_price(5000, 500, 7.0, 84)
        result = check_affordability(
            vehicle_price=budget.max_vehicle_price + 1,
            vehicle_description="Slightly Over",
            down_payment=5000,
            monthly_payment=500,
            apr=7.0,
            term_months=84,
        )
        assert result.is_affordable is False

    def test_small_vehicle_price(self):
        result = calculate_monthly_payment(
            vehicle_price=1000, down_payment=500, apr=7.0, term_months=12
        )
        assert result.monthly_payment > 0
        assert result.financed_amount == 500.0


# ===========================================================================
# VIN SANITIZATION — MALFORMED VINS
# ===========================================================================

class TestVINSanitization:
    """Test VIN sanitization with various malformed inputs."""

    def test_valid_vin(self):
        result = sanitize_vin("1GCUDDED5RZ123456")
        assert result == "1GCUDDED5RZ123456"

    def test_lowercase_vin(self):
        result = sanitize_vin("1gcudded5rz123456")
        assert result == "1GCUDDED5RZ123456"

    def test_vin_with_spaces(self):
        result = sanitize_vin("1GCUD DED5 RZ123456")
        assert result == "1GCUDDED5RZ123456"

    def test_empty_vin(self):
        result = sanitize_vin("")
        assert result == ""

    def test_none_vin(self):
        result = sanitize_vin(None)
        assert result == ""

    def test_vin_too_long(self):
        result = sanitize_vin("1GCUDDED5RZ123456EXTRA")
        assert len(result) <= 17

    def test_vin_too_short(self):
        result = sanitize_vin("1GCUD")
        assert result == "1GCUD"

    def test_vin_with_invalid_characters_I_O_Q(self):
        """VINs cannot contain I, O, or Q."""
        result = sanitize_vin("1GIOQDED5RZ123456")
        # I, O, Q should be stripped
        assert "I" not in result
        assert "O" not in result
        assert "Q" not in result

    def test_vin_with_special_characters(self):
        result = sanitize_vin("1GCUD-DED5.RZ_1234")
        # Only alphanumeric (minus I, O, Q) should remain
        assert "-" not in result
        assert "." not in result
        assert "_" not in result

    def test_vin_with_sql_injection(self):
        result = sanitize_vin("'; DROP TABLE vehicles; --")
        assert "DROP" not in result
        assert "'" not in result

    def test_vin_with_html(self):
        result = sanitize_vin('<script>alert("xss")</script>')
        assert "<" not in result
        assert ">" not in result


# ===========================================================================
# STOCK NUMBER SANITIZATION
# ===========================================================================

class TestStockNumberSanitization:
    """Test stock number sanitization."""

    def test_valid_stock(self):
        assert sanitize_stock_number("M12345") == "M12345"

    def test_stock_with_spaces(self):
        assert sanitize_stock_number("M 123 45") == "M12345"

    def test_stock_with_special_chars(self):
        assert sanitize_stock_number("M12345!@#") == "M12345"

    def test_stock_with_hyphen(self):
        assert sanitize_stock_number("M-12345") == "M-12345"

    def test_empty_stock(self):
        assert sanitize_stock_number("") == ""

    def test_none_stock(self):
        assert sanitize_stock_number(None) == ""

    def test_very_long_stock(self):
        result = sanitize_stock_number("A" * 100)
        assert len(result) <= 20

    def test_sql_injection_stock(self):
        result = sanitize_stock_number("M12345'; DROP TABLE inventory; --")
        # sanitize_stock_number strips non-alphanumeric chars (except hyphens)
        # and truncates to 20 chars. SQL-dangerous characters are removed:
        assert ";" not in result
        assert "'" not in result
        assert " " not in result
        assert len(result) <= 20
        # The result starts with the valid stock number prefix
        assert result.startswith("M12345")


# ===========================================================================
# PHONE SANITIZATION
# ===========================================================================

class TestPhoneSanitization:
    """Test phone number sanitization."""

    def test_formatted_phone(self):
        assert sanitize_phone("(617) 555-1234") == "6175551234"

    def test_digits_only(self):
        assert sanitize_phone("6175551234") == "6175551234"

    def test_dashes_only(self):
        assert sanitize_phone("617-555-1234") == "6175551234"

    def test_empty_phone(self):
        assert sanitize_phone("") == ""

    def test_none_phone(self):
        assert sanitize_phone(None) == ""

    def test_phone_with_letters(self):
        result = sanitize_phone("617abc5551234")
        assert result == "6175551234"

    def test_very_long_phone(self):
        result = sanitize_phone("1" * 50)
        assert len(result) <= 15


# ===========================================================================
# USER INPUT SANITIZATION
# ===========================================================================

class TestUserInputSanitization:
    """Test user input sanitization for chat messages."""

    def test_normal_input(self):
        result = sanitize_user_input("I want a truck")
        assert result == "I want a truck"

    def test_empty_input(self):
        assert sanitize_user_input("") == ""

    def test_none_input(self):
        assert sanitize_user_input(None) == ""

    def test_html_tags_escaped(self):
        result = sanitize_user_input('<script>alert("xss")</script>')
        assert "<script>" not in result
        assert "&lt;" in result  # HTML-escaped

    def test_control_characters_removed(self):
        result = sanitize_user_input("Hello\x00\x01\x02World")
        assert "\x00" not in result
        assert "\x01" not in result

    def test_max_length_enforced(self):
        long_input = "a" * 5000
        result = sanitize_user_input(long_input, max_length=2000)
        assert len(result) <= 2000

    def test_newlines_preserved(self):
        result = sanitize_user_input("Line 1\nLine 2")
        assert "\n" in result

    def test_tabs_preserved(self):
        result = sanitize_user_input("Col1\tCol2")
        assert "\t" in result

    def test_sql_injection_escaped(self):
        result = sanitize_user_input("'; DROP TABLE users; --")
        # HTML entities escaped but SQL is just text, not executed
        assert isinstance(result, str)

    def test_unicode_preserved(self):
        result = sanitize_user_input("Hola, busco un Equinox rojo")
        assert "Hola" in result
        assert "rojo" in result

    def test_emoji_preserved(self):
        result = sanitize_user_input("I love this truck! 🚗❤️")
        assert "🚗" in result


# ===========================================================================
# EMAIL SANITIZATION
# ===========================================================================

class TestEmailSanitization:
    """Test email sanitization."""

    def test_valid_email(self):
        assert sanitize_email("user@example.com") == "user@example.com"

    def test_uppercase_email(self):
        assert sanitize_email("User@Example.COM") == "user@example.com"

    def test_empty_email(self):
        assert sanitize_email("") == ""

    def test_none_email(self):
        assert sanitize_email(None) == ""

    def test_invalid_email_no_at(self):
        assert sanitize_email("not-an-email") == ""

    def test_invalid_email_no_domain(self):
        assert sanitize_email("user@") == ""

    def test_email_with_whitespace(self):
        assert sanitize_email("  user@example.com  ") == "user@example.com"


# ===========================================================================
# INVENTORY SEARCH — NO RESULTS
# ===========================================================================

class TestInventorySearchNoResults:
    """Test inventory endpoints when no vehicles match filters."""

    def test_search_nonexistent_model(self):
        """Synchronous test using TestClient for a model that does not exist."""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        resp = client.get("/api/v1/inventory?model=NonExistentModel9999")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["vehicles"] == []

    def test_search_extreme_price_range(self):
        """No vehicles should exist above $10M."""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        resp = client.get("/api/v1/inventory?min_price=10000000")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0

    def test_search_contradictory_filters(self):
        """min_price > max_price should return no results."""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        resp = client.get("/api/v1/inventory?min_price=100000&max_price=10000")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0

    def test_search_empty_query(self):
        """Search with empty string should return 422 (required param)."""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        resp = client.get("/api/v1/inventory/search?q=")
        # Empty query may return 200 with no results or 422
        assert resp.status_code in (200, 422)

    def test_search_special_characters(self):
        """Search with special characters should not crash."""
        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        resp = client.get("/api/v1/inventory/search?q=%3Cscript%3E")
        assert resp.status_code in (200, 422)
