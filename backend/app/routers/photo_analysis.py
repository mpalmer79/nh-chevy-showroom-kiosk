"""
NH Chevy Showroom Kiosk - Trade-In Photo Analysis Router
Uses Claude Vision API to analyze vehicle photos and assess condition
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import httpx
import logging
import base64
import re

# Use secure key manager
from app.core.security import get_key_manager

router = APIRouter()
logger = logging.getLogger("showroom_kiosk.photo_analysis")

# Anthropic API configuration
ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"


# Request/Response models
class PhotoItem(BaseModel):
    id: str  # e.g., "front", "rear", "interior", "odometer", "damage"
    data: str  # Base64 encoded image data (with or without data URL prefix)
    mimeType: Optional[str] = "image/jpeg"


class VehicleInfo(BaseModel):
    year: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    mileage: Optional[str] = None


class PhotoAnalysisRequest(BaseModel):
    photos: List[PhotoItem]
    vehicleInfo: Optional[VehicleInfo] = None


class ConditionIssue(BaseModel):
    location: str  # e.g., "front bumper", "driver seat", "rear left quarter panel"
    severity: str  # "minor", "moderate", "severe"
    description: str
    estimatedImpact: Optional[str] = None  # e.g., "-$200 to -$500"


class PhotoAnalysisResult(BaseModel):
    photoId: str
    category: str  # "exterior", "interior", "mechanical", "odometer"
    issues: List[ConditionIssue]
    positives: List[str]
    notes: str


class PhotoAnalysisResponse(BaseModel):
    overallCondition: str  # "excellent", "good", "fair", "poor"
    conditionScore: int  # 1-100
    confidenceLevel: str  # "high", "medium", "low"
    summary: str
    detectedMileage: Optional[str] = None
    photoResults: List[PhotoAnalysisResult]
    recommendations: List[str]
    estimatedConditionAdjustment: str  # e.g., "-5% to -10%"


# System prompt for photo analysis
PHOTO_ANALYSIS_PROMPT = """You are an expert automotive appraiser analyzing trade-in vehicle photos for a car dealership. Your job is to carefully examine each photo and provide a detailed condition assessment.

ANALYSIS GUIDELINES:

For EXTERIOR photos, look for:
- Dents, dings, and body damage
- Scratches, paint chips, and clear coat issues
- Rust or corrosion
- Bumper damage or misalignment
- Headlight/taillight condition (cloudy, cracked, moisture)
- Wheel and tire condition
- Window/windshield chips or cracks
- Missing trim pieces or emblems
- Overall paint condition and color fade

For INTERIOR photos, look for:
- Seat condition (tears, stains, wear, bolster wear)
- Dashboard condition (cracks, fading, scratches)
- Steering wheel wear
- Carpet and floor mat condition
- Headliner condition (sagging, stains)
- Door panel condition
- Console and storage wear
- Odors (note if visible stains suggest odor issues)
- Electronics/screen condition if visible

For ODOMETER photos:
- Read and report the exact mileage shown
- Note any warning lights visible on dashboard
- Check engine light, ABS, airbag, or other indicators

For DAMAGE-SPECIFIC photos:
- Assess the specific damage shown
- Estimate severity and repair cost category
- Note if damage appears recent or old
- Identify if structural or cosmetic

SCORING GUIDELINES:
- Excellent (85-100): Like new, minimal wear consistent with low miles, no damage
- Good (70-84): Minor wear appropriate for age/miles, maybe 1-2 small cosmetic issues
- Fair (50-69): Noticeable wear, several cosmetic issues, or one moderate issue
- Poor (below 50): Significant damage, multiple issues, or major mechanical concerns

Be thorough but fair. Most used vehicles will be in "Good" or "Fair" condition - that's normal and expected. Only mark "Excellent" for truly exceptional vehicles and "Poor" for vehicles with serious problems.

