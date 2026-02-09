"""
Quirk AI Kiosk - Dependency Injection Provider
Replaces module-level global singletons with FastAPI Depends().

BEFORE (scattered across multiple modules):
    # vehicle_retriever.py
    _retriever: Optional[SemanticVehicleRetriever] = None
    def get_vehicle_retriever():
        global _retriever
        if _retriever is None:
            _retriever = SemanticVehicleRetriever()
        return _retriever

AFTER (centralized, testable):
    # core/dependencies.py
    from app.core.dependencies import get_vehicle_retriever

    @router.post("/chat")
    async def chat(retriever = Depends(get_vehicle_retriever)):
        ...

    # In tests:
    app.dependency_overrides[get_vehicle_retriever] = lambda: mock_retriever

Benefits:
  - Testable: override any dependency without monkeypatching
  - No global mutable state scattered across modules
  - Explicit lifecycle — can see all services in one place
  - FastAPI handles caching per-request or app-wide as needed
"""

from functools import lru_cache

from app.core.settings import get_settings, Settings


# ---
# SETTINGS (already uses @lru_cache — re-exported for consistency)
# ---

def get_app_settings() -> Settings:
    """App settings — cached singleton via Pydantic."""
    return get_settings()


# ---
# CONVERSATION STATE MANAGER
# ---

_state_manager = None


def get_state_manager():
    """
    Conversation state manager — application-scoped singleton.

    Usage in routers:
        from app.core.dependencies import get_state_manager
        @router.post("/chat")
        async def chat(state_mgr = Depends(get_state_manager)):
            state = state_mgr.get_or_create_state(session_id)
    """
    global _state_manager
    if _state_manager is None:
        from app.services.conversation_state import ConversationStateManager
        _state_manager = ConversationStateManager()
    return _state_manager


# ---
# VEHICLE RETRIEVER
# ---

_vehicle_retriever = None


def get_vehicle_retriever():
    """
    Semantic vehicle retriever — application-scoped singleton.

    The retriever must be .fit() with inventory before first use.
    The AI router handles fitting on first request if not already done.
    """
    global _vehicle_retriever
    if _vehicle_retriever is None:
        from app.services.vehicle_retriever import SemanticVehicleRetriever
        _vehicle_retriever = SemanticVehicleRetriever()
    return _vehicle_retriever


# ---
# OUTCOME TRACKER
# ---

_outcome_tracker = None


def get_outcome_tracker():
    """Conversation outcome tracker — application-scoped singleton."""
    global _outcome_tracker
    if _outcome_tracker is None:
        from app.services.outcome_tracker import OutcomeTracker
        _outcome_tracker = OutcomeTracker()
    return _outcome_tracker


# ---
# NOTIFICATION SERVICE
# ---

_notification_service = None


def get_notification_service():
    """Staff notification service (Slack, SMS, Email) — application-scoped singleton."""
    global _notification_service
    if _notification_service is None:
        from app.services.notifications import NotificationService
        settings = get_settings()
        _notification_service = NotificationService(settings)
    return _notification_service


# ---
# WORKSHEET SERVICE
# ---

_worksheet_service = None


def get_worksheet_service():
    """Digital worksheet service — application-scoped singleton."""
    global _worksheet_service
    if _worksheet_service is None:
        from app.services.worksheet_service import WorksheetService
        _worksheet_service = WorksheetService()
    return _worksheet_service


# ---
# ENRICHMENT SERVICE
# ---

_enrichment_service = None


def get_enrichment_service():
    """Vehicle enrichment service — application-scoped singleton."""
    global _enrichment_service
    if _enrichment_service is None:
        from app.services.inventory_enrichment import InventoryEnrichmentService
        _enrichment_service = InventoryEnrichmentService()
    return _enrichment_service


# ---
# ENTITY EXTRACTOR
# ---

_entity_extractor = None


def get_entity_extractor():
    """Conversation entity extractor — application-scoped singleton."""
    global _entity_extractor
    if _entity_extractor is None:
        from app.services.entity_extraction import ConversationEntityExtractor
        _entity_extractor = ConversationEntityExtractor()
    return _entity_extractor


# ---
# TEST SUPPORT
# ---

def reset_all():
    """
    Reset all singletons — FOR TESTING ONLY.
    Call this in conftest.py fixtures to get fresh instances.

    Example:
        @pytest.fixture(autouse=True)
        def reset_deps():
            from app.core.dependencies import reset_all
            reset_all()
            yield
            reset_all()
    """
    global _state_manager, _vehicle_retriever, _outcome_tracker
    global _notification_service, _worksheet_service
    global _enrichment_service, _entity_extractor

    _state_manager = None
    _vehicle_retriever = None
    _outcome_tracker = None
    _notification_service = None
    _worksheet_service = None
    _enrichment_service = None
    _entity_extractor = None

    # Clear lru_cache singletons
    get_settings.cache_clear()
