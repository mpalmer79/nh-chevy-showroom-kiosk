"""
Worksheet Service
Business logic for Digital Worksheet creation, updates, and management.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
import logging

from app.models.worksheet import (
    Worksheet,
    WorksheetStatus,
    WorksheetCreateRequest,
    WorksheetUpdateRequest,
    WorksheetManagerUpdate,
    WorksheetCounterOffer,
    WorksheetSummary,
    VehicleInfo,
    TradeInInfo,
    TermOption,
    StatusHistoryEntry,
)
from app.services.payment_calculator import get_payment_calculator
from app.services.vehicle_retriever import get_vehicle_retriever
from app.services.conversation_state import get_state_manager, ConversationState
from app.services.notifications import get_notification_service
from app.core.cache import get_cache

logger = logging.getLogger("quirk_ai.worksheet")


class WorksheetService:
    """
    Service for managing Digital Worksheets.
    Handles creation, updates, status changes, and manager interactions.
    """
    
    # Worksheet expiration (24 hours)
    EXPIRATION_HOURS = 24

    # Lead score thresholds
    HOT_LEAD_THRESHOLD = 70
    WARM_LEAD_THRESHOLD = 40

    # Redis key prefixes and TTL
    WS_KEY_PREFIX = "ws:"
    SESSION_WS_KEY_PREFIX = "session_ws:"
    WS_TTL = 86400  # 24 hours

    def __init__(self):
        self.calculator = get_payment_calculator()
        self.retriever = get_vehicle_retriever()
        self.state_manager = get_state_manager()
        self.notifications = get_notification_service()

        # In-memory store (L1 cache — replace with database in production)
        self._worksheets: Dict[str, Worksheet] = {}
        self._session_worksheets: Dict[str, List[str]] = {}  # session_id -> [worksheet_ids]

    async def _persist_worksheet(self, worksheet: Worksheet) -> bool:
        """Persist a worksheet to the L2 cache (Redis)."""
        try:
            cache = await get_cache()
            ws_key = f"{self.WS_KEY_PREFIX}{worksheet.id}"
            ws_data = worksheet.model_dump(mode="json")
            await cache.set(ws_key, ws_data, ttl=self.WS_TTL)
            return True
        except Exception as e:
            logger.warning(f"Failed to persist worksheet {worksheet.id} to cache: {e}")
            return False

    async def _persist_session_worksheets(self, session_id: str, worksheet_ids: List[str]) -> bool:
        """Persist the session -> worksheet_ids mapping to the L2 cache."""
        try:
            cache = await get_cache()
            session_key = f"{self.SESSION_WS_KEY_PREFIX}{session_id}"
            await cache.set(session_key, worksheet_ids, ttl=self.WS_TTL)
            return True
        except Exception as e:
            logger.warning(f"Failed to persist session worksheets for {session_id} to cache: {e}")
            return False

    async def _load_worksheet_from_cache(self, worksheet_id: str) -> Optional[Worksheet]:
        """Load a worksheet from the L2 cache (Redis)."""
        try:
            cache = await get_cache()
            ws_key = f"{self.WS_KEY_PREFIX}{worksheet_id}"
            data = await cache.get(ws_key)
            if data:
                worksheet = Worksheet.model_validate(data)
                logger.info(f"Loaded worksheet {worksheet_id} from cache")
                return worksheet
        except Exception as e:
            logger.warning(f"Failed to load worksheet {worksheet_id} from cache: {e}")
        return None

    async def _load_session_worksheets_from_cache(self, session_id: str) -> Optional[List[str]]:
        """Load session -> worksheet_ids mapping from the L2 cache."""
        try:
            cache = await get_cache()
            session_key = f"{self.SESSION_WS_KEY_PREFIX}{session_id}"
            data = await cache.get(session_key)
            if data and isinstance(data, list):
                return data
        except Exception as e:
            logger.warning(f"Failed to load session worksheets for {session_id} from cache: {e}")
        return None
    
    async def create_worksheet(
        self,
        request: WorksheetCreateRequest,
        state: Optional[ConversationState] = None
    ) -> Worksheet:
        """
        Create a new worksheet from request and conversation state.
        
        Args:
            request: WorksheetCreateRequest with required fields
            state: Optional conversation state (will fetch if not provided)
            
        Returns:
            Created Worksheet
            
        Raises:
            ValueError: If vehicle not found or invalid request
        """
        # Get vehicle from inventory
        vehicle_data = self.retriever.get_vehicle_by_stock(request.stock_number)
        if not vehicle_data:
            raise ValueError(f"Vehicle {request.stock_number} not found in inventory")
        
        # Get conversation state if not provided
        if state is None:
            state = self.state_manager.get_state(request.session_id)
        
        # Build vehicle info
        vehicle = VehicleInfo(
            stock_number=request.stock_number,
            year=vehicle_data.get('Year') or vehicle_data.get('year', 0),
            make=vehicle_data.get('Make') or vehicle_data.get('make', 'Chevrolet'),
            model=vehicle_data.get('Model') or vehicle_data.get('model', ''),
            trim=vehicle_data.get('Trim') or vehicle_data.get('trim'),
            exterior_color=vehicle_data.get('exteriorColor') or vehicle_data.get('Exterior Color'),
            interior_color=vehicle_data.get('interiorColor') or vehicle_data.get('Interior Color'),
            vin=vehicle_data.get('VIN') or vehicle_data.get('vin'),
            msrp=float(vehicle_data.get('MSRP') or vehicle_data.get('msrp') or vehicle_data.get('price', 0)),
        )
        
        # Determine down payment (request > state > 0)
        down_payment = request.down_payment or 0
        if not down_payment and state and hasattr(state, 'down_payment') and state.down_payment:
            down_payment = state.down_payment
        
        # Build trade-in info if applicable
        trade_in = None
        trade_equity = 0
        has_trade = False
        
        if request.include_trade and state:
            trade_model = getattr(state, 'trade_model', None)
            if trade_model:
                has_trade = True
                trade_payoff = getattr(state, 'trade_payoff', None) or 0
                
                trade_in = TradeInInfo(
                    year=getattr(state, 'trade_year', None),
                    make=getattr(state, 'trade_make', None),
                    model=trade_model,
                    trim=getattr(state, 'trade_trim', None),
                    mileage=getattr(state, 'trade_mileage', None),
                    condition=getattr(state, 'trade_condition', None),
                    has_lien=bool(trade_payoff),
                    lien_holder=getattr(state, 'trade_lender', None),
                    payoff_amount=trade_payoff,
                )
                
                # Equity is negative until appraised (only have payoff)
                if trade_payoff:
                    trade_equity = -trade_payoff
        
        # Calculate selling price
        selling_price = vehicle.get_selling_price()
        
        # Calculate amount to finance
        amount_financed = selling_price - down_payment - trade_equity
        amount_financed = max(0, amount_financed)
        
        # Generate term options
        term_results = self.calculator.generate_term_options(amount_financed)
        term_options = [
            TermOption(
                term_months=r.term_months,
                apr=r.apr,
                monthly_payment=r.monthly_payment,
                total_of_payments=r.total_of_payments,
                total_interest=r.total_interest,
                is_selected=False
            )
            for r in term_results
        ]
        
        # Auto-select term based on target monthly (if provided)
        selected_term = None
        monthly_target = request.monthly_payment_target
        if not monthly_target and state and hasattr(state, 'monthly_payment_target'):
            monthly_target = state.monthly_payment_target
        
        if monthly_target and term_options:
            # Find closest term to target
            best_match = min(
                term_options,
                key=lambda t: abs(t.monthly_payment - monthly_target)
            )
            best_match.is_selected = True
            selected_term = best_match.term_months
        
        # Calculate total due at signing
        total_due = self.calculator.calculate_total_due_at_signing(
            down_payment=down_payment,
            doc_fee=599,
            title_fee=25,
            registration_estimate=0,
        )
        
        # Determine monthly payment (selected or middle option)
        if selected_term and term_options:
            monthly = next(
                (t.monthly_payment for t in term_options if t.term_months == selected_term),
                term_options[1].monthly_payment if len(term_options) > 1 else 0
            )
        elif term_options:
            monthly = term_options[1].monthly_payment if len(term_options) > 1 else term_options[0].monthly_payment
        else:
            monthly = 0
        
        # Get customer info
        customer_name = request.customer_name
        customer_phone = request.customer_phone
        customer_email = request.customer_email
        
        if state:
            if not customer_name:
                customer_name = getattr(state, 'customer_name', None)
            if not customer_phone:
                customer_phone = getattr(state, 'customer_phone', None)
            if not customer_email:
                customer_email = getattr(state, 'customer_email', None)
        
        # Calculate lead score
        lead_score = self._calculate_lead_score(state, down_payment, amount_financed, has_trade)
        
        # Build worksheet
        now = datetime.utcnow()
        worksheet = Worksheet(
            id=str(uuid.uuid4()),
            session_id=request.session_id,
            created_at=now,
            updated_at=now,
            expires_at=now + timedelta(hours=self.EXPIRATION_HOURS),
            status=WorksheetStatus.DRAFT,
            status_history=[
                StatusHistoryEntry(
                    status=WorksheetStatus.DRAFT.value,
                    timestamp=now,
                    actor="system",
                    notes="Worksheet created"
                )
            ],
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_email=customer_email,
            vehicle=vehicle,
            has_trade=has_trade,
            trade_in=trade_in,
            selling_price=selling_price,
            trade_equity=trade_equity,
            down_payment=down_payment,
            amount_financed=amount_financed,
            term_options=term_options,
            selected_term=selected_term,
            total_due_at_signing=total_due,
            monthly_payment=monthly,
            lead_score=lead_score,
        )
        
        # Store worksheet (L1)
        self._worksheets[worksheet.id] = worksheet

        # Track by session (L1)
        if request.session_id not in self._session_worksheets:
            self._session_worksheets[request.session_id] = []
        self._session_worksheets[request.session_id].append(worksheet.id)

        # Write-through to L2 (Redis/cache)
        await self._persist_worksheet(worksheet)
        await self._persist_session_worksheets(
            request.session_id,
            self._session_worksheets[request.session_id]
        )

        # Notify sales floor if lead score is decent
        await self._notify_new_worksheet(worksheet)

        logger.info(
            f"Created worksheet {worksheet.id} for {vehicle.year} {vehicle.model} "
            f"@ ${selling_price:,.0f}, down=${down_payment:,.0f}, "
            f"monthly=${monthly:,.0f}, lead_score={lead_score}"
        )

        return worksheet

    async def get_worksheet(self, worksheet_id: str) -> Optional[Worksheet]:
        """Get worksheet by ID. Checks L1 (in-memory) then L2 (Redis)."""
        # Check L1
        worksheet = self._worksheets.get(worksheet_id)
        if worksheet:
            return worksheet

        # Check L2 (Redis/cache)
        loaded = await self._load_worksheet_from_cache(worksheet_id)
        if loaded:
            self._worksheets[worksheet_id] = loaded
            return loaded

        return None

    async def get_session_worksheets(self, session_id: str) -> List[Worksheet]:
        """Get all worksheets for a session. Checks L1 then L2."""
        worksheet_ids = self._session_worksheets.get(session_id)

        # If not in L1, check L2
        if worksheet_ids is None:
            cached_ids = await self._load_session_worksheets_from_cache(session_id)
            if cached_ids:
                self._session_worksheets[session_id] = cached_ids
                worksheet_ids = cached_ids
            else:
                worksheet_ids = []

        worksheets = []
        for wid in worksheet_ids:
            ws = await self.get_worksheet(wid)
            if ws:
                worksheets.append(ws)
        return worksheets
    
    def get_active_worksheets(self) -> List[WorksheetSummary]:
        """
        Get all active worksheets for sales floor dashboard.
        Sorted by lead_score DESC, then updated_at DESC.
        """
        active_statuses = [
            WorksheetStatus.DRAFT,
            WorksheetStatus.READY,
            WorksheetStatus.MANAGER_REVIEW,
            WorksheetStatus.NEGOTIATING,
        ]
        
        active = [
            WorksheetSummary.from_worksheet(w)
            for w in self._worksheets.values()
            if w.status in active_statuses
        ]
        
        # Sort by lead_score DESC, then updated_at DESC
        active.sort(key=lambda w: (-w.lead_score, -w.updated_at.timestamp()))
        
        return active
    
    async def update_worksheet(
        self,
        worksheet_id: str,
        updates: WorksheetUpdateRequest,
        actor: str = "customer"
    ) -> Worksheet:
        """
        Update worksheet with new values and recalculate.
        
        Args:
            worksheet_id: Worksheet to update
            updates: Fields to update
            actor: Who is making the update
            
        Returns:
            Updated Worksheet
            
        Raises:
            ValueError: If worksheet not found or not editable
        """
        worksheet = self._worksheets.get(worksheet_id)
        if not worksheet:
            raise ValueError(f"Worksheet {worksheet_id} not found")
        
        # Check if editable
        editable_statuses = [WorksheetStatus.DRAFT, WorksheetStatus.NEGOTIATING]
        if worksheet.status not in editable_statuses:
            raise ValueError(
                f"Worksheet is {worksheet.status.value} and cannot be edited by {actor}"
            )
        
        # Apply updates
        if updates.down_payment is not None:
            worksheet.down_payment = updates.down_payment
        
        if updates.selected_term is not None:
            worksheet.selected_term = updates.selected_term
            for opt in worksheet.term_options:
                opt.is_selected = (opt.term_months == updates.selected_term)
        
        if updates.trade_payoff is not None and worksheet.trade_in:
            worksheet.trade_in.payoff_amount = updates.trade_payoff
            worksheet.trade_in.has_lien = updates.trade_payoff > 0
        
        if updates.customer_name is not None:
            worksheet.customer_name = updates.customer_name
        
        if updates.customer_phone is not None:
            worksheet.customer_phone = updates.customer_phone
        
        if updates.customer_email is not None:
            worksheet.customer_email = updates.customer_email
        
        # Recalculate everything
        self._recalculate_worksheet(worksheet)
        
        # Update metadata
        worksheet.updated_at = datetime.utcnow()
        worksheet.adjustments_made += 1
        
        # Recalculate lead score (engagement increased)
        worksheet.lead_score = min(100, worksheet.lead_score + 2)
        
        logger.info(f"Updated worksheet {worksheet_id} by {actor}, adjustments={worksheet.adjustments_made}")

        # Write-through to L2 (Redis/cache)
        await self._persist_worksheet(worksheet)

        return worksheet

    async def select_term(self, worksheet_id: str, term_months: int) -> Worksheet:
        """Select a financing term"""
        updates = WorksheetUpdateRequest(selected_term=term_months)
        return await self.update_worksheet(worksheet_id, updates, actor="customer")
    
    async def mark_ready(self, worksheet_id: str) -> Worksheet:
        """
        Customer indicates they're ready to proceed.
        Changes status to READY and notifies sales manager.
        """
        worksheet = self._worksheets.get(worksheet_id)
        if not worksheet:
            raise ValueError(f"Worksheet {worksheet_id} not found")
        
        now = datetime.utcnow()
        
        # Update status
        worksheet.status = WorksheetStatus.READY
        worksheet.status_history.append(
            StatusHistoryEntry(
                status=WorksheetStatus.READY.value,
                timestamp=now,
                actor="customer",
                notes="Customer marked ready to proceed"
            )
        )
        worksheet.updated_at = now
        
        # Boost lead score
        worksheet.lead_score = min(100, worksheet.lead_score + 20)
        
        # Notify sales manager with priority
        try:
            vehicle_desc = f"{worksheet.vehicle.year} {worksheet.vehicle.model}"
            if worksheet.vehicle.trim:
                vehicle_desc += f" {worksheet.vehicle.trim}"
            
            await self.notifications.notify_staff(
                notification_type="sales",
                message=(
                    f"🔥 HOT LEAD READY: {vehicle_desc} | "
                    f"${worksheet.down_payment:,.0f} down | "
                    f"${worksheet.monthly_payment:,.0f}/mo | "
                    f"Score: {worksheet.lead_score}"
                ),
                vehicle_stock=worksheet.vehicle.stock_number,
                additional_context={
                    "worksheet_id": worksheet_id,
                    "customer_name": worksheet.customer_name,
                    "customer_phone": worksheet.customer_phone,
                    "selected_term": worksheet.selected_term,
                    "has_trade": worksheet.has_trade,
                }
            )
        except Exception as e:
            logger.error(f"Failed to notify staff for ready worksheet: {e}")
        
        logger.info(
            f"Worksheet {worksheet_id} marked READY - "
            f"lead_score={worksheet.lead_score}, notifying sales"
        )

        # Write-through to L2 (Redis/cache)
        await self._persist_worksheet(worksheet)

        return worksheet

    async def manager_review(self, worksheet_id: str, manager_id: str, manager_name: str = None) -> Worksheet:
        """Manager starts reviewing a worksheet"""
        worksheet = self._worksheets.get(worksheet_id)
        if not worksheet:
            raise ValueError(f"Worksheet {worksheet_id} not found")
        
        now = datetime.utcnow()
        
        worksheet.status = WorksheetStatus.MANAGER_REVIEW
        worksheet.manager_id = manager_id
        worksheet.manager_name = manager_name
        worksheet.status_history.append(
            StatusHistoryEntry(
                status=WorksheetStatus.MANAGER_REVIEW.value,
                timestamp=now,
                actor=f"manager:{manager_id}",
                notes=f"Manager {manager_name or manager_id} reviewing"
            )
        )
        worksheet.updated_at = now
        
        logger.info(f"Worksheet {worksheet_id} under manager review by {manager_name or manager_id}")

        # Write-through to L2 (Redis/cache)
        await self._persist_worksheet(worksheet)

        return worksheet

    async def manager_counter_offer(
        self,
        worksheet_id: str,
        counter_offer: WorksheetCounterOffer
    ) -> Worksheet:
        """
        Manager sends counter-offer to customer.
        Applies adjustment and pushes update.
        """
        worksheet = self._worksheets.get(worksheet_id)
        if not worksheet:
            raise ValueError(f"Worksheet {worksheet_id} not found")
        
        now = datetime.utcnow()
        
        # Apply adjustment (negative = discount)
        worksheet.manager_adjustment = counter_offer.adjustment
        worksheet.manager_notes = counter_offer.notes
        worksheet.manager_id = counter_offer.manager_id
        worksheet.manager_name = counter_offer.manager_name
        worksheet.counter_offer_sent = True
        worksheet.counter_offer_sent_at = now
        
        # Recalculate with new selling price
        worksheet.selling_price = worksheet.vehicle.msrp + counter_offer.adjustment
        self._recalculate_worksheet(worksheet)
        
        # Update status
        worksheet.status = WorksheetStatus.NEGOTIATING
        worksheet.status_history.append(
            StatusHistoryEntry(
                status=WorksheetStatus.NEGOTIATING.value,
                timestamp=now,
                actor=f"manager:{counter_offer.manager_id}",
                notes=f"Counter offer: ${counter_offer.adjustment:+,.0f} - {counter_offer.notes}"
            )
        )
        worksheet.updated_at = now
        
        logger.info(
            f"Manager counter-offer on {worksheet_id}: "
            f"${counter_offer.adjustment:+,.0f}, new price=${worksheet.selling_price:,.0f}"
        )
        
        # TODO: Push to customer via WebSocket

        # Write-through to L2 (Redis/cache)
        await self._persist_worksheet(worksheet)

        return worksheet

    async def manager_update(
        self,
        worksheet_id: str,
        updates: WorksheetManagerUpdate,
        manager_id: str
    ) -> Worksheet:
        """Generic manager update (notes, status, adjustment)"""
        worksheet = self._worksheets.get(worksheet_id)
        if not worksheet:
            raise ValueError(f"Worksheet {worksheet_id} not found")
        
        now = datetime.utcnow()
        
        if updates.manager_adjustment is not None:
            worksheet.manager_adjustment = updates.manager_adjustment
            worksheet.selling_price = worksheet.vehicle.msrp + updates.manager_adjustment
            self._recalculate_worksheet(worksheet)
        
        if updates.manager_notes is not None:
            worksheet.manager_notes = updates.manager_notes
        
        if updates.status is not None:
            old_status = worksheet.status
            worksheet.status = updates.status
            worksheet.status_history.append(
                StatusHistoryEntry(
                    status=updates.status.value,
                    timestamp=now,
                    actor=f"manager:{manager_id}",
                    notes=f"Status changed from {old_status.value}"
                )
            )
        
        worksheet.updated_at = now

        # Write-through to L2 (Redis/cache)
        await self._persist_worksheet(worksheet)

        return worksheet

    async def accept_deal(self, worksheet_id: str, manager_id: str) -> Worksheet:
        """Manager accepts the deal"""
        worksheet = self._worksheets.get(worksheet_id)
        if not worksheet:
            raise ValueError(f"Worksheet {worksheet_id} not found")

        now = datetime.utcnow()

        worksheet.status = WorksheetStatus.ACCEPTED
        worksheet.status_history.append(
            StatusHistoryEntry(
                status=WorksheetStatus.ACCEPTED.value,
                timestamp=now,
                actor=f"manager:{manager_id}",
                notes="Deal accepted"
            )
        )
        worksheet.updated_at = now

        logger.info(f"Worksheet {worksheet_id} ACCEPTED by manager {manager_id}")

        # TODO: Trigger CRM integration

        # Write-through to L2 (Redis/cache)
        await self._persist_worksheet(worksheet)

        return worksheet

    async def decline_worksheet(self, worksheet_id: str, actor: str, reason: str = None) -> Worksheet:
        """Mark worksheet as declined"""
        worksheet = self._worksheets.get(worksheet_id)
        if not worksheet:
            raise ValueError(f"Worksheet {worksheet_id} not found")

        now = datetime.utcnow()

        worksheet.status = WorksheetStatus.DECLINED
        worksheet.status_history.append(
            StatusHistoryEntry(
                status=WorksheetStatus.DECLINED.value,
                timestamp=now,
                actor=actor,
                notes=reason or "Declined"
            )
        )
        worksheet.updated_at = now

        # Write-through to L2 (Redis/cache)
        await self._persist_worksheet(worksheet)

        return worksheet
    
    def _recalculate_worksheet(self, worksheet: Worksheet):
        """Recalculate all dependent values after an update."""
        
        # Recalculate trade equity
        if worksheet.trade_in:
            value = worksheet.trade_in.appraised_value or worksheet.trade_in.estimated_value or 0
            payoff = worksheet.trade_in.payoff_amount or 0
            worksheet.trade_equity = value - payoff
            worksheet.trade_in.equity = worksheet.trade_equity
        
        # Recalculate amount financed
        worksheet.amount_financed = max(
            0,
            worksheet.selling_price - worksheet.down_payment - worksheet.trade_equity
        )
        
        # Regenerate term options
        term_results = self.calculator.generate_term_options(worksheet.amount_financed)
        worksheet.term_options = [
            TermOption(
                term_months=r.term_months,
                apr=r.apr,
                monthly_payment=r.monthly_payment,
                total_of_payments=r.total_of_payments,
                total_interest=r.total_interest,
                is_selected=(r.term_months == worksheet.selected_term)
            )
            for r in term_results
        ]
        
        # Update monthly payment
        if worksheet.selected_term and worksheet.term_options:
            selected_opt = next(
                (t for t in worksheet.term_options if t.term_months == worksheet.selected_term),
                worksheet.term_options[1] if len(worksheet.term_options) > 1 else worksheet.term_options[0]
            )
            worksheet.monthly_payment = selected_opt.monthly_payment
        elif worksheet.term_options:
            worksheet.monthly_payment = (
                worksheet.term_options[1].monthly_payment 
                if len(worksheet.term_options) > 1 
                else worksheet.term_options[0].monthly_payment
            )
        
        # Recalculate due at signing
        worksheet.total_due_at_signing = self.calculator.calculate_total_due_at_signing(
            down_payment=worksheet.down_payment,
            doc_fee=worksheet.doc_fee,
            title_fee=worksheet.title_fee,
        )
    
    def _calculate_lead_score(
        self,
        state: Optional[ConversationState],
        down_payment: float,
        amount_financed: float,
        has_trade: bool
    ) -> int:
        """
        Calculate lead score (0-100) based on buying signals.
        """
        score = 0
        
        # Has down payment ready (+15-25)
        if down_payment > 0:
            score += 15
            if down_payment >= 10000:
                score += 10
        
        if state:
            # Has phone number - can follow up (+15)
            if hasattr(state, 'customer_phone') and state.customer_phone:
                score += 15
            
            # Asked multiple questions - engaged (+10-20)
            message_count = getattr(state, 'message_count', 0)
            if message_count >= 5:
                score += 10
            if message_count >= 10:
                score += 10
            
            # Interest level from AI (+5-15)
            interest_level = getattr(state, 'interest_level', None)
            if interest_level:
                level_value = getattr(interest_level, 'value', str(interest_level))
                if level_value == "high":
                    score += 15
                elif level_value == "medium":
                    score += 5
        
        # Has trade-in - motivated to switch (+15)
        if has_trade:
            score += 15
        
        # Reasonable deal structure - not over-leveraged (+10)
        if amount_financed < 80000:
            score += 10
        
        return min(100, score)
    
    async def _notify_new_worksheet(self, worksheet: Worksheet):
        """Notify sales floor of new worksheet if lead score is decent."""
        
        if worksheet.lead_score >= self.WARM_LEAD_THRESHOLD:
            try:
                vehicle_desc = f"{worksheet.vehicle.year} {worksheet.vehicle.model}"
                if worksheet.vehicle.trim:
                    vehicle_desc += f" {worksheet.vehicle.trim}"
                
                priority = "🔥 " if worksheet.lead_score >= self.HOT_LEAD_THRESHOLD else ""
                
                await self.notifications.notify_staff(
                    notification_type="sales",
                    message=(
                        f"{priority}New worksheet: {vehicle_desc} | "
                        f"${worksheet.down_payment:,.0f} down | "
                        f"Score: {worksheet.lead_score}"
                    ),
                    vehicle_stock=worksheet.vehicle.stock_number,
                )
            except Exception as e:
                logger.error(f"Failed to notify staff of new worksheet: {e}")


# Singleton instance
_worksheet_service = None


def get_worksheet_service() -> WorksheetService:
    """Get the singleton WorksheetService instance."""
    global _worksheet_service
    if _worksheet_service is None:
        _worksheet_service = WorksheetService()
    return _worksheet_service
