"""
NH Chevy Showroom Kiosk - AI Helper Functions
Utility functions for context building, formatting, and fallback responses.
"""

from typing import Dict, Any, List, Optional
from app.services.conversation_state import ConversationState
from app.services.vehicle_retriever import SemanticVehicleRetriever, ScoredVehicle


# ---
# GM MODEL NUMBER DECODER
# Maps GM model codes to human-readable vehicle descriptions
# ---

GM_MODEL_DECODER = {
    # Silverado 1500
    "CK10543": "Silverado 1500 4WD Crew Cab 147\"",
    "CK10703": "Silverado 1500 4WD Regular Cab 126\"",
    "CK10743": "Silverado 1500 4WD Crew Cab 157\"",
    "CK10753": "Silverado 1500 4WD Double Cab 147\"",
    "CK10903": "Silverado 1500 4WD Regular Cab 140\"",
    
    # Silverado HD
    "CK20743": "Silverado 2500HD 4WD Crew Cab 159\"",
    "CK30743": "Silverado 3500HD 4WD Crew Cab 159\"",
    "CK30903": "Silverado 3500HD 4WD Regular Cab 142\"",
    "CK30943": "Silverado 3500HD 4WD Crew Cab 172\"",
    "CK31003": "Silverado 3500HD Chassis Cab 4WD Regular Cab",
    
    # SUVs
    "CK10706": "Tahoe 4WD",
    "CK10906": "Suburban 4WD",
    
    # Colorado
    "14C43": "Colorado 4WD Crew Cab LT",
    "14G43": "Colorado 4WD Crew Cab Z71",
    
    # Equinox
    "1PT26": "Equinox AWD LT",
    "1PS26": "Equinox AWD RS",
    "1PR26": "Equinox AWD ACTIV",
    
    # Equinox EV
    "1MB48": "Equinox EV",
    "1MM48": "Equinox EV RS",
    
    # Traverse
    "1LB56": "Traverse AWD LT",
    "1LD56": "Traverse AWD RS / High Country",
    
    # Trax / Trailblazer
    "1TR58": "Trax FWD",
    "1TR56": "Trailblazer FWD",
    
    # Corvette
    "1YG07": "Corvette E-Ray Coupe",
    "1YR07": "Corvette ZR1 Coupe",
    
    # Commercial Vans
    "CG23405": "Express Cargo Van RWD 2500 135\"",
    "CG33405": "Express Cargo Van RWD 3500 135\"",
    "CG33503": "Express Commercial Cutaway Van 139\"",
    "CG33803": "Express Commercial Cutaway Van 159\"",
    "CG33903": "Express Commercial Cutaway Van 177\"",
    
    # LCF (Low Cab Forward)
    "CP31003": "4500 HG LCF Gas 2WD Regular Cab 109\"",
    "CP34003": "4500 HG LCF Gas 2WD Regular Cab 176\"",
}


def decode_model_number(model_number: str) -> str:
    """Decode a GM model number to human-readable description."""
    return GM_MODEL_DECODER.get(model_number, model_number)


# ---
# CONTEXT BUILDING FUNCTIONS
# ---

def build_dynamic_context(state: ConversationState) -> str:
    """Build dynamic context from conversation state"""
    if not state or state.message_count == 0:
        return "CUSTOMER CONTEXT:\nNew customer - no information gathered yet."
    
    context = f"""CUSTOMER CONTEXT (What you know about this customer):
{state.to_context_summary()}

CONVERSATION PROGRESS:
- Messages exchanged: {state.message_count}
- Stage: {state.stage.value}
- Interest level: {state.interest_level.value}"""
    
    # Add explicit trade-in exclusion warning
    if state.trade_model:
        context += f"""

TRADE-IN EXCLUSION: Customer is trading in a {state.trade_model}.
DO NOT show or search for {state.trade_model} vehicles - they want something DIFFERENT.
Focus on their original request (what they want to BUY, not trade)."""
    
    return context


def build_inventory_context(retriever: SemanticVehicleRetriever) -> str:
    """Build inventory summary for context"""
    summary = retriever.get_inventory_summary()
    
    if summary.get('total', 0) == 0:
        return "INVENTORY: Unable to load inventory data."
    
    return f"""CURRENT INVENTORY SUMMARY:
- Total vehicles: {summary['total']}
- Types: {', '.join(f"{k}: {v}" for k, v in summary.get('by_body_style', {}).items())}
- Price range: ${summary.get('price_range', {}).get('min', 0):,.0f} - ${summary.get('price_range', {}).get('max', 0):,.0f}
- Top models: {', '.join(summary.get('top_models', {}).keys())}"""


# ---
# VEHICLE FORMATTING FUNCTIONS
# ---

