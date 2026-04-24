"""
NH Chevy Showroom Kiosk - Services Module
Business logic and AI/ML services

Services:
- entity_extraction: NLP extraction of budget, preferences, trade-in from messages
- conversation_state: Persistent conversation memory and stage tracking
- vehicle_retriever: Semantic vehicle search with TF-IDF
- outcome_tracker: Conversation outcome logging for AI learning
- smart_recommendations: Preference-weighted vehicle recommendations
- inventory_enrichment: Derive missing vehicle fields
"""

# Entity extraction
from app.services.entity_extraction import (
    ConversationEntityExtractor,
    ExtractedEntities,
    get_entity_extractor,
)

# Conversation state management
from app.services.conversation_state import (
    ConversationStateManager,
    ConversationState,
    ConversationStage,
    InterestLevel,
    get_state_manager,
)

# Semantic vehicle retrieval
from app.services.vehicle_retriever import (
    SemanticVehicleRetriever,
    ScoredVehicle,
    get_vehicle_retriever,
)

# Outcome tracking for AI learning
from app.services.outcome_tracker import (
    OutcomeTracker,
    ConversationOutcome,
    InteractionQuality,
    get_outcome_tracker,
)

# Smart recommendations
from app.services.smart_recommendations import (
    SmartRecommendationService,
    get_smart_recommendation_service,
)

# Inventory enrichment
from app.services.inventory_enrichment import (
    InventoryEnrichmentService,
    enrich_vehicle,
    enrich_inventory,
)

__all__ = [
    # Entity extraction
    "ConversationEntityExtractor",
    "ExtractedEntities",
    "get_entity_extractor",
    # Conversation state
    "ConversationStateManager",
    "ConversationState", 
    "ConversationStage",
    "InterestLevel",
    "get_state_manager",
    # Vehicle retrieval
    "SemanticVehicleRetriever",
    "ScoredVehicle",
    "get_vehicle_retriever",
    # Outcome tracking
    "OutcomeTracker",
    "ConversationOutcome",
    "InteractionQuality",
    "get_outcome_tracker",
    # Smart recommendations
    "SmartRecommendationService",
    "get_smart_recommendation_service",
    # Inventory enrichment
    "InventoryEnrichmentService",
    "enrich_vehicle",
    "enrich_inventory",
]
