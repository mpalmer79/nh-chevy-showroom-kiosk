"""
Analytics Router - Kiosk telemetry and usage tracking
Tracks user interactions, vehicle views, and session data

Uses pluggable repository pattern - defaults to in-memory, can switch to SQLite/Postgres
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os

from app.repositories import AnalyticsRepository
from app.repositories.memory_repository import get_memory_repository
from app.repositories.sqlite_repository import get_sqlite_repository

router = APIRouter()


# ---
# Repository Configuration
# ---

REPOSITORY_TYPE = os.getenv("ANALYTICS_REPOSITORY", "memory")


def get_repository() -> AnalyticsRepository:
    """
    Factory function to get the configured repository.
    
    Set ANALYTICS_REPOSITORY env var to switch implementations:
    - "memory" (default): In-memory storage, lost on restart
    - "sqlite": SQLite file storage, persists across restarts
    """
    if REPOSITORY_TYPE == "sqlite":
        db_path = os.getenv("ANALYTICS_DB_PATH", "data/analytics.db")
        return get_sqlite_repository(db_path)
    return get_memory_repository()


# ---
# Pydantic Models
# ---

class ViewEvent(BaseModel):
    vehicleId: str
    sessionId: str


class InteractionEvent(BaseModel):
    eventType: str
    eventData: Optional[Dict[str, Any]] = None
    sessionId: str
    timestamp: Optional[str] = None


class SessionStart(BaseModel):
    kioskId: str


class SessionEnd(BaseModel):
    sessionId: str


# ---
# Endpoints
# ---

@router.post("/session/start")
async def start_session(
    request: SessionStart,
    repo: AnalyticsRepository = Depends(get_repository)
):
    """
    Start a new kiosk session when a user touches the screen.
    """
    return await repo.create_session(request.kioskId)


@router.post("/session/end")
async def end_session(
    request: SessionEnd,
    repo: AnalyticsRepository = Depends(get_repository)
):
    """
    End a kiosk session (user inactive or explicitly ended).
    """
    result = await repo.end_session(request.sessionId)
    if result is None:
        return {"status": "session_not_found"}
    return result


@router.post("/view")
async def track_vehicle_view(
    event: ViewEvent,
    repo: AnalyticsRepository = Depends(get_repository)
):
    """
    Track when a user views a vehicle detail page.
    """
    await repo.add_vehicle_view_to_session(event.sessionId, event.vehicleId)
    await repo.track_vehicle_view(event.vehicleId, event.sessionId)
    
    return {"status": "tracked"}


@router.post("/interaction")
async def track_interaction(
    event: InteractionEvent,
    repo: AnalyticsRepository = Depends(get_repository)
):
    """
    Track generic user interactions (button clicks, filter changes, etc).
    """
    await repo.update_session_interactions(event.sessionId)
    await repo.log_event(
        event.eventType, 
        event.sessionId,
        event.eventData,
        event.timestamp
    )
    
    return {"status": "tracked"}


@router.get("/dashboard")
async def get_analytics_dashboard(
    repo: AnalyticsRepository = Depends(get_repository)
):
    """
    Get analytics dashboard data for internal monitoring.
    """
    return await repo.get_dashboard_stats()


@router.get("/vehicle/{vehicle_id}")
async def get_vehicle_analytics(
    vehicle_id: str,
    repo: AnalyticsRepository = Depends(get_repository)
):
    """
    Get analytics for a specific vehicle.
    """
    return await repo.get_vehicle_stats(vehicle_id)