Respond with a JSON object matching this exact structure:
{
  "overallCondition": "good",
  "conditionScore": 75,
  "confidenceLevel": "high",
  "summary": "Brief 1-2 sentence overall assessment",
  "detectedMileage": "45,230" or null if no odometer photo,
  "photoResults": [
    {
      "photoId": "front",
      "category": "exterior",
      "issues": [
        {
          "location": "front bumper",
          "severity": "minor",
          "description": "Small scratch approximately 2 inches long",
          "estimatedImpact": "-$50 to -$100"
        }
      ],
      "positives": ["Paint shows good shine", "Headlights are clear"],
      "notes": "Front end appears well-maintained overall"
    }
  ],
  "recommendations": [
    "Touch-up paint recommended for front bumper scratch",
    "Professional detail would improve presentation"
  ],
  "estimatedConditionAdjustment": "-5% to -10%"
}"""


def extract_base64_data(data_string: str) -> tuple[str, str]:
    """Extract base64 data and mime type from a data URL or raw base64"""
    if data_string.startswith('data:'):
        # Parse data URL format: data:image/jpeg;base64,/9j/4AAQ...
        match = re.match(r'data:([^;]+);base64,(.+)', data_string)
        if match:
            return match.group(2), match.group(1)
    # Assume raw base64 and default to JPEG
    return data_string, "image/jpeg"


@router.post("/analyze", response_model=PhotoAnalysisResponse)
async def analyze_trade_in_photos(request: PhotoAnalysisRequest):
    """
    Analyze trade-in vehicle photos using Claude Vision API
    """
    
    if not request.photos:
        raise HTTPException(status_code=400, detail="At least one photo is required")
    
    # Get API key
    key_manager = get_key_manager()
    api_key = key_manager.anthropic_key
    
    if not api_key:
        logger.warning("Anthropic API key not configured - using fallback analysis")
        return generate_fallback_analysis(request)
    
    try:
        # Build the content array with images
        content = []
        
        # Add context about the vehicle if provided
        vehicle_context = ""
        if request.vehicleInfo:
            vi = request.vehicleInfo
            vehicle_context = f"\nVehicle being appraised: {vi.year or ''} {vi.make or ''} {vi.model or ''}"
            if vi.mileage:
                vehicle_context += f" with {vi.mileage} miles"
        
        # Add each photo
        photo_descriptions = []
        for i, photo in enumerate(request.photos):
            base64_data, media_type = extract_base64_data(photo.data)
            
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": photo.mimeType or media_type,
                    "data": base64_data
                }
            })
            photo_descriptions.append(f"Photo {i+1}: {photo.id}")
        
        # Add the analysis request text
        photos_list = "\n".join(photo_descriptions)
        content.append({
            "type": "text",
            "text": f"""Please analyze these trade-in vehicle photos and provide a detailed condition assessment.
{vehicle_context}

Photos provided:
{photos_list}

Provide your analysis as a JSON object following the exact structure specified in your instructions."""
        })
        
        # Call Anthropic API
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                ANTHROPIC_API_URL,
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": "claude-sonnet-4-5-20250929",
                    "max_tokens": 2000,
                    "system": PHOTO_ANALYSIS_PROMPT,
                    "messages": [
                        {
                            "role": "user",
                            "content": content
                        }
                    ]
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Anthropic API error: {response.status_code}")
                return generate_fallback_analysis(request)
            
            result = response.json()
            ai_response = result.get("content", [{}])[0].get("text", "")
            
            # Parse the JSON response
            try:
                # Find JSON in the response (might be wrapped in markdown code blocks)
                json_match = re.search(r'\{[\s\S]*\}', ai_response)
                if json_match:
                    import json
                    analysis_data = json.loads(json_match.group())
                    
                    # Convert to response model
                    return PhotoAnalysisResponse(
                        overallCondition=analysis_data.get("overallCondition", "fair"),
                        conditionScore=analysis_data.get("conditionScore", 65),
                        confidenceLevel=analysis_data.get("confidenceLevel", "medium"),
                        summary=analysis_data.get("summary", "Analysis complete"),
                        detectedMileage=analysis_data.get("detectedMileage"),
                        photoResults=[
                            PhotoAnalysisResult(
                                photoId=pr.get("photoId", f"photo_{i}"),
                                category=pr.get("category", "general"),
                                issues=[
                                    ConditionIssue(
                                        location=issue.get("location", "unknown"),
                                        severity=issue.get("severity", "minor"),
                                        description=issue.get("description", ""),
                                        estimatedImpact=issue.get("estimatedImpact")
                                    ) for issue in pr.get("issues", [])
                                ],
                                positives=pr.get("positives", []),
                                notes=pr.get("notes", "")
                            ) for i, pr in enumerate(analysis_data.get("photoResults", []))
                        ],
                        recommendations=analysis_data.get("recommendations", []),
                        estimatedConditionAdjustment=analysis_data.get("estimatedConditionAdjustment", "0%")
                    )
            except Exception as parse_error:
                logger.error(f"Failed to parse AI response: {parse_error}")
                
            # If parsing fails, return fallback
            return generate_fallback_analysis(request)
            
    except httpx.TimeoutException:
        logger.error("Anthropic API timeout during photo analysis")
        return generate_fallback_analysis(request)
    except Exception as e:
        logger.exception("Photo analysis error")
        return generate_fallback_analysis(request)


def generate_fallback_analysis(request: PhotoAnalysisRequest) -> PhotoAnalysisResponse:
    """Generate a basic analysis when AI is unavailable"""
    
    photo_results = []
    for photo in request.photos:
        category = "exterior"
        if photo.id in ["interior"]:
            category = "interior"
        elif photo.id in ["odometer"]:
            category = "mechanical"
        elif photo.id in ["damage"]:
            category = "damage"
            
        photo_results.append(PhotoAnalysisResult(
            photoId=photo.id,
            category=category,
            issues=[],
            positives=["Photo received for manual review"],
            notes="Automated analysis unavailable - photo will be reviewed by appraisal team"
        ))
    
    return PhotoAnalysisResponse(
        overallCondition="pending",
        conditionScore=0,
        confidenceLevel="low",
        summary="Photos received successfully. Our appraisal team will review them and provide a detailed assessment.",
        detectedMileage=None,
        photoResults=photo_results,
        recommendations=[
            "Photos have been saved for appraisal team review",
            "An appraiser will contact you with a detailed assessment"
        ],
        estimatedConditionAdjustment="TBD - pending manual review"
    )


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "photo_analysis"}
