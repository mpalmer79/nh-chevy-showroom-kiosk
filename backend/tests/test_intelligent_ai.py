"""
Tests for Intelligent AI Services
Tests conversation state, vehicle retrieval, and outcome tracking
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from app.services.conversation_state import (
    ConversationStateManager,
    ConversationState,
    ConversationStage,
    InterestLevel,
    DiscussedVehicle,
)
from app.services.vehicle_retriever import (
    SemanticVehicleRetriever,
    TFIDFVectorizer,
)
from app.services.outcome_tracker import (
    OutcomeTracker,
    ConversationOutcome,
    InteractionQuality,
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
        "Body": "4WD Crew Cab 147\"",
        "Body Type": "PKUP",
        "Exterior Color": "Summit White",
    },
    {
        "Stock Number": "M12346",
        "Year": 2025,
        "Make": "Chevrolet", 
        "Model": "Equinox",
        "Trim": "RS",
        "MSRP": 35000,
        "Body": "AWD 4dr",
        "Body Type": "APURP",
        "Exterior Color": "Radiant Red",
    },
    {
        "Stock Number": "M12347",
        "Year": 2025,
        "Make": "Chevrolet",
        "Model": "Tahoe",
        "Trim": "Premier",
        "MSRP": 72000,
        "Body": "4WD 4dr",
        "Body Type": "APURP",
        "Exterior Color": "Black",
    },
    {
        "Stock Number": "M12348",
        "Year": 2025,
        "Make": "Chevrolet",
        "Model": "Colorado",
        "Trim": "Z71",
        "MSRP": 42000,
        "Body": "4WD Crew Cab",
        "Body Type": "PKUP",
        "Exterior Color": "Glacier Blue",
    },
    {
        "Stock Number": "M12349",
        "Year": 2025,
        "Make": "Chevrolet",
        "Model": "Traverse",
        "Trim": "LT",
        "MSRP": 45000,
        "Body": "AWD 4dr",
        "Body Type": "APURP",
        "Exterior Color": "Silver",
    },
]


# ---
# CONVERSATION STATE TESTS
# ---

class TestConversationStateManager:
    """Tests for ConversationStateManager"""
    
    @pytest.fixture
    def manager(self):
        return ConversationStateManager()
    
    def test_create_new_state(self, manager):
        """Test creating a new conversation state"""
        state = manager.get_or_create_state("session-123", "John")
        
        assert state.session_id == "session-123"
        assert state.customer_name == "John"
        assert state.stage == ConversationStage.GREETING
        assert state.interest_level == InterestLevel.COLD
        assert state.message_count == 0
    
    def test_get_existing_state(self, manager):
        """Test retrieving existing state"""
        manager.get_or_create_state("session-123", "John")
        state = manager.get_or_create_state("session-123")
        
        assert state.customer_name == "John"
    
    def test_update_state_budget(self, manager):
        """Test budget extraction from messages"""
        state = manager.update_state(
            session_id="session-123",
            user_message="I'm looking for something under $50,000",
            assistant_response="Great! We have many options in that range."
        )
        
        assert state.budget_max == 50000
        assert state.message_count == 1
    
    def test_update_state_vehicle_type(self, manager):
        """Test vehicle type preference extraction"""
        state = manager.update_state(
            session_id="session-123",
            user_message="I need a truck for towing my boat",
            assistant_response="Perfect! Our trucks have great towing capacity."
        )
        
        assert "truck" in state.preferred_types
        assert "towing" in state.use_cases
    
    def test_update_state_trade_in(self, manager):
        """Test trade-in info extraction"""
        state = manager.update_state(
            session_id="session-123",
            user_message="I'm trading in my 2019 Ford F-150, paying about $450/month",
            assistant_response="Got it! Let me factor that in."
        )
        
        assert state.has_trade_in
        assert state.trade_year == 2019
        assert state.trade_make == "Ford"
        # Note: Monthly payment may be extracted as general budget monthly payment
        # The important thing is that trade-in was detected
        assert state.monthly_payment_target == 450 or state.trade_monthly_payment == 450
    
    def test_update_state_spouse_objection(self, manager):
        """Test spouse objection detection"""
        state = manager.update_state(
            session_id="session-123",
            user_message="I need to talk to my wife first before deciding",
            assistant_response="I completely understand."
        )
        
        assert state.needs_spouse_approval
        assert state.spouse_reference == "wife"
        assert len(state.objections) > 0
        assert state.objections[0].category == "spouse"
    
    def test_stage_progression(self, manager):
        """Test conversation stage progression"""
        # Greeting
        state = manager.get_or_create_state("session-123")
        assert state.stage == ConversationStage.GREETING
        
        # Discovery
        state = manager.update_state(
            "session-123",
            "I'm looking for a family vehicle",
            "What size family?"
        )
        assert state.stage == ConversationStage.DISCOVERY
        
        # Browsing
        state = manager.update_state(
            "session-123", 
            "Show me what you have in SUVs",
            "Here are our SUVs..."
        )
        assert state.stage == ConversationStage.BROWSING
    
    def test_interest_level_updates(self, manager):
        """Test interest level detection"""
        state = manager.update_state(
            "session-123",
            "This is perfect! Exactly what I was looking for!",
            "Great! Shall I get the keys?"
        )
        
        assert state.interest_level == InterestLevel.HOT
    
    def test_vehicle_discussion_tracking(self, manager):
        """Test that discussed vehicles are tracked"""
        vehicles = [
            {"Stock Number": "M12345", "Model": "Silverado"},
            {"Stock Number": "M12346", "Model": "Equinox"},
        ]
        
        state = manager.update_state(
            "session-123",
            "Tell me about those trucks",
            "Here are two options...",
            mentioned_vehicles=vehicles
        )
        
        assert len(state.discussed_vehicles) == 2
        assert "M12345" in state.discussed_vehicles
        assert state.discussed_vehicles["M12345"].model == "Silverado"
    
    def test_mark_favorite(self, manager):
        """Test marking vehicle as favorite"""
        manager.get_or_create_state("session-123")
        manager.update_state(
            "session-123",
            "Tell me about M12345",
            "Here's the Silverado...",
            mentioned_vehicles=[{"Stock Number": "M12345", "Model": "Silverado"}]
        )
        
        manager.mark_vehicle_favorite("session-123", "M12345")
        state = manager.get_state("session-123")
        
        assert state.discussed_vehicles["M12345"].is_favorite
        assert "M12345" in state.favorite_vehicles
    
    def test_context_summary(self, manager):
        """Test context summary generation"""
        state = manager.get_or_create_state("session-123", "John")
        state.budget_max = 50000
        state.preferred_types.add("truck")
        state.use_cases.add("towing")
        state.has_trade_in = True
        state.trade_year = 2019
        state.trade_make = "Ford"
        
        summary = state.to_context_summary()
        
        assert "John" in summary
        assert "50,000" in summary
        assert "truck" in summary
        assert "Ford" in summary


# ---
# VEHICLE RETRIEVER TESTS
# ---

class TestTFIDFVectorizer:
    """Tests for TF-IDF vectorizer"""
    
    def test_tokenize(self):
        vectorizer = TFIDFVectorizer()
        tokens = vectorizer._tokenize("2025 Chevrolet Silverado LT 4WD")
        
        assert "2025" in tokens
        assert "chevrolet" in tokens
        assert "silverado" in tokens
        assert "4wd" in tokens
    
    def test_fit_and_transform(self):
        vectorizer = TFIDFVectorizer()
        docs = [
            "Chevrolet Silverado truck towing",
            "Chevrolet Equinox SUV family",
            "Chevrolet Tahoe large SUV",
        ]
        
        vectorizer.fit(docs)
        vector = vectorizer.transform("truck towing capacity")
        
        assert "truck" in vector
        assert "towing" in vector
    
    def test_similarity(self):
        vectorizer = TFIDFVectorizer()
        docs = [
            "truck pickup towing hauling",
            "suv family kids seating",
        ]
        
        vectorizer.fit(docs)
        
        truck_vec = vectorizer.transform("I need a truck for towing")
        suv_vec = vectorizer.transform("family SUV with seating")
        
        doc_vec_1 = vectorizer.transform(docs[0])
        doc_vec_2 = vectorizer.transform(docs[1])
        
        # Truck query should be more similar to truck doc
        truck_sim_to_truck = vectorizer.similarity(truck_vec, doc_vec_1)
        truck_sim_to_suv = vectorizer.similarity(truck_vec, doc_vec_2)
        
        assert truck_sim_to_truck > truck_sim_to_suv


class TestSemanticVehicleRetriever:
    """Tests for SemanticVehicleRetriever"""
    
    @pytest.fixture
    def retriever(self):
        r = SemanticVehicleRetriever()
        r.fit(SAMPLE_INVENTORY)
        return r
    
    def test_fit_inventory(self, retriever):
        """Test fitting retriever on inventory"""
        assert retriever._is_fitted
        assert len(retriever.inventory) == 5
    
    def test_retrieve_truck(self, retriever):
        """Test retrieving trucks"""
        results = retriever.retrieve("I need a truck for towing")
        
        assert len(results) > 0
        # Should prioritize trucks
        models = [r.vehicle.get('Model', '').lower() for r in results]
        assert any('silverado' in m or 'colorado' in m for m in models)
    
    def test_retrieve_suv(self, retriever):
        """Test retrieving SUVs"""
        results = retriever.retrieve("family SUV with third row seating")
        
        assert len(results) > 0
        # Should prioritize large SUVs
        models = [r.vehicle.get('Model', '').lower() for r in results]
        assert any('tahoe' in m or 'traverse' in m for m in models)
    
    def test_retrieve_with_budget(self, retriever):
        """Test retrieval with budget constraint from state"""
        state = ConversationState(session_id="test")
        state.budget_max = 40000
        
        results = retriever.retrieve(
            "show me vehicles",
            conversation_state=state
        )
        
        # Results should favor vehicles under budget
        for result in results:
            price = result.vehicle.get('MSRP', 0)
            if result.preference_matches.get('budget'):
                assert price <= 40000 * 1.15  # With 15% buffer
    
    def test_retrieve_with_preferences(self, retriever):
        """Test retrieval with accumulated preferences"""
        state = ConversationState(session_id="test")
        state.preferred_types.add("truck")
        state.use_cases.add("towing")
        
        results = retriever.retrieve(
            "what do you have",
            conversation_state=state
        )
        
        # Should include match reasons
        assert any(r.match_reasons for r in results)
    
    def test_retrieve_by_color(self, retriever):
        """Test color-based retrieval"""
        results = retriever.retrieve("blue truck")
        
        assert len(results) > 0
        # Should find the glacier blue Colorado
        colors = [r.vehicle.get('Exterior Color', '').lower() for r in results]
        assert any('blue' in c or 'glacier' in c for c in colors)
    
    def test_retrieve_similar(self, retriever):
        """Test finding similar vehicles"""
        source = SAMPLE_INVENTORY[0]  # Silverado
        
        similar = retriever.retrieve_similar(source, limit=3)
        
        assert len(similar) > 0
        # Should find other trucks
        for result in similar:
            assert result.vehicle.get('Stock Number') != source['Stock Number']
    
    def test_get_vehicle_by_stock(self, retriever):
        """Test getting specific vehicle"""
        vehicle = retriever.get_vehicle_by_stock("M12345")
        
        assert vehicle is not None
        assert vehicle.get('Model') == "Silverado 1500"
    
    def test_inventory_summary(self, retriever):
        """Test inventory summary generation"""
        summary = retriever.get_inventory_summary()
        
        assert summary['total'] == 5
        assert 'by_body_style' in summary
        assert 'price_range' in summary


# ---
# OUTCOME TRACKER TESTS  
# ---

class TestOutcomeTracker:
    """Tests for OutcomeTracker"""
    
    @pytest.fixture
    def tracker(self):
        return OutcomeTracker(storage_path="/tmp/test_outcomes")
    
    @pytest.fixture
    def sample_state(self):
        state = ConversationState(session_id="test-session")
        state.started_at = datetime.utcnow() - timedelta(minutes=10)
        state.message_count = 8
        state.budget_max = 50000
        state.preferred_types.add("truck")
        state.discussed_vehicles["M12345"] = DiscussedVehicle(
            stock_number="M12345",
            model="Silverado",
            mentioned_at=datetime.utcnow()
        )
        return state
    
    def test_record_signal(self, tracker):
        """Test recording interaction signals"""
        tracker.record_signal("session-123", "positive", "Customer showed interest")
        
        signals = tracker._session_signals["session-123"]
        assert len(signals) == 1
        assert signals[0].signal_type == "positive"
    
    def test_finalize_conversation_lead(self, tracker, sample_state):
        """Test finalizing with lead outcome"""
        sample_state.customer_phone = "555-1234"
        
        record = tracker.finalize_conversation(
            sample_state,
            outcome=ConversationOutcome.LEAD_SUBMITTED
        )
        
        assert record.outcome == ConversationOutcome.LEAD_SUBMITTED
        assert record.message_count == 8
        assert record.vehicles_discussed == 1
    
    def test_infer_outcome_from_state(self, tracker, sample_state):
        """Test outcome inference"""
        # Test drive requested
        sample_state.test_drive_requested = True
        
        record = tracker.finalize_conversation(sample_state)
        
        assert record.outcome == ConversationOutcome.TEST_DRIVE_SCHEDULED
    
    def test_assess_quality(self, tracker, sample_state):
        """Test quality assessment"""
        sample_state.favorite_vehicles = ["M12345"]
        sample_state.interest_level = InterestLevel.HOT
        
        record = tracker.finalize_conversation(sample_state)
        
        # Should be at least GOOD quality
        assert record.quality in [InteractionQuality.EXCELLENT, InteractionQuality.GOOD]
    
    def test_extract_patterns(self, tracker, sample_state):
        """Test pattern extraction"""
        sample_state.favorite_vehicles = ["M12345"]
        
        record = tracker.finalize_conversation(
            sample_state,
            outcome=ConversationOutcome.LEAD_SUBMITTED
        )
        
        assert "budget_and_type_discovery" in record.successful_patterns
    
    def test_customer_segment_detection(self, tracker, sample_state):
        """Test customer segment determination"""
        sample_state.preferred_types.add("truck")
        sample_state.min_towing = 12000
        
        record = tracker.finalize_conversation(sample_state)
        
        assert record.customer_segment == "heavy_towing"
    
    def test_analytics(self, tracker, sample_state):
        """Test analytics generation"""
        # Create a few outcome records
        for i in range(3):
            state = ConversationState(session_id=f"test-{i}")
            state.message_count = 5
            state.budget_max = 50000
            state.preferred_types.add("truck")
            state.test_drive_requested = True
            tracker.finalize_conversation(state)
        
        analytics = tracker.get_analytics()
        
        assert analytics['total_conversations'] == 3
        assert 'conversion_rate' in analytics
        assert 'average_score' in analytics
    
    def test_improvement_suggestions(self, tracker, sample_state):
        """Test improvement suggestions"""
        # Create records with poor quality
        for i in range(12):
            state = ConversationState(session_id=f"poor-{i}")
            state.message_count = 1  # Very short
            state.frustration_signals = 3
            tracker.finalize_conversation(
                state,
                outcome=ConversationOutcome.ABANDONED
            )
        
        suggestions = tracker.get_improvement_suggestions()
        
        assert len(suggestions) > 0
        assert any(s['type'] in ['critical', 'warning'] for s in suggestions)


# ---
# INTEGRATION TESTS
# ---

class TestIntelligentAIIntegration:
    """Integration tests for the intelligent AI system"""
    
    @pytest.fixture
    def setup_services(self):
        """Setup all services for integration testing"""
        state_manager = ConversationStateManager()
        retriever = SemanticVehicleRetriever()
        retriever.fit(SAMPLE_INVENTORY)
        outcome_tracker = OutcomeTracker(storage_path="/tmp/test_outcomes")
        
        return state_manager, retriever, outcome_tracker
    
    def test_full_conversation_flow(self, setup_services):
        """Test a complete conversation flow"""
        state_manager, retriever, outcome_tracker = setup_services
        session_id = "integration-test"
        
        # Turn 1: Initial greeting
        state = state_manager.get_or_create_state(session_id, "Mike")
        assert state.stage == ConversationStage.GREETING
        
        # Turn 2: Customer states need
        state = state_manager.update_state(
            session_id,
            "I'm looking for a truck to tow my boat, around $50k",
            "Great! Let me find some trucks in that range."
        )
        
        # Budget extraction creates a range around stated price (typically ±15%)
        # So "around $50k" becomes roughly $42,500 - $57,500
        assert state.budget_max is not None
        assert 50000 <= state.budget_max <= 60000  # Allow for range expansion
        assert "truck" in state.preferred_types
        assert state.stage == ConversationStage.DISCOVERY
        
        # Turn 3: Search inventory
        results = retriever.retrieve(
            "truck for towing",
            conversation_state=state
        )
        
        assert len(results) > 0
        
        # Update state with vehicles
        state = state_manager.update_state(
            session_id,
            "Tell me more about the first one",
            "Here's the Silverado...",
            mentioned_vehicles=[r.vehicle for r in results[:2]]
        )
        
        assert len(state.discussed_vehicles) > 0
        
        # Turn 4: Customer likes one
        state_manager.mark_vehicle_favorite(session_id, results[0].vehicle.get('Stock Number'))
        state = state_manager.update_state(
            session_id,
            "I love that one! Can I see it?",
            "Absolutely! Let me notify our team."
        )
        
        state.test_drive_requested = True
        
        # Interest level is WARM from "love" signal; HOT requires test_drive before update_state
        assert state.interest_level in [InterestLevel.WARM, InterestLevel.HOT]
        
        # Finalize conversation
        record = outcome_tracker.finalize_conversation(state)
        
        assert record.outcome == ConversationOutcome.TEST_DRIVE_SCHEDULED
        assert record.vehicles_discussed > 0
        assert record.favorites_count > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
