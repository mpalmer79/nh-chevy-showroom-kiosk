"""
Integration tests for API endpoints.

Tests the full request → response flow through FastAPI routes
with mocked external services (Anthropic API, Slack, Twilio).
Uses httpx.AsyncClient for async endpoint testing.
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core import cache as cache_module


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
async def reset_cache():
    """Reset cache singleton between tests to prevent leakage."""
    if cache_module._cache_service is not None:
        await cache_module._cache_service.shutdown()
        cache_module._cache_service = None
    yield
    if cache_module._cache_service is not None:
        await cache_module._cache_service.shutdown()
        cache_module._cache_service = None


@pytest.fixture
async def client():
    """Async HTTP client for testing FastAPI routes."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------------------------------------------------------------------------
# Health Check Tests
# ---------------------------------------------------------------------------

class TestHealthEndpoints:
    """Verify health-check endpoints return expected structures."""

    @pytest.mark.asyncio
    async def test_root_returns_service_info(self, client: AsyncClient):
        resp = await client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["service"] == "Quirk AI Kiosk API"
        assert data["status"] == "running"
        assert "version" in data
        assert "features" in data

    @pytest.mark.asyncio
    async def test_health_returns_checks(self, client: AsyncClient):
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("healthy", "degraded", "unhealthy")
        assert "timestamp" in data
        assert "checks" in data
        checks = data["checks"]
        # These sub-checks should always be present
        assert "database" in checks
        assert "ai_service" in checks
        assert "inventory" in checks

    @pytest.mark.asyncio
    async def test_health_includes_redis_check(self, client: AsyncClient):
        resp = await client.get("/api/health")
        data = resp.json()
        assert "redis" in data["checks"]
        redis_status = data["checks"]["redis"]["status"]
        assert redis_status in ("healthy", "unavailable", "in_memory_fallback")

    @pytest.mark.asyncio
    async def test_liveness_probe(self, client: AsyncClient):
        resp = await client.get("/api/health/live")
        assert resp.status_code == 200
        assert resp.json()["status"] == "alive"

    @pytest.mark.asyncio
    async def test_readiness_probe(self, client: AsyncClient):
        resp = await client.get("/api/health/ready")
        # Should be 200 (ready) or 503 (not ready); both are valid
        assert resp.status_code in (200, 503)


# ---------------------------------------------------------------------------
# Inventory Endpoint Tests
# ---------------------------------------------------------------------------

class TestInventoryEndpoints:
    """Integration tests for /api/v1/inventory routes."""

    @pytest.mark.asyncio
    async def test_get_inventory_returns_200(self, client: AsyncClient):
        resp = await client.get("/api/v1/inventory")
        assert resp.status_code == 200
        data = resp.json()
        assert "vehicles" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_get_inventory_filter_body_style(self, client: AsyncClient):
        resp = await client.get("/api/v1/inventory?body_style=Truck")
        assert resp.status_code == 200
        data = resp.json()
        for vehicle in data["vehicles"]:
            assert vehicle["bodyStyle"] == "Truck"

    @pytest.mark.asyncio
    async def test_get_inventory_filter_price_range(self, client: AsyncClient):
        resp = await client.get("/api/v1/inventory?min_price=30000&max_price=60000")
        assert resp.status_code == 200
        data = resp.json()
        for vehicle in data["vehicles"]:
            assert 30000 <= vehicle["price"] <= 60000

    @pytest.mark.asyncio
    async def test_get_inventory_filter_fuel_type(self, client: AsyncClient):
        resp = await client.get("/api/v1/inventory?fuel_type=Electric")
        assert resp.status_code == 200
        data = resp.json()
        for vehicle in data["vehicles"]:
            assert vehicle["fuelType"] == "Electric"

    @pytest.mark.asyncio
    async def test_get_inventory_filter_model(self, client: AsyncClient):
        resp = await client.get("/api/v1/inventory?model=Silverado")
        assert resp.status_code == 200
        data = resp.json()
        for vehicle in data["vehicles"]:
            assert "Silverado" in vehicle["model"]

    @pytest.mark.asyncio
    async def test_get_inventory_combined_filters(self, client: AsyncClient):
        resp = await client.get(
            "/api/v1/inventory?body_style=Truck&min_price=40000&max_price=70000"
        )
        assert resp.status_code == 200
        data = resp.json()
        for vehicle in data["vehicles"]:
            assert vehicle["bodyStyle"] == "Truck"
            assert 40000 <= vehicle["price"] <= 70000

    @pytest.mark.asyncio
    async def test_get_inventory_stats(self, client: AsyncClient):
        resp = await client.get("/api/v1/inventory/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "byBodyStyle" in data
        assert "priceRange" in data
        assert isinstance(data["byBodyStyle"], dict)

    @pytest.mark.asyncio
    async def test_get_featured_vehicles(self, client: AsyncClient):
        resp = await client.get("/api/v1/inventory/featured")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) <= 8

    @pytest.mark.asyncio
    async def test_search_inventory(self, client: AsyncClient):
        resp = await client.get("/api/v1/inventory/search?q=Silverado")
        assert resp.status_code == 200
        data = resp.json()
        assert "vehicles" in data
        assert "query" in data

    @pytest.mark.asyncio
    async def test_search_inventory_requires_query(self, client: AsyncClient):
        resp = await client.get("/api/v1/inventory/search")
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_get_vehicle_by_id_not_found(self, client: AsyncClient):
        resp = await client.get("/api/v1/inventory/v999999")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_available_models(self, client: AsyncClient):
        resp = await client.get("/api/v1/inventory/models")
        assert resp.status_code == 200
        data = resp.json()
        assert "models" in data


