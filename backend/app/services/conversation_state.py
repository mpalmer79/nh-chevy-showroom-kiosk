"""
Conversation State Manager
Maintains persistent state across conversation turns for intelligent context building.

Features:
- Entity accumulation (budget, preferences, trade-in info)
- Discussed vehicles tracking
- Conversation stage detection
- Objection history
- Interest signals for staff notification

State Lifecycle
===============
Every kiosk session creates one ``ConversationState`` object. The state is the
AI's "memory" of the conversation so far.

**Caching strategy** (two-tier, write-through):

- **L1 (in-memory dict)**: ``_sessions[session_id]``. Fast lookup, lost on
  restart.
- **L2 (Redis)**: ``conv:{session_id}`` key, 24-hour TTL. Survives restarts.
  Falls back gracefully to in-memory-only mode when Redis is unavailable.

On every ``update_state()`` call, the state is written to both L1 and L2.

**Stage transitions** (``ConversationStage``) progress forward through the
buying journey. They only advance forward (greeting -> discovery -> browsing
-> etc.) except for ``TRADE_IN`` and ``FINANCING`` which can occur at any point.

**Interest levels** (``InterestLevel``) can move in either direction:
COLD -> WARM -> HOT, or back to COOLING if objections arise. Interest is
automatically escalated to HOT when a test drive or appraisal is requested.

Phone number persistence
------------------------
When a customer provides their phone number, it is indexed in two places:

1. In-memory dict ``_phone_index[normalized_phone] -> session_id``
2. Redis key ``phone:{normalized_phone} -> session_id``

This allows returning customers to resume their conversation by entering their
phone number on a future visit.
"""

from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
import json
import logging
import os
from collections import defaultdict

from app.services.entity_extraction import (
    ConversationEntityExtractor,
    ExtractedEntities,
    get_entity_extractor
)
from app.core.cache import get_cache

logger = logging.getLogger("showroom_kiosk.ai.conversation_state")


class ConversationStage(str, Enum):
    """
    Tracks where the customer is in the buying journey.

    Stages are ordered from early (GREETING) to late (HANDOFF). The state
    manager only allows forward transitions, with two exceptions:
    ``TRADE_IN`` and ``FINANCING`` can be triggered at any point because
    customers mention those topics at unpredictable times.

    Transition map (forward only)::

        GREETING -> DISCOVERY -> BROWSING -> COMPARING -> DEEP_DIVE
                                    \\                        |
                                     +-- TRADE_IN --------+
                                     +-- FINANCING -------+
                                                           |
                                                       OBJECTION
                                                           |
                                                       COMMITMENT
                                                           |
                                                        HANDOFF

    Auto-transition: GREETING advances to DISCOVERY after the first
    substantive exchange (message_count > 1).
    """
    GREETING = "greeting"
    DISCOVERY = "discovery"           # Learning about needs
    BROWSING = "browsing"             # Looking at inventory
    COMPARING = "comparing"           # Comparing specific vehicles
    DEEP_DIVE = "deep_dive"           # Focused on 1-2 vehicles
    TRADE_IN = "trade_in"             # Discussing trade
    FINANCING = "financing"           # Payment/financing questions
    OBJECTION = "objection"           # Handling objections
    COMMITMENT = "commitment"         # Ready to move forward
    HANDOFF = "handoff"               # Ready for sales team


class InterestLevel(str, Enum):
    """
    Customer interest/engagement level.

    Levels move in both directions based on conversation signals:

    - **COLD** (default): Just browsing, no specific buying intent.
    - **WARM**: Discussing specific vehicles, asking pricing questions,
      or has 3+ discussed vehicles.
    - **HOT**: Discussing financing, test drive requested, appraisal
      requested, or using phrases like "I'll take it".
    - **COOLING**: Was interested but raising hesitations ("need to
      think about it", "maybe", "come back later").

    The AI system prompt receives the current interest level and adjusts
    its response strategy accordingly (e.g., more assertive for HOT leads,
    more exploratory for COLD leads).
    """
    COLD = "cold"                     # Just browsing
    WARM = "warm"                     # Showing interest
    HOT = "hot"                       # Ready to act
    COOLING = "cooling"               # Was interested, now hesitant


@dataclass
class DiscussedVehicle:
    """Tracks a vehicle that was discussed in conversation"""
    stock_number: str
    model: str
    mentioned_at: datetime
    times_mentioned: int = 1
    customer_sentiment: str = "neutral"  # positive, neutral, negative
    features_discussed: List[str] = field(default_factory=list)
    objections_raised: List[str] = field(default_factory=list)
    is_favorite: bool = False


@dataclass
class ObjectionRecord:
    """Records an objection raised by the customer"""
    category: str  # price, spouse, timing, features, competition
    text: str
    raised_at: datetime
    addressed: bool = False
    resolution: Optional[str] = None


