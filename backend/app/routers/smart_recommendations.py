"""
Smart Recommendations Router
API endpoints for AI-powered vehicle recommendations
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import pandas as pd
from pathlib import Path

from app.services.smart_recommendations import get_smart_recommendation_service
from app.services.entity_extraction import get_entity_extractor

router = APIRouter()
logger = logging.getLogger("showroom_kiosk.ai.smart_recs")


def load_inventory_data() -> List[Dict[str, Any]]:
    """Load inventory from Excel file"""
    try:
        possible_paths = [
            Path("data/inventory.xlsx"),
            Path("backend/data/inventory.xlsx"),
            Path("/app/data/inventory.xlsx"),
            Path(__file__).parent.parent.parent / "data" / "inventory.xlsx",
        ]
        
        for path in possible_paths:
            if path.exists():
                df = pd.read_excel(path)
                return df.to_dict('records')
        
        logger.warning("Inventory file not found")
        return []
        
    except Exception as e:
        logger.error(f"Error loading inventory: {e}")
        return []


# Request/Response Models
class ConversationMessage(BaseModel):
    role: str
    content: str


class ConversationRecommendationRequest(BaseModel):
    """Request for conversation-based recommendations"""
    messages: List[ConversationMessage] = Field(
        ..., 
        description="Conversation history with role and content"
    )
    limit: int = Field(default=6, ge=1, le=20)
    include_debug: bool = Field(default=False)


class VehicleSimilarityRequest(BaseModel):
    """Request for similar vehicle recommendations"""
    stockNumber: str = Field(..., description="Stock number of source vehicle")
    limit: int = Field(default=6, ge=1, le=20)


class EntityExtractionRequest(BaseModel):
    """Request for entity extraction only"""
    message: str
    conversationHistory: Optional[List[ConversationMessage]] = None


class RecommendationResult(BaseModel):
    """Single recommendation result"""
    vehicle: Dict[str, Any]
    score: float
    match_reasons: List[str]
    confidence: str
    warnings: List[str] = []


class ConversationRecommendationResponse(BaseModel):
    """Response for conversation-based recommendations"""
    recommendations: List[RecommendationResult]
    total_matches: int
    entities_detected: Dict[str, Any]
    filters_applied: List[str]


class EntityExtractionResponse(BaseModel):
    """Response for entity extraction"""
    budget: Dict[str, Any]
    trade_in: Dict[str, Any]
    preferences: Dict[str, Any]
    context: Dict[str, Any]
    mentioned_stock_numbers: List[str]
    mentioned_models: List[str]


@router.post("/from-conversation", response_model=ConversationRecommendationResponse)
async def get_recommendations_from_conversation(request: ConversationRecommendationRequest):
    """
    Get vehicle recommendations based on conversation context.
    
    Analyzes the conversation to extract:
    - Budget constraints
    - Vehicle type preferences
    - Feature requirements
    - Use cases
    - Family size / seating needs
    
    Returns ranked recommendations with match scores and reasons.
    """
    try:
        # Load inventory
        inventory = load_inventory_data()
        
        if not inventory:
            raise HTTPException(status_code=503, detail="Inventory not available")
        
        # Convert messages to dict format
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        
        # Get recommendations
        service = get_smart_recommendation_service()
        result = service.get_recommendations_from_conversation(
            messages=messages,
            inventory=inventory,
            limit=request.limit,
            include_all_scores=request.include_debug
        )
        
        return ConversationRecommendationResponse(
            recommendations=result["recommendations"],
            total_matches=result["total_matches"],
            entities_detected=result["entities_detected"],
            filters_applied=result["filters_applied"]
        )
        
    except Exception as e:
        logger.error(f"Error getting conversation recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/similar/{stock_number}")
async def get_similar_vehicles(stock_number: str, limit: int = 6):
    """
    Get vehicles similar to a specified vehicle.
    
    Finds vehicles with similar:
    - Body style
    - Price range
    - Drivetrain
    - Features
    - Performance characteristics
    """
    try:
        inventory = load_inventory_data()
        
        if not inventory:
            raise HTTPException(status_code=503, detail="Inventory not available")
        
        # Find source vehicle
        source_vehicle = None
        for v in inventory:
            stock = v.get('Stock Number') or v.get('stockNumber', '')
            if stock.upper() == stock_number.upper():
                source_vehicle = v
                break
        
        if not source_vehicle:
            raise HTTPException(status_code=404, detail=f"Vehicle {stock_number} not found")
        
        # Get similar vehicles
        service = get_smart_recommendation_service()
        recommendations = service.get_recommendations_for_vehicle(
            source_vehicle=source_vehicle,
            inventory=inventory,
            limit=limit
        )
        
        return {
            "source_vehicle": {
                "stockNumber": stock_number,
                "year": source_vehicle.get('Year'),
                "make": source_vehicle.get('Make'),
                "model": source_vehicle.get('Model'),
                "trim": source_vehicle.get('Trim'),
                "price": source_vehicle.get('MSRP'),
            },
            "similar_vehicles": recommendations,
            "count": len(recommendations)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting similar vehicles: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-entities", response_model=EntityExtractionResponse)
async def extract_entities(request: EntityExtractionRequest):
    """
    Extract structured entities from a message (for debugging/testing).
    
    Extracts:
    - Budget information
    - Trade-in details
    - Vehicle preferences
    - Customer context
    - Mentioned stock numbers and models
    """
    try:
        extractor = get_entity_extractor()
        
        history = None
        if request.conversationHistory:
            history = [{"role": m.role, "content": m.content} for m in request.conversationHistory]
        
        entities = extractor.extract_all(request.message, history)
        
        return EntityExtractionResponse(**entities.to_dict())
        
    except Exception as e:
        logger.error(f"Error extracting entities: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def smart_recs_health():
    """Health check for smart recommendations service."""
    inventory = load_inventory_data()
    return {
        "status": "healthy",
        "service": "smart-recommendations",
        "inventory_count": len(inventory),
        "features": [
            "conversation_analysis",
            "entity_extraction",
            "similarity_matching",
            "preference_scoring"
        ]
    }
