"""
Worksheet Router
API endpoints for Digital Worksheet operations.
Customer-facing and manager-facing endpoints for deal structuring.
"""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Query
from typing import List, Optional
import logging
from datetime import datetime

from app.models.worksheet import (
    Worksheet,
    WorksheetStatus,
    WorksheetCreateRequest,
    WorksheetUpdateRequest,
    WorksheetManagerUpdate,
    WorksheetCounterOffer,
    WorksheetSendRequest,
    WorksheetResponse,
    WorksheetListResponse,
    WorksheetSummary,
)
from app.services.worksheet_service import get_worksheet_service

router = APIRouter(prefix="/worksheet", tags=["worksheet"])
logger = logging.getLogger("quirk_ai.worksheet_router")


# ---
# CUSTOMER-FACING ENDPOINTS
# ---

@router.post("/create", response_model=WorksheetResponse)
async def create_worksheet(request: WorksheetCreateRequest):
    """
    Create a new Digital Worksheet.
    
    Called by AI when customer is ready to talk numbers.
    Pre-populates from conversation state and inventory.
    
    Args:
        request: WorksheetCreateRequest with session_id and stock_number
        
    Returns:
        WorksheetResponse with created worksheet
    """
    try:
        service = get_worksheet_service()
        worksheet = await service.create_worksheet(request)
        
        return WorksheetResponse(
            success=True,
            worksheet=worksheet,
            message=f"Worksheet created for {worksheet.vehicle.year} {worksheet.vehicle.model}"
        )
    except ValueError as e:
        logger.warning(f"Failed to create worksheet: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating worksheet: {e}")
        raise HTTPException(status_code=500, detail="Failed to create worksheet")


@router.get("/{worksheet_id}", response_model=WorksheetResponse)
async def get_worksheet(worksheet_id: str):
    """
    Get worksheet by ID.
    
    Args:
        worksheet_id: Unique worksheet identifier
        
    Returns:
        WorksheetResponse with worksheet details
    """
    service = get_worksheet_service()
    worksheet = service.get_worksheet(worksheet_id)
    
    if not worksheet:
        raise HTTPException(status_code=404, detail="Worksheet not found")
    
    return WorksheetResponse(
        success=True,
        worksheet=worksheet
    )


@router.patch("/{worksheet_id}", response_model=WorksheetResponse)
async def update_worksheet(worksheet_id: str, updates: WorksheetUpdateRequest):
    """
    Update worksheet values (customer-side).
    
    Recalculates all dependent fields (payments, totals).
    Increments adjustments_made counter.
    
    Args:
        worksheet_id: Worksheet to update
        updates: Fields to update
        
    Returns:
        WorksheetResponse with updated worksheet
    """
    try:
        service = get_worksheet_service()
        worksheet = await service.update_worksheet(
            worksheet_id=worksheet_id,
            updates=updates,
            actor="customer"
        )
        
        return WorksheetResponse(
            success=True,
            worksheet=worksheet,
            message="Worksheet updated"
        )
    except ValueError as e:
        logger.warning(f"Failed to update worksheet {worksheet_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating worksheet {worksheet_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update worksheet")


