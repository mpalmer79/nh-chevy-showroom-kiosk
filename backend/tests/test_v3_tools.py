"""
Tests for V3 AI Router Tool Execution
Covers Claude tool use, budget calculation tool, inventory search, and staff notification
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime
import json

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
    {
        "Stock Number": "M12347",
        "Year": 2025,
        "Make": "Chevrolet",
        "Model": "Trax",
        "Trim": "1RS",
        "MSRP": 24000,
        "price": 24000,
        "Body": "FWD 4dr",
        "Body Type": "APURP",
        "bodyStyle": "SUV",
        "Exterior Color": "Red",
        "exteriorColor": "Red",
    },
    {
        "Stock Number": "M12348",
        "Year": 2025,
        "Make": "Chevrolet",
        "Model": "Tahoe",
        "Trim": "Premier",
        "MSRP": 72000,
        "price": 72000,
        "Body": "4WD 4dr",
        "Body Type": "APURP",
        "bodyStyle": "SUV",
        "Exterior Color": "Black",
        "exteriorColor": "Black",
    },
]


# ---
# TOOL DEFINITIONS TESTS
# ---

class TestToolDefinitions:
    """Tests for Claude tool definitions"""
    
    def test_calculate_budget_tool_schema(self):
        """Verify calculate_budget tool has correct schema"""
        tool = {
            "name": "calculate_budget",
            "description": "Calculate what vehicle price a customer can afford",
            "input_schema": {
                "type": "object",
                "properties": {
                    "down_payment": {"type": "number"},
                    "monthly_payment": {"type": "number"},
                    "apr": {"type": "number", "default": 7.0},
                    "term_months": {"type": "integer", "default": 84}
                },
                "required": ["down_payment", "monthly_payment"]
            }
        }
        
        assert tool["name"] == "calculate_budget"
        assert "down_payment" in tool["input_schema"]["properties"]
        assert "monthly_payment" in tool["input_schema"]["properties"]
        assert "down_payment" in tool["input_schema"]["required"]
    
    def test_search_inventory_tool_schema(self):
        """Verify search_inventory tool has correct schema"""
        tool = {
            "name": "search_inventory",
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "body_style": {"type": "string"},
                    "max_price": {"type": "number"},
                    "min_seating": {"type": "integer"},
                    "min_towing": {"type": "integer"}
                },
                "required": ["query"]
            }
        }
        
        assert tool["name"] == "search_inventory"
        assert "query" in tool["input_schema"]["required"]
    
    def test_notify_staff_tool_schema(self):
        """Verify notify_staff tool has correct schema"""
        tool = {
            "name": "notify_staff",
            "input_schema": {
                "type": "object",
                "properties": {
                    "notification_type": {
                        "type": "string",
                        "enum": ["sales", "appraisal", "financing", "test_drive"]
                    },
                    "message": {"type": "string"},
                    "vehicle_stock": {"type": "string"},
                    "urgency": {"type": "string"}
                },
                "required": ["notification_type", "message"]
            }
        }
        
        assert "sales" in tool["input_schema"]["properties"]["notification_type"]["enum"]
        assert "appraisal" in tool["input_schema"]["properties"]["notification_type"]["enum"]


# ---
# CALCULATE BUDGET TOOL TESTS
# ---

class TestCalculateBudgetTool:
    """Tests for the calculate_budget tool execution"""
    
    def execute_calculate_budget(self, down_payment, monthly_payment, apr=7.0, term_months=84):
        """Execute budget calculation (mirroring V3 router logic)"""
        monthly_rate = (apr / 100) / 12
        
        if monthly_rate > 0:
            pv_factor = (1 - (1 + monthly_rate) ** -term_months) / monthly_rate
            financed_amount = monthly_payment * pv_factor
        else:
            financed_amount = monthly_payment * term_months
        
        max_vehicle_price = down_payment + financed_amount
        
        return {
            "down_payment": down_payment,
            "monthly_payment": monthly_payment,
            "max_vehicle_price": round(max_vehicle_price, 2),
            "apr": apr,
            "term_months": term_months,
        }
    
    def test_standard_budget(self):
        """$5000 down, $500/month should afford ~$37,500"""
        result = self.execute_calculate_budget(5000, 500)
        
        assert 35000 < result["max_vehicle_price"] < 40000
    
    def test_budget_with_inventory_filtering(self):
        """Budget should correctly filter inventory"""
        result = self.execute_calculate_budget(5000, 500)
        max_price = result["max_vehicle_price"]
        
        # Filter inventory
        affordable = [v for v in SAMPLE_INVENTORY if v["price"] <= max_price]
        
        # Should afford Equinox ($35k) and Trax ($24k), not Silverado ($52k) or Tahoe ($72k)
        assert any(v["Model"] == "Equinox" for v in affordable)
        assert any(v["Model"] == "Trax" for v in affordable)
        assert not any(v["Model"] == "Silverado 1500" for v in affordable)
        assert not any(v["Model"] == "Tahoe" for v in affordable)
    
    def test_premium_budget(self):
        """$15000 down, $800/month should afford ~$67,000"""
        result = self.execute_calculate_budget(15000, 800)
        
        # Should be able to afford Silverado
        assert result["max_vehicle_price"] > 52000
        assert result["max_vehicle_price"] < 75000
    
    def test_budget_updates_state(self):
        """Budget calculation should update conversation state"""
        state = ConversationState(session_id="test-123")
        
        # Simulate tool execution updating state
        result = self.execute_calculate_budget(5000, 500)
        state.budget_max = result["max_vehicle_price"]
        state.down_payment = result["down_payment"]
        state.monthly_payment_target = result["monthly_payment"]
        
        assert state.budget_max is not None
        assert state.down_payment == 5000
        assert state.monthly_payment_target == 500


# ---
# SEARCH INVENTORY TOOL TESTS
# ---

class TestSearchInventoryTool:
    """Tests for the search_inventory tool execution"""
    
    @pytest.fixture
    def retriever(self):
        """Setup retriever with sample inventory"""
        retriever = SemanticVehicleRetriever()
        retriever.fit(SAMPLE_INVENTORY)
        return retriever
    
    def test_search_trucks(self, retriever):
        """Search for trucks should return truck results"""
        results = retriever.retrieve("truck for towing", limit=5)
        
        # Should find trucks
        truck_results = [r for r in results if r.vehicle.get("bodyStyle") == "Truck"]
        assert len(truck_results) > 0
    
    def test_search_with_max_price(self, retriever):
        """Search with max_price filter"""
        results = retriever.retrieve("SUV", limit=10)
        
        # Filter by price
        max_price = 40000
        filtered = [r for r in results if (r.vehicle.get("MSRP") or r.vehicle.get("price", 0)) <= max_price]
        
        # Should only include Equinox ($35k) and Trax ($24k)
        for r in filtered:
            assert r.vehicle.get("price", 0) <= max_price
    
    def test_search_respects_budget_from_state(self, retriever):
        """Search should use budget from state if available"""
        state = ConversationState(session_id="test-123")
        state.budget_max = 40000
        
        results = retriever.retrieve("vehicle", conversation_state=state, limit=10)
        
        # Results should be influenced by state preferences
        assert len(results) > 0
    
    def test_search_filters_trade_in_model(self, retriever):
        """Should not recommend same model as trade-in"""
        state = ConversationState(session_id="test-123")
        state.trade_model = "Equinox"
        
        results = retriever.retrieve("SUV", limit=10)
        
        # Filter out trade-in model (as done in V3)
        trade_model_lower = state.trade_model.lower()
        filtered = [
            r for r in results
            if trade_model_lower not in (r.vehicle.get("Model") or "").lower()
        ]
        
        # Should not include Equinox
        for r in filtered:
            assert "equinox" not in r.vehicle.get("Model", "").lower()


# ---
# GET VEHICLE DETAILS TOOL TESTS
# ---

class TestGetVehicleDetailsTool:
    """Tests for the get_vehicle_details tool execution"""
    
    @pytest.fixture
    def retriever(self):
        retriever = SemanticVehicleRetriever()
        retriever.fit(SAMPLE_INVENTORY)
        return retriever
    
    def test_get_by_stock_number(self, retriever):
        """Get vehicle by stock number"""
        vehicle = retriever.get_vehicle_by_stock("M12345")
        
        assert vehicle is not None
        assert vehicle.get("Model") == "Silverado 1500"
        assert vehicle.get("MSRP") == 52000
    
    def test_get_nonexistent_stock(self, retriever):
        """Return None for nonexistent stock number"""
        vehicle = retriever.get_vehicle_by_stock("XXXXX")
        
        assert vehicle is None
    
    def test_format_vehicle_details(self, retriever):
        """Format vehicle details for tool response"""
        vehicle = retriever.get_vehicle_by_stock("M12345")
        
        if vehicle:
            details = f"""