@dataclass 
class ConversationState:
    """
    Complete conversation state - accumulated across all turns.
    This is what makes the AI "remember" and get smarter during conversation.
    """
    session_id: str
    started_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)
    
    # Customer identification
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    
    # Accumulated entities from all messages
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    monthly_payment_target: Optional[float] = None
    down_payment: Optional[float] = None
    
    # Vehicle preferences (accumulated)
    preferred_types: Set[str] = field(default_factory=set)
    preferred_features: Set[str] = field(default_factory=set)
    use_cases: Set[str] = field(default_factory=set)
    min_seating: Optional[int] = None
    min_towing: Optional[int] = None
    fuel_preference: Optional[str] = None
    drivetrain_preference: Optional[str] = None
    color_preferences: Set[str] = field(default_factory=set)
    
    # Trade-in information
    has_trade_in: bool = False
    trade_year: Optional[int] = None
    trade_make: Optional[str] = None
    trade_model: Optional[str] = None
    trade_mileage: Optional[int] = None
    trade_monthly_payment: Optional[float] = None
    trade_payoff: Optional[float] = None
    trade_lender: Optional[str] = None
    trade_is_lease: Optional[bool] = None
    trade_condition: Optional[str] = None
    
    # Conversation tracking
    stage: ConversationStage = ConversationStage.GREETING
    interest_level: InterestLevel = InterestLevel.COLD
    message_count: int = 0
    
    # Discussed vehicles
    discussed_vehicles: Dict[str, DiscussedVehicle] = field(default_factory=dict)
    favorite_vehicles: List[str] = field(default_factory=list)
    rejected_vehicles: List[str] = field(default_factory=list)
    
    # Objections
    objections: List[ObjectionRecord] = field(default_factory=list)
    needs_spouse_approval: bool = False
    spouse_reference: Optional[str] = None
    
    # Staff notification tracking
    staff_notified: bool = False
    staff_notification_type: Optional[str] = None
    test_drive_requested: bool = False
    appraisal_requested: bool = False
    
    # Sentiment tracking
    overall_sentiment: str = "neutral"
    frustration_signals: int = 0
    excitement_signals: int = 0
    
    # Key moments
    key_moments: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "session_id": self.session_id,
            "started_at": self.started_at.isoformat(),
            "last_activity": self.last_activity.isoformat(),
            "customer_name": self.customer_name,
            "customer_phone": self.customer_phone,
            "budget": {
                "min": self.budget_min,
                "max": self.budget_max,
                "monthly_target": self.monthly_payment_target,
                "down_payment": self.down_payment,
            },
            "preferences": {
                "types": list(self.preferred_types),
                "features": list(self.preferred_features),
                "use_cases": list(self.use_cases),
                "min_seating": self.min_seating,
                "min_towing": self.min_towing,
                "fuel": self.fuel_preference,
                "drivetrain": self.drivetrain_preference,
                "colors": list(self.color_preferences),
            },
            "trade_in": {
                "has_trade": self.has_trade_in,
                "year": self.trade_year,
                "make": self.trade_make,
                "model": self.trade_model,
                "mileage": self.trade_mileage,
                "monthly_payment": self.trade_monthly_payment,
                "payoff": self.trade_payoff,
                "lender": self.trade_lender,
                "is_lease": self.trade_is_lease,
            },
            "stage": self.stage.value,
            "interest_level": self.interest_level.value,
            "message_count": self.message_count,
            "discussed_vehicles": {
                k: {
                    "stock_number": v.stock_number,
                    "model": v.model,
                    "times_mentioned": v.times_mentioned,
                    "sentiment": v.customer_sentiment,
                    "is_favorite": v.is_favorite,
                }
                for k, v in self.discussed_vehicles.items()
            },
            "favorite_vehicles": self.favorite_vehicles,
            "objections": [
                {"category": o.category, "addressed": o.addressed}
                for o in self.objections
            ],
            "needs_spouse_approval": self.needs_spouse_approval,
            "overall_sentiment": self.overall_sentiment,
            "staff_notified": self.staff_notified,
            "test_drive_requested": self.test_drive_requested,
        }
    
    def to_context_summary(self) -> str:
        """Generate a natural language summary for the AI prompt"""
        parts = []
        
        # Customer info
        if self.customer_name:
            parts.append(f"Customer name: {self.customer_name}")
        
        # Stage and interest
        parts.append(f"Conversation stage: {self.stage.value}")
        parts.append(f"Interest level: {self.interest_level.value}")
        
        # Budget
        if self.budget_max:
            if self.budget_min:
                parts.append(f"Budget: ${self.budget_min:,.0f} - ${self.budget_max:,.0f}")
            else:
                parts.append(f"Budget: up to ${self.budget_max:,.0f}")
        if self.monthly_payment_target:
            parts.append(f"Target monthly payment: ${self.monthly_payment_target:,.0f}")
        
        # Preferences
        if self.preferred_types:
            parts.append(f"Looking for: {', '.join(self.preferred_types)}")
        if self.use_cases:
            parts.append(f"Primary use: {', '.join(self.use_cases)}")
        if self.preferred_features:
            parts.append(f"Must-have features: {', '.join(list(self.preferred_features)[:5])}")
        if self.min_seating:
            parts.append(f"Needs seating for: {self.min_seating}+ people")
        if self.min_towing:
            parts.append(f"Needs to tow: {self.min_towing:,}+ lbs")
        
        # Trade-in
        if self.has_trade_in:
            trade_desc = "Has a trade-in"
            if self.trade_year and self.trade_make:
                trade_desc = f"Trading in: {self.trade_year} {self.trade_make} {self.trade_model or ''}"
            if self.trade_monthly_payment:
                trade_desc += f" (currently paying ${self.trade_monthly_payment:,.0f}/mo)"
            if self.trade_payoff:
                trade_desc += f" (payoff: ${self.trade_payoff:,.0f})"
            parts.append(trade_desc)
        
        # Discussed vehicles
        if self.discussed_vehicles:
            favorites = [v for v in self.discussed_vehicles.values() if v.is_favorite]
            if favorites:
                parts.append(f"Favorite vehicles: {', '.join(v.model for v in favorites)}")
            else:
                recent = sorted(self.discussed_vehicles.values(), 
                              key=lambda x: x.times_mentioned, reverse=True)[:3]
                parts.append(f"Vehicles discussed: {', '.join(v.model for v in recent)}")
        
        # Objections
        unaddressed = [o for o in self.objections if not o.addressed]
        if unaddressed:
            parts.append(f"Unaddressed concerns: {', '.join(o.category for o in unaddressed)}")
        
        if self.needs_spouse_approval:
            ref = self.spouse_reference or "spouse"
            parts.append(f"Needs to consult with {ref} before deciding")
        
        # Sentiment
        if self.frustration_signals > 2:
            parts.append("Customer showing signs of frustration")
        elif self.excitement_signals > 2:
            parts.append("Customer showing strong interest/excitement")
        
        return "\n".join(parts)


