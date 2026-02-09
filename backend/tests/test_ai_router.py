"""
Tests for Intelligent AI Router (V3)
Covers tool execution, fallback behavior, and system prompt configuration
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
import json
import sys

sys.path.insert(0, '/home/runner/work/quirk-ai-kiosk/quirk-ai-kiosk/backend')

# Updated imports for refactored module structure
from app.routers.ai_v3 import MODEL_NAME
from app.ai.tools import TOOLS
from app.ai.prompts import SYSTEM_PROMPT_TEMPLATE
from app.ai.helpers import (
    generate_fallback_response,
    build_dynamic_context,
    format_vehicles_for_tool_result,
)
from app.services.conversation_state import ConversationState, ConversationStage, InterestLevel
from app.services.vehicle_retriever import ScoredVehicle


# ---
# Fallback Response Tests
# ---

class TestFallbackResponses:
    
    def test_fallback_truck_keywords(self):
        """Truck-related queries should get truck response"""
        response = generate_fallback_response("I need a truck for towing")
        
        assert "Silverado" in response or "truck" in response.lower()
    
    def test_fallback_suv_keywords(self):
        """SUV/family queries should get SUV response"""
        response = generate_fallback_response("I need space for my family")
        
        assert any(model in response for model in ["Equinox", "Traverse", "Tahoe", "Suburban", "SUV"])
    
    def test_fallback_electric_keywords(self):
        """Electric queries should get EV response"""
        response = generate_fallback_response("Show me electric vehicles")
        
        assert "EV" in response or "electric" in response.lower()
    
    def test_fallback_sports_car_keywords(self):
        """Sports car queries should get performance response"""
        response = generate_fallback_response("I want something fast and fun")
        
        assert "Corvette" in response or "Camaro" in response or "performance" in response.lower()
    
    def test_fallback_budget_keywords(self):
        """Budget queries should get price response"""
        response = generate_fallback_response("What's your cheapest vehicle?")
        
        assert "Trax" in response or "price" in response.lower() or "$" in response
    
    def test_fallback_with_customer_name(self):
        """Response should include customer name if provided"""
        response = generate_fallback_response("Hi", customer_name="John")
        
        assert "John" in response
    
    def test_fallback_without_customer_name(self):
        """Response should work without customer name"""
        response = generate_fallback_response("Hi", customer_name=None)
        
        assert len(response) > 0
    
    def test_fallback_spanish_detection(self):
        """Spanish queries should get Spanish response"""
        response = generate_fallback_response("Busco una camioneta")
        
        # Should contain Spanish words
        assert any(word in response.lower() for word in ["busca", "camioneta", "vehículo", "silverado", "hola"])
    
    def test_fallback_spanish_with_name(self):
        """Spanish response should include customer name"""
        response = generate_fallback_response("Hola, busco un carro", customer_name="María")
        
        assert "María" in response


# ---
# System Prompt Tests
# ---

class TestSystemPrompt:
    """Tests to verify system prompt contains required sections"""
    
    def test_system_prompt_contains_showroom_context(self):
        """System prompt should emphasize customer is already in showroom"""
        assert "SHOWROOM" in SYSTEM_PROMPT_TEMPLATE.upper()
        assert "already here" in SYSTEM_PROMPT_TEMPLATE.lower() or "right now" in SYSTEM_PROMPT_TEMPLATE.lower()
    
    def test_system_prompt_contains_language_detection(self):
        """System prompt should contain Spanish language detection"""
        assert "Spanish" in SYSTEM_PROMPT_TEMPLATE or "español" in SYSTEM_PROMPT_TEMPLATE.lower()
    
    def test_system_prompt_contains_budget_qualification(self):
        """System prompt should contain budget qualification section"""
        assert "BUDGET" in SYSTEM_PROMPT_TEMPLATE.upper()
        assert "calculate_budget" in SYSTEM_PROMPT_TEMPLATE
    
    def test_system_prompt_contains_trade_in_policy(self):
        """System prompt should contain trade-in policy"""
        assert "TRADE-IN" in SYSTEM_PROMPT_TEMPLATE.upper()
        assert "appraisal" in SYSTEM_PROMPT_TEMPLATE.lower()
    
    def test_system_prompt_contains_spouse_handling(self):
        """System prompt should contain spouse objection handling"""
        assert "SPOUSE" in SYSTEM_PROMPT_TEMPLATE.upper() or "spouse" in SYSTEM_PROMPT_TEMPLATE.lower()
        assert "wife" in SYSTEM_PROMPT_TEMPLATE.lower() or "husband" in SYSTEM_PROMPT_TEMPLATE.lower()
    
    def test_system_prompt_contains_acknowledge_validate(self):
        """System prompt should contain acknowledgment step"""
        assert "Acknowledge" in SYSTEM_PROMPT_TEMPLATE
        assert "Validate" in SYSTEM_PROMPT_TEMPLATE
    
    def test_system_prompt_contains_call_spouse_option(self):
        """System prompt should propose calling the spouse"""
        assert "call" in SYSTEM_PROMPT_TEMPLATE.lower()
        assert "speaker" in SYSTEM_PROMPT_TEMPLATE.lower()
    
    def test_system_prompt_contains_test_drive_option(self):
        """System prompt should propose test drive take-home"""
        assert "test drive" in SYSTEM_PROMPT_TEMPLATE.lower() or "take it home" in SYSTEM_PROMPT_TEMPLATE.lower()
    
    def test_system_prompt_contains_followup_requirement(self):
        """System prompt should require specific follow-up time"""
        assert "follow-up" in SYSTEM_PROMPT_TEMPLATE.lower() or "followup" in SYSTEM_PROMPT_TEMPLATE.lower()
    
    def test_system_prompt_never_say_come_in(self):
        """System prompt should explicitly say never to say 'come in'"""
        assert "never say" in SYSTEM_PROMPT_TEMPLATE.lower()
        assert "come in" in SYSTEM_PROMPT_TEMPLATE.lower()


# ---
# Tool Configuration Tests
# ---

class TestToolConfiguration:
    """Tests for Claude tool definitions"""
    
    def test_tools_list_not_empty(self):
        """Tools list should contain tools"""
        assert len(TOOLS) > 0
    
    def test_calculate_budget_tool_exists(self):
        """calculate_budget tool should exist"""
        tool_names = [t["name"] for t in TOOLS]
        assert "calculate_budget" in tool_names
    
    def test_search_inventory_tool_exists(self):
        """search_inventory tool should exist"""
        tool_names = [t["name"] for t in TOOLS]
        assert "search_inventory" in tool_names
    
    def test_get_vehicle_details_tool_exists(self):
        """get_vehicle_details tool should exist"""
        tool_names = [t["name"] for t in TOOLS]
        assert "get_vehicle_details" in tool_names
    
    def test_notify_staff_tool_exists(self):
        """notify_staff tool should exist"""
        tool_names = [t["name"] for t in TOOLS]
        assert "notify_staff" in tool_names
    
    def test_calculate_budget_has_required_params(self):
        """calculate_budget tool should have required parameters"""
        budget_tool = next(t for t in TOOLS if t["name"] == "calculate_budget")
        required = budget_tool["input_schema"]["required"]
        
        assert "down_payment" in required
        assert "monthly_payment" in required
    
    def test_search_inventory_has_query_param(self):
        """search_inventory tool should have query parameter"""
        search_tool = next(t for t in TOOLS if t["name"] == "search_inventory")
        required = search_tool["input_schema"]["required"]
        
        assert "query" in required
    
    def test_notify_staff_has_notification_type(self):
        """notify_staff tool should have notification_type parameter"""
        notify_tool = next(t for t in TOOLS if t["name"] == "notify_staff")
        props = notify_tool["input_schema"]["properties"]
        
        assert "notification_type" in props
        assert "enum" in props["notification_type"]
        assert "sales" in props["notification_type"]["enum"]
        assert "appraisal" in props["notification_type"]["enum"]
        assert "finance" in props["notification_type"]["enum"]


# ---
# Model Configuration Tests
# ---

class TestModelConfiguration:
    """Tests for model configuration"""
    
    def test_model_name_is_sonnet_4_5(self):
        """Model should be Claude Sonnet 4.5"""
        assert "claude-sonnet-4-5" in MODEL_NAME
    
    def test_model_has_version_date(self):
        """Model should have September 2025 version date"""
        assert "20250929" in MODEL_NAME


# ---
# Context Building Tests
# ---

class TestContextBuilding:
    """Tests for dynamic context building"""
    
    def test_build_context_new_customer(self):
        """New customer should show 'no information gathered'"""
        state = ConversationState(session_id="test123")
        state.message_count = 0
        
        context = build_dynamic_context(state)
        
        assert "New customer" in context or "no information" in context.lower()
    
    def test_build_context_with_trade_in(self):
        """Context should warn about trade-in exclusion"""
        state = ConversationState(session_id="test123")
        state.message_count = 5
        state.trade_model = "Equinox"
        
        context = build_dynamic_context(state)
        
        assert "Equinox" in context
        assert "TRADE-IN" in context.upper() or "trade" in context.lower()


# ---
# Vehicle Formatting Tests
# ---

class TestVehicleFormatting:
    """Tests for vehicle result formatting"""
    
    def test_format_empty_vehicles(self):
        """Empty list should return no vehicles message"""
        result = format_vehicles_for_tool_result([])
        
        assert "No vehicles found" in result
    
    def test_format_vehicles_includes_stock_number(self):
        """Formatted result should include stock numbers"""
        vehicle = {
            "Stock Number": "M12345",
            "Year": 2024,
            "Model": "Silverado",
            "Trim": "LT",
            "MSRP": 55000,
            "exteriorColor": "Red"
        }
        scored = ScoredVehicle(
            vehicle=vehicle, 
            score=0.9, 
            match_reasons=["Great truck"],
            preference_matches={"body_style": True}
        )
        
        result = format_vehicles_for_tool_result([scored])
        
        assert "M12345" in result
        assert "Silverado" in result
        assert "55,000" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
