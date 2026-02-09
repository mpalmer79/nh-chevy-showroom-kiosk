"""
Digital Worksheet Models
Pydantic models for deal structuring worksheets.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import uuid


class WorksheetStatus(str, Enum):
    """Worksheet lifecycle status"""
    DRAFT = "draft"                    # Customer still adjusting
    READY = "ready"                    # Customer clicked "I'm ready"
    MANAGER_REVIEW = "manager_review"  # Manager is looking
    NEGOTIATING = "negotiating"        # Back-and-forth adjustments
    ACCEPTED = "accepted"              # Deal agreed
    EXPIRED = "expired"                # No action within 24h
    DECLINED = "declined"              # Customer walked away


class TermOption(BaseModel):
    """Single financing term option"""
    term_months: int
    apr: float
    monthly_payment: float
    total_of_payments: float
    total_interest: float
    is_selected: bool = False


class TradeInInfo(BaseModel):
    """Trade-in vehicle details"""
    # Vehicle info
    year: Optional[int] = None
    make: Optional[str] = None
    model: Optional[str] = None
    trim: Optional[str] = None
    mileage: Optional[int] = None
    condition: Optional[str] = None  # excellent/good/fair/poor
    vin: Optional[str] = None
    
    # Financial
    has_lien: bool = False
    lien_holder: Optional[str] = None
    payoff_amount: Optional[float] = None
    
    # Values (populated after appraisal or estimate)
    estimated_value: Optional[float] = None  # AI/BlackBook estimate
    appraised_value: Optional[float] = None  # Actual appraisal
    equity: Optional[float] = None  # Value minus payoff
    
    # Status
    appraisal_requested: bool = False
    appraisal_completed: bool = False
    appraisal_requested_at: Optional[datetime] = None
    appraisal_completed_at: Optional[datetime] = None


class VehicleInfo(BaseModel):
    """Target vehicle details for worksheet"""
    stock_number: str
    year: int
    make: str = "Chevrolet"
    model: str
    trim: Optional[str] = None
    exterior_color: Optional[str] = None
    interior_color: Optional[str] = None
    vin: Optional[str] = None
    msrp: float
    
    # Adjustments
    dealer_discount: float = 0
    rebates: float = 0
    accessories: float = 0
    destination_fee: float = 0
    
    # Calculated property
    @property
    def selling_price(self) -> float:
        """Calculate final selling price after adjustments"""
        return self.msrp - self.dealer_discount - self.rebates + self.accessories + self.destination_fee
    
    def get_selling_price(self) -> float:
        """Method version for serialization"""
        return self.selling_price


class StatusHistoryEntry(BaseModel):
    """Single status change record"""
    status: str
    timestamp: datetime
    actor: str  # 'customer', 'manager:name', 'system'
    notes: Optional[str] = None


class Worksheet(BaseModel):
    """Complete Digital Worksheet"""
    
    # Identification
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None  # 24 hours from creation
    
    # Status tracking
    status: WorksheetStatus = WorksheetStatus.DRAFT
    status_history: List[StatusHistoryEntry] = []
    
    # Customer info (from conversation state)
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    
    # Vehicle
    vehicle: VehicleInfo
    
    # Trade-in
    has_trade: bool = False
    trade_in: Optional[TradeInInfo] = None
    
    # Deal structure
    selling_price: float
    trade_equity: float = 0  # Can be negative (underwater)
    down_payment: float = 0
    
    # Calculated
    amount_financed: float = 0
    
    # Term options (always show 3)
    term_options: List[TermOption] = []
    selected_term: Optional[int] = None  # 60, 72, or 84
    
    # Taxes & fees (NH = no sales tax on vehicles)
    doc_fee: float = 599  # Quirk standard
    registration_estimate: float = 0
    title_fee: float = 25
    state: str = "NH"
    state_tax_rate: float = 0  # 0 for NH
    estimated_tax: float = 0
    
    # Totals
    total_due_at_signing: float = 0  # Down + fees
    monthly_payment: float = 0  # Selected term payment
    
    # Manager interaction
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None
    manager_notes: Optional[str] = None
    manager_adjustment: Optional[float] = None  # +/- from selling price
    counter_offer_sent: bool = False
    counter_offer_sent_at: Optional[datetime] = None
    
    # Conversion tracking
    lead_score: int = 0  # 0-100
    time_on_worksheet: int = 0  # seconds
    adjustments_made: int = 0  # how many times customer changed values
    
    class Config:
        use_enum_values = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        data = self.model_dump()
        # Handle vehicle selling price property
        if self.vehicle:
            data['vehicle']['selling_price'] = self.vehicle.get_selling_price()
        return data


# ---
# REQUEST/RESPONSE MODELS
# ---

class WorksheetCreateRequest(BaseModel):
    """Request to create a new worksheet"""
    session_id: str
    stock_number: str
    down_payment: Optional[float] = 0
    monthly_payment_target: Optional[float] = None
    include_trade: bool = False
    
    # Optional overrides
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None


class WorksheetUpdateRequest(BaseModel):
    """Request to update worksheet values (customer-side)"""
    down_payment: Optional[float] = None
    selected_term: Optional[int] = None
    trade_payoff: Optional[float] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None


class WorksheetManagerUpdate(BaseModel):
    """Manager-side updates"""
    manager_adjustment: Optional[float] = None  # Discount/markup (negative = discount)
    manager_notes: Optional[str] = None
    status: Optional[WorksheetStatus] = None


class WorksheetCounterOffer(BaseModel):
    """Counter offer from manager"""
    adjustment: float  # Negative = discount
    notes: str
    manager_id: str
    manager_name: Optional[str] = None


class WorksheetSendRequest(BaseModel):
    """Request to send worksheet to customer"""
    method: str  # 'sms' or 'email'
    destination: str  # phone number or email address


class WorksheetResponse(BaseModel):
    """Standard worksheet response"""
    success: bool
    worksheet: Optional[Worksheet] = None
    message: Optional[str] = None
    error: Optional[str] = None


class WorksheetListResponse(BaseModel):
    """Response for listing worksheets"""
    success: bool
    worksheets: List[Worksheet] = []
    total_count: int = 0
    message: Optional[str] = None


class WorksheetSummary(BaseModel):
    """Compact worksheet summary for dashboard lists"""
    id: str
    session_id: str
    status: WorksheetStatus
    created_at: datetime
    updated_at: datetime
    
    # Vehicle summary
    stock_number: str
    vehicle_year: int
    vehicle_model: str
    vehicle_trim: Optional[str] = None
    selling_price: float
    
    # Deal summary
    down_payment: float
    monthly_payment: float
    selected_term: Optional[int] = None
    
    # Customer
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    
    # Scoring
    lead_score: int = 0
    has_trade: bool = False
    
    # Manager
    counter_offer_sent: bool = False
    
    class Config:
        use_enum_values = True
    
    @classmethod
    def from_worksheet(cls, worksheet: Worksheet) -> "WorksheetSummary":
        """Create summary from full worksheet"""
        return cls(
            id=worksheet.id,
            session_id=worksheet.session_id,
            status=worksheet.status,
            created_at=worksheet.created_at,
            updated_at=worksheet.updated_at,
            stock_number=worksheet.vehicle.stock_number,
            vehicle_year=worksheet.vehicle.year,
            vehicle_model=worksheet.vehicle.model,
            vehicle_trim=worksheet.vehicle.trim,
            selling_price=worksheet.selling_price,
            down_payment=worksheet.down_payment,
            monthly_payment=worksheet.monthly_payment,
            selected_term=worksheet.selected_term,
            customer_name=worksheet.customer_name,
            customer_phone=worksheet.customer_phone,
            lead_score=worksheet.lead_score,
            has_trade=worksheet.has_trade,
            counter_offer_sent=worksheet.counter_offer_sent,
        )