def format_vehicle_for_response(vehicle: Dict[str, Any], reasons: List[str] = None) -> Dict[str, Any]:
    """Format vehicle data for response"""
    return {
        "stock_number": vehicle.get('Stock Number') or vehicle.get('stockNumber', ''),
        "year": vehicle.get('Year') or vehicle.get('year', ''),
        "make": vehicle.get('Make') or vehicle.get('make', 'Chevrolet'),
        "model": vehicle.get('Model') or vehicle.get('model', ''),
        "trim": vehicle.get('Trim') or vehicle.get('trim', ''),
        "price": vehicle.get('MSRP') or vehicle.get('msrp') or vehicle.get('price', 0),
        "body_style": vehicle.get('bodyStyle', ''),
        "drivetrain": vehicle.get('drivetrain', ''),
        "exterior_color": vehicle.get('exteriorColor') or vehicle.get('Exterior Color', ''),
        "features": vehicle.get('features', [])[:5],
        "seating_capacity": vehicle.get('seatingCapacity', 5),
        "towing_capacity": vehicle.get('towingCapacity', 0),
        "match_reasons": reasons or [],
    }


def format_vehicles_for_tool_result(vehicles: List[ScoredVehicle]) -> str:
    """Format vehicle list for tool result to Claude"""
    if not vehicles:
        return "No vehicles found matching the criteria."
    
    result_parts = [f"Found {len(vehicles)} matching vehicles:\n"]
    
    for idx, sv in enumerate(vehicles, 1):
        v = sv.vehicle
        stock = v.get('Stock Number') or v.get('stockNumber', '')
        year = v.get('Year') or v.get('year', '')
        model = v.get('Model') or v.get('model', '')
        trim = v.get('Trim') or v.get('trim', '')
        price = v.get('MSRP') or v.get('msrp') or v.get('price', 0)
        color = v.get('exteriorColor') or v.get('Exterior Color', '')
        
        result_parts.append(
            f"{idx}. Stock #{stock}: {year} {model} {trim}\n"
            f"   Price: ${price:,.0f} | Color: {color}\n"
            f"   Why it matches: {', '.join(sv.match_reasons[:3])}\n"
        )
    
    return '\n'.join(result_parts)


def format_vehicle_details_for_tool(vehicle: Dict[str, Any]) -> str:
    """Format single vehicle details for tool result"""
    if not vehicle:
        return "Vehicle not found."
    
    stock = vehicle.get('Stock Number') or vehicle.get('stockNumber', '')
    year = vehicle.get('Year') or vehicle.get('year', '')
    make = vehicle.get('Make') or vehicle.get('make', 'Chevrolet')
    model = vehicle.get('Model') or vehicle.get('model', '')
    trim = vehicle.get('Trim') or vehicle.get('trim', '')
    price = vehicle.get('MSRP') or vehicle.get('msrp') or vehicle.get('price', 0)
    color = vehicle.get('exteriorColor') or vehicle.get('Exterior Color', '')
    drivetrain = vehicle.get('drivetrain', '')
    features = vehicle.get('features', [])
    seating = vehicle.get('seatingCapacity', 5)
    towing = vehicle.get('towingCapacity', 0)
    
    return f"""Vehicle Details - Stock #{stock}:
{year} {make} {model} {trim}

PRICE: ${price:,.0f}
COLOR: {color}
DRIVETRAIN: {drivetrain}
SEATING: {seating} passengers
TOWING CAPACITY: {towing:,} lbs

KEY FEATURES:
{chr(10).join(f'- {f}' for f in features[:8])}

This vehicle is available in our showroom. I can have it brought up front or get the keys for a closer look."""


def format_worksheet_for_tool_result(worksheet) -> str:
    """Format worksheet creation result for Claude"""
    if not worksheet:
        return "Failed to create worksheet."
    
    # Build term options display
    term_display = []
    for opt in worksheet.term_options:
        selected = " ← SELECTED" if opt.is_selected else ""
        term_display.append(
            f"  • {opt.term_months} months @ {opt.apr}% = ${opt.monthly_payment:,.0f}/month{selected}"
        )
    
    # Trade-in info
    trade_info = ""
    if worksheet.has_trade and worksheet.trade_in:
        trade_desc = f"{worksheet.trade_in.year or ''} {worksheet.trade_in.make or ''} {worksheet.trade_in.model or ''}".strip()
        trade_info = f"""
TRADE-IN:
- Vehicle: {trade_desc}
- Estimated Equity: ${worksheet.trade_equity:,.0f} (pending appraisal)
"""
    
    return f"""DIGITAL WORKSHEET CREATED

VEHICLE: {worksheet.vehicle.year} {worksheet.vehicle.model} {worksheet.vehicle.trim or ''}
Stock #: {worksheet.vehicle.stock_number}
Selling Price: ${worksheet.selling_price:,.0f}
{trade_info}
DEAL STRUCTURE:
- Down Payment: ${worksheet.down_payment:,.0f}
- Amount Financed: ${worksheet.amount_financed:,.0f}

PAYMENT OPTIONS:
{chr(10).join(term_display)}

TOTAL DUE AT SIGNING: ${worksheet.total_due_at_signing:,.0f}
(Includes ${worksheet.doc_fee:,.0f} doc fee + ${worksheet.title_fee:,.0f} title fee)

WORKSHEET ID: {worksheet.id}

RESPONSE GUIDANCE:
1. Explain the 3 term options - shorter term = less interest, longer = lower payment
2. Mention the customer can adjust the down payment on screen to see how it changes
3. If there's a trade-in, note that equity is estimated pending appraisal
4. Tell them: "When you're comfortable with these numbers, tap 'I'm Ready' and a sales manager will come finalize everything with you"
5. Remind them: Taxes and fees are separate - NH has no sales tax on vehicles!

The worksheet is now displayed on the kiosk. Customer can interact with it directly."""


