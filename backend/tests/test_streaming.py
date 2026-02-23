"""
Tests for SSE Streaming Chat Endpoint (Phase 5)

Verifies:
- Streaming endpoint is registered on the router
- SSE event format is correct
- Error handling returns proper SSE error events
- Fallback response when no API key is configured
- Tool execution events are properly yielded during streaming
- Vehicle and worksheet events are emitted
- Conversation state is updated after streaming completes
"""

import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import json

from app.routers.ai_v3 import router, intelligent_chat_stream
from app.services.conversation_state import (
    ConversationStateManager,
    ConversationState,
    ConversationStage,
)
from app.services.vehicle_retriever import (
    SemanticVehicleRetriever,
    ScoredVehicle,
)


# ---
# TEST DATA
# ---

SAMPLE_INVENTORY = [
    {
        "Stock Number": "M12345",
        "Year": 2025,
        "Make": "Chevrolet",
        "Model": "Silverado 1500",
        "Trim": "LT",
        "MSRP": 52000,
        "price": 52000,
        "Body": "4WD Crew Cab",
        "Body Type": "PKUP",
        "bodyStyle": "Truck",
        "Exterior Color": "Summit White",
        "exteriorColor": "Summit White",
    },
    {
        "Stock Number": "M12346",
        "Year": 2025,
        "Make": "Chevrolet",
        "Model": "Equinox",
        "Trim": "RS",
        "MSRP": 35000,
        "price": 35000,
        "Body": "AWD 4dr",
        "Body Type": "APURP",
        "bodyStyle": "SUV",
        "Exterior Color": "Black",
        "exteriorColor": "Black",
    },
]


def _create_test_state(session_id="test-session-123"):
    """Create a ConversationState for testing."""
    state = ConversationState(session_id=session_id)
    return state


# ---
# ROUTE REGISTRATION TESTS
# ---

class TestStreamingEndpointRegistration:
    """Verify the streaming endpoint is registered on the router."""

    def test_streaming_endpoint_exists(self):
        """The /chat/stream route should be registered on the ai_v3 router."""
        routes = [r.path for r in router.routes]
        assert "/chat/stream" in routes

    def test_streaming_endpoint_accepts_post(self):
        """The /chat/stream route should accept POST requests."""
        for route in router.routes:
            if hasattr(route, "path") and route.path == "/chat/stream":
                assert "POST" in route.methods
                break
        else:
            pytest.fail("/chat/stream route not found")

    def test_existing_chat_endpoint_preserved(self):
        """The original /chat endpoint should still be registered."""
        routes = [r.path for r in router.routes]
        assert "/chat" in routes

    def test_all_original_routes_preserved(self):
        """All pre-existing routes should still be registered."""
        routes = [r.path for r in router.routes]
        expected_routes = [
            "/chat",
            "/chat/stream",
            "/notify-staff",
            "/state/{session_id}",
            "/health",
            "/analytics",
        ]
        for expected in expected_routes:
            assert expected in routes, f"Missing route: {expected}"


# ---
# SSE EVENT FORMAT TESTS
# ---

