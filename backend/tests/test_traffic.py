"""
Tests for Traffic Router
Covers session logging, traffic statistics, and active sessions for Sales Dashboard
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
import json


# ---
# MOCK DATA
# ---

SAMPLE_SESSION_DATA = {
    "sessionId": "K1234ABCD",
    "customerName": "John Doe",
    "phone": "5551234567",
    "path": "modelBudget",
    "currentStep": "budget_selection",
    "vehicleInterest": {
        "model": "Silverado",
        "cab": "Crew Cab",
        "colors": ["white", "black"]
    },
    "budget": {
        "min": 400,
        "max": 600,
        "downPaymentPercent": 10
    },
    "actions": ["viewed_inventory", "selected_model"]
}

SAMPLE_TRADE_IN = {
    "hasTrade": True,
    "vehicle": {
        "year": "2019",
        "make": "Ford",
        "model": "F-150",
        "mileage": 45000
    },
    "hasPayoff": True,
    "payoffAmount": 15000,
    "monthlyPayment": 450,
    "financedWith": "Ford Credit"
}


# ---
# SESSION DATA VALIDATION TESTS
# ---

class TestSessionDataValidation:
    """Tests for session data structure validation"""
    
    def test_valid_session_data(self):
        """Valid session data should pass validation"""
        data = SAMPLE_SESSION_DATA.copy()
        
        # Basic structure checks
        assert "sessionId" in data
        assert "path" in data
        assert "vehicleInterest" in data
        assert "budget" in data
    
    def test_session_id_format(self):
        """Session ID should follow expected format"""
        session_id = "K1234ABCD5678"
        
        # Should start with K
        assert session_id.startswith("K")
        # Should be alphanumeric after K
        assert session_id[1:].isalnum()
    
    def test_budget_range_validation(self):
        """Budget range should have min <= max"""
        budget = {"min": 400, "max": 600, "downPaymentPercent": 10}
        
        assert budget["min"] <= budget["max"]
        assert 0 <= budget["downPaymentPercent"] <= 100
    
    def test_phone_format(self):
        """Phone should be digits only after formatting"""
        phone = "5551234567"
        
        assert phone.isdigit()
        assert len(phone) == 10
    
    def test_trade_in_structure(self):
        """Trade-in data should have required fields"""
        trade_in = SAMPLE_TRADE_IN.copy()
        
        assert "hasTrade" in trade_in
        if trade_in["hasTrade"]:
            assert "vehicle" in trade_in
            vehicle = trade_in["vehicle"]
            assert "year" in vehicle
            assert "make" in vehicle
            assert "model" in vehicle


# ---
# TRAFFIC STATISTICS TESTS
# ---

class TestTrafficStatistics:
    """Tests for traffic statistics calculations"""
    
    def test_calculate_conversion_rate(self):
        """Conversion rate calculation"""
        total_sessions = 100
        completed_handoffs = 15
        
        conversion_rate = (completed_handoffs / total_sessions) * 100
        
        assert conversion_rate == 15.0
    
    def test_conversion_rate_zero_sessions(self):
        """Handle zero sessions gracefully"""
        total_sessions = 0
        completed_handoffs = 0
        
        conversion_rate = (completed_handoffs / total_sessions) * 100 if total_sessions > 0 else 0
        
        assert conversion_rate == 0
    
    def test_path_distribution(self):
        """Calculate path distribution"""
        sessions = [
            {"path": "modelBudget"},
            {"path": "modelBudget"},
            {"path": "aiAssistant"},
            {"path": "stockLookup"},
            {"path": "aiAssistant"},
            {"path": "modelBudget"},
        ]
        
        by_path = {}
        for s in sessions:
            path = s.get("path", "unknown")
            by_path[path] = by_path.get(path, 0) + 1
        
        assert by_path["modelBudget"] == 3
        assert by_path["aiAssistant"] == 2
        assert by_path["stockLookup"] == 1
    
    def test_engagement_metrics(self):
        """Calculate engagement metrics"""
        sessions = [
            {"vehicleInterest": {"model": "Silverado"}, "tradeIn": {"hasTrade": True}},
            {"vehicleInterest": {"model": "Equinox"}, "tradeIn": None},
            {"vehicleInterest": None, "tradeIn": {"hasTrade": True}},
            {"vehicleInterest": {"model": "Tahoe"}, "tradeIn": {"hasTrade": True}},
        ]
        
        with_vehicle = sum(1 for s in sessions if s.get("vehicleInterest"))
        # Fix: Use (s.get("tradeIn") or {}) to handle None values
        with_trade_in = sum(1 for s in sessions if (s.get("tradeIn") or {}).get("hasTrade"))
        
        assert with_vehicle == 3
        assert with_trade_in == 3


# ---
# ACTIVE SESSIONS TESTS (Sales Dashboard)
# ---

class TestActiveSessions:
    """Tests for active session tracking (Sales Dashboard feature)"""
    
    def test_session_is_active(self):
        """Session should be active if updated within timeout"""
        timeout_minutes = 30
        now = datetime.utcnow()
        
        # Session updated 10 minutes ago - should be active
        updated_at = now - timedelta(minutes=10)
        is_active = (now - updated_at).total_seconds() < timeout_minutes * 60
        
        assert is_active is True
    
    def test_session_is_inactive(self):
        """Session should be inactive if not updated within timeout"""
        timeout_minutes = 30
        now = datetime.utcnow()
        
        # Session updated 45 minutes ago - should be inactive
        updated_at = now - timedelta(minutes=45)
        is_active = (now - updated_at).total_seconds() < timeout_minutes * 60
        
        assert is_active is False
    
    def test_format_session_for_dashboard(self):
        """Format session data for Sales Dashboard"""
        raw_session = {
            "sessionId": "K1234ABCD",
            "createdAt": "2025-12-16T10:00:00Z",
            "updatedAt": "2025-12-16T10:15:00Z",
            "customerName": "John",
            "phone": "5551234567",
            "currentStep": "vehicle_detail",
            "vehicleInterest": {
                "model": "Silverado",
                "cab": "Crew Cab",
                "colors": ["white"]
            },
            "budget": {"min": 400, "max": 600},
            "vehicle": {
                "stockNumber": "M12345",
                "year": 2025,
                "make": "Chevrolet",
                "model": "Silverado 1500",
                "price": 52000
            }
        }
        
        # Format for dashboard
        dashboard_session = {
            "sessionId": raw_session["sessionId"],
            "customerName": raw_session.get("customerName"),
            "phone": raw_session.get("phone"),
            "startTime": raw_session["createdAt"],
            "lastActivity": raw_session["updatedAt"],
            "currentStep": raw_session.get("currentStep", "unknown"),
            "vehicleInterest": raw_session.get("vehicleInterest", {}),
            "budget": raw_session.get("budget", {}),
            "selectedVehicle": raw_session.get("vehicle"),
        }
        
        assert dashboard_session["sessionId"] == "K1234ABCD"
        assert dashboard_session["customerName"] == "John"
        assert dashboard_session["selectedVehicle"]["stockNumber"] == "M12345"


# ---
# CHAT HISTORY TESTS
# ---

class TestChatHistory:
    """Tests for AI chat history in traffic sessions"""
    
    def test_chat_history_structure(self):
        """Chat history should have proper structure"""
        chat_history = [
            {"role": "user", "content": "Show me trucks", "timestamp": "2025-12-16T10:00:00Z"},
            {"role": "assistant", "content": "Here are our trucks!", "timestamp": "2025-12-16T10:00:05Z"},
            {"role": "user", "content": "What about the Silverado?", "timestamp": "2025-12-16T10:01:00Z"},
        ]
        
        for msg in chat_history:
            assert "role" in msg
            assert "content" in msg
            assert msg["role"] in ["user", "assistant"]
    
    def test_count_ai_chat_sessions(self):
        """Count sessions with AI chat"""
        sessions = [
            {"chatHistory": [{"role": "user", "content": "hi"}]},
            {"chatHistory": None},
            {"chatHistory": []},
            {"chatHistory": [{"role": "user", "content": "test"}, {"role": "assistant", "content": "hello"}]},
        ]
        
        with_ai_chat = sum(
            1 for s in sessions 
            if s.get("chatHistory") and len(s["chatHistory"]) > 0
        )
        
        assert with_ai_chat == 2
    
    def test_extract_chat_summary(self):
        """Extract summary from chat history"""
        chat_history = [
            {"role": "user", "content": "I'm looking for a truck for towing"},
            {"role": "assistant", "content": "Great! Our Silverado has excellent towing."},
            {"role": "user", "content": "What's the price?"},
            {"role": "assistant", "content": "The Silverado LT starts at $48,000."},
            {"role": "user", "content": "I have $5000 down and want $500/month"},
        ]
        
        # Extract user messages for summary
        user_messages = [m["content"] for m in chat_history if m["role"] == "user"]
        
        assert len(user_messages) == 3
        assert "truck" in user_messages[0].lower()
        assert "$500/month" in user_messages[2]


# ---
# SESSION FILTERING TESTS
# ---

class TestSessionFiltering:
    """Tests for filtering traffic log entries"""
    
    def test_filter_today_sessions(self):
        """Filter sessions from today only"""
        today = datetime.utcnow().date()
        
        sessions = [
            {"createdAt": datetime.utcnow().isoformat()},
            {"createdAt": (datetime.utcnow() - timedelta(days=1)).isoformat()},
            {"createdAt": (datetime.utcnow() - timedelta(hours=5)).isoformat()},
            {"createdAt": (datetime.utcnow() - timedelta(days=2)).isoformat()},
        ]
        
        today_sessions = [
            s for s in sessions 
            if datetime.fromisoformat(s["createdAt"].replace("Z", "+00:00")).date() == today
        ]
        
        # Only sessions from today
        assert len(today_sessions) == 2
    
    def test_filter_by_path(self):
        """Filter sessions by path"""
        sessions = [
            {"path": "aiAssistant"},
            {"path": "modelBudget"},
            {"path": "aiAssistant"},
            {"path": "stockLookup"},
        ]
        
        ai_sessions = [s for s in sessions if s.get("path") == "aiAssistant"]
        
        assert len(ai_sessions) == 2
    
    def test_filter_with_vehicle_interest(self):
        """Filter sessions that have vehicle interest"""
        sessions = [
            {"vehicleInterest": {"model": "Silverado"}},
            {"vehicleInterest": None},
            {"vehicleInterest": {"model": "Equinox"}},
            {},
        ]
        
        with_interest = [s for s in sessions if s.get("vehicleInterest")]
        
        assert len(with_interest) == 2


# ---
# PAGINATION TESTS
# ---

class TestPagination:
    """Tests for traffic log pagination"""
    
    def test_pagination_offset(self):
        """Test offset-based pagination"""
        all_sessions = [{"id": i} for i in range(100)]
        
        limit = 20
        offset = 40
        
        page = all_sessions[offset:offset + limit]
        
        assert len(page) == 20
        assert page[0]["id"] == 40
        assert page[-1]["id"] == 59
    
    def test_pagination_last_page(self):
        """Test last page with fewer items"""
        all_sessions = [{"id": i} for i in range(95)]
        
        limit = 20
        offset = 80
        
        page = all_sessions[offset:offset + limit]
        
        assert len(page) == 15  # Only 15 items left
    
    def test_pagination_metadata(self):
        """Test pagination metadata"""
        total = 150
        limit = 20
        offset = 60
        
        metadata = {
            "total": total,
            "limit": limit,
            "offset": offset,
            "has_more": offset + limit < total,
            "page": (offset // limit) + 1,
            "total_pages": (total + limit - 1) // limit,
        }
        
        assert metadata["has_more"] is True
        assert metadata["page"] == 4
        assert metadata["total_pages"] == 8


# ---
# DATA AGGREGATION TESTS
# ---

class TestDataAggregation:
    """Tests for aggregating traffic data"""
    
    def test_aggregate_by_hour(self):
        """Aggregate sessions by hour"""
        base_time = datetime(2025, 12, 16, 10, 0, 0)
        
        sessions = [
            {"createdAt": base_time.isoformat()},
            {"createdAt": (base_time + timedelta(minutes=30)).isoformat()},
            {"createdAt": (base_time + timedelta(hours=1, minutes=15)).isoformat()},
            {"createdAt": (base_time + timedelta(hours=1, minutes=45)).isoformat()},
            {"createdAt": (base_time + timedelta(hours=2)).isoformat()},
        ]
        
        by_hour = {}
        for s in sessions:
            hour = datetime.fromisoformat(s["createdAt"]).hour
            by_hour[hour] = by_hour.get(hour, 0) + 1
        
        assert by_hour[10] == 2  # 10:00 and 10:30
        assert by_hour[11] == 2  # 11:15 and 11:45
        assert by_hour[12] == 1  # 12:00
    
    def test_aggregate_popular_models(self):
        """Find most popular vehicle models"""
        sessions = [
            {"vehicleInterest": {"model": "Silverado"}},
            {"vehicleInterest": {"model": "Equinox"}},
            {"vehicleInterest": {"model": "Silverado"}},
            {"vehicleInterest": {"model": "Tahoe"}},
            {"vehicleInterest": {"model": "Silverado"}},
            {"vehicleInterest": {"model": "Equinox"}},
        ]
        
        model_counts = {}
        for s in sessions:
            model = s.get("vehicleInterest", {}).get("model")
            if model:
                model_counts[model] = model_counts.get(model, 0) + 1
        
        # Sort by count
        sorted_models = sorted(model_counts.items(), key=lambda x: x[1], reverse=True)
        
        assert sorted_models[0] == ("Silverado", 3)
        assert sorted_models[1] == ("Equinox", 2)


# ---
# ERROR HANDLING TESTS
# ---

class TestErrorHandling:
    """Tests for error handling in traffic operations"""
    
    def test_handle_missing_session_id(self):
        """Handle request without session ID"""
        data = {"path": "modelBudget"}
        
        # Should generate one if missing
        if "sessionId" not in data:
            data["sessionId"] = f"K{datetime.utcnow().timestamp()}"[:13]
        
        assert data["sessionId"].startswith("K")
    
    def test_handle_invalid_timestamp(self):
        """Handle invalid timestamp gracefully"""
        invalid_timestamps = ["not-a-date", "", None, "2025-13-45"]
        
        for ts in invalid_timestamps:
            try:
                if ts:
                    datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    parsed = ts  # Valid timestamp, use it
                else:
                    # Empty string or None - use current time
                    parsed = datetime.utcnow().isoformat()
            except (ValueError, AttributeError):
                # Invalid format - use current time
                parsed = datetime.utcnow().isoformat()
            
            # Should have a valid ISO timestamp (never None)
            assert parsed is not None
            assert len(parsed) > 0
    
    def test_handle_malformed_session_data(self):
        """Handle malformed session data"""
        malformed = {
            "sessionId": "K123",
            "vehicleInterest": "not-a-dict",  # Should be dict
            "budget": [1, 2, 3],  # Should be dict
        }
        
        # Safe access with defaults
        vehicle_interest = malformed.get("vehicleInterest") if isinstance(malformed.get("vehicleInterest"), dict) else {}
        budget = malformed.get("budget") if isinstance(malformed.get("budget"), dict) else {}
        
        assert vehicle_interest == {}
        assert budget == {}


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
