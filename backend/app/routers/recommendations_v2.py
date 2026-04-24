"""
NH Chevy Showroom Kiosk - Enhanced Recommendations Router (V2)
Improved vehicle recommendations with unified recommendation engine
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import pandas as pd
from pathlib import Path

from app.core.recommendation_engine import VehicleRecommender

router = APIRouter()
logger = logging.getLogger("showroom_kiosk.ai.recommendations_v2")

# Initialize recommender
recommender = VehicleRecommender()


def load_inventory() -> List[Dict[str, Any]]:
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
class RecommendationRequest(BaseModel):
    """Request for vehicle recommendations"""
    stockNumber: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    limit: int = Field(default=6, ge=1, le=20)


class VehicleSuggestion(BaseModel):
    """A single vehicle suggestion"""
    vehicle: Dict[str, Any]
    score: float
    match_reasons: List[str]
    confidence: str


class RecommendationResponse(BaseModel):
    """Response with vehicle recommendations"""
    recommendations: List[VehicleSuggestion]
    total_candidates: int
    source_vehicle: Optional[Dict[str, Any]] = None


class PersonalizedRequest(BaseModel):
    """Request for personalized recommendations based on browsing history"""
    browsingHistory: List[Dict[str, Any]] = Field(..., description="List of viewed vehicles")
    limit: int = Field(default=6, ge=1, le=20)


@router.get("/{vehicle_id}")
async def get_recommendations_for_vehicle(vehicle_id: str, limit: int = 6):
    """
    Get vehicle recommendations based on a source vehicle.
    
    Args:
        vehicle_id: Stock number of the source vehicle
        limit: Maximum number of recommendations to return
    """
    try:
        inventory = load_inventory()
        
        if not inventory:
            raise HTTPException(status_code=503, detail="Inventory not available")
        
        # Find source vehicle
        source_vehicle = None
        for v in inventory:
            stock = v.get('Stock Number') or v.get('stockNumber', '')
            if stock.upper() == vehicle_id.upper():
                source_vehicle = v
                break
        
        if not source_vehicle:
            raise HTTPException(status_code=404, detail=f"Vehicle {vehicle_id} not found")
        
        # Get recommendations
        recommendations = recommender.get_recommendations(
            source_vehicle=source_vehicle,
            candidates=inventory,
            limit=limit
        )
        
        return {
            "recommendations": recommendations,
            "total_candidates": len(inventory),
            "source_vehicle": {
                "stockNumber": vehicle_id,
                "year": source_vehicle.get('Year'),
                "make": source_vehicle.get('Make'),
                "model": source_vehicle.get('Model'),
                "trim": source_vehicle.get('Trim'),
                "price": source_vehicle.get('MSRP'),
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/personalized")
async def get_personalized_recommendations(request: PersonalizedRequest):
    """
    Get personalized recommendations based on browsing history.
    """
    try:
        if not request.browsingHistory:
            raise HTTPException(status_code=400, detail="Browsing history required")
        
        inventory = load_inventory()
        
        if not inventory:
            raise HTTPException(status_code=503, detail="Inventory not available")
        
        recommendations = recommender.get_personalized_recommendations(
            browsing_history=request.browsingHistory,
            candidates=inventory,
            limit=request.limit
        )
        
        return {
            "recommendations": recommendations,
            "based_on_vehicles": len(request.browsingHistory),
            "total_candidates": len(inventory)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting personalized recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preferences")
async def get_recommendations_by_preferences(request: RecommendationRequest):
    """
    Get recommendations based on explicit preferences.
    """
    try:
        inventory = load_inventory()
        
        if not inventory:
            raise HTTPException(status_code=503, detail="Inventory not available")
        
        if not request.preferences:
            # Return random selection if no preferences
            import random
            sample = random.sample(inventory, min(request.limit, len(inventory)))
            return {
                "recommendations": [{"vehicle": v, "score": 0.5, "match_reasons": ["Random selection"], "confidence": "low"} for v in sample],
                "total_candidates": len(inventory)
            }
        
        # Filter based on preferences
        filtered = inventory
        prefs = request.preferences
        
        # Price filter
        if prefs.get('maxPrice'):
            filtered = [v for v in filtered if (v.get('MSRP') or 0) <= prefs['maxPrice']]
        
        if prefs.get('minPrice'):
            filtered = [v for v in filtered if (v.get('MSRP') or 0) >= prefs['minPrice']]
        
        # Model filter
        if prefs.get('model'):
            model_lower = prefs['model'].lower()
            filtered = [v for v in filtered if model_lower in (v.get('Model') or '').lower()]
        
        # Body type filter
        if prefs.get('bodyType'):
            body_lower = prefs['bodyType'].lower()
            filtered = [v for v in filtered if body_lower in (v.get('Body Type') or '').lower()]
        
        # Sort by price
        filtered.sort(key=lambda v: v.get('MSRP') or 0)
        
        recommendations = [
            {
                "vehicle": v,
                "score": 0.7,
                "match_reasons": ["Matches preferences"],
                "confidence": "medium"
            }
            for v in filtered[:request.limit]
        ]
        
        return {
            "recommendations": recommendations,
            "total_candidates": len(filtered),
            "filters_applied": list(prefs.keys())
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting preference recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/config")
async def get_recommender_config():
    """Get current recommender configuration."""
    return recommender.get_config()
