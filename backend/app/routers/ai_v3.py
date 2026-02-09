"""
Quirk AI Kiosk - Intelligent AI Assistant Router (V3)
Production-grade AI with persistent memory, tool use, and smart vehicle retrieval.

Key Features:
- Persistent conversation state across turns
- Semantic vehicle retrieval (RAG-lite)
- Claude tool use for real actions
- Dynamic context building
- Outcome tracking for learning
- Rate limiting (30 requests/minute per session)

This module has been refactored for maintainability:
- Tools defined in: app/ai/tools.py
- System prompt in: app/ai/prompts.py
- Tool execution in: app/ai/tool_executor.py
- Helpers in: app/ai/helpers.py
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import httpx
import re
import logging
import asyncio
import random
from datetime import datetime

# Rate limiting
from slowapi import Limiter

# Core services
from app.services.conversation_state import (
    ConversationStateManager,
    ConversationState,
    get_state_manager
)
from app.services.vehicle_retriever import (
    SemanticVehicleRetriever,
    ScoredVehicle,
    get_vehicle_retriever
)
from app.services.outcome_tracker import (
    OutcomeTracker,
    ConversationOutcome,
    get_outcome_tracker
)
from app.services.notifications import get_notification_service

# Security
from app.core.security import get_key_manager

# AI Module imports
from app.ai.tools import TOOLS
from app.ai.prompts import SYSTEM_PROMPT_TEMPLATE
from app.ai.tool_executor import execute_tool
from app.ai.helpers import (
    build_dynamic_context,
    build_inventory_context,
    generate_fallback_response,
)

router = APIRouter()
logger = logging.getLogger("quirk_ai.intelligent")

# ---
# CONFIGURATION
# ---

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
PROMPT_VERSION = "3.7.0"  # Added Digital Worksheet tool
MODEL_NAME = "claude-sonnet-4-5-20250929"  # Sonnet 4.5
MAX_CONTEXT_TOKENS = 4000

# Retry configuration
MAX_RETRIES = 3
BASE_DELAY = 1.0
MAX_DELAY = 10.0


# ---
# RATE LIMITER SETUP
# ---

def get_session_identifier(request: Request) -> str:
    """
    Get session ID for rate limiting AI chat requests.
    Uses X-Session-ID header if available, falls back to IP.
    """
    session_id = request.headers.get("X-Session-ID", "")
    if session_id:
        return f"session:{session_id}"
    
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return f"ip:{forwarded.split(',')[0].strip()}"
    
    return f"ip:{request.client.host if request.client else 'unknown'}"


ai_limiter = Limiter(key_func=get_session_identifier)


async def call_with_retry(
    func,
    max_retries: int = MAX_RETRIES,
    base_delay: float = BASE_DELAY,
    max_delay: float = MAX_DELAY,
    *args,
    **kwargs
) -> Any:
    """Execute an async function with exponential backoff retry."""
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            return await func(*args, **kwargs)
        except (httpx.HTTPStatusError, httpx.RequestError, httpx.TimeoutException) as e:
            last_exception = e
            
            if attempt < max_retries - 1:
                delay = min(base_delay * (2 ** attempt), max_delay)
                delay = delay * (0.8 + random.random() * 0.4)
                
                logger.warning(
                    f"API call failed (attempt {attempt + 1}/{max_retries}), "
                    f"retrying in {delay:.2f}s: {str(e)}"
                )
                
                await asyncio.sleep(delay)
            else:
                logger.error(f"API call failed after {max_retries} attempts: {str(e)}")
    
    raise last_exception


# ---
# REQUEST/RESPONSE MODELS
# ---

class ConversationMessage(BaseModel):
    role: str
    content: str


class IntelligentChatRequest(BaseModel):
    message: str
    session_id: str
    conversation_history: List[ConversationMessage] = []
    customer_name: Optional[str] = None


class VehicleRecommendation(BaseModel):
    stock_number: str
    model: str
    price: Optional[float]
    match_reasons: List[str]
    score: float


class IntelligentChatResponse(BaseModel):
    message: str
    vehicles: Optional[List[VehicleRecommendation]] = None
    conversation_state: Optional[Dict[str, Any]] = None
    tools_used: List[str] = []
    staff_notified: bool = False
    worksheet_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


# ---
# MAIN CHAT ENDPOINT
# ---

@router.post("/chat", response_model=IntelligentChatResponse)
@ai_limiter.limit("30/minute")
async def intelligent_chat(
    chat_request: IntelligentChatRequest,
    background_tasks: BackgroundTasks,
    request: Request
):
    """
    Intelligent chat endpoint with persistent memory and tool use.
    
    Rate limited to 30 requests per minute per session to prevent API abuse.
    
    Features:
    - Persistent conversation state
    - Semantic vehicle retrieval
    - Claude tool use for real actions
    - Dynamic context building
    - Digital Worksheet creation
    """
    start_time = datetime.utcnow()
    tools_used = []
    all_vehicles = []
    staff_notified = False
    worksheet_id = None
    
    # Get services
    key_manager = get_key_manager()
    api_key = key_manager.anthropic_key
    state_manager = get_state_manager()
    retriever = get_vehicle_retriever()
    outcome_tracker = get_outcome_tracker()
    
    # Check API key
    if not api_key:
        return IntelligentChatResponse(
            message=generate_fallback_response(chat_request.message, chat_request.customer_name),
            metadata={"fallback": True, "reason": "no_api_key"}
        )
    
    # Ensure retriever is fitted with inventory
    if not retriever._is_fitted:
        try:
            from app.routers.inventory import INVENTORY
            retriever.fit(INVENTORY)
            logger.info(f"Fitted retriever with {len(INVENTORY)} vehicles")
        except Exception as e:
            logger.error(f"Failed to load inventory for retriever: {e}")
    
    # Get or create conversation state
    state = state_manager.get_or_create_state(
        chat_request.session_id,
        chat_request.customer_name
    )
    
    # Extract budget from user message if mentioned
    user_msg_lower = chat_request.message.lower()
    budget_patterns = [
        r'under\s*\$?([\d,]+)\s*k\b',
        r'under\s*\$?([\d,]+)\b',
        r'below\s*\$?([\d,]+)\s*k\b',
        r'below\s*\$?([\d,]+)\b',
        r'less\s*than\s*\$?([\d,]+)\s*k\b',
        r'less\s*than\s*\$?([\d,]+)\b',
        r'budget\s*(?:is|of)?\s*\$?([\d,]+)\s*k\b',
        r'budget\s*(?:is|of)?\s*\$?([\d,]+)\b',
        r'\$?([\d,]+)\s*k?\s*(?:or\s*less|max|maximum)',
    ]
    for pattern in budget_patterns:
        match = re.search(pattern, user_msg_lower)
        if match:
            amount_str = match.group(1).replace(',', '')
            amount = float(amount_str)
            if 'k' in pattern or amount < 1000:
                amount *= 1000
            state.budget_max = int(amount)
            logger.info(f"Extracted budget from user message: ${state.budget_max:,.0f}")
            break
    
    # Build dynamic system prompt
    conversation_context = build_dynamic_context(state)
    inventory_context = build_inventory_context(retriever)
    
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        conversation_context=conversation_context,
        inventory_context=inventory_context
    )
    
    # Build messages
    messages = []
    for msg in chat_request.conversation_history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})
    
    # Add current message with context hints
    user_message = chat_request.message
    if chat_request.customer_name and not chat_request.conversation_history:
        user_message = f"(Customer's name is {chat_request.customer_name}) {chat_request.message}"
    
    messages.append({"role": "user", "content": user_message})
    
    try:
        # Initial API call with tools
        async with httpx.AsyncClient() as client:
            response = await client.post(
                ANTHROPIC_API_URL,
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01"  # FIXED: Updated API version
                },
                json={
                    "model": MODEL_NAME,
                    "max_tokens": 2048,
                    "system": system_prompt,
                    "messages": messages,
                    "tools": TOOLS,
                },
                timeout=45.0
            )
            
            if response.status_code != 200:
                error_body = response.text
                logger.error(f"Anthropic API error: {response.status_code} - {error_body}")
                raise Exception(f"API error: {response.status_code} - {error_body[:200]}")
            
            result = response.json()
        
        # Process response - handle tool use loop
        max_tool_iterations = 5
        iteration = 0
        final_response = ""
        
        while iteration < max_tool_iterations:
            iteration += 1
            
            stop_reason = result.get("stop_reason")
            content_blocks = result.get("content", [])
            
            # Extract text and tool use blocks
            text_content = ""
            tool_use_blocks = []
            
            for block in content_blocks:
                if block.get("type") == "text":
                    text_content += block.get("text", "")
                elif block.get("type") == "tool_use":
                    tool_use_blocks.append(block)
            
            # If no tool use, we're done
            if stop_reason != "tool_use" or not tool_use_blocks:
                final_response = text_content
                break
            
            # Execute tools and collect results
            tool_results = []
            
            for tool_block in tool_use_blocks:
                tool_name = tool_block.get("name")
                tool_id = tool_block.get("id")
                tool_input = tool_block.get("input", {})
                
                tools_used.append(tool_name)
                logger.info(f"Executing tool: {tool_name} with input: {tool_input}")
                
                # Execute the tool
                tool_result, vehicles, notified = await execute_tool(
                    tool_name,
                    tool_input,
                    state,
                    retriever,
                    state_manager
                )
                
                all_vehicles.extend(vehicles)
                if notified:
                    staff_notified = True
                
               # Check if worksheet was created (extract ID from result)
                if tool_name == "create_worksheet" and "WORKSHEET ID:" in str(tool_result):
                    ws_match = re.search(r'WORKSHEET ID: ([a-f0-9-]+)', str(tool_result))
                    if ws_match:
                        worksheet_id = ws_match.group(1)
                
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_id,
                    "content": tool_result
                })
            
            # Continue conversation with tool results
            messages.append({"role": "assistant", "content": content_blocks})
            messages.append({"role": "user", "content": tool_results})
            
            # Make another API call
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    ANTHROPIC_API_URL,
                    headers={
                        "Content-Type": "application/json",
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01"  # FIXED: Updated API version
                    },
                    json={
                        "model": MODEL_NAME,
                        "max_tokens": 2048,
                        "system": system_prompt,
                        "messages": messages,
                        "tools": TOOLS,
                    },
                    timeout=45.0
                )
                
                if response.status_code != 200:
                    error_body = response.text
                    logger.error(f"Anthropic API error in tool loop: {response.status_code} - {error_body}")
                    break
                
                result = response.json()
        
        # Update conversation state
        mentioned_vehicles = [sv.vehicle for sv in all_vehicles] if all_vehicles else None
        state = state_manager.update_state(
            session_id=chat_request.session_id,
            user_message=chat_request.message,
            assistant_response=final_response,
            mentioned_vehicles=mentioned_vehicles,
            customer_name=chat_request.customer_name
        )
        
        # Record quality signal
        if tools_used:
            outcome_tracker.record_signal(
                chat_request.session_id,
                "positive",
                f"Used tools: {', '.join(tools_used)}"
            )
        
        # Build response
        vehicle_recommendations = None
        if all_vehicles:
            vehicle_recommendations = [
                VehicleRecommendation(
                    stock_number=sv.vehicle.get('Stock Number') or sv.vehicle.get('stockNumber', ''),
                    model=f"{sv.vehicle.get('Year', '')} {sv.vehicle.get('Model', '')} {sv.vehicle.get('Trim', '')}".strip(),
                    price=sv.vehicle.get('MSRP') or sv.vehicle.get('price'),
                    match_reasons=sv.match_reasons[:3],
                    score=sv.score
                )
                for sv in all_vehicles[:6]
            ]
        
        latency_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        return IntelligentChatResponse(
            message=final_response,
            vehicles=vehicle_recommendations,
            conversation_state=state.to_dict(),
            tools_used=tools_used,
            staff_notified=staff_notified,
            worksheet_id=worksheet_id,
            metadata={
                "prompt_version": PROMPT_VERSION,
                "model": MODEL_NAME,
                "latency_ms": round(latency_ms, 2),
                "tool_iterations": iteration,
                "conversation_stage": state.stage.value,
                "interest_level": state.interest_level.value,
            }
        )
        
    except httpx.TimeoutException:
        logger.error("API timeout")
        outcome_tracker.record_signal(chat_request.session_id, "negative", "API timeout")
        return IntelligentChatResponse(
            message=generate_fallback_response(chat_request.message, chat_request.customer_name),
            metadata={"fallback": True, "reason": "timeout"}
        )
    except Exception as e:
        logger.exception(f"Intelligent chat error: {e}")
        outcome_tracker.record_signal(chat_request.session_id, "negative", f"Error: {str(e)[:50]}")
        return IntelligentChatResponse(
            message=generate_fallback_response(chat_request.message, chat_request.customer_name),
            metadata={"fallback": True, "reason": "error", "error": str(e)[:100]}
        )


# ---
# NOTIFY STAFF ENDPOINT
# ---

class NotifyStaffRequest(BaseModel):
    """Request to notify staff"""
    notification_type: str = Field(default="sales", description="Type: sales, vehicle_request, appraisal, or finance")
    message: str = Field(description="Message describing what customer needs")
    vehicle_stock: Optional[str] = Field(default=None, description="Stock number if applicable")
    vehicle_info: Optional[Dict[str, Any]] = Field(default=None, description="Vehicle details")


@router.post("/notify-staff")
async def notify_staff_endpoint(
    request: NotifyStaffRequest,
    http_request: Request
):
    """
    Notify staff when customer requests assistance.
    Sends notifications via Slack, SMS, and/or Email.
    """
    session_id = http_request.headers.get("X-Session-ID", "unknown")
    state_manager = get_state_manager()
    state = state_manager.get_state(session_id)
    
    additional_context = {}
    customer_name = None
    
    if state:
        customer_name = state.customer_name
        if state.budget_max:
            additional_context["budget"] = state.budget_max
        if state.trade_model:
            additional_context["trade_in"] = f"{state.trade_year or ''} {state.trade_make or ''} {state.trade_model}".strip()
        if state.vehicle_preferences:
            additional_context["preferences"] = state.vehicle_preferences
    
    if request.vehicle_info:
        additional_context["vehicle_info"] = request.vehicle_info
    
    try:
        notification_service = get_notification_service()
        result = await notification_service.notify_staff(
            notification_type=request.notification_type,
            message=request.message,
            session_id=session_id,
            vehicle_stock=request.vehicle_stock,
            customer_name=customer_name,
            additional_context=additional_context
        )
        
        if state:
            state.staff_notified = True
            state.staff_notification_type = request.notification_type
            if request.notification_type == "appraisal":
                state.appraisal_requested = True
            elif request.notification_type == "sales":
                state.test_drive_requested = True
            elif request.notification_type == "vehicle_request":
                state.vehicle_requested = True
                if request.vehicle_stock:
                    state.requested_vehicle_stock = request.vehicle_stock
            state_manager.save_state(state)
        
        return {
            "success": True,
            "slack_sent": result.get("slack_sent", False),
            "sms_sent": result.get("sms_sent", False),
            "email_sent": result.get("email_sent", False),
            "errors": result.get("errors", [])
        }
    except Exception as e:
        logger.error(f"Failed to send staff notification: {e}")
        return {
            "success": False,
            "slack_sent": False,
            "sms_sent": False,
            "email_sent": False,
            "errors": [str(e)]
        }


# ---
# ADDITIONAL ENDPOINTS
# ---

@router.get("/state/{session_id}")
async def get_conversation_state(session_id: str):
    """Get current conversation state for a session"""
    state_manager = get_state_manager()
    state = state_manager.get_state(session_id)
    
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return state.to_dict()


@router.post("/state/{session_id}/favorite/{stock_number}")
async def mark_vehicle_favorite(session_id: str, stock_number: str):
    """Mark a vehicle as favorite for a session"""
    state_manager = get_state_manager()
    state_manager.mark_vehicle_favorite(session_id, stock_number)
    return {"status": "ok", "stock_number": stock_number}


@router.get("/lookup/phone/{phone_number}")
async def lookup_by_phone(phone_number: str):
    """Look up a previous conversation by phone number."""
    state_manager = get_state_manager()
    
    phone_digits = ''.join(c for c in phone_number if c.isdigit())
    
    if len(phone_digits) != 10:
        raise HTTPException(
            status_code=400, 
            detail="Phone number must be exactly 10 digits"
        )
    
    state = state_manager.get_state_by_phone(phone_digits)
    
    if not state:
        raise HTTPException(
            status_code=404, 
            detail="No conversation found for this phone number"
        )
    
    return {
        "found": True,
        "phone_last_four": phone_digits[-4:],
        "conversation": state.to_dict()
    }


@router.post("/state/{session_id}/phone/{phone_number}")
async def save_customer_phone(session_id: str, phone_number: str):
    """Save customer phone number to session for future lookup"""
    state_manager = get_state_manager()
    
    phone_digits = ''.join(c for c in phone_number if c.isdigit())
    
    if len(phone_digits) != 10:
        raise HTTPException(
            status_code=400, 
            detail="Phone number must be exactly 10 digits"
        )
    
    state = state_manager.get_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    
    state_manager.set_customer_phone(session_id, phone_digits)
    state_manager.persist_session(session_id)
    
    return {
        "status": "ok",
        "phone_last_four": phone_digits[-4:],
        "message": "Phone saved. Customer can continue conversation in future visits."
    }


@router.post("/state/{session_id}/finalize")
async def finalize_conversation(
    session_id: str,
    outcome: Optional[str] = None
):
    """Finalize a conversation and record outcome"""
    state_manager = get_state_manager()
    outcome_tracker = get_outcome_tracker()
    
    state = state_manager.get_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    
    outcome_enum = None
    if outcome:
        try:
            outcome_enum = ConversationOutcome(outcome)
        except ValueError:
            pass
    
    record = outcome_tracker.finalize_conversation(
        state,
        outcome=outcome_enum,
        prompt_version=PROMPT_VERSION
    )
    
    return record.to_dict()


@router.get("/analytics")
async def get_analytics():
    """Get AI conversation analytics"""
    outcome_tracker = get_outcome_tracker()
    return outcome_tracker.get_analytics()


@router.get("/analytics/suggestions")
async def get_improvement_suggestions():
    """Get suggestions for AI improvement"""
    outcome_tracker = get_outcome_tracker()
    return outcome_tracker.get_improvement_suggestions()


@router.get("/health")
async def health_check():
    """Health check for intelligent AI service"""
    key_manager = get_key_manager()
    retriever = get_vehicle_retriever()
    
    return {
        "status": "healthy",
        "version": PROMPT_VERSION,
        "model": MODEL_NAME,
        "api_key_configured": bool(key_manager.anthropic_key),
        "retriever_fitted": retriever._is_fitted,
        "inventory_count": len(retriever.inventory) if retriever._is_fitted else 0,
    }