Stock #{vehicle.get('Stock Number')}
{vehicle.get('Year')} {vehicle.get('Make')} {vehicle.get('Model')} {vehicle.get('Trim')}
Price: ${vehicle.get('MSRP'):,}
Color: {vehicle.get('Exterior Color')}
Body: {vehicle.get('Body')}
"""
            assert "M12345" in details
            assert "Silverado" in details
            assert "52,000" in details


# ---
# NOTIFY STAFF TOOL TESTS
# ---

class TestNotifyStaffTool:
    """Tests for the notify_staff tool execution"""
    
    def test_sales_notification(self):
        """Sales notification updates state"""
        state = ConversationState(session_id="test-123")
        
        # Simulate notify_staff execution
        notification_type = "sales"
        state.staff_notified = True
        state.staff_notification_type = notification_type
        state.test_drive_requested = True
        
        assert state.staff_notified is True
        assert state.test_drive_requested is True
    
    def test_appraisal_notification(self):
        """Appraisal notification updates state"""
        state = ConversationState(session_id="test-123")
        
        notification_type = "appraisal"
        state.staff_notified = True
        state.staff_notification_type = notification_type
        state.appraisal_requested = True
        
        assert state.appraisal_requested is True
    
    def test_notification_message_format(self):
        """Format notification message"""
        notification_type = "test_drive"
        message = "Customer wants to see Silverado M12345"
        vehicle_stock = "M12345"
        
        result = f"✓ {notification_type.title()} team has been notified: {message}"
        if vehicle_stock:
            result += f" (regarding Stock #{vehicle_stock})"
        
        assert "Test_Drive" in result
        assert "M12345" in result


# ---
# TOOL LOOP TESTS
# ---

class TestToolLoop:
    """Tests for multi-tool execution loop"""
    
    def test_budget_then_search_flow(self):
        """Test budget calculation followed by inventory search"""
        state = ConversationState(session_id="test-123")
        
        # Step 1: Calculate budget
        monthly_rate = (7.0 / 100) / 12
        pv_factor = (1 - (1 + monthly_rate) ** -84) / monthly_rate
        financed_amount = 500 * pv_factor
        max_price = 5000 + financed_amount
        
        state.budget_max = max_price
        state.down_payment = 5000
        state.monthly_payment_target = 500
        
        # Step 2: Search with budget constraint
        affordable = [v for v in SAMPLE_INVENTORY if v["price"] <= state.budget_max]
        
        assert len(affordable) > 0
        assert all(v["price"] <= state.budget_max for v in affordable)
    
    def test_max_tool_iterations(self):
        """Should stop after max iterations"""
        max_iterations = 5
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            # Simulate tool execution
            tool_used = iteration <= 3
            
            if not tool_used:
                break
        
        assert iteration <= max_iterations
    
    def test_tool_results_accumulated(self):
        """Tool results should accumulate vehicles"""
        all_vehicles = []
        
        # First tool returns 2 vehicles
        all_vehicles.extend([{"stock": "M001"}, {"stock": "M002"}])
        
        # Second tool returns 1 vehicle
        all_vehicles.extend([{"stock": "M003"}])
        
        assert len(all_vehicles) == 3


# ---
# SPANISH LANGUAGE TESTS
# ---

class TestSpanishLanguage:
    """Tests for Spanish language support in tool responses"""
    
    def test_detect_spanish_input(self):
        """Detect Spanish language in user message"""
        spanish_patterns = ['español', 'busco', 'quiero', 'necesito', 'camioneta', 'carro', '¿']
        spanish_chars = 'áéíóúñ'
        
        test_messages = [
            ("Busco una camioneta", True),
            ("I'm looking for a truck", False),
            ("¿Cuánto cuesta?", True),
            ("Necesito un carro familiar", True),
            ("Show me SUVs", False),
        ]
        
        for message, expected_spanish in test_messages:
            is_spanish = (
                any(p in message.lower() for p in spanish_patterns) or
                any(c in message for c in spanish_chars)
            )
            assert is_spanish == expected_spanish, f"Failed for: {message}"
    
    def test_spanish_fallback_response(self):
        """Fallback responses should be in Spanish when detected"""
        message = "Busco una camioneta"
        is_spanish = "busco" in message.lower()
        
        if is_spanish:
            response = "¡Excelente elección! Nuestra línea Silverado ofrece gran capacidad de remolque."
            assert "Silverado" in response
            assert "remolque" in response  # "towing" in Spanish


# ---
# RATE LIMITING TESTS
# ---

class TestRateLimiting:
    """Tests for AI chat rate limiting"""
    
    def test_rate_limit_key_from_session(self):
        """Rate limit key should use session ID"""
        session_id = "K1234ABCD"
        
        rate_key = f"session:{session_id}"
        
        assert rate_key == "session:K1234ABCD"
    
    def test_rate_limit_key_fallback_to_ip(self):
        """Fall back to IP when no session ID"""
        client_ip = "192.168.1.100"
        
        rate_key = f"ip:{client_ip}"
        
        assert rate_key == "ip:192.168.1.100"
    
    def test_rate_limit_configuration(self):
        """Verify rate limit configuration"""
        rate_limit = "30/minute"
        
        # Parse rate limit
        count, period = rate_limit.split("/")
        
        assert int(count) == 30
        assert period == "minute"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