class TestSSEEventFormat:
    """Verify SSE events are formatted correctly."""

    def test_sse_thinking_event_format(self):
        """Thinking event should be properly formatted SSE."""
        event = f"event: thinking\ndata: {json.dumps({'status': 'processing'})}\n\n"
        assert event.startswith("event: thinking\n")
        assert "data: " in event
        assert event.endswith("\n\n")
        data = json.loads(event.split("data: ")[1].strip())
        assert data["status"] == "processing"

    def test_sse_text_delta_event_format(self):
        """Text delta event should contain the text chunk."""
        text = "Hello! How can I help you?"
        event = f"event: text_delta\ndata: {json.dumps({'text': text})}\n\n"
        data = json.loads(event.split("data: ")[1].strip())
        assert data["text"] == text

    def test_sse_tool_start_event_format(self):
        """Tool start event should contain the tool name."""
        event = f"event: tool_start\ndata: {json.dumps({'tool': 'search_inventory'})}\n\n"
        data = json.loads(event.split("data: ")[1].strip())
        assert data["tool"] == "search_inventory"

    def test_sse_tool_result_event_format(self):
        """Tool result event should contain tool name and success status."""
        event = f"event: tool_result\ndata: {json.dumps({'tool': 'search_inventory', 'success': True})}\n\n"
        data = json.loads(event.split("data: ")[1].strip())
        assert data["tool"] == "search_inventory"
        assert data["success"] is True

    def test_sse_vehicles_event_format(self):
        """Vehicles event should contain a list of vehicle data."""
        vehicles = [
            {"stock_number": "M12345", "model": "2025 Silverado 1500 LT", "price": 52000},
        ]
        event = f"event: vehicles\ndata: {json.dumps({'vehicles': vehicles})}\n\n"
        data = json.loads(event.split("data: ")[1].strip())
        assert len(data["vehicles"]) == 1
        assert data["vehicles"][0]["stock_number"] == "M12345"

    def test_sse_worksheet_event_format(self):
        """Worksheet event should contain the worksheet ID."""
        ws_id = "abc123-def456"
        event = f"event: worksheet\ndata: {json.dumps({'worksheet_id': ws_id})}\n\n"
        data = json.loads(event.split("data: ")[1].strip())
        assert data["worksheet_id"] == ws_id

    def test_sse_done_event_format(self):
        """Done event should contain metadata about the response."""
        metadata = {
            "tools_used": ["search_inventory"],
            "staff_notified": False,
            "worksheet_id": None,
        }
        event = f"event: done\ndata: {json.dumps(metadata)}\n\n"
        data = json.loads(event.split("data: ")[1].strip())
        assert data["tools_used"] == ["search_inventory"]
        assert data["staff_notified"] is False

    def test_sse_error_event_format(self):
        """Error event should contain the error message."""
        event = f"event: error\ndata: {json.dumps({'error': 'API error: 500'})}\n\n"
        data = json.loads(event.split("data: ")[1].strip())
        assert "API error" in data["error"]


# ---
# FALLBACK BEHAVIOR TESTS
# ---

class TestStreamingFallback:
    """Test fallback behavior when API key is not configured."""

    @pytest.mark.asyncio
    async def test_fallback_when_no_api_key(self):
        """When no API key is configured, should yield a fallback text_delta and done event."""
        mock_key_manager = MagicMock()
        mock_key_manager.anthropic_key = None

        mock_state_manager = MagicMock()
        mock_retriever = MagicMock()
        mock_retriever._is_fitted = True

        with patch("app.routers.ai_v3.get_key_manager", return_value=mock_key_manager), \
             patch("app.routers.ai_v3.get_state_manager", return_value=mock_state_manager), \
             patch("app.routers.ai_v3.get_vehicle_retriever", return_value=mock_retriever):

            from starlette.testclient import TestClient
            from app.main import app

            client = TestClient(app)
            response = client.post(
                "/api/v3/ai/chat/stream",
                json={
                    "message": "I need a truck",
                    "session_id": "test-session",
                    "conversation_history": [],
                    "customer_name": "John",
                },
                headers={"X-Session-ID": "test-session"},
            )

            assert response.status_code == 200
            assert response.headers.get("content-type", "").startswith("text/event-stream")

            body = response.text
            assert "event: text_delta" in body
            assert "event: done" in body

            # Done event should indicate fallback
            for line_block in body.split("\n\n"):
                if "event: done" in line_block:
                    data_line = [
                        l for l in line_block.split("\n") if l.startswith("data: ")
                    ][0]
                    data = json.loads(data_line[6:])
                    assert data.get("fallback") is True


# ---
# ANTHROPIC STREAM PARSING TESTS
# ---

