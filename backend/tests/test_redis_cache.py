"""
Tests for Redis Cache Layer and State Persistence

Tests:
- InMemoryCache get/set/delete/TTL behavior
- CacheService falls back to InMemoryCache when Redis not available
- ConversationState serialization round-trip (to_dict -> from dict)
- Worksheet serialization round-trip
- Graceful fallback when Redis unavailable
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.cache import InMemoryCache, CacheService, get_cache, shutdown_cache

# Reset the singleton between tests
from app.core import cache as cache_module


@pytest.fixture(autouse=True)
async def reset_cache_singleton():
    """Reset the global cache singleton before and after each test."""
    cache_module._cache_service = None
    yield
    cache_module._cache_service = None


# ---
# INMEMORYCACHE TESTS
# ---

class TestInMemoryCache:
    """Tests for InMemoryCache get/set/delete/TTL behavior."""

    @pytest.fixture
    def cache(self):
        return InMemoryCache()

    @pytest.mark.asyncio
    async def test_set_and_get(self, cache):
        """Test basic set and get."""
        await cache.set("key1", {"foo": "bar"}, ttl=300)
        result = await cache.get("key1")
        assert result == {"foo": "bar"}

    @pytest.mark.asyncio
    async def test_get_missing_key(self, cache):
        """Test get for nonexistent key returns None."""
        result = await cache.get("nonexistent")
        assert result is None

    @pytest.mark.asyncio
    async def test_delete(self, cache):
        """Test delete removes key."""
        await cache.set("key1", "value1", ttl=300)
        deleted = await cache.delete("key1")
        assert deleted is True
        result = await cache.get("key1")
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_nonexistent(self, cache):
        """Test delete of nonexistent key returns False."""
        result = await cache.delete("nonexistent")
        assert result is False

    @pytest.mark.asyncio
    async def test_exists(self, cache):
        """Test exists check."""
        await cache.set("key1", "value1", ttl=300)
        assert await cache.exists("key1") is True
        assert await cache.exists("nonexistent") is False

    @pytest.mark.asyncio
    async def test_clear(self, cache):
        """Test clearing all keys."""
        await cache.set("key1", "val1", ttl=300)
        await cache.set("key2", "val2", ttl=300)
        await cache.clear()
        assert await cache.get("key1") is None
        assert await cache.get("key2") is None

    @pytest.mark.asyncio
    async def test_ttl_expiry(self, cache):
        """Test that keys expire after TTL."""
        # Set with a very short TTL
        await cache.set("expiring", "value", ttl=1)

        # Manually set the expiry time to the past
        cache._expiry["expiring"] = datetime.now() - timedelta(seconds=1)

        result = await cache.get("expiring")
        assert result is None

    @pytest.mark.asyncio
    async def test_set_overwrites(self, cache):
        """Test that set overwrites existing value."""
        await cache.set("key1", "original", ttl=300)
        await cache.set("key1", "updated", ttl=300)
        result = await cache.get("key1")
        assert result == "updated"

    @pytest.mark.asyncio
    async def test_various_value_types(self, cache):
        """Test storing different value types."""
        await cache.set("str_key", "string_value", ttl=300)
        await cache.set("int_key", 42, ttl=300)
        await cache.set("list_key", [1, 2, 3], ttl=300)
        await cache.set("dict_key", {"nested": {"data": True}}, ttl=300)
        await cache.set("none_key", None, ttl=300)

        assert await cache.get("str_key") == "string_value"
        assert await cache.get("int_key") == 42
        assert await cache.get("list_key") == [1, 2, 3]
        assert await cache.get("dict_key") == {"nested": {"data": True}}
        # None is a valid value that was set
        assert await cache.get("none_key") is None  # get returns None for both "no key" and "value is None"


# ---
# CACHESERVICE TESTS
# ---

class TestCacheService:
    """Tests for CacheService fallback behavior."""

    @pytest.mark.asyncio
    async def test_fallback_to_memory_when_no_redis(self):
        """CacheService falls back to InMemoryCache when Redis not configured."""
        # No REDIS_URL set -> should use in-memory
        with patch.dict("os.environ", {}, clear=False):
            service = CacheService()
            await service.initialize()

            assert service._use_redis is False

            # Should still work with in-memory
            await service.set("test_key", "test_value", ttl=300)
            result = await service.get("test_key")
            assert result == "test_value"

            await service.shutdown()

    @pytest.mark.asyncio
    async def test_get_or_set(self):
        """Test get_or_set helper method."""
        service = CacheService()
        await service.initialize()

        # First call should compute and cache
        result = await service.get_or_set("computed", lambda: "computed_value", ttl=300)
        assert result == "computed_value"

        # Second call should return cached value
        result = await service.get_or_set("computed", lambda: "different_value", ttl=300)
        assert result == "computed_value"

        await service.shutdown()

    @pytest.mark.asyncio
    async def test_delete(self):
        """Test delete through service."""
        service = CacheService()
        await service.initialize()

        await service.set("to_delete", "value", ttl=300)
        await service.delete("to_delete")
        result = await service.get("to_delete")
        assert result is None

        await service.shutdown()


# ---
# GET_CACHE SINGLETON TESTS
# ---

class TestGetCacheSingleton:
    """Tests for the get_cache() singleton factory."""

    @pytest.mark.asyncio
    async def test_get_cache_returns_same_instance(self):
        """get_cache() returns the same CacheService instance."""
        cache1 = await get_cache()
        cache2 = await get_cache()
        assert cache1 is cache2

    @pytest.mark.asyncio
    async def test_shutdown_cache_resets_singleton(self):
        """shutdown_cache() clears the singleton so next call creates new."""
        cache1 = await get_cache()
        await shutdown_cache()
        cache2 = await get_cache()
        assert cache1 is not cache2


# ---
# CONVERSATION STATE SERIALIZATION ROUND-TRIP
# ---

class TestConversationStateRoundTrip:
    """Test ConversationState serialization round-trip via cache."""

    @pytest.mark.asyncio
    async def test_state_to_dict_and_back(self):
        """Test that ConversationState survives a to_dict -> load_state round-trip."""
        from app.services.conversation_state import (
            ConversationStateManager,
            ConversationState,
            ConversationStage,
            InterestLevel,
            DiscussedVehicle,
        )

        # Create a state with realistic data
        state = ConversationState(session_id="round-trip-test")
        state.customer_name = "Jane Doe"
        state.customer_phone = "6175551234"
        state.customer_email = "jane@example.com"
        state.budget_min = 30000
        state.budget_max = 50000
        state.monthly_payment_target = 550
        state.down_payment = 5000
        state.preferred_types = {"SUV", "crossover"}
        state.preferred_features = {"AWD", "backup camera"}
        state.use_cases = {"family", "commute"}
        state.has_trade_in = True
        state.trade_year = 2020
        state.trade_make = "Honda"
        state.trade_model = "CR-V"
        state.trade_mileage = 45000
        state.stage = ConversationStage.BROWSING
        state.interest_level = InterestLevel.WARM
        state.message_count = 7
        state.favorite_vehicles = ["M12345"]
        state.needs_spouse_approval = True
        state.staff_notified = True
        state.test_drive_requested = True
        state.overall_sentiment = "positive"
        state.discussed_vehicles["M12345"] = DiscussedVehicle(
            stock_number="M12345",
            model="Equinox",
            mentioned_at=datetime.utcnow(),
            times_mentioned=3,
            customer_sentiment="positive",
            is_favorite=True,
        )

        # Serialize to dict
        state_dict = state.to_dict()
        assert state_dict["session_id"] == "round-trip-test"
        assert state_dict["customer_name"] == "Jane Doe"

        # Create a manager and persist to in-memory cache
        manager = ConversationStateManager()
        success = await manager.persist_state(state)
        assert success is True

        # Load back from cache
        loaded = await manager.load_state("round-trip-test")
        assert loaded is not None

        # Verify round-trip fidelity
        assert loaded.session_id == "round-trip-test"
        assert loaded.customer_name == "Jane Doe"
        assert loaded.customer_phone == "6175551234"
        assert loaded.budget_min == 30000
        assert loaded.budget_max == 50000
        assert loaded.monthly_payment_target == 550
        assert loaded.down_payment == 5000
        assert "SUV" in loaded.preferred_types
        assert "crossover" in loaded.preferred_types
        assert "AWD" in loaded.preferred_features
        assert loaded.has_trade_in is True
        assert loaded.trade_year == 2020
        assert loaded.trade_make == "Honda"
        assert loaded.trade_model == "CR-V"
        assert loaded.trade_mileage == 45000
        assert loaded.stage == ConversationStage.BROWSING
        assert loaded.interest_level == InterestLevel.WARM
        assert loaded.message_count == 7
        assert "M12345" in loaded.favorite_vehicles
        assert loaded.needs_spouse_approval is True
        assert loaded.staff_notified is True
        assert loaded.test_drive_requested is True
        assert loaded.overall_sentiment == "positive"
        assert "M12345" in loaded.discussed_vehicles
        assert loaded.discussed_vehicles["M12345"].model == "Equinox"
        assert loaded.discussed_vehicles["M12345"].times_mentioned == 3
        assert loaded.discussed_vehicles["M12345"].is_favorite is True

    @pytest.mark.asyncio
    async def test_get_or_create_state_l2_fallback(self):
        """Test that get_or_create_state checks L2 cache when not in L1."""
        from app.services.conversation_state import (
            ConversationStateManager,
            ConversationState,
        )

        manager = ConversationStateManager()

        # Create and persist a state
        state = ConversationState(session_id="l2-test")
        state.customer_name = "L2 Test User"
        state.budget_max = 45000
        await manager.persist_state(state)

        # Verify it's NOT in L1
        assert "l2-test" not in manager._sessions

        # get_or_create_state should find it in L2
        loaded = await manager.get_or_create_state("l2-test")
        assert loaded.customer_name == "L2 Test User"
        assert loaded.budget_max == 45000

        # Now it should be in L1 too
        assert "l2-test" in manager._sessions

    @pytest.mark.asyncio
    async def test_update_state_persists_to_cache(self):
        """Test that update_state writes through to cache."""
        from app.services.conversation_state import ConversationStateManager

        manager = ConversationStateManager()

        # Update state (creates + persists)
        state = await manager.update_state(
            session_id="persist-test",
            user_message="I need a truck under $60,000",
            assistant_response="Great! Let me show you some trucks."
        )

        assert state.message_count == 1
        assert state.budget_max == 60000

        # Load from cache directly (bypass L1)
        loaded = await manager.load_state("persist-test")
        assert loaded is not None
        assert loaded.message_count == 1
        assert loaded.budget_max == 60000

    @pytest.mark.asyncio
    async def test_phone_lookup_via_cache(self):
        """Test that phone lookup works through cache."""
        from app.services.conversation_state import ConversationStateManager

        manager = ConversationStateManager()

        # Create a state with phone
        state = await manager.get_or_create_state("phone-test", "Phone User")
        manager.set_customer_phone("phone-test", "6175559999")
        await manager.persist_state(state)

        # Create a new manager (simulating app restart - empty L1)
        manager2 = ConversationStateManager()

        # Should find via cache phone mapping
        found = await manager2.get_state_by_phone("6175559999")
        assert found is not None
        assert found.customer_name == "Phone User"
        assert found.customer_phone == "6175559999"


# ---
# WORKSHEET SERIALIZATION ROUND-TRIP
# ---

class TestWorksheetRoundTrip:
    """Test Worksheet serialization round-trip via cache."""

    @pytest.mark.asyncio
    async def test_worksheet_persist_and_load(self):
        """Test that worksheets survive persist -> load round-trip."""
        from app.models.worksheet import (
            Worksheet,
            WorksheetStatus,
            VehicleInfo,
            TermOption,
            StatusHistoryEntry,
        )

        # Build a worksheet
        vehicle = VehicleInfo(
            stock_number="M12345",
            year=2025,
            make="Chevrolet",
            model="Equinox",
            trim="RS",
            exterior_color="Radiant Red",
            msrp=35000,
        )

        now = datetime.utcnow()
        worksheet = Worksheet(
            id="ws-test-123",
            session_id="session-abc",
            created_at=now,
            updated_at=now,
            expires_at=now + timedelta(hours=24),
            status=WorksheetStatus.DRAFT,
            status_history=[
                StatusHistoryEntry(
                    status=WorksheetStatus.DRAFT.value,
                    timestamp=now,
                    actor="system",
                    notes="Created",
                )
            ],
            customer_name="Test Customer",
            customer_phone="6175551234",
            vehicle=vehicle,
            selling_price=35000,
            down_payment=5000,
            amount_financed=30000,
            term_options=[
                TermOption(
                    term_months=60,
                    apr=6.9,
                    monthly_payment=593,
                    total_of_payments=35580,
                    total_interest=5580,
                    is_selected=False,
                ),
                TermOption(
                    term_months=72,
                    apr=7.4,
                    monthly_payment=517,
                    total_of_payments=37224,
                    total_interest=7224,
                    is_selected=True,
                ),
            ],
            selected_term=72,
            monthly_payment=517,
            lead_score=55,
        )

        # Persist via cache
        cache = await get_cache()
        ws_data = worksheet.model_dump(mode="json")
        await cache.set(f"ws:{worksheet.id}", ws_data, ttl=86400)

        # Load back
        loaded_data = await cache.get(f"ws:{worksheet.id}")
        assert loaded_data is not None

        from app.models.worksheet import Worksheet as WS
        loaded_ws = WS.model_validate(loaded_data)

        assert loaded_ws.id == "ws-test-123"
        assert loaded_ws.session_id == "session-abc"
        assert loaded_ws.customer_name == "Test Customer"
        assert loaded_ws.vehicle.stock_number == "M12345"
        assert loaded_ws.vehicle.model == "Equinox"
        assert loaded_ws.selling_price == 35000
        assert loaded_ws.down_payment == 5000
        assert loaded_ws.amount_financed == 30000
        assert loaded_ws.selected_term == 72
        assert loaded_ws.monthly_payment == 517
        assert loaded_ws.lead_score == 55
        assert len(loaded_ws.term_options) == 2
        assert loaded_ws.term_options[1].is_selected is True


# ---
# GRACEFUL FALLBACK TESTS
# ---

class TestGracefulFallback:
    """Test that cache failures don't break the application."""

    @pytest.mark.asyncio
    async def test_conversation_state_works_without_cache(self):
        """ConversationStateManager works even when cache operations fail."""
        from app.services.conversation_state import ConversationStateManager

        manager = ConversationStateManager()

        # Mock get_cache to raise an exception
        with patch("app.services.conversation_state.get_cache", side_effect=Exception("Redis down")):
            # get_or_create_state should still work (creates in L1)
            state = await manager.get_or_create_state("fallback-test", "Fallback User")
            assert state.session_id == "fallback-test"
            assert state.customer_name == "Fallback User"

            # update_state should still work
            state = await manager.update_state(
                session_id="fallback-test",
                user_message="Hello",
                assistant_response="Hi there!"
            )
            assert state.message_count == 1

    @pytest.mark.asyncio
    async def test_persist_state_returns_false_on_failure(self):
        """persist_state returns False when cache fails."""
        from app.services.conversation_state import (
            ConversationStateManager,
            ConversationState,
        )

        manager = ConversationStateManager()
        state = ConversationState(session_id="fail-test")

        with patch("app.services.conversation_state.get_cache", side_effect=Exception("Redis down")):
            result = await manager.persist_state(state)
            assert result is False

    @pytest.mark.asyncio
    async def test_load_state_returns_none_on_failure(self):
        """load_state returns None when cache fails."""
        from app.services.conversation_state import ConversationStateManager

        manager = ConversationStateManager()

        with patch("app.services.conversation_state.get_cache", side_effect=Exception("Redis down")):
            result = await manager.load_state("nonexistent")
            assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
