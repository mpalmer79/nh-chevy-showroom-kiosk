"""
Smart Recommendation Service
Generates vehicle recommendations based on conversation context and extracted entities
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
import logging

from app.services.entity_extraction import (
    ConversationEntityExtractor, 
    ExtractedEntities,
    get_entity_extractor
)
from app.services.inventory_enrichment import enrich_vehicle

logger = logging.getLogger("showroom_kiosk.ai.recommendations")


@dataclass
class ScoredVehicle:
    """A vehicle with match score and reasons"""
    vehicle: Dict[str, Any]
    score: float
    match_reasons: List[str]
    confidence: str  # high, medium, low
    warnings: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "vehicle": self.vehicle,
            "score": round(self.score, 3),
            "match_reasons": self.match_reasons,
            "confidence": self.confidence,
            "warnings": self.warnings,
        }


class SmartRecommendationService:
    """
    Generates intelligent vehicle recommendations based on:
    - Extracted entities from conversation
    - Customer preferences and constraints
    - Inventory availability
    """
    
    # Scoring weights
    WEIGHTS = {
        'budget_match': 25,
        'type_match': 20,
        'feature_match': 15,
        'use_case_match': 15,
        'seating_match': 10,
        'towing_match': 10,
        'fuel_match': 5,
    }
    
    def __init__(self):
        self.extractor = get_entity_extractor()
    
    def get_recommendations_from_conversation(
        self,
        messages: List[Dict[str, str]],
        inventory: List[Dict[str, Any]],
        limit: int = 6,
        include_all_scores: bool = False
    ) -> Dict[str, Any]:
        """
        Generate recommendations based on full conversation context.
        
        Args:
            messages: Conversation history [{role, content}]
            inventory: Raw inventory list
            limit: Max recommendations to return
            include_all_scores: Include all scored vehicles (for debugging)
            
        Returns:
            Dictionary with recommendations and metadata
        """
        # Get the latest user message
        latest_message = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                latest_message = msg.get("content", "")
                break
        
        # Extract entities from conversation
        entities = self.extractor.extract_all(
            latest_message,
            messages[:-1] if len(messages) > 1 else None  # History without current
        )
        
        # Enrich inventory with derived fields
        enriched_inventory = [enrich_vehicle(v) for v in inventory]
        
        # Filter inventory based on hard constraints
        filtered = self._filter_inventory(enriched_inventory, entities)
        
        # Score remaining vehicles
        scored = self._score_vehicles(filtered, entities)
        
        # Sort by score
        scored.sort(key=lambda x: x.score, reverse=True)
        
        # Get top recommendations
        recommendations = scored[:limit]
        
        result = {
            "recommendations": [r.to_dict() for r in recommendations],
            "total_matches": len(scored),
            "entities_detected": entities.to_dict(),
            "filters_applied": self._get_applied_filters(entities),
        }
        
        if include_all_scores:
            result["all_scored"] = [r.to_dict() for r in scored]
        
        logger.info(f"Generated {len(recommendations)} recommendations from {len(inventory)} vehicles")
        
        return result
    
    def get_recommendations_for_vehicle(
        self,
        source_vehicle: Dict[str, Any],
        inventory: List[Dict[str, Any]],
        limit: int = 6
    ) -> List[Dict[str, Any]]:
        """
        Get similar vehicle recommendations based on a source vehicle.
        
        Args:
            source_vehicle: The vehicle to find similar matches for
            inventory: Raw inventory list
            limit: Max recommendations to return
            
        Returns:
            List of recommendation dictionaries
        """
        # Enrich source and inventory
        source = enrich_vehicle(source_vehicle)
        enriched_inventory = [enrich_vehicle(v) for v in inventory]
        
        scored = []
        source_stock = source.get('Stock Number') or source.get('stockNumber', '')
        
        for vehicle in enriched_inventory:
            # Skip source vehicle
            vehicle_stock = vehicle.get('Stock Number') or vehicle.get('stockNumber', '')
            if vehicle_stock == source_stock:
                continue
            
            score, reasons = self._calculate_vehicle_similarity(source, vehicle)
            
            if score > 0:
                confidence = 'high' if score >= 70 else 'medium' if score >= 40 else 'low'
                scored.append(ScoredVehicle(
                    vehicle=vehicle,
                    score=score,
                    match_reasons=reasons,
                    confidence=confidence,
                    warnings=[]
                ))
        
        scored.sort(key=lambda x: x.score, reverse=True)
        
        return [r.to_dict() for r in scored[:limit]]
    
    def _filter_inventory(
        self, 
        inventory: List[Dict[str, Any]], 
        entities: ExtractedEntities
    ) -> List[Dict[str, Any]]:
        """Apply hard filters based on extracted constraints."""
        filtered = inventory
        
        # Budget filter (with 10% buffer)
        if entities.budget.max_price:
            max_with_buffer = entities.budget.max_price * 1.10
            filtered = [
                v for v in filtered 
                if self._get_price(v) <= max_with_buffer
            ]
            logger.debug(f"After budget filter (max ${entities.budget.max_price:,.0f}): {len(filtered)} vehicles")
        
        # Minimum seating filter
        if entities.preferences.min_seating:
            filtered = [
                v for v in filtered
                if (v.get('seatingCapacity') or 5) >= entities.preferences.min_seating
            ]
            logger.debug(f"After seating filter (min {entities.preferences.min_seating}): {len(filtered)} vehicles")
        
        # Minimum towing filter
        if entities.preferences.min_towing:
            filtered = [
                v for v in filtered
                if (v.get('towingCapacity') or 0) >= entities.preferences.min_towing
            ]
            logger.debug(f"After towing filter (min {entities.preferences.min_towing}): {len(filtered)} vehicles")
        
        # Fuel type filter (if specified)
        if entities.preferences.fuel_preference == 'electric':
            filtered = [
                v for v in filtered
                if v.get('isElectric') or v.get('fuelType') == 'Electric'
            ]
            logger.debug(f"After electric filter: {len(filtered)} vehicles")
        
        return filtered
    
    def _score_vehicles(
        self, 
        vehicles: List[Dict[str, Any]], 
        entities: ExtractedEntities
    ) -> List[ScoredVehicle]:
        """Score vehicles based on preference match."""
        scored = []
        
        for vehicle in vehicles:
            score = 0
            reasons = []
            warnings = []
            
            # Budget match (25 points max)
            budget_score, budget_reason, budget_warning = self._score_budget_match(vehicle, entities)
            score += budget_score
            if budget_reason:
                reasons.append(budget_reason)
            if budget_warning:
                warnings.append(budget_warning)
            
            # Vehicle type match (20 points max)
            type_score, type_reasons = self._score_type_match(vehicle, entities)
            score += type_score
            reasons.extend(type_reasons)
            
            # Feature match (15 points max)
            feature_score, feature_reasons = self._score_feature_match(vehicle, entities)
            score += feature_score
            reasons.extend(feature_reasons)
            
            # Use case match (15 points max)
            use_case_score, use_case_reasons = self._score_use_case_match(vehicle, entities)
            score += use_case_score
            reasons.extend(use_case_reasons)
            
            # Seating match (10 points max)
            seating_score, seating_reason = self._score_seating_match(vehicle, entities)
            score += seating_score
            if seating_reason:
                reasons.append(seating_reason)
            
            # Towing match (10 points max)
            towing_score, towing_reason = self._score_towing_match(vehicle, entities)
            score += towing_score
            if towing_reason:
                reasons.append(towing_reason)
            
            # Base score for all vehicles
            if score == 0:
                score = 10
                reasons.append("Available in inventory")
            
            # Determine confidence
            confidence = 'high' if score >= 70 else 'medium' if score >= 40 else 'low'
            
            scored.append(ScoredVehicle(
                vehicle=vehicle,
                score=score,
                match_reasons=reasons[:5],  # Top 5 reasons
                confidence=confidence,
                warnings=warnings
            ))
        
        return scored
    
    def _score_budget_match(
        self, 
        vehicle: Dict[str, Any], 
        entities: ExtractedEntities
    ) -> tuple:
        """Score budget fit."""
        if not entities.budget.has_budget_constraint:
            return 0, None, None
        
        price = self._get_price(vehicle)
        max_budget = entities.budget.max_price or float('inf')
        min_budget = entities.budget.min_price or 0
        
        if price <= max_budget:
            if min_budget and price >= min_budget:
                return self.WEIGHTS['budget_match'], "Perfect budget fit", None
            elif price <= max_budget * 0.85:
                return self.WEIGHTS['budget_match'] * 0.9, "Well under budget", None
            else:
                return self.WEIGHTS['budget_match'], "Within budget", None
        elif price <= max_budget * 1.10:
            return self.WEIGHTS['budget_match'] * 0.5, None, "Slightly over budget"
        else:
            return 0, None, "Over budget"
    
    def _score_type_match(
        self, 
        vehicle: Dict[str, Any], 
        entities: ExtractedEntities
    ) -> tuple:
        """Score vehicle type match."""
        if not entities.preferences.vehicle_types:
            return 0, []
        
        score = 0
        reasons = []
        
        vehicle_category = (vehicle.get('category') or '').lower()
        model = (vehicle.get('Model') or '').lower()
        body_style = (vehicle.get('bodyStyle') or '').lower()
        
        for pref_type in entities.preferences.vehicle_types:
            if pref_type == 'truck':
                if vehicle_category == 'truck' or 'silverado' in model or 'colorado' in model:
                    score = self.WEIGHTS['type_match']
                    reasons.append("Matches truck preference")
                    break
            
            elif pref_type == 'suv':
                if vehicle_category == 'suv' or body_style == 'suv':
                    score = self.WEIGHTS['type_match']
                    reasons.append("Matches SUV preference")
                    break
            
            elif pref_type == 'electric':
                if vehicle.get('isElectric'):
                    score = self.WEIGHTS['type_match']
                    reasons.append("Electric vehicle")
                    break
            
            elif pref_type == 'sports_car':
                if vehicle.get('isPerformance') or 'corvette' in model or 'camaro' in model:
                    score = self.WEIGHTS['type_match']
                    reasons.append("Performance/sports vehicle")
                    break
            
            elif pref_type == 'family':
                if vehicle.get('seatingCapacity', 0) >= 5:
                    score = self.WEIGHTS['type_match'] * 0.8
                    reasons.append("Family-friendly")
        
        return score, reasons
    
    def _score_feature_match(
        self, 
        vehicle: Dict[str, Any], 
        entities: ExtractedEntities
    ) -> tuple:
        """Score feature match."""
        if not entities.preferences.must_have_features:
            return 0, []
        
        vehicle_features = set(f.lower() for f in (vehicle.get('features') or []))
        drivetrain = (vehicle.get('drivetrain') or '').upper()
        
        matched = 0
        reasons = []
        
        for feature in entities.preferences.must_have_features:
            feature_matched = False
            
            if feature == 'awd' and drivetrain in ['AWD', '4WD']:
                feature_matched = True
                reasons.append("All-wheel drive")
            
            elif feature == 'third_row' and 'third row' in ' '.join(vehicle_features):
                feature_matched = True
                reasons.append("Third row seating")
            
            elif feature == 'towing' and vehicle.get('towingCapacity', 0) > 3000:
                feature_matched = True
                reasons.append("Towing capable")
            
            elif feature == 'leather' and any('leather' in f for f in vehicle_features):
                feature_matched = True
                reasons.append("Leather interior")
            
            elif any(feature in f for f in vehicle_features):
                feature_matched = True
                reasons.append(f"Has {feature.replace('_', ' ')}")
            
            if feature_matched:
                matched += 1
        
        if matched == 0:
            return 0, []
        
        score = (matched / len(entities.preferences.must_have_features)) * self.WEIGHTS['feature_match']
        return score, reasons
    
    def _score_use_case_match(
        self, 
        vehicle: Dict[str, Any], 
        entities: ExtractedEntities
    ) -> tuple:
        """Score use case match."""
        if not entities.preferences.use_cases:
            return 0, []
        
        score = 0
        reasons = []
        
        model = (vehicle.get('Model') or '').lower()
        category = (vehicle.get('category') or '').lower()
        
        for use_case in entities.preferences.use_cases:
            case_matched = False
            
            if use_case == 'commuting':
                if category == 'suv' or 'equinox' in model or 'trax' in model or 'trailblazer' in model:
                    case_matched = True
                    reasons.append("Great for commuting")
            
            elif use_case == 'family':
                seating = vehicle.get('seatingCapacity', 0)
                if seating >= 5:
                    case_matched = True
                    reasons.append(f"Seats {seating} - good for family")
            
            elif use_case == 'towing':
                towing = vehicle.get('towingCapacity', 0)
                if towing >= 5000:
                    case_matched = True
                    reasons.append(f"Tows up to {towing:,} lbs")
            
            elif use_case == 'off_road':
                drivetrain = (vehicle.get('drivetrain') or '').upper()
                if drivetrain in ['4WD', 'AWD'] or 'z71' in (vehicle.get('Trim') or '').lower():
                    case_matched = True
                    reasons.append("Off-road capable")
            
            elif use_case == 'work':
                if category == 'truck' or 'work truck' in ' '.join(vehicle.get('features') or []).lower():
                    case_matched = True
                    reasons.append("Work-ready truck")
            
            elif use_case == 'road_trips':
                if vehicle.get('seatingCapacity', 0) >= 5 and category in ['suv', 'truck']:
                    case_matched = True
                    reasons.append("Comfortable for road trips")
            
            if case_matched:
                score += self.WEIGHTS['use_case_match'] / len(entities.preferences.use_cases)
        
        return min(score, self.WEIGHTS['use_case_match']), reasons
    
    def _score_seating_match(
        self, 
        vehicle: Dict[str, Any], 
        entities: ExtractedEntities
    ) -> tuple:
        """Score seating capacity match."""
        needed = entities.preferences.min_seating or entities.context.family_size
        if not needed:
            return 0, None
        
        capacity = vehicle.get('seatingCapacity', 5)
        
        if capacity >= needed:
            if capacity == needed or capacity == needed + 1:
                return self.WEIGHTS['seating_match'], f"Perfect fit - seats {capacity}"
            else:
                return self.WEIGHTS['seating_match'] * 0.8, f"Seats {capacity} (more than needed)"
        else:
            return 0, None
    
    def _score_towing_match(
        self, 
        vehicle: Dict[str, Any], 
        entities: ExtractedEntities
    ) -> tuple:
        """Score towing capacity match."""
        needed = entities.preferences.min_towing
        if not needed:
            # Check if towing was mentioned as a use case
            if 'towing' in entities.preferences.use_cases:
                if vehicle.get('towingCapacity', 0) >= 5000:
                    return self.WEIGHTS['towing_match'], "Strong towing capability"
            return 0, None
        
        capacity = vehicle.get('towingCapacity', 0)
        
        if capacity >= needed:
            excess = capacity - needed
            if excess < 2000:
                return self.WEIGHTS['towing_match'], f"Tows {capacity:,} lbs - perfect for your needs"
            else:
                return self.WEIGHTS['towing_match'] * 0.8, f"Tows {capacity:,} lbs - exceeds your needs"
        else:
            return 0, None
    
    def _calculate_vehicle_similarity(
        self, 
        source: Dict[str, Any], 
        target: Dict[str, Any]
    ) -> tuple:
        """Calculate similarity between two vehicles."""
        score = 0
        reasons = []
        
        # Same body style (30 points)
        if source.get('bodyStyle') == target.get('bodyStyle'):
            score += 30
            reasons.append(f"Same type ({target.get('bodyStyle')})")
        
        # Similar price range (25 points)
        source_price = self._get_price(source)
        target_price = self._get_price(target)
        
        if source_price > 0 and target_price > 0:
            price_diff_pct = abs(source_price - target_price) / source_price
            if price_diff_pct <= 0.1:
                score += 25
                reasons.append("Similar price")
            elif price_diff_pct <= 0.2:
                score += 15
                reasons.append("Comparable price range")
        
        # Same drivetrain (15 points)
        if source.get('drivetrain') == target.get('drivetrain'):
            score += 15
            reasons.append(f"Same drivetrain ({target.get('drivetrain')})")
        
        # Same fuel type (10 points)
        if source.get('fuelType') == target.get('fuelType'):
            score += 10
        
        # Similar seating (10 points)
        source_seats = source.get('seatingCapacity', 5)
        target_seats = target.get('seatingCapacity', 5)
        if abs(source_seats - target_seats) <= 1:
            score += 10
        
        # Performance match (10 points)
        if source.get('isPerformance') == target.get('isPerformance'):
            if source.get('isPerformance'):
                score += 10
                reasons.append("Performance vehicle")
        
        return score, reasons
    
    def _get_applied_filters(self, entities: ExtractedEntities) -> List[str]:
        """Get list of filters that were applied."""
        filters = []
        
        if entities.budget.max_price:
            filters.append(f"Budget: up to ${entities.budget.max_price:,.0f}")
        
        if entities.preferences.vehicle_types:
            filters.append(f"Type: {', '.join(entities.preferences.vehicle_types)}")
        
        if entities.preferences.min_seating:
            filters.append(f"Seating: {entities.preferences.min_seating}+")
        
        if entities.preferences.min_towing:
            filters.append(f"Towing: {entities.preferences.min_towing:,}+ lbs")
        
        if entities.preferences.fuel_preference:
            filters.append(f"Fuel: {entities.preferences.fuel_preference}")
        
        return filters
    
    def _get_price(self, vehicle: Dict[str, Any]) -> float:
        """Get vehicle price from various possible fields."""
        for field in ['MSRP', 'msrp', 'salePrice', 'sale_price', 'price']:
            if field in vehicle and vehicle[field]:
                try:
                    return float(vehicle[field])
                except (ValueError, TypeError):
                    continue
        return 0


# Module-level singleton
_service: Optional[SmartRecommendationService] = None


def get_smart_recommendation_service() -> SmartRecommendationService:
    """Get or create the smart recommendation service instance."""
    global _service
    if _service is None:
        _service = SmartRecommendationService()
    return _service
