"""
Traffic Router - Kiosk Session Tracking
Logs customer interactions for internal dashboard

All timestamps stored and displayed in Eastern Time (America/New_York)
Supports PostgreSQL (primary) with JSON file fallback.

BETA MODE: Authentication disabled for easier testing.
To re-enable auth, add `admin: dict = Depends(require_admin)` back to endpoints.
"""
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import json
import os
import logging

router = APIRouter()
logger = logging.getLogger("showroom_kiosk.traffic")

# Import database module (not individual items - they need to be accessed dynamically)
from app import database

# Import model (will be None if not using DB)
try:
    from app.models.traffic_session import TrafficSession
except ImportError:
    TrafficSession = None

# File-based storage fallback
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
TRAFFIC_LOG_FILE = os.path.join(DATA_DIR, 'traffic_log.json')

# Eastern Time offset (EST = UTC-5, EDT = UTC-4)
EST_OFFSET = timedelta(hours=-5)

# Active session timeout (minutes)
ACTIVE_SESSION_TIMEOUT = 30


# ---

def get_eastern_time() -> datetime:
    """Get current time in Eastern Time."""
    utc_now = datetime.now(timezone.utc)
    est_now = utc_now + EST_OFFSET
    return est_now


def get_eastern_date_str() -> str:
    """Get current date string in Eastern Time (YYYY-MM-DD)."""
    return get_eastern_time().strftime('%Y-%m-%d')


def format_eastern_timestamp() -> str:
    """Get ISO format timestamp in Eastern Time."""
    return get_eastern_time().strftime('%Y-%m-%dT%H:%M:%S') + '-05:00'


def parse_timestamp(ts_str: str) -> datetime:
    """Parse a timestamp string into datetime."""
    try:
        if '+' in ts_str or ts_str.endswith('Z'):
            return datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
        elif '-05:00' in ts_str:
            return datetime.fromisoformat(ts_str)
        else:
            return datetime.fromisoformat(ts_str)
    except:
        return datetime.now()


# ---

def load_traffic_log() -> List[Dict]:
    """Load traffic log from JSON file (fallback)."""
    try:
        if os.path.exists(TRAFFIC_LOG_FILE):
            with open(TRAFFIC_LOG_FILE, 'r') as f:
                data = json.load(f)
                return data
    except Exception as e:
        logger.error(f"Error loading traffic log: {e}")
    return []