@router.post("/{worksheet_id}/select-term/{term_months}", response_model=WorksheetResponse)
async def select_term(worksheet_id: str, term_months: int):
    """
    Select a financing term (60, 72, or 84 months).
    
    Args:
        worksheet_id: Worksheet to update
        term_months: Term length to select
        
    Returns:
        WorksheetResponse with updated worksheet
    """
    if term_months not in [60, 72, 84]:
        raise HTTPException(
            status_code=400, 
            detail="Term must be 60, 72, or 84 months"
        )
    
    try:
        service = get_worksheet_service()
        worksheet = await service.select_term(worksheet_id, term_months)
        
        return WorksheetResponse(
            success=True,
            worksheet=worksheet,
            message=f"Selected {term_months} month term"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error selecting term for {worksheet_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to select term")


@router.post("/{worksheet_id}/ready", response_model=WorksheetResponse)
async def mark_ready(worksheet_id: str):
    """
    Customer indicates they're ready to proceed.
    
    - Changes status to READY
    - Notifies sales manager
    - Boosts lead score
    
    Args:
        worksheet_id: Worksheet to mark ready
        
    Returns:
        WorksheetResponse with updated worksheet
    """
    try:
        service = get_worksheet_service()
        worksheet = await service.mark_ready(worksheet_id)
        
        return WorksheetResponse(
            success=True,
            worksheet=worksheet,
            message="A sales manager has been notified and will be with you shortly!"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error marking worksheet {worksheet_id} ready: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark ready")


@router.post("/{worksheet_id}/send", response_model=WorksheetResponse)
async def send_worksheet(worksheet_id: str, request: WorksheetSendRequest):
    """
    Send worksheet to customer via SMS or email.
    
    Args:
        worksheet_id: Worksheet to send
        request: Send method and destination
        
    Returns:
        WorksheetResponse confirming send
    """
    service = get_worksheet_service()
    worksheet = service.get_worksheet(worksheet_id)
    
    if not worksheet:
        raise HTTPException(status_code=404, detail="Worksheet not found")
    
    if request.method not in ["sms", "email"]:
        raise HTTPException(
            status_code=400,
            detail="Method must be 'sms' or 'email'"
        )
    
    # TODO: Implement actual send via notification service
    # For now, just update contact info and return success
    
    try:
        if request.method == "sms":
            # Validate phone format
            phone_digits = ''.join(c for c in request.destination if c.isdigit())
            if len(phone_digits) != 10:
                raise HTTPException(
                    status_code=400,
                    detail="Phone number must be 10 digits"
                )
            
            # Update worksheet with phone
            updates = WorksheetUpdateRequest(customer_phone=phone_digits)
            worksheet = await service.update_worksheet(
                worksheet_id=worksheet_id,
                updates=updates,
                actor="customer"
            )
            
            message = f"Worksheet sent to ({phone_digits[:3]}) {phone_digits[3:6]}-{phone_digits[6:]}"
        
        else:  # email
            # Basic email validation
            if "@" not in request.destination or "." not in request.destination:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid email address"
                )
            
            # Update worksheet with email
            updates = WorksheetUpdateRequest(customer_email=request.destination)
            worksheet = await service.update_worksheet(
                worksheet_id=worksheet_id,
                updates=updates,
                actor="customer"
            )
            
            message = f"Worksheet sent to {request.destination}"
        
        return WorksheetResponse(
            success=True,
            worksheet=worksheet,
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending worksheet {worksheet_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to send worksheet")


@router.get("/session/{session_id}", response_model=WorksheetListResponse)
async def get_session_worksheets(session_id: str):
    """
    Get all worksheets for a session.
    
    Customer may have compared multiple vehicles.
    
    Args:
        session_id: Kiosk session ID
        
    Returns:
        WorksheetListResponse with all session worksheets
    """
    service = get_worksheet_service()
    worksheets = service.get_session_worksheets(session_id)
    
    return WorksheetListResponse(
        success=True,
        worksheets=worksheets,
        total_count=len(worksheets)
    )


# ---
# MANAGER-FACING ENDPOINTS
# ---

@router.get("/manager/active", response_model=List[WorksheetSummary])
async def get_active_worksheets(
    min_score: int = Query(default=0, ge=0, le=100, description="Minimum lead score filter")
):
    """
    Get all active worksheets for sales floor dashboard.
    
    Sorted by lead_score DESC, then updated_at DESC.
    Filters: status in (DRAFT, READY, MANAGER_REVIEW, NEGOTIATING)
    
    Args:
        min_score: Optional minimum lead score filter
        
    Returns:
        List of WorksheetSummary for dashboard display
    """
    service = get_worksheet_service()
    worksheets = service.get_active_worksheets()
    
    # Apply score filter
    if min_score > 0:
        worksheets = [w for w in worksheets if w.lead_score >= min_score]
    
    return worksheets


@router.get("/manager/ready", response_model=List[WorksheetSummary])
async def get_ready_worksheets():
    """
    Get worksheets where customer is ready (hot leads).
    
    Returns:
        List of WorksheetSummary with status=READY
    """
    service = get_worksheet_service()
    all_active = service.get_active_worksheets()
    
    ready = [w for w in all_active if w.status == WorksheetStatus.READY]
    
    return ready


@router.post("/manager/{worksheet_id}/review", response_model=WorksheetResponse)
async def manager_start_review(
    worksheet_id: str,
    manager_id: str = Query(..., description="Manager's user ID"),
    manager_name: str = Query(default=None, description="Manager's display name")
):
    """
    Manager starts reviewing a worksheet.
    
    Marks worksheet as under review so other managers know.
    
    Args:
        worksheet_id: Worksheet to review
        manager_id: Manager's identifier
        manager_name: Manager's display name
        
    Returns:
        WorksheetResponse with updated worksheet
    """
    try:
        service = get_worksheet_service()
        worksheet = await service.manager_review(
            worksheet_id=worksheet_id,
            manager_id=manager_id,
            manager_name=manager_name
        )
        
        return WorksheetResponse(
            success=True,
            worksheet=worksheet,
            message=f"Now reviewing worksheet"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error starting review for {worksheet_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to start review")


@router.patch("/manager/{worksheet_id}", response_model=WorksheetResponse)
async def manager_update(
    worksheet_id: str,
    updates: WorksheetManagerUpdate,
    manager_id: str = Query(..., description="Manager's user ID")
):
    """
    Manager updates worksheet (notes, status, adjustment).
    
    If manager_adjustment is set, recalculates all payments.
    
    Args:
        worksheet_id: Worksheet to update
        updates: Manager update fields
        manager_id: Manager's identifier
        
    Returns:
        WorksheetResponse with updated worksheet
    """
    try:
        service = get_worksheet_service()
        worksheet = await service.manager_update(
            worksheet_id=worksheet_id,
            updates=updates,
            manager_id=manager_id
        )
        
        return WorksheetResponse(
            success=True,
            worksheet=worksheet,
            message="Worksheet updated by manager"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in manager update for {worksheet_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update worksheet")


@router.post("/manager/{worksheet_id}/counter-offer", response_model=WorksheetResponse)
async def send_counter_offer(worksheet_id: str, counter_offer: WorksheetCounterOffer):
    """
    Send counter-offer to customer.
    
    - Applies adjustment to selling price
    - Changes status to NEGOTIATING
    - Pushes update to customer's kiosk (via WebSocket)
    
    Args:
        worksheet_id: Worksheet for counter-offer
        counter_offer: Adjustment and notes
        
    Returns:
        WorksheetResponse with updated worksheet
    """
    try:
        service = get_worksheet_service()
        worksheet = await service.manager_counter_offer(
            worksheet_id=worksheet_id,
            counter_offer=counter_offer
        )
        
        return WorksheetResponse(
            success=True,
            worksheet=worksheet,
            message=f"Counter-offer sent: ${counter_offer.adjustment:+,.0f}"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error sending counter-offer for {worksheet_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to send counter-offer")


@router.post("/manager/{worksheet_id}/accept", response_model=WorksheetResponse)
async def accept_deal(
    worksheet_id: str,
    manager_id: str = Query(..., description="Manager's user ID")
):
    """
    Manager accepts the deal.
    
    - Changes status to ACCEPTED
    - Triggers CRM integration (future)
    - Notifies customer
    
    Args:
        worksheet_id: Worksheet to accept
        manager_id: Manager accepting the deal
        
    Returns:
        WorksheetResponse with accepted worksheet
    """
    try:
        service = get_worksheet_service()
        worksheet = await service.accept_deal(
            worksheet_id=worksheet_id,
            manager_id=manager_id
        )
        
        return WorksheetResponse(
            success=True,
            worksheet=worksheet,
            message="Deal accepted! Proceeding to finance."
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error accepting deal for {worksheet_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to accept deal")


@router.post("/manager/{worksheet_id}/decline", response_model=WorksheetResponse)
async def decline_worksheet(
    worksheet_id: str,
    manager_id: str = Query(..., description="Manager's user ID"),
    reason: str = Query(default=None, description="Reason for decline")
):
    """
    Decline/close a worksheet.
    
    Args:
        worksheet_id: Worksheet to decline
        manager_id: Manager declining
        reason: Optional reason
        
    Returns:
        WorksheetResponse with declined worksheet
    """
    try:
        service = get_worksheet_service()
        worksheet = await service.decline_worksheet(
            worksheet_id=worksheet_id,
            actor=f"manager:{manager_id}",
            reason=reason
        )
        
        return WorksheetResponse(
            success=True,
            worksheet=worksheet,
            message="Worksheet declined"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error declining worksheet {worksheet_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to decline worksheet")


# ---
# WEBSOCKET ENDPOINTS (Real-time updates)
# ---

# Track active WebSocket connections
active_connections: dict = {}  # worksheet_id -> List[WebSocket]
manager_connections: List[WebSocket] = []


@router.websocket("/ws/{worksheet_id}")
async def worksheet_websocket(websocket: WebSocket, worksheet_id: str):
    """
    Real-time worksheet updates for a specific worksheet.
    
    Customer connects to see manager counter-offers.
    Manager connects to see customer adjustments.
    
    Messages sent:
    - worksheet_updated: Full worksheet state
    - status_changed: {old_status, new_status, message}
    - counter_offer: {adjustment, notes, new_payment}
    - customer_ready: Customer clicked "I'm ready"
    """
    await websocket.accept()
    
    # Track connection
    if worksheet_id not in active_connections:
        active_connections[worksheet_id] = []
    active_connections[worksheet_id].append(websocket)
    
    logger.info(f"WebSocket connected for worksheet {worksheet_id}")
    
    try:
        # Send current worksheet state
        service = get_worksheet_service()
        worksheet = service.get_worksheet(worksheet_id)
        if worksheet:
            await websocket.send_json({
                "type": "worksheet_updated",
                "worksheet": worksheet.to_dict()
            })
        
        # Keep connection alive and handle messages
        while True:
            data = await websocket.receive_json()
            
            # Handle ping/pong for keepalive
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            
            # Could handle other client messages here
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for worksheet {worksheet_id}")
    except Exception as e:
        logger.error(f"WebSocket error for worksheet {worksheet_id}: {e}")
    finally:
        # Remove from tracked connections
        if worksheet_id in active_connections:
            active_connections[worksheet_id] = [
                ws for ws in active_connections[worksheet_id] 
                if ws != websocket
            ]
            if not active_connections[worksheet_id]:
                del active_connections[worksheet_id]


@router.websocket("/ws/manager/feed")
async def manager_feed_websocket(websocket: WebSocket):
    """
    Real-time feed of all worksheet activity for sales floor dashboard.
    
    Messages sent:
    - new_worksheet: New worksheet created
    - worksheet_updated: Any worksheet changed
    - hot_lead: Lead score exceeded threshold
    - customer_ready: Customer ready to deal
    """
    await websocket.accept()
    manager_connections.append(websocket)
    
    logger.info("Manager WebSocket connected to feed")
    
    try:
        # Send current active worksheets
        service = get_worksheet_service()
        active = service.get_active_worksheets()
        await websocket.send_json({
            "type": "initial_state",
            "worksheets": [w.model_dump() for w in active]
        })
        
        # Keep connection alive
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        logger.info("Manager WebSocket disconnected from feed")
    except Exception as e:
        logger.error(f"Manager WebSocket error: {e}")
    finally:
        manager_connections.remove(websocket)


# ---
# HELPER FUNCTIONS FOR BROADCASTING
# ---

async def broadcast_worksheet_update(worksheet: Worksheet):
    """Broadcast worksheet update to connected clients."""
    worksheet_id = worksheet.id
    
    # Send to worksheet-specific connections
    if worksheet_id in active_connections:
        message = {
            "type": "worksheet_updated",
            "worksheet": worksheet.to_dict()
        }
        for ws in active_connections[worksheet_id]:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to worksheet WebSocket: {e}")
    
    # Send to manager feed
    summary = WorksheetSummary.from_worksheet(worksheet)
    manager_message = {
        "type": "worksheet_updated",
        "worksheet": summary.model_dump()
    }
    for ws in manager_connections:
        try:
            await ws.send_json(manager_message)
        except Exception as e:
            logger.error(f"Failed to send to manager WebSocket: {e}")


async def broadcast_new_worksheet(worksheet: Worksheet):
    """Broadcast new worksheet to manager feed."""
    summary = WorksheetSummary.from_worksheet(worksheet)
    message = {
        "type": "new_worksheet",
        "worksheet": summary.model_dump()
    }
    for ws in manager_connections:
        try:
            await ws.send_json(message)
        except Exception as e:
            logger.error(f"Failed to broadcast new worksheet: {e}")


async def broadcast_customer_ready(worksheet: Worksheet):
    """Broadcast customer ready alert to manager feed."""
    summary = WorksheetSummary.from_worksheet(worksheet)
    message = {
        "type": "customer_ready",
        "worksheet": summary.model_dump(),
        "alert": f"🔥 Customer ready on {worksheet.vehicle.year} {worksheet.vehicle.model}!"
    }
    for ws in manager_connections:
        try:
            await ws.send_json(message)
        except Exception as e:
            logger.error(f"Failed to broadcast customer ready: {e}")