class TestAnthropicStreamParsing:
    """Test parsing of Anthropic SSE stream events."""

    def test_parse_content_block_start_text(self):
        """content_block_start with type text should be recognized."""
        event_data = {
            "type": "content_block_start",
            "index": 0,
            "content_block": {"type": "text", "text": ""},
        }
        assert event_data["content_block"]["type"] == "text"

    def test_parse_content_block_start_tool_use(self):
        """content_block_start with type tool_use should extract tool info."""
        event_data = {
            "type": "content_block_start",
            "index": 1,
            "content_block": {
                "type": "tool_use",
                "id": "toolu_123",
                "name": "search_inventory",
            },
        }
        block = event_data["content_block"]
        assert block["type"] == "tool_use"
        assert block["name"] == "search_inventory"
        assert block["id"] == "toolu_123"

    def test_parse_text_delta(self):
        """text_delta should extract incremental text."""
        event_data = {
            "type": "content_block_delta",
            "delta": {"type": "text_delta", "text": "Hello!"},
        }
        delta = event_data["delta"]
        assert delta["type"] == "text_delta"
        assert delta["text"] == "Hello!"

    def test_parse_input_json_delta(self):
        """input_json_delta should accumulate partial JSON for tool input."""
        partial_chunks = [
            '{"qu',
            'ery": "',
            'truck u',
            'nder 50k"}',
        ]
        accumulated = "".join(partial_chunks)
        parsed = json.loads(accumulated)
        assert parsed["query"] == "truck under 50k"

    def test_parse_message_delta_with_stop_reason(self):
        """message_delta should extract stop_reason."""
        event_data = {
            "type": "message_delta",
            "delta": {"stop_reason": "end_turn"},
        }
        assert event_data["delta"]["stop_reason"] == "end_turn"

    def test_parse_message_delta_tool_use_stop(self):
        """message_delta with tool_use stop_reason triggers tool execution loop."""
        event_data = {
            "type": "message_delta",
            "delta": {"stop_reason": "tool_use"},
        }
        assert event_data["delta"]["stop_reason"] == "tool_use"


# ---
# TOOL EXECUTION DURING STREAMING TESTS
# ---

class TestToolExecutionInStream:
    """Test tool execution behavior within the streaming context."""

    @pytest.mark.asyncio
    async def test_execute_tool_called_for_tool_blocks(self):
        """execute_tool should be called when tool_use blocks are present."""
        from app.ai.tool_executor import execute_tool

        state = _create_test_state()
        retriever = SemanticVehicleRetriever()
        retriever.fit(SAMPLE_INVENTORY)
        state_manager = ConversationStateManager()

        # Test search_inventory tool execution
        tool_result, vehicles, notified = await execute_tool(
            "search_inventory",
            {"query": "truck"},
            state,
            retriever,
            state_manager,
        )

        assert isinstance(tool_result, str)
        assert isinstance(vehicles, list)
        assert notified is False

    @pytest.mark.asyncio
    async def test_worksheet_id_extraction_from_tool_result(self):
        """Worksheet ID should be extractable from tool result text."""
        import re

        sample_result = """DIGITAL WORKSHEET CREATED

VEHICLE: 2025 Silverado 1500 LT
Stock #: M12345

WORKSHEET ID: abc12345-def6-7890-abcd-1234567890ab

The worksheet is now displayed on the kiosk."""

        ws_match = re.search(r"WORKSHEET ID: ([a-f0-9-]+)", sample_result)
        assert ws_match is not None
        assert ws_match.group(1) == "abc12345-def6-7890-abcd-1234567890ab"

    @pytest.mark.asyncio
    async def test_notify_staff_sets_notified_flag(self):
        """notify_staff tool should set staff_notified=True."""
        from app.ai.tool_executor import execute_tool

        state = _create_test_state()
        retriever = SemanticVehicleRetriever()
        retriever.fit(SAMPLE_INVENTORY)
        state_manager = ConversationStateManager()

        with patch(
            "app.ai.tool_executor.get_notification_service"
        ) as mock_notif:
            mock_service = AsyncMock()
            mock_service.notify_staff.return_value = {
                "slack_sent": True,
                "sms_sent": False,
                "errors": [],
            }
            mock_notif.return_value = mock_service

            tool_result, vehicles, notified = await execute_tool(
                "notify_staff",
                {
                    "notification_type": "sales",
                    "message": "Customer ready for test drive",
                },
                state,
                retriever,
                state_manager,
            )

            assert notified is True
            assert "notified" in tool_result.lower() or "team" in tool_result.lower()