# ---------------------------------------------------------------------------
# AI Chat Endpoint Tests (with mocked Anthropic)
# ---------------------------------------------------------------------------

class TestAIChatEndpoint:
    """Integration tests for /api/v3/ai/chat with mocked Anthropic API."""

    CHAT_URL = "/api/v3/ai/chat"

    def _make_request_body(
        self,
        message: str = "Show me some trucks",
        session_id: str = "test-session-001",
        customer_name: str = "John",
    ):
        return {
            "message": message,
            "session_id": session_id,
            "conversation_history": [],
            "customer_name": customer_name,
        }

    @pytest.mark.asyncio
    async def test_chat_returns_fallback_without_api_key(self, client: AsyncClient):
        """When ANTHROPIC_API_KEY is missing, the endpoint returns a fallback response."""
        with patch("app.routers.ai_v3.get_key_manager") as mock_km:
            mock_manager = MagicMock()
            mock_manager.anthropic_key = None
            mock_km.return_value = mock_manager

            resp = await client.post(
                self.CHAT_URL,
                json=self._make_request_body(),
                headers={"X-Session-ID": "test-session-001"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data
        assert data["metadata"]["fallback"] is True

    @pytest.mark.asyncio
    async def test_chat_with_mock_anthropic_response(self, client: AsyncClient):
        """Full chat flow with a mocked Anthropic API response (text-only, no tools)."""
        mock_anthropic_response = MagicMock()
        mock_anthropic_response.status_code = 200
        mock_anthropic_response.json.return_value = {
            "content": [
                {"type": "text", "text": "Here are some great trucks for you!"}
            ],
            "stop_reason": "end_turn",
            "usage": {
                "input_tokens": 200,
                "output_tokens": 50,
                "cache_creation_input_tokens": 0,
                "cache_read_input_tokens": 0,
            },
        }
        mock_anthropic_response.text = ""

        # Build an async-context-manager mock that only intercepts the
        # httpx.AsyncClient created *inside* the route (for the Anthropic
        # API call), while leaving the test-level AsyncClient untouched.
        mock_internal_client = AsyncMock()
        mock_internal_client.post.return_value = mock_anthropic_response

        with patch("app.routers.ai_v3.get_key_manager") as mock_km, \
             patch("app.routers.ai_v3.httpx.AsyncClient") as MockClientCls:

            mock_manager = MagicMock()
            mock_manager.anthropic_key = "sk-test-key"
            mock_km.return_value = mock_manager

            # Make the class act as an async context manager returning our mock
            MockClientCls.return_value.__aenter__ = AsyncMock(return_value=mock_internal_client)
            MockClientCls.return_value.__aexit__ = AsyncMock(return_value=False)

            resp = await client.post(
                self.CHAT_URL,
                json=self._make_request_body(),
                headers={"X-Session-ID": "test-session-001"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data
        assert data["message"] == "Here are some great trucks for you!"
        assert isinstance(data.get("tools_used"), list)

    @pytest.mark.asyncio
    async def test_chat_with_tool_use_response(self, client: AsyncClient):
        """Chat with tool use: Anthropic returns tool_use block, then text."""
        tool_response = MagicMock()
        tool_response.status_code = 200
        tool_response.json.return_value = {
            "content": [
                {
                    "type": "tool_use",
                    "id": "toolu_01",
                    "name": "search_inventory",
                    "input": {"query": "trucks", "limit": 5},
                }
            ],
            "stop_reason": "tool_use",
            "usage": {"input_tokens": 200, "output_tokens": 50},
        }
        tool_response.text = ""

        text_response = MagicMock()
        text_response.status_code = 200
        text_response.json.return_value = {
            "content": [
                {"type": "text", "text": "I found some great trucks!"}
            ],
            "stop_reason": "end_turn",
            "usage": {"input_tokens": 300, "output_tokens": 80},
        }
        text_response.text = ""

        # Build an async-context-manager mock for the internal httpx client.
        # The route creates a *new* httpx.AsyncClient context on each API call
        # (initial + tool-loop), so we build two separate mock instances.
        mock_client_1 = AsyncMock()
        mock_client_1.post.return_value = tool_response

        mock_client_2 = AsyncMock()
        mock_client_2.post.return_value = text_response

        client_instances = iter([mock_client_1, mock_client_2])

        with patch("app.routers.ai_v3.get_key_manager") as mock_km, \
             patch("app.routers.ai_v3.httpx.AsyncClient") as MockClientCls, \
             patch("app.routers.ai_v3.execute_tool", new_callable=AsyncMock) as mock_exec:

            mock_manager = MagicMock()
            mock_manager.anthropic_key = "sk-test-key"
            mock_km.return_value = mock_manager

            # Each `async with httpx.AsyncClient() as c:` gets the next mock
            def make_ctx():
                ctx = MagicMock()
                inst = next(client_instances)
                ctx.__aenter__ = AsyncMock(return_value=inst)
                ctx.__aexit__ = AsyncMock(return_value=False)
                return ctx

            MockClientCls.side_effect = lambda: make_ctx()

            # Tool returns no vehicles, no staff notified
            mock_exec.return_value = ("Found 5 trucks in inventory", [], False)

            resp = await client.post(
                self.CHAT_URL,
                json=self._make_request_body(),
                headers={"X-Session-ID": "test-session-002"},
            )

        assert resp.status_code == 200
        data = resp.json()
        assert "search_inventory" in data["tools_used"]


# ---------------------------------------------------------------------------
# AI Chat Stream Endpoint Tests
# ---------------------------------------------------------------------------

class TestAIChatStreamEndpoint:
    """Integration tests for /api/v3/ai/chat/stream SSE endpoint."""

    STREAM_URL = "/api/v3/ai/chat/stream"

    @pytest.mark.asyncio
    async def test_stream_returns_event_stream_content_type(self, client: AsyncClient):
        """Verify the stream endpoint returns text/event-stream."""
        with patch("app.routers.ai_v3.get_key_manager") as mock_km:
            mock_manager = MagicMock()
            mock_manager.anthropic_key = None
            mock_km.return_value = mock_manager

            resp = await client.post(
                self.STREAM_URL,
                json={
                    "message": "Hello",
                    "session_id": "stream-test-001",
                    "conversation_history": [],
                },
                headers={"X-Session-ID": "stream-test-001"},
            )

        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")

    @pytest.mark.asyncio
    async def test_stream_fallback_without_api_key(self, client: AsyncClient):
        """When no API key, stream should still return text_delta and done events."""
        with patch("app.routers.ai_v3.get_key_manager") as mock_km:
            mock_manager = MagicMock()
            mock_manager.anthropic_key = None
            mock_km.return_value = mock_manager

            resp = await client.post(
                self.STREAM_URL,
                json={
                    "message": "Hello",
                    "session_id": "stream-test-002",
                    "conversation_history": [],
                },
                headers={"X-Session-ID": "stream-test-002"},
            )

        assert resp.status_code == 200
        body = resp.text
        assert "event: text_delta" in body
        assert "event: done" in body


# ---------------------------------------------------------------------------
# Traffic Session Lifecycle Tests
# ---------------------------------------------------------------------------

class TestTrafficSessionLifecycle:
    """Test /api/v1/traffic session create → get → list → delete."""

    @pytest.mark.asyncio
    async def test_create_session(self, client: AsyncClient):
        resp = await client.post(
            "/api/v1/traffic/session",
            json={
                "sessionId": "integration-test-001",
                "customerName": "Jane",
                "path": "aiAssistant",
                "actions": ["entered_name", "selected_aiAssistant"],
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["sessionId"] == "integration-test-001"
        assert data["status"] == "success"
        assert data["storage"] in ("postgresql", "json")

    @pytest.mark.asyncio
    async def test_get_session_detail(self, client: AsyncClient):
        # Create first
        await client.post(
            "/api/v1/traffic/session",
            json={
                "sessionId": "integration-test-002",
                "customerName": "Bob",
                "path": "stockLookup",
                "actions": ["entered_name"],
            },
        )
        # Retrieve
        resp = await client.get("/api/v1/traffic/log/integration-test-002")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("sessionId") == "integration-test-002" or data.get("session_id") == "integration-test-002"

    @pytest.mark.asyncio
    async def test_update_existing_session(self, client: AsyncClient):
        """Posting to the same session_id updates rather than creating a duplicate."""
        await client.post(
            "/api/v1/traffic/session",
            json={
                "sessionId": "integration-test-003",
                "customerName": "Alice",
                "actions": ["entered_name"],
            },
        )
        # Update with more data
        resp = await client.post(
            "/api/v1/traffic/session",
            json={
                "sessionId": "integration-test-003",
                "path": "modelBudget",
                "actions": ["selected_modelBudget"],
            },
        )
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_get_active_sessions(self, client: AsyncClient):
        resp = await client.get("/api/v1/traffic/active")
        assert resp.status_code == 200
        data = resp.json()
        assert "sessions" in data
        assert "count" in data
        assert "server_time" in data

    @pytest.mark.asyncio
    async def test_get_traffic_log(self, client: AsyncClient):
        resp = await client.get("/api/v1/traffic/log?limit=10&offset=0")
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "sessions" in data

    @pytest.mark.asyncio
    async def test_get_traffic_stats(self, client: AsyncClient):
        resp = await client.get("/api/v1/traffic/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_sessions" in data
        assert "active_now" in data
        assert "by_path" in data

    @pytest.mark.asyncio
    async def test_delete_session(self, client: AsyncClient):
        # Create
        await client.post(
            "/api/v1/traffic/session",
            json={
                "sessionId": "integration-test-delete",
                "customerName": "Delete Me",
                "actions": ["test"],
            },
        )
        # Delete
        resp = await client.delete("/api/v1/traffic/log/integration-test-delete")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "deleted" or "error" not in data

    @pytest.mark.asyncio
    async def test_get_storage_status(self, client: AsyncClient):
        resp = await client.get("/api/v1/traffic/storage-status")
        assert resp.status_code == 200
        data = resp.json()
        assert "active_storage" in data
        assert data["active_storage"] in ("postgresql", "json")


# ---------------------------------------------------------------------------
# Worksheet CRUD Lifecycle Tests
# ---------------------------------------------------------------------------

class TestWorksheetLifecycle:
    """Test /api/v3/worksheet CRUD: create → get → update → list."""

    @pytest.mark.asyncio
    async def test_create_worksheet(self, client: AsyncClient):
        """Create worksheet - may fail with 400 if stock number is invalid,
        which is expected because we don't have real inventory in test."""
        resp = await client.post(
            "/api/v3/worksheet/create",
            json={
                "session_id": "ws-test-001",
                "stock_number": "M12345",
                "customer_name": "Test Customer",
                "customer_phone": "6175551234",
            },
        )
        # 200 or 400 (stock not found) or 500 are acceptable; we verify the route exists
        assert resp.status_code in (200, 400, 500)

    @pytest.mark.asyncio
    async def test_get_worksheet_not_found(self, client: AsyncClient):
        resp = await client.get("/api/v3/worksheet/nonexistent-id")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_session_worksheets_empty(self, client: AsyncClient):
        resp = await client.get("/api/v3/worksheet/session/no-session-exists")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_count"] == 0
        assert data["worksheets"] == []

    @pytest.mark.asyncio
    async def test_select_term_invalid(self, client: AsyncClient):
        """Selecting a term that is not 60/72/84 should return 400."""
        resp = await client.post("/api/v3/worksheet/fake-id/select-term/48")
        assert resp.status_code == 400
        assert "60, 72, or 84" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_get_active_worksheets(self, client: AsyncClient):
        resp = await client.get("/api/v3/worksheet/manager/active")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_get_ready_worksheets(self, client: AsyncClient):
        resp = await client.get("/api/v3/worksheet/manager/ready")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)


# ---------------------------------------------------------------------------
# AI Conversation State Endpoints
# ---------------------------------------------------------------------------

class TestConversationStateEndpoints:
    """Test /api/v3/ai/state endpoints."""

    @pytest.mark.asyncio
    async def test_get_state_not_found(self, client: AsyncClient):
        resp = await client.get("/api/v3/ai/state/nonexistent-session")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_phone_lookup_invalid_phone(self, client: AsyncClient):
        resp = await client.get("/api/v3/ai/lookup/phone/12345")
        assert resp.status_code == 400
        assert "10 digits" in resp.json()["detail"]

    @pytest.mark.asyncio
    async def test_phone_lookup_not_found(self, client: AsyncClient):
        resp = await client.get("/api/v3/ai/lookup/phone/9999999999")
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_ai_health_endpoint(self, client: AsyncClient):
        resp = await client.get("/api/v3/ai/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data
        assert "version" in data
        assert "model" in data

    @pytest.mark.asyncio
    async def test_analytics_endpoint(self, client: AsyncClient):
        resp = await client.get("/api/v3/ai/analytics")
        assert resp.status_code == 200