# ---
# FALLBACK RESPONSE
# ---

def generate_fallback_response(message: str, customer_name: Optional[str] = None) -> str:
    """Generate fallback response when AI is unavailable"""
    message_lower = message.lower()
    
    # Detect Spanish
    spanish_patterns = ['español', 'busco', 'quiero', 'necesito', 'camioneta', 'carro', '¿']
    is_spanish = any(p in message_lower for p in spanish_patterns) or any(c in message for c in 'áéíóúñ')
    
    if is_spanish:
        greeting = f"¡Hola {customer_name}! " if customer_name else "¡Hola! "
        
        if any(word in message_lower for word in ['camioneta', 'truck', 'remolcar', 'trabajo']):
            return f"{greeting}¿Busca una camioneta? ¡Excelente elección! Nuestra línea Silverado ofrece una capacidad de remolque de hasta 13,300 lbs. ¿Le gustaría ver lo que tenemos disponible?"
        
        elif any(word in message_lower for word in ['suv', 'familia', 'espacio', 'niños']):
            return f"{greeting}Para necesidades familiares, le recomiendo nuestra línea de SUV. El Equinox es perfecto para familias pequeñas, el Traverse ofrece tres filas, y el Tahoe/Suburban son ideales para familias más grandes. ¿Qué tamaño busca?"
        
        elif any(word in message_lower for word in ['eléctrico', 'ev', 'híbrido']):
            return f"{greeting}¿Interesado en vehículos eléctricos? Nuestro Equinox EV ofrece hasta 319 millas de autonomía, y el Silverado EV combina capacidad de camioneta con cero emisiones. ¡Ambos califican para créditos fiscales federales!"
        
        elif any(word in message_lower for word in ['precio', 'costo', 'económico', 'presupuesto']):
            return f"{greeting}¡Tenemos opciones para cada presupuesto! El Trax comienza alrededor de $22k, el Trailblazer alrededor de $24k, y el Equinox alrededor de $28k. ¿Qué pago mensual le acomoda?"
        
        else:
            return f"{greeting}¡Me encantaría ayudarle a encontrar el vehículo perfecto! Cuénteme un poco sobre lo que está buscando - ¿para qué lo usará principalmente y hay alguna característica que debe tener?"
    
    # English fallback
    greeting = f"Hi {customer_name}! " if customer_name else "Hi there! "
    
    if any(word in message_lower for word in ['truck', 'tow', 'haul', 'work']):
        return f"{greeting}Looking for a truck? Great choice! Our Silverado lineup offers excellent towing capacity up to 13,300 lbs for the 1500, and our HD trucks can handle serious hauling. Would you like me to show you what's available?"
    
    elif any(word in message_lower for word in ['suv', 'family', 'space', 'kids']):
        return f"{greeting}For family needs, I'd recommend our SUV lineup! The Equinox is perfect for smaller families, Traverse offers three rows, and Tahoe/Suburban are ideal for larger families. What size family are you shopping for?"
    
    elif any(word in message_lower for word in ['electric', 'ev', 'hybrid']):
        return f"{greeting}Interested in electric? Our Equinox EV offers up to 319 miles of range, and the Silverado EV combines truck capability with zero emissions. Both qualify for federal tax credits!"
    
    elif any(word in message_lower for word in ['sport', 'fast', 'performance', 'fun', 'corvette', 'camaro']):
        return f"{greeting}Looking for something exciting? The Corvette is an American icon with mid-engine performance that rivals European exotics! We also have the legendary Camaro for muscle car heritage. Want me to show you what's in stock?"
    
    elif any(word in message_lower for word in ['budget', 'price', 'afford', 'cheap']):
        return f"{greeting}We have options at every price point! The Trax starts around $22k, Trailblazer around $24k, and Equinox around $28k. What monthly payment are you comfortable with?"
    
    else:
        return f"{greeting}I'd love to help you find the perfect vehicle! Tell me a bit about what you're looking for - what will you mainly use it for, and are there any must-have features?"