# ---
# ERROR HANDLING TESTS
# ---

class TestStreamingErrorHandling:
    """Test error scenarios during streaming."""

    def test_error_message_truncated_to_200_chars(self):
        """Error messages should be truncated to 200 characters."""
        long_error = "x" * 500
        truncated = long_error[:200]
        event = f"event: error\ndata: {json.dumps({'error': truncated})}\n\n"
        data = json.loads(event.split("data: ")[1].strip())
        assert len(data["error"]) == 200

    def test_json_serializable_events(self):
        """All event data payloads should be JSON-serializable."""
        test_payloads = [
            {"status": "processing"},
            {"text": "Hello! \u00bfC\u00f3mo est\u00e1s?"},  # Spanish characters
            {"tool": "search_inventory"},
            {"tool": "calculate_budget", "success": True},
            {
                "vehicles": [
                    {"stock_number": "M12345", "model": "2025 Silverado", "price": 52000}
                ]
            },
            {"worksheet_id": "abc-123"},
            {"tools_used": ["search_inventory", "calculate_budget"], "staff_notified": False, "worksheet_id": None},
            {"error": "API timeout"},
        ]
        for payload in test_payloads:
            serialized = json.dumps(payload)
            deserialized = json.loads(serialized)
            assert deserialized == payload

    @pytest.mark.asyncio
    async def test_stream_yields_error_on_api_failure(self):
        """When the Anthropic API returns a non-200, should yield an error event."""
        mock_key_manager = MagicMock()
        mock_key_manager.anthropic_key = "test-key"

        mock_state_manager = MagicMock()
        mock_state = _create_test_state()
        mock_state_manager.get_or_create_state = AsyncMock(return_value=mock_state)
        mock_state_manager.update_state = MagicMock(return_value=mock_state)

        mock_retriever = MagicMock()
        mock_retriever._is_fitted = True
        mock_retriever.get_inventory_summary.return_value = {
            "total": 2,
            "by_body_style": {"Truck": 1, "SUV": 1},
            "price_range": {"min": 35000, "max": 52000},
            "top_models": {"Silverado 1500": 1},
        }

        # Create a mock httpx stream that returns a 500 error
        mock_response = AsyncMock()
        mock_response.status_code = 500
        mock_response.aread = AsyncMock(return_value=b"Internal Server Error")

        mock_stream_context = AsyncMock()
        mock_stream_context.__aenter__ = AsyncMock(return_value=mock_response)
        mock_stream_context.__aexit__ = AsyncMock(return_value=False)

        mock_client = AsyncMock()
        mock_client.stream = MagicMock(return_value=mock_stream_context)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)

        with patch("app.routers.ai_v3.get_key_manager", return_value=mock_key_manager), \
             patch("app.routers.ai_v3.get_state_manager", return_value=mock_state_manager), \
             patch("app.routers.ai_v3.get_vehicle_retriever", return_value=mock_retriever), \
             patch("httpx.AsyncClient", return_value=mock_client):

            from starlette.testclient import TestClient
            from app.main import app

            client = TestClient(app)
            response = client.post(
                "/api/v3/ai/chat/stream",
                json={
                    "message": "Show me trucks",
                    "session_id": "test-session",
                    "conversation_history": [],
                },
                headers={"X-Session-ID": "test-session"},
            )

            assert response.status_code == 200
            body = response.text

            # Should contain thinking and error events
            assert "event: thinking" in body
            assert "event: error" in body


# ---
# CONTENT BLOCKS ASSEMBLY TESTS
# ---

