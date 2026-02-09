"""
Tests for Lead Scoring Service
"""

import pytest
from unittest.mock import MagicMock

from app.services.lead_scoring import (
    LeadScorer,
    LeadScore,
    LeadTier,
    get_lead_scorer,
)


def create_mock_state(**kwargs):
    """Helper to create a properly configured mock state"""
    state = MagicMock()
    
    # Set defaults for all attributes to avoid MagicMock comparison issues
    defaults = {
        'message_count': 0,
        'customer_phone': None,
        'customer_name': None,
        'customer_email': None,
        'down_payment': 0,
        'budget_max': None,
        'monthly_payment_target': None,
        'trade_model': None,
        'trade_payoff': None,
        'interest_level': None,
        'test_drive_requested': False,
        'appraisal_requested': False,
        'vehicles_discussed': [],
        'session_duration_seconds': 0,
    }
    
    # Apply defaults
    for key, value in defaults.items():
        setattr(state, key, value)
    
    # Override with provided values
    for key, value in kwargs.items():
        setattr(state, key, value)
    
    return state


class TestLeadScorer:
    """Tests for LeadScorer service"""
    
    @pytest.fixture
    def scorer(self):
        return LeadScorer()
    
    #
    # TIER CLASSIFICATION TESTS
    #
    
    def test_hot_lead_threshold(self, scorer):
        """Score 70+ should be HOT tier"""
        # Create mock with high interest level
        interest = MagicMock()
        interest.value = "high"
        
        state = create_mock_state(
            message_count=15,
            customer_phone="6175551234",
            customer_name="John",
            down_payment=15000,
            budget_max=50000,
            trade_model="Equinox",
            interest_level=interest,
            test_drive_requested=True,
        )
        
        result = scorer.calculate_score(state=state)
        
        assert result.tier == LeadTier.HOT
        assert result.total >= 70
        assert "🔥" in result.recommended_action
    
    def test_warm_lead_threshold(self, scorer):
        """Score 40-69 should be WARM tier"""
        state = create_mock_state(
            message_count=8,
            customer_phone="6175551234",
            down_payment=5000,
            budget_max=40000,  # Add budget to get more points
        )
        
        result = scorer.calculate_score(state=state)
        
        assert result.tier == LeadTier.WARM
        assert 40 <= result.total < 70
        assert "⚡" in result.recommended_action
    
    def test_cold_lead_threshold(self, scorer):
        """Score below 40 should be COLD tier"""
        state = create_mock_state(
            message_count=2,
        )
        
        result = scorer.calculate_score(state=state)
        
        assert result.tier == LeadTier.COLD
        assert result.total < 40
        assert "👀" in result.recommended_action
    
    #
    # ENGAGEMENT SCORING TESTS
    #
    
    def test_high_engagement_scoring(self, scorer):
        """15+ messages should give high engagement points"""
        state = create_mock_state(
            message_count=20,
        )
        
        result = scorer.calculate_score(state=state)
        
        assert "high_engagement" in result.factors
        assert result.factors["high_engagement"] == 15
    
    def test_session_duration_scoring(self, scorer):
        """Long sessions should add points"""
        state = create_mock_state(
            session_duration_seconds=700,  # 11+ minutes
        )
        
        result = scorer.calculate_score(state=state)
        
        assert "long_session" in result.factors
        assert result.factors["long_session"] == 10
    
    #
    # QUALIFICATION SCORING TESTS
    #
    
    def test_down_payment_tiers(self, scorer):
        """Different down payment levels should score differently"""
        # $5k down
        state1 = create_mock_state(
            down_payment=5000,
        )
        
        result1 = scorer.calculate_score(state=state1)
        
        # $15k down
        state2 = create_mock_state(
            down_payment=15000,
        )
        
        result2 = scorer.calculate_score(state=state2)
        
        assert "has_down_payment" in result1.factors
        assert "strong_down_payment" in result2.factors
        assert result2.total > result1.total
    
    def test_trade_in_scoring(self, scorer):
        """Trade-in with payoff knowledge should score higher"""
        # Trade without payoff
        state1 = create_mock_state(
            trade_model="Equinox",
        )
        
        result1 = scorer.calculate_score(state=state1)
        
        # Trade with payoff
        state2 = create_mock_state(
            trade_model="Equinox",
            trade_payoff=12000,
        )
        
        result2 = scorer.calculate_score(state=state2)
        
        assert "has_trade" in result1.factors
        assert "knows_payoff" in result2.factors
        assert result2.total > result1.total
    
    #
    # WORKSHEET SCORING TESTS
    #
    
    def test_worksheet_ready_bonus(self, scorer):
        """Marked ready should give big bonus"""
        worksheet_data = {
            "status": "ready",
            "down_payment": 5000,
            "adjustments_made": 5,
        }
        
        result = scorer.calculate_score(worksheet_data=worksheet_data)
        
        assert "marked_ready" in result.factors
        assert "worksheet_created" in result.factors
        assert result.factors["marked_ready"] == 20
    
    def test_worksheet_negotiating_bonus(self, scorer):
        """Negotiating status should add points"""
        worksheet_data = {
            "status": "negotiating",
            "down_payment": 10000,
        }
        
        result = scorer.calculate_score(worksheet_data=worksheet_data)
        
        assert "in_negotiation" in result.factors
        assert result.factors["in_negotiation"] == 15
    
    #
    # CONTACT INFO SCORING TESTS
    #
    
    def test_phone_is_most_valuable_contact(self, scorer):
        """Phone number should be worth more than email"""
        state = create_mock_state(
            customer_phone="6175551234",
            customer_email="test@example.com",
            customer_name="John",
        )
        
        result = scorer.calculate_score(state=state)
        
        assert result.factors.get("has_phone", 0) > result.factors.get("has_email", 0)
    
    #
    # CONVERSATION HISTORY TESTS
    #
    
    def test_financing_keywords_in_conversation(self, scorer):
        """Financing questions should add intent points"""
        conversation = [
            {"role": "user", "content": "What's my monthly payment?"},
            {"role": "assistant", "content": "Based on your budget..."},
            {"role": "user", "content": "What APR do you offer for financing?"},
        ]
        
        result = scorer.calculate_score(conversation_history=conversation)
        
        assert "asked_about_financing" in result.factors
    
    def test_warranty_keywords_in_conversation(self, scorer):
        """Warranty questions indicate serious buyer"""
        conversation = [
            {"role": "user", "content": "What warranty comes with the vehicle?"},
            {"role": "assistant", "content": "All new Chevrolets come with..."},
        ]
        
        result = scorer.calculate_score(conversation_history=conversation)
        
        assert "asked_about_warranty" in result.factors
    
    #
    # SCORE CAPPING TESTS
    #
    
    def test_score_capped_at_100(self, scorer):
        """Score should never exceed 100"""
        interest = MagicMock()
        interest.value = "high"
        
        state = create_mock_state(
            message_count=20,
            customer_phone="6175551234",
            customer_email="test@example.com",
            customer_name="John",
            down_payment=25000,
            budget_max=60000,
            monthly_payment_target=700,
            trade_model="Tahoe",
            trade_payoff=15000,
            interest_level=interest,
            test_drive_requested=True,
            appraisal_requested=True,
            vehicles_discussed=["Silverado"],
            session_duration_seconds=900,
        )
        
        worksheet_data = {
            "status": "ready",
            "down_payment": 25000,
            "adjustments_made": 10,
            "has_trade": True,
            "trade_in": {"appraised_value": 20000},
        }
        
        result = scorer.calculate_score(state=state, worksheet_data=worksheet_data)
        
        assert result.total <= 100
    
    #
    # PRIORITY RANKING TESTS
    #
    
    def test_priority_ranking(self, scorer):
        """Higher scores should get lower rank numbers"""
        scores = [
            LeadScore(total=45, tier=LeadTier.WARM, factors={}),
            LeadScore(total=85, tier=LeadTier.HOT, factors={}),
            LeadScore(total=30, tier=LeadTier.COLD, factors={}),
            LeadScore(total=72, tier=LeadTier.HOT, factors={}),
        ]
        
        ranked = scorer.calculate_priority_rank(scores)
        
        assert ranked[0].total == 85
        assert ranked[0].priority_rank == 1
        assert ranked[1].total == 72
        assert ranked[1].priority_rank == 2
        assert ranked[-1].total == 30
        assert ranked[-1].priority_rank == 4
    
    #
    # TIER SUMMARY TESTS
    #
    
    def test_tier_summary(self, scorer):
        """Should correctly count leads by tier"""
        scores = [
            LeadScore(total=85, tier=LeadTier.HOT, factors={}),
            LeadScore(total=75, tier=LeadTier.HOT, factors={}),
            LeadScore(total=55, tier=LeadTier.WARM, factors={}),
            LeadScore(total=25, tier=LeadTier.COLD, factors={}),
        ]
        
        summary = scorer.get_tier_summary(scores)
        
        assert summary["hot"] == 2
        assert summary["warm"] == 1
        assert summary["cold"] == 1
        assert summary["total"] == 4
    
    #
    # SINGLETON TESTS
    #
    
    def test_singleton(self):
        """Should return same instance"""
        scorer1 = get_lead_scorer()
        scorer2 = get_lead_scorer()
        
        assert scorer1 is scorer2
    
    #
    # SERIALIZATION TESTS
    #
    
    def test_lead_score_to_dict(self, scorer):
        """LeadScore should serialize properly"""
        state = create_mock_state(
            message_count=10,
            customer_phone="6175551234",
        )
        
        result = scorer.calculate_score(state=state)
        data = result.to_dict()
        
        assert "total" in data
        assert "tier" in data
        assert "factors" in data
        assert "recommended_action" in data
        assert isinstance(data["tier"], str)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
