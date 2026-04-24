"""
NH Chevy Showroom Kiosk AI Service - Vehicle Recommendation Engine
Content-based filtering with feature engineering for vehicle similarity
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os

app = FastAPI(
    title="Showroom Kiosk AI Recommendation Service",
    description="AI-powered vehicle recommendations using content-based filtering",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Vehicle(BaseModel):
    id: str
    year: int
    make: str
    model: str
    trim: str
    bodyStyle: str
    price: float
    msrp: Optional[float] = None
    mileage: int
    engine: str
    transmission: str
    drivetrain: str
    fuelType: str
    mpgCity: Optional[int] = None
    mpgHighway: Optional[int] = None
    evRange: Optional[int] = None
    features: List[str] = []


class RecommendationRequest(BaseModel):
    sourceVehicle: Vehicle
    candidateVehicles: List[Vehicle]
    limit: int = 5


class PersonalizedRequest(BaseModel):
    viewedVehicles: List[Vehicle]
    candidateVehicles: List[Vehicle]
    limit: int = 5


class RecommendationResponse(BaseModel):
    recommendations: List[Dict[str, Any]]
    algorithm: str = "content-based-filtering"
    version: str = "1.0"


class VehicleRecommender:
    """
    Content-based vehicle recommendation engine.
    Uses feature engineering and weighted scoring for similarity.
    """
    
    WEIGHTS = {
        'body_style': 2.0,
        'price_range': 1.5,
        'fuel_type': 1.5,
        'drivetrain': 1.0,
        'features': 1.0,
        'performance': 0.75,
    }
    
    PRICE_BUCKETS = [0, 30000, 50000, 75000, 100000, 150000, float('inf')]
    
    def _extract_features(self, vehicle: Vehicle) -> Dict[str, Any]:
        """Extract normalized features from a vehicle."""
        
        price_bucket = 0
        for i, threshold in enumerate(self.PRICE_BUCKETS[1:]):
            if vehicle.price < threshold:
                price_bucket = i
                break
        
        if vehicle.fuelType == "Electric":
            perf_score = 80 + (vehicle.evRange or 250) / 10
        else:
            mpg_avg = ((vehicle.mpgCity or 20) + (vehicle.mpgHighway or 30)) / 2
            perf_score = 50 + mpg_avg
        
        feature_set = set(f.lower() for f in vehicle.features)
        
        return {
            'body_style': vehicle.bodyStyle.lower(),
            'price_bucket': price_bucket,
            'fuel_type': vehicle.fuelType.lower(),
            'drivetrain': vehicle.drivetrain.lower(),
            'year': vehicle.year,
            'mileage': vehicle.mileage,
            'performance_score': min(perf_score, 100),
            'features': feature_set,
            'is_electric': vehicle.fuelType.lower() in ['electric', 'hybrid'],
            'is_luxury': vehicle.price > 60000,
            'is_performance': any(f in feature_set for f in 
                ['performance exhaust', 'magnetic ride', 'brembo', 'recaro']),
        }
    
    def calculate_similarity(self, source: Vehicle, target: Vehicle) -> float:
        """Calculate similarity score between two vehicles."""
        
        source_features = self._extract_features(source)
        target_features = self._extract_features(target)
        
        score = 0.0
        max_score = sum(self.WEIGHTS.values())
        
        if source_features['body_style'] == target_features['body_style']:
            score += self.WEIGHTS['body_style']
        
        price_diff = abs(source_features['price_bucket'] - target_features['price_bucket'])
        if price_diff == 0:
            score += self.WEIGHTS['price_range']
        elif price_diff == 1:
            score += self.WEIGHTS['price_range'] * 0.5
        
        if source_features['fuel_type'] == target_features['fuel_type']:
            score += self.WEIGHTS['fuel_type']
        elif source_features['is_electric'] == target_features['is_electric']:
            score += self.WEIGHTS['fuel_type'] * 0.5
        
        if source_features['drivetrain'] == target_features['drivetrain']:
            score += self.WEIGHTS['drivetrain']
        
        if source_features['features'] and target_features['features']:
            intersection = len(source_features['features'] & target_features['features'])
            union = len(source_features['features'] | target_features['features'])
            if union > 0:
                jaccard = intersection / union
                score += self.WEIGHTS['features'] * jaccard
        
        perf_diff = abs(source_features['performance_score'] - target_features['performance_score'])
        perf_similarity = max(0, 1 - perf_diff / 50)
        score += self.WEIGHTS['performance'] * perf_similarity
        
        return round(score / max_score, 3)
    
    def get_recommendations(
        self, 
        source: Vehicle, 
        candidates: List[Vehicle], 
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get top recommendations for a source vehicle."""
        
        scored = []
        for candidate in candidates:
            if candidate.id == source.id:
                continue
                
            similarity = self.calculate_similarity(source, candidate)
            match_reason = self._get_match_reason(source, candidate, similarity)
            
            scored.append({
                "vehicle": candidate.model_dump(),
                "similarityScore": similarity,
                "matchReason": match_reason,
            })
        
        scored.sort(key=lambda x: x["similarityScore"], reverse=True)
        
        return scored[:limit]
    
    def get_personalized_recommendations(
        self,
        viewed: List[Vehicle],
        candidates: List[Vehicle],
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get recommendations based on browsing history."""
        
        if not viewed:
            return []
        
        viewed_ids = {v.id for v in viewed}
        
        body_prefs = {}
        fuel_prefs = {}
        total_price = 0
        
        for v in viewed:
            body_prefs[v.bodyStyle] = body_prefs.get(v.bodyStyle, 0) + 1
            fuel_prefs[v.fuelType] = fuel_prefs.get(v.fuelType, 0) + 1
            total_price += v.price
        
        avg_price = total_price / len(viewed)
        preferred_body = max(body_prefs, key=body_prefs.get)
        preferred_fuel = max(fuel_prefs, key=fuel_prefs.get)
        
        scored = []
        for candidate in candidates:
            if candidate.id in viewed_ids:
                continue
            
            avg_similarity = sum(
                self.calculate_similarity(v, candidate) for v in viewed
            ) / len(viewed)
            
            preference_score = 0
            if candidate.bodyStyle == preferred_body:
                preference_score += 0.2
            if candidate.fuelType == preferred_fuel:
                preference_score += 0.1
            if abs(candidate.price - avg_price) / avg_price < 0.2:
                preference_score += 0.1
            
            final_score = min(avg_similarity + preference_score, 1.0)
            
            scored.append({
                "vehicle": candidate.model_dump(),
                "preferenceScore": round(final_score, 3),
                "matchReason": f"Based on your interest in {preferred_body}s",
            })
        
        scored.sort(key=lambda x: x["preferenceScore"], reverse=True)
        return scored[:limit]
    
    def _get_match_reason(self, source: Vehicle, target: Vehicle, score: float) -> str:
        """Generate human-readable match explanation."""
        reasons = []
        
        if source.bodyStyle == target.bodyStyle:
            reasons.append(f"Same {target.bodyStyle} style")
        
        if abs(source.price - target.price) < 10000:
            reasons.append("Similar price range")
        
        if source.fuelType == target.fuelType:
            if target.fuelType == "Electric":
                reasons.append("Also electric")
            elif target.fuelType == "Hybrid":
                reasons.append("Also hybrid")
        
        if source.drivetrain == target.drivetrain:
            reasons.append(f"{target.drivetrain}")
        
        if score > 0.8:
            reasons.insert(0, "Excellent match")
        elif score > 0.6:
            reasons.insert(0, "Great match")
        
        return reasons[0] if reasons else "Popular choice"


recommender = VehicleRecommender()


@app.get("/")
async def root():
    return {
        "service": "Showroom Kiosk AI Recommendation Engine",
        "version": "1.0.0",
        "status": "operational",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/recommend", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """Get vehicle recommendations based on a source vehicle."""
    
    if not request.candidateVehicles:
        raise HTTPException(status_code=400, detail="No candidate vehicles provided")
    
    recommendations = recommender.get_recommendations(
        source=request.sourceVehicle,
        candidates=request.candidateVehicles,
        limit=request.limit,
    )
    
    return RecommendationResponse(recommendations=recommendations)


@app.post("/recommend/personalized", response_model=RecommendationResponse)
async def get_personalized_recommendations(request: PersonalizedRequest):
    """Get personalized recommendations based on browsing history."""
    
    if not request.viewedVehicles:
        raise HTTPException(status_code=400, detail="No viewed vehicles provided")
    
    if not request.candidateVehicles:
        raise HTTPException(status_code=400, detail="No candidate vehicles provided")
    
    recommendations = recommender.get_personalized_recommendations(
        viewed=request.viewedVehicles,
        candidates=request.candidateVehicles,
        limit=request.limit,
    )
    
    return RecommendationResponse(
        recommendations=recommendations,
        algorithm="personalized-content-filtering",
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