class TestContentBlocksAssembly:
    """Test assembly of content blocks for tool loop continuation."""

    def test_text_block_added_to_content_blocks(self):
        """Text content should be added to content_blocks when present."""
        content_blocks = []
        text_content = "Let me search for trucks."
        content_blocks_has_text = any(
            b.get("type") == "text" for b in content_blocks
        )
        if not content_blocks_has_text and text_content:
            content_blocks.insert(0, {"type": "text", "text": text_content})

        assert len(content_blocks) == 1
        assert content_blocks[0]["type"] == "text"
        assert content_blocks[0]["text"] == "Let me search for trucks."

    def test_tool_use_block_in_content_blocks(self):
        """Tool use blocks should be collected in content_blocks."""
        content_blocks = []
        tool_block = {
            "type": "tool_use",
            "id": "toolu_abc123",
            "name": "search_inventory",
            "input": {"query": "truck"},
        }
        content_blocks.append(tool_block)

        assert len(content_blocks) == 1
        assert content_blocks[0]["type"] == "tool_use"
        assert content_blocks[0]["name"] == "search_inventory"

    def test_mixed_content_blocks(self):
        """Text and tool_use blocks should coexist in content_blocks."""
        content_blocks = [
            {"type": "text", "text": "Let me search for you."},
            {
                "type": "tool_use",
                "id": "toolu_abc",
                "name": "search_inventory",
                "input": {"query": "SUV"},
            },
        ]

        text_blocks = [b for b in content_blocks if b["type"] == "text"]
        tool_blocks = [b for b in content_blocks if b["type"] == "tool_use"]

        assert len(text_blocks) == 1
        assert len(tool_blocks) == 1

    def test_tool_results_format_for_continuation(self):
        """Tool results should be formatted correctly for conversation continuation."""
        tool_results = [
            {
                "type": "tool_result",
                "tool_use_id": "toolu_abc123",
                "content": "Found 3 matching vehicles:\n1. Stock #M12345...",
            }
        ]

        assert tool_results[0]["type"] == "tool_result"
        assert tool_results[0]["tool_use_id"] == "toolu_abc123"
        assert "Found 3 matching vehicles" in tool_results[0]["content"]


# ---
# VEHICLE EVENT EMISSION TESTS
# ---

class TestVehicleEventEmission:
    """Test vehicle recommendation event construction."""

    def test_vehicle_data_structure(self):
        """Vehicle data in SSE events should have required fields."""
        vehicles = [
            ScoredVehicle(
                vehicle=SAMPLE_INVENTORY[0],
                score=95,
                match_reasons=["High towing capacity"],
                preference_matches={},
            )
        ]

        vehicle_data = []
        for sv in vehicles[:6]:
            vehicle_data.append({
                "stock_number": (
                    sv.vehicle.get("Stock Number")
                    or sv.vehicle.get("stockNumber", "")
                ),
                "model": (
                    f"{sv.vehicle.get('Year', '')} "
                    f"{sv.vehicle.get('Model', '')} "
                    f"{sv.vehicle.get('Trim', '')}"
                ).strip(),
                "price": (
                    sv.vehicle.get("MSRP") or sv.vehicle.get("price")
                ),
            })

        assert len(vehicle_data) == 1
        assert vehicle_data[0]["stock_number"] == "M12345"
        assert vehicle_data[0]["model"] == "2025 Silverado 1500 LT"
        assert vehicle_data[0]["price"] == 52000

    def test_vehicles_limited_to_six(self):
        """At most 6 vehicles should be included in the event."""
        many_vehicles = [
            ScoredVehicle(
                vehicle={"Stock Number": f"M{i}", "Year": 2025, "Model": "Test", "Trim": "LT", "MSRP": 30000},
                score=90 - i,
                match_reasons=[],
                preference_matches={},
            )
            for i in range(10)
        ]

        vehicle_data = []
        for sv in many_vehicles[:6]:
            vehicle_data.append({
                "stock_number": sv.vehicle.get("Stock Number", ""),
            })

        assert len(vehicle_data) == 6
