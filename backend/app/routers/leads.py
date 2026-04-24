"""
Leads Router - CRM Integration for lead capture
Integrates with VinSolutions CRM in production
"""
from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import uuid

router = APIRouter()


class LeadCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    context_vin: Optional[str] = None
    context_page: str = "Kiosk Showroom"


class TestDriveRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    vehicle_id: str
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None


class InfoRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    vehicle_id: str
    questions: Optional[str] = None


class LeadResponse(BaseModel):
    id: str
    status: str
    message: str
    created_at: str


# In-memory storage for demo (would be CRM in production)
leads_store = []


@router.post("", response_model=LeadResponse)
async def submit_lead(lead: LeadCreate):
    """
    Submit a new customer lead to the CRM.
    In production, this integrates with VinSolutions CRM API.
    """
    lead_id = str(uuid.uuid4())[:8].upper()
    
    lead_record = {
        "id": lead_id,
        "first_name": lead.first_name,
        "last_name": lead.last_name,
        "email": lead.email,
        "phone": lead.phone,
        "context_vin": lead.context_vin,
        "context_page": lead.context_page,
        "source": "NH Chevy Showroom Kiosk",
        "status": "new",
        "created_at": datetime.utcnow().isoformat(),
    }
    
    leads_store.append(lead_record)
    
    return LeadResponse(
        id=lead_id,
        status="success",
        message="Thank you! A sales representative will contact you shortly.",
        created_at=lead_record["created_at"],
    )


@router.post("/test-drive", response_model=LeadResponse)
async def schedule_test_drive(request: TestDriveRequest):
    """
    Schedule a test drive appointment.
    Creates a lead with test drive context.
    """
    lead_id = str(uuid.uuid4())[:8].upper()
    
    lead_record = {
        "id": lead_id,
        "first_name": request.first_name,
        "last_name": request.last_name,
        "email": request.email,
        "phone": request.phone,
        "vehicle_id": request.vehicle_id,
        "preferred_date": request.preferred_date,
        "preferred_time": request.preferred_time,
        "lead_type": "test_drive",
        "source": "NH Chevy Showroom Kiosk",
        "status": "pending_confirmation",
        "created_at": datetime.utcnow().isoformat(),
    }
    
    leads_store.append(lead_record)
    
    return LeadResponse(
        id=lead_id,
        status="success",
        message="Your test drive request has been submitted. We'll confirm your appointment shortly.",
        created_at=lead_record["created_at"],
    )


@router.post("/info-request", response_model=LeadResponse)
async def request_more_info(request: InfoRequest):
    """
    Request more information about a vehicle.
    """
    lead_id = str(uuid.uuid4())[:8].upper()
    
    lead_record = {
        "id": lead_id,
        "first_name": request.first_name,
        "last_name": request.last_name,
        "email": request.email,
        "phone": request.phone,
        "vehicle_id": request.vehicle_id,
        "questions": request.questions,
        "lead_type": "info_request",
        "source": "NH Chevy Showroom Kiosk",
        "status": "new",
        "created_at": datetime.utcnow().isoformat(),
    }
    
    leads_store.append(lead_record)
    
    return LeadResponse(
        id=lead_id,
        status="success",
        message="Your request has been received. A product specialist will reach out with more information.",
        created_at=lead_record["created_at"],
    )


@router.get("/stats")
async def get_lead_stats():
    """
    Get lead statistics (for internal dashboard).
    """
    total = len(leads_store)
    by_type = {}
    by_status = {}
    
    for lead in leads_store:
        lead_type = lead.get("lead_type", "general")
        status = lead.get("status", "unknown")
        
        by_type[lead_type] = by_type.get(lead_type, 0) + 1
        by_status[status] = by_status.get(status, 0) + 1
    
    return {
        "total_leads": total,
        "by_type": by_type,
        "by_status": by_status,
        "recent": leads_store[-10:][::-1] if leads_store else [],
    }
