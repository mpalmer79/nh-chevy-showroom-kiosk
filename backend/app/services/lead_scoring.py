"""
Lead Scoring Service
Calculates lead quality scores based on conversation signals and worksheet engagement.
Used by worksheet service and sales manager dashboard.

Scoring Overview
================
Each lead is scored on a 0-100 scale across five categories:

- **Engagement Signals** (0-25 pts): Message count and session duration.
- **Qualification Signals** (0-35 pts): Budget, down payment, trade-in info.
- **Contact Information** (0-20 pts): Phone, email, name captured.
- **Intent Signals** (0-20 pts): AI-detected interest level, test drive
  or appraisal requests, financing/warranty questions.
- **Worksheet Engagement** (0-20 bonus pts): Worksheet created, adjusted,
  or marked "I'm Ready".

Scores are capped at 100. They map to three tiers:

- **HOT** (70+): Approach immediately, customer is ready to deal.
- **WARM** (40-69): Follow up within 5 minutes, qualified buyer.
- **COLD** (0-39): Monitor, still in discovery phase.

The ``LeadScorer`` is instantiated as a singleton via ``get_lead_scorer()``.
It is stateless -- all scoring inputs are passed as arguments.
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, List, Any
from enum import Enum
import logging

logger = logging.getLogger("showroom_kiosk.ai.lead_scoring")


class LeadTier(str, Enum):
    """Lead quality tiers"""
    HOT = "hot"          # Immediate attention - ready to buy
    WARM = "warm"        # Follow up soon - qualified buyer
    COLD = "cold"        # Nurture - still in discovery


@dataclass
class LeadScore:
    """
    Complete lead score breakdown.

    Attributes:
        total: Composite score (0-100, capped).
        tier: Derived tier (HOT / WARM / COLD).
        factors: Dict mapping factor name -> points awarded. Only factors
                 that contributed points are included. Use
                 ``get_scoring_factors_description()`` for human-readable
                 descriptions.
        recommended_action: Human-readable action string for the dashboard.
        priority_rank: Rank among active leads (1 = highest). Assigned by
                       ``calculate_priority_rank()`` after scoring a batch.
    """
    total: int
    tier: LeadTier
    factors: Dict[str, int] = field(default_factory=dict)
    recommended_action: str = ""
    priority_rank: int = 0  # 1 = highest priority
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "total": self.total,
            "tier": self.tier.value,
            "factors": self.factors,
            "recommended_action": self.recommended_action,
            "priority_rank": self.priority_rank,
        }


class LeadScorer:
    """
    Calculates lead quality score based on conversation signals.
    
    Scoring Categories (max 100 points):
    - Engagement Signals: 0-25 points
    - Qualification Signals: 0-35 points  
    - Contact Information: 0-20 points
    - Intent Signals: 0-20 points
    - Worksheet Engagement: 0-20 bonus points
    
    Tiers:
    - HOT (70+): Immediate attention, ready to deal
    - WARM (40-69): Follow up within 5 minutes
    - COLD (0-39): Monitor, still in discovery
    """
    
    # Tier thresholds
    HOT_THRESHOLD = 70
    WARM_THRESHOLD = 40
    
    # Scoring weights -- each key maps to a point value.
    # Points within a category are additive (e.g., has_down_payment + strong_down_payment).
    # The total across all factors is capped at 100.
    WEIGHTS = {
        # --- Engagement signals (max ~25 pts) ---
        # Only ONE of high/medium/some engagement is awarded per lead.
        "high_engagement": 15,      # 15+ messages exchanged
        "medium_engagement": 10,    # 8-14 messages exchanged
        "some_engagement": 5,       # 3-7 messages exchanged
        "long_session": 10,         # Session lasted 10+ minutes
        "medium_session": 5,        # Session lasted 5-10 minutes
        "specific_vehicle_interest": 5,  # Asked about a specific vehicle

        # --- Qualification signals (max ~35 pts) ---
        "budget_qualified": 15,     # Revealed budget or monthly payment target
        "has_down_payment": 10,     # Any down payment mentioned
        "strong_down_payment": 10,  # $10k+ down payment (stacks with has_down_payment)
        "very_strong_down": 5,      # $20k+ down payment (stacks further)
        "has_trade": 10,            # Has a vehicle to trade in
        "knows_payoff": 5,          # Knows their trade payoff amount
        "trade_appraised": 5,       # Trade has been appraised (from worksheet)

        # --- Contact information (max 20 pts) ---
        "has_phone": 15,            # Phone number captured -- highest weight
        "has_email": 5,             # Email captured
        "has_name": 5,              # Customer name captured

        # --- Intent signals (max ~20 pts) ---
        # Only ONE of high/medium interest is awarded.
        "high_interest": 15,        # AI ConversationState.interest_level == HOT
        "medium_interest": 5,       # AI ConversationState.interest_level == WARM
        "test_drive_requested": 10, # Strong buying signal
        "appraisal_requested": 10,  # Ready to deal on trade-in
        "asked_about_financing": 5, # Mentioned financing/APR/loan keywords
        "asked_about_warranty": 5,  # Mentioned warranty/protection keywords

        # --- Worksheet engagement (bonus, max ~20 pts) ---
        "worksheet_created": 10,    # Digital Worksheet was created
        "worksheet_adjustments": 5, # Made 3+ adjustments to the worksheet
        "marked_ready": 20,         # Clicked "I'm Ready" -- strongest signal
        "in_negotiation": 15,       # Active negotiation with sales manager
    }
    
    def calculate_score(
        self,
        state: Optional[Any] = None,
        worksheet_data: Optional[Dict] = None,
        conversation_history: Optional[List[Dict]] = None,
    ) -> LeadScore:
        """
        Calculate comprehensive lead score from all available data sources.

        All three inputs are optional; the scorer extracts as much signal as
        possible from whatever is provided. When the same signal appears in
        multiple sources (e.g., down_payment in both ``state`` and
        ``worksheet_data``), it is only counted once.

        Args:
            state: ``ConversationState`` object (from conversation_state.py).
                   Provides engagement, qualification, contact, and intent
                   signals.
            worksheet_data: Dict with worksheet fields (from WorksheetService).
                   Provides down_payment, trade-in, status, and adjustments.
            conversation_history: List of ``{"role": "user"|"assistant",
                   "content": str}`` dicts. Used as a fallback for engagement
                   counting and keyword-based intent detection.

        Returns:
            ``LeadScore`` with total (0-100), tier, factors breakdown, and
            recommended action string.
        """
        factors: Dict[str, int] = {}
        
        # === ENGAGEMENT SIGNALS (max 25 points) ===
        if state:
            message_count = getattr(state, 'message_count', 0)
            if message_count >= 15:
                factors["high_engagement"] = self.WEIGHTS["high_engagement"]
            elif message_count >= 8:
                factors["medium_engagement"] = self.WEIGHTS["medium_engagement"]
            elif message_count >= 3:
                factors["some_engagement"] = self.WEIGHTS["some_engagement"]
            
            # Session duration
            session_duration = getattr(state, 'session_duration_seconds', 0)
            if session_duration:
                if session_duration > 600:  # 10+ minutes
                    factors["long_session"] = self.WEIGHTS["long_session"]
                elif session_duration > 300:  # 5+ minutes
                    factors["medium_session"] = self.WEIGHTS["medium_session"]
            
            # Specific vehicle interest
            vehicles_discussed = getattr(state, 'vehicles_discussed', [])
            if vehicles_discussed and len(vehicles_discussed) > 0:
                factors["specific_vehicle_interest"] = self.WEIGHTS["specific_vehicle_interest"]
        
        # Also check conversation history for engagement
        if conversation_history:
            user_messages = [m for m in conversation_history if m.get('role') == 'user']
            if len(user_messages) >= 15 and "high_engagement" not in factors:
                factors["high_engagement"] = self.WEIGHTS["high_engagement"]
            elif len(user_messages) >= 8 and "medium_engagement" not in factors:
                factors["medium_engagement"] = self.WEIGHTS["medium_engagement"]
        
        # === QUALIFICATION SIGNALS (max 35 points) ===
        if state:
            # Budget info
            budget_max = getattr(state, 'budget_max', None)
            monthly_target = getattr(state, 'monthly_payment_target', None)
            if budget_max or monthly_target:
                factors["budget_qualified"] = self.WEIGHTS["budget_qualified"]
            
            # Down payment
            down_payment = getattr(state, 'down_payment', 0) or 0
            if down_payment > 0:
                factors["has_down_payment"] = self.WEIGHTS["has_down_payment"]
                if down_payment >= 20000:
                    factors["very_strong_down"] = self.WEIGHTS["very_strong_down"]
                elif down_payment >= 10000:
                    factors["strong_down_payment"] = self.WEIGHTS["strong_down_payment"]
            
            # Trade-in
            trade_model = getattr(state, 'trade_model', None)
            if trade_model:
                factors["has_trade"] = self.WEIGHTS["has_trade"]
                
                trade_payoff = getattr(state, 'trade_payoff', None)
                if trade_payoff is not None:
                    factors["knows_payoff"] = self.WEIGHTS["knows_payoff"]
        
        # Check worksheet for qualification
        if worksheet_data:
            down = worksheet_data.get('down_payment', 0)
            if down > 0 and "has_down_payment" not in factors:
                factors["has_down_payment"] = self.WEIGHTS["has_down_payment"]
                if down >= 20000:
                    factors["very_strong_down"] = self.WEIGHTS["very_strong_down"]
                elif down >= 10000:
                    factors["strong_down_payment"] = self.WEIGHTS["strong_down_payment"]
            
            if worksheet_data.get('has_trade') and "has_trade" not in factors:
                factors["has_trade"] = self.WEIGHTS["has_trade"]
            
            # Trade appraised
            trade_in = worksheet_data.get('trade_in', {})
            if trade_in and trade_in.get('appraised_value'):
                factors["trade_appraised"] = self.WEIGHTS["trade_appraised"]
        
        # === CONTACT INFORMATION (max 20 points) ===
        if state:
            if getattr(state, 'customer_phone', None):
                factors["has_phone"] = self.WEIGHTS["has_phone"]
            if getattr(state, 'customer_email', None):
                factors["has_email"] = self.WEIGHTS["has_email"]
            if getattr(state, 'customer_name', None):
                factors["has_name"] = self.WEIGHTS["has_name"]
        
        # Check worksheet for contact info
        if worksheet_data:
            if worksheet_data.get('customer_phone') and "has_phone" not in factors:
                factors["has_phone"] = self.WEIGHTS["has_phone"]
            if worksheet_data.get('customer_email') and "has_email" not in factors:
                factors["has_email"] = self.WEIGHTS["has_email"]
            if worksheet_data.get('customer_name') and "has_name" not in factors:
                factors["has_name"] = self.WEIGHTS["has_name"]
        
        # === INTENT SIGNALS (max 20 points) ===
        if state:
            # Interest level from AI
            interest_level = getattr(state, 'interest_level', None)
            if interest_level:
                level_value = getattr(interest_level, 'value', str(interest_level))
                if level_value == "high":
                    factors["high_interest"] = self.WEIGHTS["high_interest"]
                elif level_value == "medium":
                    factors["medium_interest"] = self.WEIGHTS["medium_interest"]
            
            # Test drive requested
            if getattr(state, 'test_drive_requested', False):
                factors["test_drive_requested"] = self.WEIGHTS["test_drive_requested"]
            
            # Appraisal requested
            if getattr(state, 'appraisal_requested', False):
                factors["appraisal_requested"] = self.WEIGHTS["appraisal_requested"]
        
        # Check conversation for intent keywords
        if conversation_history:
            all_user_text = " ".join(
                m.get('content', '').lower() 
                for m in conversation_history 
                if m.get('role') == 'user'
            )
            
            financing_keywords = ['finance', 'financing', 'loan', 'credit', 'apr', 'rate', 'monthly payment']
            if any(kw in all_user_text for kw in financing_keywords):
                if "asked_about_financing" not in factors:
                    factors["asked_about_financing"] = self.WEIGHTS["asked_about_financing"]
            
            warranty_keywords = ['warranty', 'maintenance', 'coverage', 'protection']
            if any(kw in all_user_text for kw in warranty_keywords):
                if "asked_about_warranty" not in factors:
                    factors["asked_about_warranty"] = self.WEIGHTS["asked_about_warranty"]
        
        # === WORKSHEET ENGAGEMENT (bonus, up to 20 points) ===
        if worksheet_data:
            factors["worksheet_created"] = self.WEIGHTS["worksheet_created"]
            
            adjustments = worksheet_data.get('adjustments_made', 0)
            if adjustments >= 3:
                factors["worksheet_adjustments"] = self.WEIGHTS["worksheet_adjustments"]
            
            status = worksheet_data.get('status', '')
            if status == 'ready':
                factors["marked_ready"] = self.WEIGHTS["marked_ready"]
            elif status == 'negotiating':
                factors["in_negotiation"] = self.WEIGHTS["in_negotiation"]
        
        # Calculate total (capped at 100)
        total = min(100, sum(factors.values()))
        
        # Determine tier and action
        if total >= self.HOT_THRESHOLD:
            tier = LeadTier.HOT
            action = "🔥 Approach immediately - customer is ready to deal"
        elif total >= self.WARM_THRESHOLD:
            tier = LeadTier.WARM
            action = "⚡ Follow up within 5 minutes - qualified buyer"
        else:
            tier = LeadTier.COLD
            action = "👀 Monitor - customer still in discovery phase"
        
        return LeadScore(
            total=total,
            tier=tier,
            factors=factors,
            recommended_action=action,
        )
    
    def calculate_priority_rank(self, scores: List[LeadScore]) -> List[LeadScore]:
        """
        Assign priority ranks to a list of lead scores.
        
        Args:
            scores: List of LeadScore objects
            
        Returns:
            Same list with priority_rank assigned (1 = highest)
        """
        # Sort by total score descending
        sorted_scores = sorted(scores, key=lambda s: s.total, reverse=True)
        
        for rank, score in enumerate(sorted_scores, start=1):
            score.priority_rank = rank
        
        return sorted_scores
    
    def get_tier_summary(self, scores: List[LeadScore]) -> Dict[str, int]:
        """
        Get count of leads by tier.
        
        Args:
            scores: List of LeadScore objects
            
        Returns:
            Dict with tier counts
        """
        summary = {
            "hot": 0,
            "warm": 0,
            "cold": 0,
            "total": len(scores),
        }
        
        for score in scores:
            summary[score.tier.value] += 1
        
        return summary
    
    def get_scoring_factors_description(self) -> Dict[str, Dict]:
        """
        Return human-readable descriptions of scoring factors.
        Useful for dashboard tooltips.
        """
        return {
            "high_engagement": {
                "points": self.WEIGHTS["high_engagement"],
                "description": "15+ messages exchanged",
                "category": "Engagement"
            },
            "medium_engagement": {
                "points": self.WEIGHTS["medium_engagement"],
                "description": "8-14 messages exchanged",
                "category": "Engagement"
            },
            "some_engagement": {
                "points": self.WEIGHTS["some_engagement"],
                "description": "3-7 messages exchanged",
                "category": "Engagement"
            },
            "long_session": {
                "points": self.WEIGHTS["long_session"],
                "description": "Session over 10 minutes",
                "category": "Engagement"
            },
            "budget_qualified": {
                "points": self.WEIGHTS["budget_qualified"],
                "description": "Provided budget or payment target",
                "category": "Qualification"
            },
            "has_down_payment": {
                "points": self.WEIGHTS["has_down_payment"],
                "description": "Has down payment ready",
                "category": "Qualification"
            },
            "strong_down_payment": {
                "points": self.WEIGHTS["strong_down_payment"],
                "description": "$10,000+ down payment",
                "category": "Qualification"
            },
            "has_trade": {
                "points": self.WEIGHTS["has_trade"],
                "description": "Has vehicle to trade",
                "category": "Qualification"
            },
            "has_phone": {
                "points": self.WEIGHTS["has_phone"],
                "description": "Phone number captured",
                "category": "Contact"
            },
            "has_name": {
                "points": self.WEIGHTS["has_name"],
                "description": "Customer name captured",
                "category": "Contact"
            },
            "high_interest": {
                "points": self.WEIGHTS["high_interest"],
                "description": "AI detected high buying intent",
                "category": "Intent"
            },
            "test_drive_requested": {
                "points": self.WEIGHTS["test_drive_requested"],
                "description": "Requested test drive",
                "category": "Intent"
            },
            "marked_ready": {
                "points": self.WEIGHTS["marked_ready"],
                "description": "Clicked 'I'm Ready' on worksheet",
                "category": "Worksheet"
            },
            "worksheet_created": {
                "points": self.WEIGHTS["worksheet_created"],
                "description": "Digital worksheet created",
                "category": "Worksheet"
            },
        }


# Singleton instance
_scorer_instance: Optional[LeadScorer] = None


def get_lead_scorer() -> LeadScorer:
    """Get the singleton LeadScorer instance."""
    global _scorer_instance
    if _scorer_instance is None:
        _scorer_instance = LeadScorer()
    return _scorer_instance
