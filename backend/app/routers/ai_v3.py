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
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import httpx
import json
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
PROMPT_VERSION = "4.0.0"  # Major upgrade: TS migration, streaming, Redis caching, prompt caching
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
    state = await state_manager.get_or_create_state(
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
                    "anthropic-version": "2023-06-01",
                    "anthropic-beta": "prompt-caching-2024-07-31",
                },
                json={
                    "model": MODEL_NAME,
                    "max_tokens": 2048,
                    "system": [
                        {
                            "type": "text",
                            "text": system_prompt,
                            "cache_control": {"type": "ephemeral"}
                        }
                    ],
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

            # Log token usage including prompt cache metrics
            usage = result.get("usage", {})
            cache_creation = usage.get("cache_creation_input_tokens", 0)
            cache_read = usage.get("cache_read_input_tokens", 0)
            input_tokens = usage.get("input_tokens", 0)
            logger.info(
                f"AI Token Usage - Input: {input_tokens}, "
                f"Cache Created: {cache_creation}, Cache Read: {cache_read}, "
                f"Output: {usage.get('output_tokens', 0)}, "
                f"Session: {chat_request.session_id}"
            )
        
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
                        "anthropic-version": "2023-06-01",
                        "anthropic-beta": "prompt-caching-2024-07-31",
                    },
                    json={
                        "model": MODEL_NAME,
                        "max_tokens": 2048,
                        "system": [
                            {
                                "type": "text",
                                "text": system_prompt,
                                "cache_control": {"type": "ephemeral"}
                            }
                        ],
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

                # Log token usage including prompt cache metrics (tool loop)
                usage = result.get("usage", {})
                cache_creation = usage.get("cache_creation_input_tokens", 0)
                cache_read = usage.get("cache_read_input_tokens", 0)
                input_tokens = usage.get("input_tokens", 0)
                logger.info(
                    f"AI Token Usage (tool loop) - Input: {input_tokens}, "
                    f"Cache Created: {cache_creation}, Cache Read: {cache_read}, "
                    f"Output: {usage.get('output_tokens', 0)}, "
                    f"Session: {chat_request.session_id}"
                )
        
        # Update conversation state
        mentioned_vehicles = [sv.vehicle for sv in all_vehicles] if all_vehicles else None
        state = await state_manager.update_state(
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
# STREAMING CHAT ENDPOINT
# ---

@router.post("/chat/stream")
@ai_limiter.limit("30/minute")
async def intelligent_chat_stream(
    chat_request: IntelligentChatRequest,
    background_tasks: BackgroundTasks,
    request: Request
):
    """
    Streaming version of intelligent chat.
    Returns Server-Sent Events with progressive updates.

    Event types:
    - thinking: AI is processing (sent immediately)
    - tool_start: Tool execution beginning
    - tool_result: Tool execution complete
    - text_delta: Incremental text from Claude
    - vehicles: Vehicle recommendations
    - worksheet: Worksheet created
    - done: Response complete with final metadata
    - error: Error occurred
    """
    async def event_stream():
        tools_used = []
        all_vehicles = []
        staff_notified = False
        worksheet_id = None

        # Get services
        key_manager = get_key_manager()
        api_key = key_manager.anthropic_key
        state_manager = get_state_manager()
        retriever = get_vehicle_retriever()

        if not api_key:
            fallback = generate_fallback_response(
                chat_request.message, chat_request.customer_name
            )
            yield f"event: text_delta\ndata: {json.dumps({'text': fallback})}\n\n"
            yield f"event: done\ndata: {json.dumps({'fallback': True})}\n\n"
            return

        # Send thinking event immediately
        yield f"event: thinking\ndata: {json.dumps({'status': 'processing'})}\n\n"

        # Ensure retriever is fitted with inventory
        if not retriever._is_fitted:
            try:
                from app.routers.inventory import INVENTORY
                retriever.fit(INVENTORY)
            except Exception:
                pass

        # Get or create conversation state
        state = await state_manager.get_or_create_state(
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
                logger.info(
                    f"Extracted budget from user message: ${state.budget_max:,.0f}"
                )
                break

        # Build dynamic system prompt (same as non-streaming)
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
            user_message = (
                f"(Customer's name is {chat_request.customer_name}) "
                f"{chat_request.message}"
            )
        messages.append({"role": "user", "content": user_message})

        try:
            max_tool_iterations = 5
            iteration = 0

            while iteration < max_tool_iterations:
                iteration += 1

                # Call Anthropic API with streaming
                async with httpx.AsyncClient() as client:
                    async with client.stream(
                        "POST",
                        ANTHROPIC_API_URL,
                        headers={
                            "Content-Type": "application/json",
                            "x-api-key": api_key,
                            "anthropic-version": "2023-06-01",
                            "anthropic-beta": "prompt-caching-2024-07-31",
                        },
                        json={
                            "model": MODEL_NAME,
                            "max_tokens": 2048,
                            "system": [
                                {
                                    "type": "text",
                                    "text": system_prompt,
                                    "cache_control": {"type": "ephemeral"}
                                }
                            ],
                            "messages": messages,
                            "tools": TOOLS,
                            "stream": True,
                        },
                        timeout=60.0,
                    ) as response:
                        if response.status_code != 200:
                            error_body = await response.aread()
                            logger.error(
                                f"Anthropic streaming API error: "
                                f"{response.status_code} - {error_body[:500]}"
                            )
                            yield (
                                f"event: error\n"
                                f"data: {json.dumps({'error': f'API error: {response.status_code}'})}\n\n"
                            )
                            return

                        # Parse SSE stream from Anthropic
                        text_content = ""
                        tool_use_blocks = []
                        current_tool = None
                        current_tool_input = ""
                        stop_reason = None
                        content_blocks = []
                        stream_usage = {}  # Track token usage from streaming events

                        async for line in response.aiter_lines():
                            if not line.startswith("data: "):
                                continue

                            data_str = line[6:]  # Remove "data: " prefix
                            if data_str == "[DONE]":
                                break

                            try:
                                event_data = json.loads(data_str)
                            except json.JSONDecodeError:
                                continue

                            event_type = event_data.get("type", "")

                            if event_type == "message_start":
                                # Capture initial usage (input tokens, cache metrics)
                                msg = event_data.get("message", {})
                                msg_usage = msg.get("usage", {})
                                stream_usage.update(msg_usage)

                            elif event_type == "content_block_start":
                                block = event_data.get("content_block", {})
                                if block.get("type") == "tool_use":
                                    current_tool = {
                                        "type": "tool_use",
                                        "id": block.get("id"),
                                        "name": block.get("name"),
                                        "input": {},
                                    }
                                    current_tool_input = ""
                                    yield (
                                        f"event: tool_start\n"
                                        f"data: {json.dumps({'tool': block.get('name')})}\n\n"
                                    )
                                elif block.get("type") == "text":
                                    # Starting a text block; nothing extra to yield yet
                                    pass

                            elif event_type == "content_block_delta":
                                delta = event_data.get("delta", {})
                                if delta.get("type") == "text_delta":
                                    text = delta.get("text", "")
                                    text_content += text
                                    yield (
                                        f"event: text_delta\n"
                                        f"data: {json.dumps({'text': text})}\n\n"
                                    )
                                elif delta.get("type") == "input_json_delta":
                                    current_tool_input += delta.get(
                                        "partial_json", ""
                                    )

                            elif event_type == "content_block_stop":
                                if current_tool:
                                    try:
                                        current_tool["input"] = (
                                            json.loads(current_tool_input)
                                            if current_tool_input
                                            else {}
                                        )
                                    except json.JSONDecodeError:
                                        current_tool["input"] = {}
                                    tool_use_blocks.append(current_tool)
                                    content_blocks.append(current_tool)
                                    current_tool = None
                                    current_tool_input = ""

                            elif event_type == "message_delta":
                                delta = event_data.get("delta", {})
                                stop_reason = delta.get("stop_reason")
                                # Capture output token usage from message_delta
                                delta_usage = event_data.get("usage", {})
                                if delta_usage:
                                    stream_usage.update(delta_usage)

                            elif event_type == "message_stop":
                                # End of message stream
                                pass

                        # Log token usage including prompt cache metrics (streaming)
                        cache_creation = stream_usage.get("cache_creation_input_tokens", 0)
                        cache_read = stream_usage.get("cache_read_input_tokens", 0)
                        input_tokens = stream_usage.get("input_tokens", 0)
                        logger.info(
                            f"AI Token Usage (stream) - Input: {input_tokens}, "
                            f"Cache Created: {cache_creation}, Cache Read: {cache_read}, "
                            f"Output: {stream_usage.get('output_tokens', 0)}, "
                            f"Session: {chat_request.session_id}"
                        )

                # Finalize text content block if we accumulated text
                if text_content:
                    # Add the text block to content_blocks for tool loop continuation
                    content_blocks_has_text = any(
                        b.get("type") == "text" for b in content_blocks
                    )
                    if not content_blocks_has_text:
                        content_blocks.insert(
                            0, {"type": "text", "text": text_content}
                        )

                # If no tool use, we're done
                if stop_reason != "tool_use" or not tool_use_blocks:
                    break

                # Execute tools
                tool_results = []
                for tool_block in tool_use_blocks:
                    tool_name = tool_block.get("name")
                    tool_id = tool_block.get("id")
                    tool_input = tool_block.get("input", {})

                    tools_used.append(tool_name)
                    logger.info(
                        f"Stream: Executing tool: {tool_name} "
                        f"with input: {tool_input}"
                    )

                    tool_result, vehicles, notified = await execute_tool(
                        tool_name, tool_input, state, retriever, state_manager
                    )

                    all_vehicles.extend(vehicles)
                    if notified:
                        staff_notified = True

                    # Check for worksheet
                    if (
                        tool_name == "create_worksheet"
                        and "WORKSHEET ID:" in str(tool_result)
                    ):
                        ws_match = re.search(
                            r'WORKSHEET ID: ([a-f0-9-]+)', str(tool_result)
                        )
                        if ws_match:
                            worksheet_id = ws_match.group(1)
                            yield (
                                f"event: worksheet\n"
                                f"data: {json.dumps({'worksheet_id': worksheet_id})}\n\n"
                            )

                    yield (
                        f"event: tool_result\n"
                        f"data: {json.dumps({'tool': tool_name, 'success': True})}\n\n"
                    )

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": tool_result,
                    })

                # Send vehicles if found
                if all_vehicles:
                    vehicle_data = []
                    for sv in all_vehicles[:6]:
                        vehicle_data.append({
                            "stock_number": (
                                sv.vehicle.get("Stock Number")
                                or sv.vehicle.get("stockNumber", "")
                            ),
                            "model": (
                                f"{sv.vehicle.get('Year', '')} "
                                f"{sv.vehicle.get('Model', '')} "
                                f"{sv.vehicle.get('Trim', '')}"
                            ).strip(),
                            "price": (
                                sv.vehicle.get("MSRP")
                                or sv.vehicle.get("price")
                            ),
                        })
                    yield (
                        f"event: vehicles\n"
                        f"data: {json.dumps({'vehicles': vehicle_data})}\n\n"
                    )

                # Continue conversation with tool results
                messages.append(
                    {"role": "assistant", "content": content_blocks}
                )
                messages.append({"role": "user", "content": tool_results})

                # Reset for next iteration
                text_content = ""
                tool_use_blocks = []
                content_blocks = []

            # Update conversation state
            try:
                mentioned_vehicles = (
                    [sv.vehicle for sv in all_vehicles]
                    if all_vehicles
                    else None
                )
                state_manager.update_state(
                    session_id=chat_request.session_id,
                    user_message=chat_request.message,
                    assistant_response=text_content,
                    mentioned_vehicles=mentioned_vehicles,
                    customer_name=chat_request.customer_name,
                )
            except Exception as e:
                logger.error(f"Failed to update state after stream: {e}")

            # Done event
            yield (
                f"event: done\n"
                f"data: {json.dumps({'tools_used': tools_used, 'staff_notified': staff_notified, 'worksheet_id': worksheet_id})}\n\n"
            )

        except Exception as e:
            logger.exception(f"Streaming chat error: {e}")
            yield (
                f"event: error\n"
                f"data: {json.dumps({'error': str(e)[:200]})}\n\n"
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
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
    
    state = await state_manager.get_state_by_phone(phone_digits)

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