def save_traffic_log(data: List[Dict]):
    """Save traffic log to JSON file (fallback)."""
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(TRAFFIC_LOG_FILE, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as e:
        logger.error(f"Error saving traffic log: {e}")


# In-memory cache for JSON fallback
traffic_sessions_cache = load_traffic_log()


# ---

class VehicleInfo(BaseModel):
    stockNumber: Optional[str] = None
    year: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    trim: Optional[str] = None
    msrp: Optional[float] = None
    salePrice: Optional[float] = None


class TradeInVehicle(BaseModel):
    year: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    mileage: Optional[int] = None


class TradeInInfo(BaseModel):
    hasTrade: Optional[bool] = None
    vehicle: Optional[TradeInVehicle] = None
    hasPayoff: Optional[bool] = None
    payoffAmount: Optional[float] = None
    monthlyPayment: Optional[float] = None
    financedWith: Optional[str] = None
    year: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    mileage: Optional[int] = None
    condition: Optional[str] = None
    estimatedValue: Optional[float] = None


class PaymentInfo(BaseModel):
    type: Optional[str] = None
    monthly: Optional[float] = None
    term: Optional[int] = None
    downPayment: Optional[float] = None


class BudgetInfo(BaseModel):
    min: Optional[int] = None
    max: Optional[int] = None
    downPaymentPercent: Optional[int] = None


class VehicleInterest(BaseModel):
    model: Optional[str] = None
    cab: Optional[str] = None
    colors: Optional[List[str]] = None


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None


class SessionCreate(BaseModel):
    sessionId: Optional[str] = None
    customerName: Optional[str] = None
    phone: Optional[str] = None
    path: Optional[str] = None
    currentStep: Optional[str] = None
    vehicle: Optional[VehicleInfo] = None
    vehicleInterest: Optional[VehicleInterest] = None
    budget: Optional[BudgetInfo] = None
    tradeIn: Optional[TradeInInfo] = None
    payment: Optional[PaymentInfo] = None
    vehicleRequested: Optional[bool] = False
    quizAnswers: Optional[Dict[str, Any]] = None
    actions: Optional[List[str]] = None
    chatHistory: Optional[List[ChatMessage]] = None
    managerNotes: Optional[str] = None  # Notes added by sales manager


class SessionResponse(BaseModel):
    sessionId: str
    status: str
    message: str
    storage: str  # 'postgresql' or 'json'


# ---

def format_session_for_dashboard(session: Dict) -> Dict:
    """Format a session for the Sales Manager Dashboard 4-square view."""
    trade_in = session.get('tradeIn') or {}
    vehicle_interest = session.get('vehicleInterest') or {}
    budget = session.get('budget') or {}
    selected_vehicle = session.get('vehicle')
    
    return {
        'sessionId': session.get('sessionId'),
        'customerName': session.get('customerName'),
        'phone': session.get('phone'),
        'startTime': session.get('createdAt'),
        'lastActivity': session.get('updatedAt'),
        'currentStep': session.get('currentStep') or session.get('path') or 'browsing',
        'vehicleInterest': {
            'model': vehicle_interest.get('model'),
            'cab': vehicle_interest.get('cab'),
            'colors': vehicle_interest.get('colors') or [],
        },
        'budget': {
            'min': budget.get('min'),
            'max': budget.get('max'),
            'downPaymentPercent': budget.get('downPaymentPercent'),
        },
        'tradeIn': {
            'hasTrade': trade_in.get('hasTrade'),
            'vehicle': trade_in.get('vehicle') if trade_in.get('vehicle') else (
                {
                    'year': str(trade_in.get('year')) if trade_in.get('year') else None,
                    'make': trade_in.get('make'),
                    'model': trade_in.get('model'),
                    'mileage': trade_in.get('mileage'),
                } if trade_in.get('year') or trade_in.get('make') else None
            ),
            'hasPayoff': trade_in.get('hasPayoff'),
            'payoffAmount': trade_in.get('payoffAmount'),
            'monthlyPayment': trade_in.get('monthlyPayment'),
            'financedWith': trade_in.get('financedWith'),
        },
        'selectedVehicle': {
            'stockNumber': selected_vehicle.get('stockNumber'),
            'year': selected_vehicle.get('year'),
            'make': selected_vehicle.get('make'),
            'model': selected_vehicle.get('model'),
            'trim': selected_vehicle.get('trim'),
            'price': selected_vehicle.get('salePrice') or selected_vehicle.get('msrp'),
        } if selected_vehicle else None,
        'chatHistory': session.get('chatHistory'),
        'managerNotes': session.get('managerNotes'),
    }


async def get_db_session():
    """Get database session if available."""
    if database.is_database_configured() and database.async_session_factory:
        async with database.async_session_factory() as session:
            yield session
    else:
        yield None


# ---

async def db_create_or_update_session(session: AsyncSession, data: Dict) -> str:
    """Create or update session in PostgreSQL."""
    session_id = data.get('sessionId')
    
    # Check if session exists
    result = await session.execute(
        select(TrafficSession).where(TrafficSession.session_id == session_id)
    )
    existing = result.scalar_one_or_none()
    
    now = format_eastern_timestamp()
    
    if existing:
        # Update existing session
        for key, value in data.items():
            if value is not None:
                db_key = {
                    'sessionId': 'session_id',
                    'customerName': 'customer_name',
                    'currentStep': 'current_step',
                    'vehicleInterest': 'vehicle_interest',
                    'tradeIn': 'trade_in',
                    'vehicleRequested': 'vehicle_requested',
                    'chatHistory': 'chat_history',
                    'quizAnswers': 'quiz_answers',
                    'managerNotes': 'manager_notes',
                    'createdAt': 'created_at',
                    'updatedAt': 'updated_at',
                }.get(key, key)
                if hasattr(existing, db_key):
                    setattr(existing, db_key, value)
        existing.updated_at = now
        
        # Merge chat history if both exist
        if data.get('chatHistory') and existing.chat_history:
            existing.chat_history = data['chatHistory']
        
        # Merge actions
        if data.get('actions'):
            existing_actions = existing.actions or []
            new_actions = data['actions']
            existing.actions = existing_actions + [a for a in new_actions if a not in existing_actions]
        
    else:
        # Create new session
        new_session = TrafficSession(
            session_id=session_id,
            customer_name=data.get('customerName'),
            phone=data.get('phone'),
            path=data.get('path'),
            current_step=data.get('currentStep'),
            vehicle_interest=data.get('vehicleInterest'),
            budget=data.get('budget'),
            trade_in=data.get('tradeIn'),
            vehicle=data.get('vehicle'),
            payment=data.get('payment'),
            vehicle_requested=data.get('vehicleRequested', False),
            actions=data.get('actions', []),
            chat_history=data.get('chatHistory'),
            quiz_answers=data.get('quizAnswers'),
            manager_notes=data.get('managerNotes'),
            created_at=now,
            updated_at=now,
        )
        session.add(new_session)
    
    await session.commit()
    return session_id


async def db_get_active_sessions(session: AsyncSession, timeout_minutes: int) -> List[Dict]:
    """Get active sessions from PostgreSQL."""
    now = get_eastern_time()
    cutoff = now - timedelta(minutes=timeout_minutes)
    cutoff_str = cutoff.strftime('%Y-%m-%dT%H:%M:%S')
    
    result = await session.execute(
        select(TrafficSession).where(TrafficSession.updated_at >= cutoff_str)
    )
    sessions = result.scalars().all()
    
    return [format_session_for_dashboard(s.to_dict()) for s in sessions]


async def db_get_all_sessions(session: AsyncSession, limit: int, offset: int) -> tuple:
    """Get all sessions with pagination from PostgreSQL."""
    # Get total count
    count_result = await session.execute(select(func.count(TrafficSession.session_id)))
    total = count_result.scalar()
    
    # Get paginated results
    result = await session.execute(
        select(TrafficSession)
        .order_by(TrafficSession.updated_at.desc())
        .offset(offset)
        .limit(limit)
    )
    sessions = result.scalars().all()
    
    return [s.to_dict() for s in sessions], total


async def db_get_session(session: AsyncSession, session_id: str) -> Optional[Dict]:
    """Get a single session from PostgreSQL."""
    result = await session.execute(
        select(TrafficSession).where(TrafficSession.session_id == session_id)
    )
    db_session = result.scalar_one_or_none()
    return db_session.to_dict() if db_session else None


async def db_delete_session(session: AsyncSession, session_id: str) -> bool:
    """Delete a session from PostgreSQL."""
    result = await session.execute(
        delete(TrafficSession).where(TrafficSession.session_id == session_id)
    )
    await session.commit()
    return result.rowcount > 0


async def db_clear_sessions(session: AsyncSession) -> int:
    """Clear all sessions from PostgreSQL."""
    result = await session.execute(delete(TrafficSession))
    await session.commit()
    return result.rowcount


async def db_get_stats(session: AsyncSession) -> Dict:
    """Get traffic statistics from PostgreSQL."""
    today = get_eastern_date_str()
    now = get_eastern_time()
    active_cutoff = (now - timedelta(minutes=ACTIVE_SESSION_TIMEOUT)).strftime('%Y-%m-%dT%H:%M:%S')
    
    # Total count
    total_result = await session.execute(select(func.count(TrafficSession.session_id)))
    total = total_result.scalar()
    
    # Today count
    today_result = await session.execute(
        select(func.count(TrafficSession.session_id))
        .where(TrafficSession.created_at.like(f"{today}%"))
    )
    today_count = today_result.scalar()
    
    # Active count
    active_result = await session.execute(
        select(func.count(TrafficSession.session_id))
        .where(TrafficSession.updated_at >= active_cutoff)
    )
    active_count = active_result.scalar()
    
    # Get all sessions for detailed stats
    all_result = await session.execute(select(TrafficSession))
    all_sessions = all_result.scalars().all()
    
    by_path = {}
    with_vehicle = 0
    with_trade = 0
    vehicle_requests = 0
    completed = 0
    with_chat = 0
    
    for s in all_sessions:
        path = s.path or 'unknown'
        by_path[path] = by_path.get(path, 0) + 1
        if s.vehicle:
            with_vehicle += 1
        if s.trade_in:
            with_trade += 1
        if s.vehicle_requested:
            vehicle_requests += 1
        if s.phone:
            completed += 1
        if s.chat_history:
            with_chat += 1
    
    return {
        "total_sessions": total,
        "active_now": active_count,
        "today": today_count,
        "today_date": today,
        "by_path": by_path,
        "with_vehicle_selected": with_vehicle,
        "with_trade_in": with_trade,
        "vehicle_requests": vehicle_requests,
        "completed_handoffs": completed,
        "with_ai_chat": with_chat,
        "conversion_rate": round((completed / total * 100), 1) if total > 0 else 0,
    }


# ---

def json_create_or_update_session(data: Dict) -> str:
    """Create or update session in JSON file."""
    global traffic_sessions_cache
    
    session_id = data.get('sessionId')
    now = format_eastern_timestamp()
    
    # Find existing session
    existing_idx = None
    for idx, s in enumerate(traffic_sessions_cache):
        if s.get('sessionId') == session_id:
            existing_idx = idx
            break
    
    if existing_idx is not None:
        # Update existing
        existing = traffic_sessions_cache[existing_idx]
        for key, value in data.items():
            if value is not None:
                existing[key] = value
        existing['updatedAt'] = now
        traffic_sessions_cache[existing_idx] = existing
    else:
        # Create new
        data['createdAt'] = now
        data['updatedAt'] = now
        traffic_sessions_cache.append(data)
    
    save_traffic_log(traffic_sessions_cache)
    return session_id


# ---

@router.post("/session", response_model=SessionResponse)
async def log_session(session_data: SessionCreate):
    """
    Log or update a kiosk session.
    Uses PostgreSQL if configured, otherwise falls back to JSON file.
    """
    # Generate session ID if not provided
    session_id = session_data.sessionId
    if not session_id:
        session_id = f"K{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
    
    # Prepare data dict
    data = {
        'sessionId': session_id,
        'customerName': session_data.customerName,
        'phone': session_data.phone,
        'path': session_data.path,
        'currentStep': session_data.currentStep,
        'vehicle': session_data.vehicle.model_dump() if session_data.vehicle else None,
        'vehicleInterest': session_data.vehicleInterest.model_dump() if session_data.vehicleInterest else None,
        'budget': session_data.budget.model_dump() if session_data.budget else None,
        'tradeIn': session_data.tradeIn.model_dump() if session_data.tradeIn else None,
        'payment': session_data.payment.model_dump() if session_data.payment else None,
        'vehicleRequested': session_data.vehicleRequested,
        'actions': session_data.actions or [],
        'chatHistory': [m.model_dump() for m in session_data.chatHistory] if session_data.chatHistory else None,
        'quizAnswers': session_data.quizAnswers,
    }
    
    # Try PostgreSQL first
    if database.is_database_configured() and database.async_session_factory and TrafficSession:
        try:
            async with database.async_session_factory() as db:
                await db_create_or_update_session(db, data)
                return SessionResponse(
                    sessionId=session_id,
                    status="success",
                    message="Session logged to PostgreSQL",
                    storage="postgresql"
                )
        except Exception as e:
            logger.error(f"PostgreSQL error, falling back to JSON: {e}")
    
    # Fallback to JSON
    json_create_or_update_session(data)
    return SessionResponse(
        sessionId=session_id,
        status="success",
        message="Session logged to JSON file",
        storage="json"
    )


@router.get("/active")
async def get_active_sessions(
    timeout_minutes: int = Query(ACTIVE_SESSION_TIMEOUT, ge=1, le=120)
):
    """
    Get active kiosk sessions for Sales Manager Dashboard.
    
    BETA: No authentication required.
    """
    # Try PostgreSQL first
    if database.is_database_configured() and database.async_session_factory and TrafficSession:
        try:
            async with database.async_session_factory() as db:
                active = await db_get_active_sessions(db, timeout_minutes)
                active.sort(key=lambda x: x.get('lastActivity', ''), reverse=True)
                return {
                    "sessions": active,
                    "count": len(active),
                    "timeout_minutes": timeout_minutes,
                    "server_time": format_eastern_timestamp(),
                    "timezone": "America/New_York",
                    "storage": "postgresql"
                }
        except Exception as e:
            logger.error(f"PostgreSQL error, falling back to JSON: {e}")
    
    # Fallback to JSON
    global traffic_sessions_cache
    traffic_sessions_cache = load_traffic_log()
    
    now = get_eastern_time()
    cutoff = now - timedelta(minutes=timeout_minutes)
    
    active = []
    for session in traffic_sessions_cache:
        updated_at = session.get('updatedAt', session.get('createdAt', ''))
        if updated_at:
            try:
                session_time = parse_timestamp(updated_at)
                if session_time.tzinfo:
                    session_time = session_time.replace(tzinfo=None)
                cutoff_naive = cutoff.replace(tzinfo=None)
                
                if session_time >= cutoff_naive:
                    active.append(format_session_for_dashboard(session))
            except Exception as e:
                continue
    
    active.sort(key=lambda x: x.get('lastActivity', ''), reverse=True)
    
    return {
        "sessions": active,
        "count": len(active),
        "timeout_minutes": timeout_minutes,
        "server_time": format_eastern_timestamp(),
        "timezone": "America/New_York",
        "storage": "json"
    }


@router.get("/log")
async def get_traffic_log(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    filter_today: bool = Query(False)
):
    """
    Get traffic log entries for admin dashboard.
    
    BETA: No authentication required.
    """
    # Try PostgreSQL first
    if database.is_database_configured() and database.async_session_factory and TrafficSession:
        try:
            async with database.async_session_factory() as db:
                sessions, total = await db_get_all_sessions(db, limit, offset)
                
                # Apply filters
                if filter_today:
                    today = get_eastern_date_str()
                    sessions = [s for s in sessions if s.get('createdAt', '').startswith(today)]
                if date_from:
                    sessions = [s for s in sessions if s.get('createdAt', '') >= date_from]
                if date_to:
                    sessions = [s for s in sessions if s.get('createdAt', '') <= date_to]
                
                return {
                    "total": len(sessions),
                    "limit": limit,
                    "offset": offset,
                    "sessions": sessions,
                    "timezone": "America/New_York",
                    "server_time": format_eastern_timestamp(),
                    "storage": "postgresql"
                }
        except Exception as e:
            logger.error(f"PostgreSQL error, falling back to JSON: {e}")
    
    # Fallback to JSON
    global traffic_sessions_cache
    traffic_sessions_cache = load_traffic_log()
    
    filtered = traffic_sessions_cache
    
    if filter_today:
        today = get_eastern_date_str()
        filtered = [s for s in filtered if s.get('createdAt', '').startswith(today)]
    
    if date_from:
        filtered = [s for s in filtered if s.get('createdAt', '') >= date_from]
    
    if date_to:
        filtered = [s for s in filtered if s.get('createdAt', '') <= date_to]
    
    sorted_sessions = sorted(
        filtered,
        key=lambda x: x.get('updatedAt', x.get('createdAt', '')),
        reverse=True
    )
    
    paginated = sorted_sessions[offset:offset + limit]
    
    return {
        "total": len(filtered),
        "limit": limit,
        "offset": offset,
        "sessions": paginated,
        "timezone": "America/New_York",
        "server_time": format_eastern_timestamp(),
        "storage": "json"
    }


@router.get("/log/{session_id}")
async def get_session_detail(session_id: str):
    """
    Get details for a specific session including chat history.
    
    BETA: No authentication required.
    """
    # Try PostgreSQL first
    if database.is_database_configured() and database.async_session_factory and TrafficSession:
        try:
            async with database.async_session_factory() as db:
                session = await db_get_session(db, session_id)
                if session:
                    return session
        except Exception as e:
            logger.error(f"PostgreSQL error, falling back to JSON: {e}")
    
    # Fallback to JSON
    global traffic_sessions_cache
    traffic_sessions_cache = load_traffic_log()
    
    for session in traffic_sessions_cache:
        if session.get('sessionId') == session_id:
            return session
    
    return {"error": "Session not found"}


@router.get("/dashboard/{session_id}")
async def get_session_for_dashboard(session_id: str):
    """
    Get a single session formatted for the 4-square dashboard view.
    
    BETA: No authentication required.
    """
    session = await get_session_detail(session_id)
    if "error" in session:
        return session
    return format_session_for_dashboard(session)


@router.get("/stats")
async def get_traffic_stats():
    """
    Get traffic statistics for dashboard.
    
    BETA: No authentication required.
    """
    # Try PostgreSQL first
    if database.is_database_configured() and database.async_session_factory and TrafficSession:
        try:
            async with database.async_session_factory() as db:
                stats = await db_get_stats(db)
                stats["timezone"] = "America/New_York"
                stats["server_time"] = format_eastern_timestamp()
                stats["storage"] = "postgresql"
                return stats
        except Exception as e:
            logger.error(f"PostgreSQL error, falling back to JSON: {e}")
    
    # Fallback to JSON
    global traffic_sessions_cache
    traffic_sessions_cache = load_traffic_log()
    
    total = len(traffic_sessions_cache)
    by_path = {}
    with_vehicle = 0
    with_trade = 0
    vehicle_requests = 0
    completed = 0
    with_chat = 0
    
    today = get_eastern_date_str()
    today_count = 0
    
    now = get_eastern_time()
    active_cutoff = now - timedelta(minutes=ACTIVE_SESSION_TIMEOUT)
    active_count = 0
    
    for session in traffic_sessions_cache:
        path = session.get('path') or 'unknown'
        by_path[path] = by_path.get(path, 0) + 1
        
        if session.get('vehicle'):
            with_vehicle += 1
        if session.get('tradeIn'):
            with_trade += 1
        if session.get('vehicleRequested'):
            vehicle_requests += 1
        if session.get('phone'):
            completed += 1
        if session.get('chatHistory'):
            with_chat += 1
        
        created = session.get('createdAt', '')
        if created.startswith(today):
            today_count += 1
        
        updated_at = session.get('updatedAt', created)
        if updated_at:
            try:
                session_time = parse_timestamp(updated_at)
                if session_time.tzinfo:
                    session_time = session_time.replace(tzinfo=None)
                active_cutoff_naive = active_cutoff.replace(tzinfo=None)
                if session_time >= active_cutoff_naive:
                    active_count += 1
            except:
                pass
    
    return {
        "total_sessions": total,
        "active_now": active_count,
        "today": today_count,
        "today_date": today,
        "by_path": by_path,
        "with_vehicle_selected": with_vehicle,
        "with_trade_in": with_trade,
        "vehicle_requests": vehicle_requests,
        "completed_handoffs": completed,
        "with_ai_chat": with_chat,
        "conversion_rate": round((completed / total * 100), 1) if total > 0 else 0,
        "timezone": "America/New_York",
        "server_time": format_eastern_timestamp(),
        "storage": "json"
    }


@router.delete("/log/{session_id}")
async def delete_session(session_id: str):
    """
    Delete a session.
    
    BETA: No authentication required.
    """
    # Try PostgreSQL first
    if database.is_database_configured() and database.async_session_factory and TrafficSession:
        try:
            async with database.async_session_factory() as db:
                deleted = await db_delete_session(db, session_id)
                if deleted:
                    return {"status": "deleted", "sessionId": session_id, "storage": "postgresql"}
        except Exception as e:
            logger.error(f"PostgreSQL error, falling back to JSON: {e}")
    
    # Fallback to JSON
    global traffic_sessions_cache
    traffic_sessions_cache = load_traffic_log()
    
    original_len = len(traffic_sessions_cache)
    traffic_sessions_cache = [s for s in traffic_sessions_cache if s.get('sessionId') != session_id]
    
    if len(traffic_sessions_cache) < original_len:
        save_traffic_log(traffic_sessions_cache)
        return {"status": "deleted", "sessionId": session_id, "storage": "json"}
    
    return {"error": "Session not found"}


@router.delete("/log")
async def clear_traffic_log():
    """
    Clear all traffic log entries.
    
    BETA: No authentication required.
    """
    # Try PostgreSQL first
    if database.is_database_configured() and database.async_session_factory and TrafficSession:
        try:
            async with database.async_session_factory() as db:
                count = await db_clear_sessions(db)
                return {"status": "cleared", "message": f"Deleted {count} sessions", "storage": "postgresql"}
        except Exception as e:
            logger.error(f"PostgreSQL error, falling back to JSON: {e}")
    
    # Fallback to JSON
    global traffic_sessions_cache
    traffic_sessions_cache = []
    save_traffic_log(traffic_sessions_cache)
    return {"status": "cleared", "message": "All traffic log entries deleted", "storage": "json"}


@router.get("/storage-status")
async def get_storage_status():
    """Check which storage backend is active."""
    db_configured = database.is_database_configured()
    db_connected = False
    
    if db_configured and database.async_session_factory:
        try:
            async with database.async_session_factory() as db:
                from sqlalchemy import text
                await db.execute(text("SELECT 1"))
                db_connected = True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
    
    return {
        "postgresql_configured": db_configured,
        "postgresql_connected": db_connected,
        "active_storage": "postgresql" if db_connected else "json",
        "json_fallback_available": True,
    }