class ConversationStateManager:
    """
    Manages conversation state across turns.
    Updates state based on new messages and extracted entities.

    This is the central memory system for the AI assistant. It:

    1. **Creates** new ``ConversationState`` objects for new sessions.
    2. **Loads** existing state from L1 (in-memory) or L2 (Redis) cache.
    3. **Updates** state after each message exchange by extracting entities,
       detecting stage transitions, and tracking interest/sentiment.
    4. **Persists** state changes to both L1 and L2 (write-through).
    5. **Indexes** sessions by phone number for returning customer lookup.

    The state manager is instantiated as a module-level singleton via
    ``get_state_manager()``.
    """
    
    # Stage transition triggers
    STAGE_KEYWORDS = {
        ConversationStage.DISCOVERY: ['looking for', 'need', 'want', 'help me find'],
        ConversationStage.BROWSING: ['show me', 'what do you have', 'inventory', 'browse'],
        ConversationStage.COMPARING: ['compare', 'difference', 'versus', 'vs', 'or the'],
        ConversationStage.DEEP_DIVE: ['tell me more', 'features', 'specs', 'this one'],
        ConversationStage.TRADE_IN: ['trade', 'current car', 'trading in', 'my car'],
        ConversationStage.FINANCING: ['payment', 'finance', 'lease', 'monthly', 'afford'],
        ConversationStage.COMMITMENT: ['ready', 'let\'s do it', 'i\'ll take', 'buy', 'purchase'],
    }
    
    INTEREST_SIGNALS = {
        'hot': ['love it', 'perfect', 'exactly what', 'this is the one', 'ready to', 'let\'s do'],
        'warm': ['like', 'interested', 'looks good', 'nice', 'could work', 'tell me more'],
        'cooling': ['not sure', 'maybe', 'think about it', 'come back', 'need to'],
    }
    
    FRUSTRATION_SIGNALS = [
        'frustrated', 'annoying', 'waste', 'terrible', 'horrible', 
        'not helpful', 'don\'t understand', 'already told you'
    ]
    
    EXCITEMENT_SIGNALS = [
        'wow', 'amazing', 'love', 'perfect', 'exactly', 'awesome', 
        'great', 'fantastic', 'beautiful', 'incredible'
    ]
    
    # Redis key prefixes and TTL
    CONV_KEY_PREFIX = "conv:"
    PHONE_KEY_PREFIX = "phone:"
    STATE_TTL = 86400  # 24 hours

    def __init__(self):
        self.extractor = get_entity_extractor()
        self._sessions: Dict[str, ConversationState] = {}
        self._phone_index: Dict[str, str] = {}  # phone -> session_id mapping

    async def persist_state(self, state: ConversationState) -> bool:
        """
        Persist conversation state to Redis (L2 cache).

        Serializes state using to_dict() and stores with 24-hour TTL.
        Also stores phone -> session_id mapping if phone is available.

        Returns True on success, False on failure.
        """
        try:
            cache = await get_cache()
            state_data = state.to_dict()
            key = f"{self.CONV_KEY_PREFIX}{state.session_id}"
            await cache.set(key, state_data, ttl=self.STATE_TTL)

            # Store phone -> session_id mapping if phone is available
            if state.customer_phone:
                phone_key = f"{self.PHONE_KEY_PREFIX}{state.customer_phone}"
                await cache.set(phone_key, state.session_id, ttl=self.STATE_TTL)

            return True
        except Exception as e:
            logger.warning(f"Failed to persist state to cache for session {state.session_id}: {e}")
            return False

    async def load_state(self, session_id: str) -> Optional[ConversationState]:
        """
        Load conversation state from Redis (L2 cache).

        Checks cache for key conv:{session_id} and deserializes.
        Returns ConversationState or None.
        """
        try:
            cache = await get_cache()
            key = f"{self.CONV_KEY_PREFIX}{session_id}"
            data = await cache.get(key)

            if not data:
                return None

            # Reconstruct ConversationState from dict
            state = ConversationState(session_id=data.get('session_id', session_id))
            state.customer_name = data.get('customer_name')
            state.customer_phone = data.get('customer_phone')
            state.customer_email = data.get('customer_email')

            # Restore timestamps
            started = data.get('started_at')
            if started:
                try:
                    state.started_at = datetime.fromisoformat(started)
                except (ValueError, TypeError):
                    pass
            last_activity = data.get('last_activity')
            if last_activity:
                try:
                    state.last_activity = datetime.fromisoformat(last_activity)
                except (ValueError, TypeError):
                    pass

            # Restore budget
            budget = data.get('budget', {})
            state.budget_min = budget.get('min')
            state.budget_max = budget.get('max')
            state.monthly_payment_target = budget.get('monthly_target')
            state.down_payment = budget.get('down_payment')

            # Restore preferences
            prefs = data.get('preferences', {})
            state.preferred_types = set(prefs.get('types', []))
            state.preferred_features = set(prefs.get('features', []))
            state.use_cases = set(prefs.get('use_cases', []))
            state.min_seating = prefs.get('min_seating')
            state.min_towing = prefs.get('min_towing')
            state.fuel_preference = prefs.get('fuel')
            state.drivetrain_preference = prefs.get('drivetrain')
            state.color_preferences = set(prefs.get('colors', []))

            # Restore trade-in
            trade = data.get('trade_in', {})
            state.has_trade_in = trade.get('has_trade', False)
            state.trade_year = trade.get('year')
            state.trade_make = trade.get('make')
            state.trade_model = trade.get('model')
            state.trade_mileage = trade.get('mileage')
            state.trade_monthly_payment = trade.get('monthly_payment')
            state.trade_payoff = trade.get('payoff')
            state.trade_lender = trade.get('lender')
            if trade.get('is_lease') is not None:
                state.trade_is_lease = trade.get('is_lease')

            # Restore conversation state
            stage_value = data.get('stage', 'greeting')
            try:
                state.stage = ConversationStage(stage_value)
            except ValueError:
                state.stage = ConversationStage.GREETING

            interest_value = data.get('interest_level', 'cold')
            try:
                state.interest_level = InterestLevel(interest_value)
            except ValueError:
                state.interest_level = InterestLevel.COLD

            state.message_count = data.get('message_count', 0)
            state.favorite_vehicles = data.get('favorite_vehicles', [])
            state.needs_spouse_approval = data.get('needs_spouse_approval', False)
            state.staff_notified = data.get('staff_notified', False)
            state.test_drive_requested = data.get('test_drive_requested', False)
            state.overall_sentiment = data.get('overall_sentiment', 'neutral')

            # Restore discussed vehicles
            discussed = data.get('discussed_vehicles', {})
            for stock, vdata in discussed.items():
                state.discussed_vehicles[stock] = DiscussedVehicle(
                    stock_number=vdata.get('stock_number', stock),
                    model=vdata.get('model', 'Unknown'),
                    mentioned_at=datetime.utcnow(),
                    times_mentioned=vdata.get('times_mentioned', 1),
                    customer_sentiment=vdata.get('sentiment', 'neutral'),
                    is_favorite=vdata.get('is_favorite', False),
                )

            logger.info(f"Loaded state from cache for session {session_id}")
            return state

        except Exception as e:
            logger.warning(f"Failed to load state from cache for session {session_id}: {e}")
            return None

    async def get_or_create_state(
        self,
        session_id: str,
        customer_name: Optional[str] = None
    ) -> ConversationState:
        """Get existing state or create new one for session.

        Checks L1 (in-memory) first, then L2 (Redis), then creates new.
        """
        # Check L1 (in-memory)
        if session_id in self._sessions:
            state = self._sessions[session_id]
            if customer_name and not state.customer_name:
                state.customer_name = customer_name
            return state

        # Check L2 (Redis/cache)
        loaded = await self.load_state(session_id)
        if loaded:
            self._sessions[session_id] = loaded
            if customer_name and not loaded.customer_name:
                loaded.customer_name = customer_name
            return loaded

        # Create new
        state = ConversationState(
            session_id=session_id,
            customer_name=customer_name
        )
        self._sessions[session_id] = state
        logger.info(f"Created new conversation state for session {session_id}")

        return state
    
    async def update_state(
        self,
        session_id: str,
        user_message: str,
        assistant_response: str,
        mentioned_vehicles: Optional[List[Dict[str, Any]]] = None,
        customer_name: Optional[str] = None
    ) -> ConversationState:
        """
        Update conversation state based on new message exchange.

        Args:
            session_id: Session identifier
            user_message: The customer's message
            assistant_response: The AI's response
            mentioned_vehicles: Vehicles mentioned in the response
            customer_name: Customer's name if known

        Returns:
            Updated ConversationState
        """
        state = await self.get_or_create_state(session_id, customer_name)
        state.last_activity = datetime.utcnow()
        state.message_count += 1
        
        # Extract entities from user message
        entities = self.extractor.extract_all(user_message)
        
        # Update budget info
        if entities.budget.has_budget_constraint:
            if entities.budget.max_price:
                state.budget_max = entities.budget.max_price
            if entities.budget.min_price:
                state.budget_min = entities.budget.min_price
            if entities.budget.monthly_payment:
                state.monthly_payment_target = entities.budget.monthly_payment
            if entities.budget.down_payment:
                state.down_payment = entities.budget.down_payment
        
        # Update preferences
        for vtype in entities.preferences.vehicle_types:
            state.preferred_types.add(vtype)
        for feature in entities.preferences.must_have_features:
            state.preferred_features.add(feature)
        for use_case in entities.preferences.use_cases:
            state.use_cases.add(use_case)
        
        if entities.preferences.min_seating:
            state.min_seating = max(state.min_seating or 0, entities.preferences.min_seating)
        if entities.preferences.min_towing:
            state.min_towing = max(state.min_towing or 0, entities.preferences.min_towing)
        if entities.preferences.fuel_preference:
            state.fuel_preference = entities.preferences.fuel_preference
        if entities.preferences.drivetrain_preference:
            state.drivetrain_preference = entities.preferences.drivetrain_preference
        
        # Update trade-in info
        if entities.trade_in.mentioned:
            state.has_trade_in = True
            if entities.trade_in.year:
                state.trade_year = entities.trade_in.year
            if entities.trade_in.make:
                state.trade_make = entities.trade_in.make
            if entities.trade_in.model:
                state.trade_model = entities.trade_in.model
            if entities.trade_in.mileage:
                state.trade_mileage = entities.trade_in.mileage
            if entities.trade_in.monthly_payment:
                state.trade_monthly_payment = entities.trade_in.monthly_payment
            if entities.trade_in.payoff_amount:
                state.trade_payoff = entities.trade_in.payoff_amount
            if entities.trade_in.lender:
                state.trade_lender = entities.trade_in.lender
            if entities.trade_in.is_lease is not None:
                state.trade_is_lease = entities.trade_in.is_lease
        
        # Update objection tracking
        if entities.context.needs_spouse_approval:
            state.needs_spouse_approval = True
            state.spouse_reference = entities.context.spouse_reference
            
            # Record as objection if not already recorded
            if not any(o.category == 'spouse' for o in state.objections):
                state.objections.append(ObjectionRecord(
                    category='spouse',
                    text=user_message,
                    raised_at=datetime.utcnow()
                ))
        
        # Update discussed vehicles
        if mentioned_vehicles:
            for vehicle in mentioned_vehicles:
                stock = vehicle.get('Stock Number') or vehicle.get('stockNumber', '')
                if stock:
                    if stock in state.discussed_vehicles:
                        state.discussed_vehicles[stock].times_mentioned += 1
                        state.discussed_vehicles[stock].mentioned_at = datetime.utcnow()
                    else:
                        state.discussed_vehicles[stock] = DiscussedVehicle(
                            stock_number=stock,
                            model=vehicle.get('Model') or vehicle.get('model', 'Unknown'),
                            mentioned_at=datetime.utcnow()
                        )
        
        # Update stage
        self._update_stage(state, user_message)
        
        # Update interest level
        self._update_interest_level(state, user_message)
        
        # Update sentiment
        self._update_sentiment(state, user_message)
        
        # Record key moments
        self._record_key_moments(state, user_message, entities)
        
        logger.debug(f"Updated state for {session_id}: stage={state.stage}, interest={state.interest_level}")

        # Write-through to L2 (Redis/cache)
        await self.persist_state(state)

        return state

    def _update_stage(self, state: ConversationState, message: str) -> None:
        """
        Update conversation stage based on message content.

        Scans the user message for keywords associated with each stage
        (defined in ``STAGE_KEYWORDS``). Stages only advance forward
        (higher ordinal) except TRADE_IN and FINANCING which can trigger
        at any time. After the first substantive exchange, auto-advances
        from GREETING to DISCOVERY.
        """
        message_lower = message.lower()
        
        # Check for stage transition triggers
        for stage, keywords in self.STAGE_KEYWORDS.items():
            if any(kw in message_lower for kw in keywords):
                # Only advance stage, don't go backwards (with exceptions)
                current_order = list(ConversationStage).index(state.stage)
                new_order = list(ConversationStage).index(stage)
                
                if new_order > current_order:
                    state.stage = stage
                    logger.debug(f"Stage advanced to {stage}")
                elif stage in [ConversationStage.TRADE_IN, ConversationStage.FINANCING]:
                    # These can happen at any time
                    state.stage = stage
                break
        
        # Auto-advance from greeting after first substantive exchange
        if state.stage == ConversationStage.GREETING and state.message_count > 1:
            state.stage = ConversationStage.DISCOVERY
    
    def _update_interest_level(self, state: ConversationState, message: str) -> None:
        """
        Update customer interest level based on conversational signals.

        Checks the message against keyword lists in ``INTEREST_SIGNALS``.
        Also auto-escalates based on behavior:
        - 3+ discussed vehicles and currently COLD -> WARM
        - Test drive or appraisal requested -> HOT
        """
        message_lower = message.lower()
        
        for level, signals in self.INTEREST_SIGNALS.items():
            if any(signal in message_lower for signal in signals):
                state.interest_level = InterestLevel(level)
                break
        
        # Escalate based on behavior
        if len(state.discussed_vehicles) >= 3 and state.interest_level == InterestLevel.COLD:
            state.interest_level = InterestLevel.WARM
        
        if state.test_drive_requested or state.appraisal_requested:
            state.interest_level = InterestLevel.HOT
    
    def _update_sentiment(self, state: ConversationState, message: str) -> None:
        """
        Update sentiment tracking based on frustration and excitement signals.

        Increments frustration or excitement counters when matching keywords
        are found. After 2+ signals in a direction, updates
        ``overall_sentiment`` to 'frustrated'/'concerned' or
        'excited'/'positive'. This information is included in the AI's system
        prompt to guide tone and approach.
        """
        message_lower = message.lower()
        
        if any(word in message_lower for word in self.FRUSTRATION_SIGNALS):
            state.frustration_signals += 1
            state.overall_sentiment = 'frustrated' if state.frustration_signals > 2 else 'concerned'
        elif any(word in message_lower for word in self.EXCITEMENT_SIGNALS):
            state.excitement_signals += 1
            state.overall_sentiment = 'excited' if state.excitement_signals > 2 else 'positive'
    
    def _record_key_moments(
        self,
        state: ConversationState,
        message: str,
        entities: ExtractedEntities
    ) -> None:
        """
        Record significant moments in the conversation.

        Key moments are "firsts" -- the first time a budget is revealed, a
        trade-in is mentioned, a spouse objection surfaces, or a test drive
        is requested. Each moment is timestamped and includes the message
        number for analytics and outcome tracking.
        """
        moment = None
        
        if entities.budget.has_budget_constraint and not state.budget_max:
            moment = {"type": "budget_revealed", "value": entities.budget.max_price}
        elif entities.trade_in.mentioned and not state.has_trade_in:
            moment = {"type": "trade_in_mentioned"}
        elif entities.context.needs_spouse_approval and not state.needs_spouse_approval:
            moment = {"type": "spouse_objection", "reference": entities.context.spouse_reference}
        elif 'test drive' in message.lower():
            moment = {"type": "test_drive_interest"}
            state.test_drive_requested = True
        
        if moment:
            moment["timestamp"] = datetime.utcnow().isoformat()
            moment["message_number"] = state.message_count
            state.key_moments.append(moment)
    
    def mark_vehicle_favorite(self, session_id: str, stock_number: str) -> None:
        """
        Mark a vehicle as a customer favorite.

        Sets the ``is_favorite`` flag on the DiscussedVehicle record and adds
        the stock number to the session's ``favorite_vehicles`` list. Favorites
        are boosted 1.5x in future search relevance scoring.
        """
        state = self._sessions.get(session_id)
        if state and stock_number in state.discussed_vehicles:
            state.discussed_vehicles[stock_number].is_favorite = True
            if stock_number not in state.favorite_vehicles:
                state.favorite_vehicles.append(stock_number)
    
    def mark_vehicle_rejected(self, session_id: str, stock_number: str, reason: str) -> None:
        """
        Mark a vehicle as rejected with a reason.

        Sets the customer_sentiment to 'negative' on the DiscussedVehicle
        record and appends the reason to its objections_raised list. Adds the
        stock number to ``rejected_vehicles`` so the SemanticVehicleRetriever
        penalizes it 0.3x in future search scoring.
        """
        state = self._sessions.get(session_id)
        if state:
            if stock_number in state.discussed_vehicles:
                state.discussed_vehicles[stock_number].customer_sentiment = 'negative'
                state.discussed_vehicles[stock_number].objections_raised.append(reason)
            if stock_number not in state.rejected_vehicles:
                state.rejected_vehicles.append(stock_number)
    
    def record_objection(
        self,
        session_id: str,
        category: str,
        text: str
    ) -> None:
        """
        Record a customer objection.

        Objection categories include: 'price', 'spouse', 'timing', 'features',
        'competition'. Objections are tracked so the AI can address them
        systematically and avoid re-raising resolved concerns.

        Args:
            session_id: Session identifier.
            category: Objection category (e.g., 'price', 'spouse').
            text: The customer's actual message containing the objection.
        """
        state = self._sessions.get(session_id)
        if state:
            state.objections.append(ObjectionRecord(
                category=category,
                text=text,
                raised_at=datetime.utcnow()
            ))
    
    def mark_objection_addressed(
        self,
        session_id: str,
        category: str,
        resolution: str
    ) -> None:
        """
        Mark an objection as addressed.

        Finds the first unaddressed objection matching the given category and
        marks it resolved. The resolution text is stored for reference (e.g.,
        "offered $1,000 discount", "scheduled spouse visit").

        Args:
            session_id: Session identifier.
            category: Objection category to resolve.
            resolution: Description of how the objection was resolved.
        """
        state = self._sessions.get(session_id)
        if state:
            for objection in state.objections:
                if objection.category == category and not objection.addressed:
                    objection.addressed = True
                    objection.resolution = resolution
                    break
    
    def get_state(self, session_id: str) -> Optional[ConversationState]:
        """
        Get state for a session from the L1 (in-memory) cache.

        Returns None if the session is not in memory. Does NOT check Redis.
        Use ``get_or_create_state()`` for L1+L2 lookup.
        """
        return self._sessions.get(session_id)
    
    def set_customer_phone(self, session_id: str, phone: str) -> None:
        """
        Set customer phone for a session and index it for future lookup.

        Normalizes the phone number to 10 digits and stores a
        ``phone -> session_id`` mapping in the in-memory index. The phone
        mapping is also persisted to Redis in ``persist_state()``.

        Args:
            session_id: Session identifier.
            phone: Customer phone number (any format, normalized to digits).
        """
        state = self._sessions.get(session_id)
        if state:
            # Normalize phone number (digits only)
            normalized = ''.join(c for c in phone if c.isdigit())
            if len(normalized) == 10:
                state.customer_phone = normalized
                # Also store in phone index for quick lookup
                self._phone_index[normalized] = session_id
                logger.info(f"Indexed session {session_id} by phone {normalized[-4:]}")
    
    async def get_state_by_phone(self, phone: str) -> Optional[ConversationState]:
        """
        Look up a conversation state by phone number.
        Returns the most recent conversation for that phone.
        Checks L1 (in-memory), then L2 (Redis), then disk persistence.
        """
        # Normalize phone number
        normalized = ''.join(c for c in phone if c.isdigit())

        if len(normalized) != 10:
            logger.warning(f"Invalid phone number format: {phone}")
            return None

        # Check in-memory index first (L1)
        if normalized in self._phone_index:
            session_id = self._phone_index[normalized]
            if session_id in self._sessions:
                return self._sessions[session_id]

        # Search all in-memory sessions for this phone
        matching_sessions = [
            state for state in self._sessions.values()
            if state.customer_phone == normalized
        ]

        if matching_sessions:
            # Return the most recent one
            return max(matching_sessions, key=lambda s: s.last_activity)

        # Check L2 (Redis/cache) for phone -> session_id mapping
        try:
            cache = await get_cache()
            phone_key = f"{self.PHONE_KEY_PREFIX}{normalized}"
            session_id = await cache.get(phone_key)
            if session_id and isinstance(session_id, str):
                loaded = await self.load_state(session_id)
                if loaded:
                    self._sessions[session_id] = loaded
                    self._phone_index[normalized] = session_id
                    return loaded
        except Exception as e:
            logger.warning(f"Failed to check cache for phone lookup: {e}")

        # Check persisted sessions on disk (legacy fallback)
        return self._load_persisted_session(normalized)
    
    def persist_session(self, session_id: str) -> bool:
        """
        Persist a session to disk as JSON (legacy fallback).

        Writes the session's ``to_dict()`` output to
        ``/tmp/showroom_kiosk_conversations/{phone}.json``. Only sessions with a
        customer phone number are persisted. This is the disk-based fallback
        used when Redis is unavailable. Prefer Redis persistence via
        ``persist_state()`` in production.

        Returns True on success, False if the session has no phone or on error.
        """
        state = self._sessions.get(session_id)
        if not state or not state.customer_phone:
            return False
        
        try:
            import json
            persist_dir = "/tmp/showroom_kiosk_conversations"
            os.makedirs(persist_dir, exist_ok=True)
            
            filename = f"{state.customer_phone}.json"
            filepath = os.path.join(persist_dir, filename)
            
            with open(filepath, 'w') as f:
                json.dump(state.to_dict(), f, indent=2, default=str)
            
            logger.info(f"Persisted session for phone {state.customer_phone[-4:]}")
            return True
        except Exception as e:
            logger.error(f"Failed to persist session: {e}")
            return False
    
    def _load_persisted_session(self, phone: str) -> Optional[ConversationState]:
        """Load a persisted session from disk"""
        try:
            import json
            filepath = f"/tmp/showroom_kiosk_conversations/{phone}.json"
            
            if not os.path.exists(filepath):
                return None
            
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            # Reconstruct ConversationState from dict
            state = ConversationState(session_id=data['session_id'])
            state.customer_name = data.get('customer_name')
            state.customer_phone = phone
            
            # Restore budget
            budget = data.get('budget', {})
            state.budget_min = budget.get('min')
            state.budget_max = budget.get('max')
            state.monthly_payment_target = budget.get('monthly_target')
            state.down_payment = budget.get('down_payment')
            
            # Restore preferences
            prefs = data.get('preferences', {})
            state.preferred_types = set(prefs.get('types', []))
            state.preferred_features = set(prefs.get('features', []))
            state.use_cases = set(prefs.get('use_cases', []))
            state.min_seating = prefs.get('min_seating')
            state.min_towing = prefs.get('min_towing')
            state.fuel_preference = prefs.get('fuel')
            state.drivetrain_preference = prefs.get('drivetrain')
            
            # Restore trade-in
            trade = data.get('trade_in', {})
            state.has_trade_in = trade.get('has_trade', False)
            state.trade_year = trade.get('year')
            state.trade_make = trade.get('make')
            state.trade_model = trade.get('model')
            state.trade_mileage = trade.get('mileage')
            state.trade_monthly_payment = trade.get('monthly_payment')
            state.trade_payoff = trade.get('payoff')
            state.trade_lender = trade.get('lender')
            
            # Restore conversation state
            state.message_count = data.get('message_count', 0)
            state.favorite_vehicles = data.get('favorite_vehicles', [])
            state.needs_spouse_approval = data.get('needs_spouse_approval', False)
            
            logger.info(f"Loaded persisted session for phone {phone[-4:]}")
            return state
            
        except Exception as e:
            logger.error(f"Failed to load persisted session: {e}")
            return None
    
    def cleanup_old_sessions(self, max_age_hours: int = 24) -> int:
        """
        Remove sessions older than ``max_age_hours`` from the in-memory cache.

        Does NOT remove from Redis (those expire via TTL). Called periodically
        to prevent unbounded memory growth.

        Args:
            max_age_hours: Maximum session age in hours (default 24).

        Returns:
            Number of sessions removed.
        """
        cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
        old_sessions = [
            sid for sid, state in self._sessions.items()
            if state.last_activity < cutoff
        ]
        
        for sid in old_sessions:
            del self._sessions[sid]
        
        logger.info(f"Cleaned up {len(old_sessions)} old sessions")
        return len(old_sessions)


# Module-level singleton
_state_manager: Optional[ConversationStateManager] = None


def get_state_manager() -> ConversationStateManager:
    """
    Get or create the conversation state manager singleton.

    The state manager is created once per process. In production with
    multiple workers, each worker has its own L1 cache but shares state
    via Redis (L2).
    """
    global _state_manager
    if _state_manager is None:
        _state_manager = ConversationStateManager()
    return _state_manager
