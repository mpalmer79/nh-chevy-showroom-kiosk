"""
NH Chevy Showroom Kiosk - AI Module
Modular components for intelligent AI assistant functionality.
"""

from app.ai.tools import TOOLS
from app.ai.prompts import SYSTEM_PROMPT_TEMPLATE
from app.ai.tool_executor import execute_tool
from app.ai.helpers import (
    build_dynamic_context,
    build_inventory_context,
    format_vehicle_for_response,
    format_vehicles_for_tool_result,
    format_vehicle_details_for_tool,
    generate_fallback_response,
    decode_model_number,
    GM_MODEL_DECODER,
)

__all__ = [
    "TOOLS",
    "SYSTEM_PROMPT_TEMPLATE",
    "execute_tool",
    "build_dynamic_context",
    "build_inventory_context",
    "format_vehicle_for_response",
    "format_vehicles_for_tool_result",
    "format_vehicle_details_for_tool",
    "generate_fallback_response",
    "decode_model_number",
    "GM_MODEL_DECODER",
]
