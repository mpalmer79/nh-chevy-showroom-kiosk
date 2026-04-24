"""
Unified Vehicle Recommendation Engine for NH Chevy Showroom Kiosk
Handles similarity scoring, feature extraction, and personalized recommendations
"""

import json
import os
import math
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path


class VehicleRecommender:
    """
    A configurable vehicle recommendation engine that uses weighted
    similarity scoring across multiple vehicle attributes.
    """
    
    # Default configuration
    DEFAULT_CONFIG = {
        "weights": {
            "body_style": 2.0,
            "price_range": 1.5,
            "fuel_type": 1.5,
            "drivetrain": 1.0,
            "features": 1.0,
            "performance": 0.75,
            "year": 0.5,
            "luxury": 0.5
        },
        "price_buckets": [0, 25000, 35000, 45000, 60000, 80000, 100000, float('inf')],
        "mileage_buckets": [0, 15000, 30000, 50000, 75000, 100000, float('inf')],
        "performance_features": [
            "sport mode", "performance package", "turbo", "supercharged",
            "v8", "sport suspension", "brembo", "launch control",
            "track mode", "performance exhaust"
        ],
        "luxury_features": [
            "leather", "heated seats", "cooled seats", "panoramic roof",
            "premium audio", "massage seats", "ambient lighting",
            "head-up display", "soft-close doors"
        ],
        "luxury_price_threshold": 55000,
        "adjacent_bucket_score": 0.5
    }
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the recommender with optional external configuration.
        
        Args:
            config_path: Path to JSON configuration file. If not provided,
                        uses RECOMMENDER_CONFIG_PATH env var or defaults.
        """
        self.config = self._load_config(config_path)
        self.weights = self.config.get("weights", self.DEFAULT_CONFIG["weights"])
        self.price_buckets = self.config.get("price_buckets", self.DEFAULT_CONFIG["price_buckets"])
        self.mileage_buckets = self.config.get("mileage_buckets", self.DEFAULT_CONFIG["mileage_buckets"])
        self.performance_features = self.config.get(
            "performance_features", 
            self.DEFAULT_CONFIG["performance_features"]
        )
        self.luxury_features = self.config.get(
            "luxury_features",
            self.DEFAULT_CONFIG["luxury_features"]
        )
        self.luxury_price_threshold = self.config.get(
            "luxury_price_threshold",
            self.DEFAULT_CONFIG["luxury_price_threshold"]
        )
        self.adjacent_bucket_score = self.config.get(
            "adjacent_bucket_score",
            self.DEFAULT_CONFIG["adjacent_bucket_score"]
        )
    
    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """Load configuration from file or environment variable."""
        # Try provided path first
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Could not load config from {config_path}: {e}")
        
        # Try environment variable
        env_path = os.environ.get('RECOMMENDER_CONFIG_PATH')
        if env_path and os.path.exists(env_path):
            try:
                with open(env_path, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Could not load config from {env_path}: {e}")
        
        # Try default location
        default_path = Path(__file__).parent.parent.parent / "config" / "recommender_config.json"
        if default_path.exists():
            try:
                with open(default_path, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                print(f"Warning: Could not load config from {default_path}: {e}")
        
        # Return default config
        return self.DEFAULT_CONFIG.copy()
    
    def get_config(self) -> Dict[str, Any]:
        """Return current configuration for inspection/debugging."""
        return {
            "weights": self.weights,
            "price_buckets": self.price_buckets,
            "mileage_buckets": self.mileage_buckets,
            "performance_features": self.performance_features,
            "luxury_features": self.luxury_features,
            "luxury_price_threshold": self.luxury_price_threshold,
            "adjacent_bucket_score": self.adjacent_bucket_score
        }
    
    def _get_bucket(self, value: float, buckets: List[float]) -> int:
        """
        Determine which bucket a value falls into.
        
        Args:
            value: The numeric value to bucket
            buckets: List of bucket boundaries (must be sorted ascending)
            
        Returns:
            Index of the bucket (0-indexed)
        """
        for i, threshold in enumerate(buckets[1:], 1):
            if value < threshold:
                return i - 1
        return len(buckets) - 2
    
    def _normalize_string(self, value: Any) -> str:
        """Normalize a string value for comparison."""
        if value is None:
            return ""
        return str(value).lower().strip()
    
    def _get_vehicle_price(self, vehicle: Dict[str, Any]) -> float:
        """Extract price from vehicle data, handling different field names."""
        # Try different price field names (camelCase, snake_case, and Excel format)
        price_fields = ['salePrice', 'sale_price', 'price', 'msrp', 'MSRP', 'Price']
        for field in price_fields:
            if field in vehicle and vehicle[field]:
                try:
                    return float(vehicle[field])
                except (ValueError, TypeError):
                    continue
        return 0.0
    
    def _get_vehicle_mileage(self, vehicle: Dict[str, Any]) -> float:
        """Extract mileage from vehicle data, handling different field names."""
        mileage_fields = ['mileage', 'Mileage', 'odometer', 'Odometer', 'miles', 'Miles']
        for field in mileage_fields:
            if field in vehicle and vehicle[field]:
                try:
                    return float(vehicle[field])
                except (ValueError, TypeError):
                    continue
        return 0.0
    
    def _get_field(self, vehicle: Dict[str, Any], *field_names: str) -> Any:
        """Get a field value trying multiple possible field names."""
        for field in field_names:
            if field in vehicle and vehicle[field] is not None:
                return vehicle[field]
        return None
    
    def extract_features(self, vehicle: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract normalized features from a vehicle record.
        
        Handles camelCase, snake_case, and Excel format field names for compatibility
        with different data sources.
        
        Args:
            vehicle: Raw vehicle data dictionary
            
        Returns:
            Normalized feature dictionary
        """
        # Get basic fields with fallbacks for different naming conventions
        # Include Excel format with spaces and capitalization
        body_style = self._normalize_string(
            self._get_field(vehicle, 'bodyStyle', 'body_style', 'Body Style', 'Body Type', 'body', 'type')
        )
        fuel_type = self._normalize_string(
            self._get_field(vehicle, 'fuelType', 'fuel_type', 'Fuel Type', 'fuel')
        )
        drivetrain = self._normalize_string(
            self._get_field(vehicle, 'drivetrain', 'driveTrain', 'drive_train', 'Drivetrain', 'drive')
        )
        
        # Get price and mileage
        price = self._get_vehicle_price(vehicle)
        mileage = self._get_vehicle_mileage(vehicle)
        
        # Get year - include Excel format
        year = 0
        year_val = self._get_field(vehicle, 'year', 'Year', 'modelYear', 'model_year')
        if year_val:
            try:
                year = int(year_val)
            except (ValueError, TypeError):
                pass
        
        # Extract features list
        features_raw = self._get_field(vehicle, 'features', 'Features', 'options', 'equipment') or []
        if isinstance(features_raw, str):
            features_raw = [f.strip() for f in features_raw.split(',')]
        features = [self._normalize_string(f) for f in features_raw if f]
        
        # Get make, model, trim - include Excel format
        make = self._normalize_string(
            self._get_field(vehicle, 'make', 'Make', 'manufacturer')
        )
        model = self._normalize_string(
            self._get_field(vehicle, 'model', 'Model', 'modelName', 'model_name')
        )
        trim = self._normalize_string(
            self._get_field(vehicle, 'trim', 'Trim', 'trimLevel', 'trim_level')
        )
        
        # Get stock number - include Excel format with space
        stock_number = self._get_field(
            vehicle, 'stockNumber', 'stock_number', 'Stock Number', 'stock', 'vin', 'VIN'
        )
        
        # Detect performance vehicle
        is_performance = self._detect_performance(vehicle, features)
        
        # Detect luxury vehicle
        is_luxury = self._detect_luxury(vehicle, features, price)
        
        return {
            "body_style": body_style,
            "fuel_type": fuel_type,
            "drivetrain": drivetrain,
            "price": price,
            "price_bucket": self._get_bucket(price, self.price_buckets),
            "mileage": mileage,
            "mileage_bucket": self._get_bucket(mileage, self.mileage_buckets),
            "year": year,
            "features": features,
            "is_performance": is_performance,
            "is_luxury": is_luxury,
            "make": make,
            "model": model,
            "trim": trim,
            "stock_number": stock_number
        }
    
    def _detect_performance(self, vehicle: Dict[str, Any], features: List[str]) -> bool:
        """Detect if a vehicle is a performance-oriented vehicle."""
        # Check model names for known performance vehicles
        model = self._normalize_string(
            self._get_field(vehicle, 'model', 'Model', 'modelName')
        )
        performance_models = ['corvette', 'camaro', 'mustang', 'challenger', 'charger', 
                            'gt-r', 'gtr', 'm3', 'm4', 'm5', 'amg', 'rs', 'type r']
        
        if any(pm in model for pm in performance_models):
            return True
        
        # Check trim for performance indicators
        trim = self._normalize_string(
            self._get_field(vehicle, 'trim', 'Trim', 'trimLevel')
        )
        performance_trims = ['ss', 'zl1', 'z06', 'z07', 'zr1', 'gt', 'sport', 'r/t', 'srt',
                           'performance', 'track', 'competition', 'm sport', 'stingray']
        
        if any(pt in trim for pt in performance_trims):
            return True
        
        # Check features list
        features_text = ' '.join(features)
        for pf in self.performance_features:
            if pf in features_text:
                return True
        
        return False
    
    def _detect_luxury(self, vehicle: Dict[str, Any], features: List[str], price: float) -> bool:
        """Detect if a vehicle is a luxury vehicle."""
        # Check make for luxury brands
        make = self._normalize_string(
            self._get_field(vehicle, 'make', 'Make', 'manufacturer')
        )
        luxury_makes = ['lexus', 'mercedes', 'bmw', 'audi', 'porsche', 'cadillac',
                       'lincoln', 'infiniti', 'acura', 'genesis', 'maserati', 
                       'bentley', 'rolls-royce', 'land rover', 'jaguar']
        
        if any(lm in make for lm in luxury_makes):
            return True
        
        # Check model/trim for luxury indicators FIRST (before price check)
        model = self._normalize_string(
            self._get_field(vehicle, 'model', 'Model', 'modelName')
        )
        trim = self._normalize_string(
            self._get_field(vehicle, 'trim', 'Trim', 'trimLevel')
        )
        # Added "premier" to luxury indicators
        luxury_indicators = ['premium', 'premier', 'luxury', 'platinum', 'high country', 
                           'denali', 'limited', 'prestige', 'executive']
        
        combined = f"{model} {trim}"
        if any(li in combined for li in luxury_indicators):
            return True
        
        # Check price threshold with luxury features
        if price >= self.luxury_price_threshold:
            features_text = ' '.join(features)
            luxury_feature_count = sum(1 for lf in self.luxury_features if lf in features_text)
            if luxury_feature_count >= 2:
                return True
        
        return False
    
    def calculate_similarity(
        self, 
        source_features: Dict[str, Any], 
        target_features: Dict[str, Any]
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculate weighted similarity score between two vehicles.
        
        Args:
            source_features: Features of the reference vehicle
            target_features: Features of the candidate vehicle
            
        Returns:
            Tuple of (total_score, component_scores_dict)
        """
        scores = {}
        
        # Body style match (exact match required for full points)
        if source_features["body_style"] and target_features["body_style"]:
            scores["body_style"] = self.weights["body_style"] if \
                source_features["body_style"] == target_features["body_style"] else 0.0
        else:
            scores["body_style"] = 0.0
        
        # Price range similarity (same bucket = full, adjacent = partial)
        source_bucket = source_features["price_bucket"]
        target_bucket = target_features["price_bucket"]
        bucket_diff = abs(source_bucket - target_bucket)
        
        if bucket_diff == 0:
            scores["price_range"] = self.weights["price_range"]
        elif bucket_diff == 1:
            scores["price_range"] = self.weights["price_range"] * self.adjacent_bucket_score
        else:
            scores["price_range"] = 0.0
        
        # Fuel type match
        if source_features["fuel_type"] and target_features["fuel_type"]:
            scores["fuel_type"] = self.weights["fuel_type"] if \
                source_features["fuel_type"] == target_features["fuel_type"] else 0.0
        else:
            scores["fuel_type"] = 0.0
        
        # Drivetrain match
        if source_features["drivetrain"] and target_features["drivetrain"]:
            scores["drivetrain"] = self.weights["drivetrain"] if \
                source_features["drivetrain"] == target_features["drivetrain"] else 0.0
        else:
            scores["drivetrain"] = 0.0
        
        # Feature overlap (Jaccard similarity)
        source_set = set(source_features["features"])
        target_set = set(target_features["features"])
        
        if source_set and target_set:
            intersection = len(source_set & target_set)
            union = len(source_set | target_set)
            feature_similarity = intersection / union if union > 0 else 0.0
            scores["features"] = self.weights["features"] * feature_similarity
        else:
            scores["features"] = 0.0
        
        # Performance match
        if source_features["is_performance"] and target_features["is_performance"]:
            scores["performance"] = self.weights["performance"]
        elif not source_features["is_performance"] and not target_features["is_performance"]:
            scores["performance"] = self.weights["performance"] * 0.5  # Partial credit for both non-performance
        else:
            scores["performance"] = 0.0
        
        # Year proximity (within 2 years = full, within 4 = partial)
        if source_features["year"] and target_features["year"]:
            year_diff = abs(source_features["year"] - target_features["year"])
            if year_diff <= 2:
                scores["year"] = self.weights["year"]
            elif year_diff <= 4:
                scores["year"] = self.weights["year"] * 0.5
            else:
                scores["year"] = 0.0
        else:
            scores["year"] = 0.0
        
        # Luxury match
        if source_features["is_luxury"] and target_features["is_luxury"]:
            scores["luxury"] = self.weights["luxury"]
        elif not source_features["is_luxury"] and not target_features["is_luxury"]:
            scores["luxury"] = self.weights["luxury"] * 0.5
        else:
            scores["luxury"] = 0.0
        
        total_score = sum(scores.values())
        max_possible = sum(self.weights.values())
        normalized_score = total_score / max_possible if max_possible > 0 else 0.0
        
        return normalized_score, scores
    
    def get_recommendations(
        self,
        source_vehicle: Dict[str, Any],
        candidates: List[Dict[str, Any]],
        limit: int = 6,
        min_score: float = 0.3,
        exclude_stock_numbers: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get vehicle recommendations based on a source vehicle.
        
        Args:
            source_vehicle: The vehicle to base recommendations on
            candidates: List of candidate vehicles to score
            limit: Maximum number of recommendations to return
            min_score: Minimum similarity score to include
            exclude_stock_numbers: Stock numbers to exclude from results
            
        Returns:
            List of recommendation dictionaries with scores and match reasons
        """
        exclude_set = set(exclude_stock_numbers or [])
        source_features = self.extract_features(source_vehicle)
        
        # Add source vehicle's stock number to exclusions
        if source_features["stock_number"]:
            exclude_set.add(source_features["stock_number"])
        
        scored_vehicles = []
        
        for candidate in candidates:
            candidate_features = self.extract_features(candidate)
            
            # Skip excluded vehicles - check both extracted and raw stock numbers
            candidate_stock = candidate_features["stock_number"]
            if candidate_stock and candidate_stock in exclude_set:
                continue
            
            # Also check raw field names for stock number
            raw_stock = (
                candidate.get("Stock Number") or 
                candidate.get("stockNumber") or 
                candidate.get("stock_number")
            )
            if raw_stock and raw_stock in exclude_set:
                continue
            
            score, component_scores = self.calculate_similarity(source_features, candidate_features)
            
            if score >= min_score:
                # Generate match reasons based on top scoring components
                match_reasons = self._generate_match_reasons(component_scores, candidate_features)
                
                scored_vehicles.append({
                    "vehicle": candidate,
                    "score": round(score, 3),
                    "component_scores": {k: round(v, 3) for k, v in component_scores.items()},
                    "match_reasons": match_reasons,
                    "confidence": self._score_to_confidence(score)
                })
        
        # Sort by score descending
        scored_vehicles.sort(key=lambda x: x["score"], reverse=True)
        
        return scored_vehicles[:limit]
    
    def _generate_match_reasons(
        self, 
        component_scores: Dict[str, float], 
        target_features: Dict[str, Any]
    ) -> List[str]:
        """Generate human-readable match reasons based on scores."""
        reasons = []
        
        # Sort components by score
        sorted_components = sorted(
            component_scores.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        for component, score in sorted_components[:3]:  # Top 3 reasons
            if score <= 0:
                continue
                
            if component == "body_style" and target_features.get("body_style"):
                reasons.append(f"Same body style ({target_features['body_style']})")
            elif component == "price_range":
                reasons.append("Similar price range")
            elif component == "fuel_type" and target_features.get("fuel_type"):
                reasons.append(f"Same fuel type ({target_features['fuel_type']})")
            elif component == "drivetrain" and target_features.get("drivetrain"):
                reasons.append(f"Same drivetrain ({target_features['drivetrain']})")
            elif component == "features":
                reasons.append("Similar features")
            elif component == "performance" and target_features.get("is_performance"):
                reasons.append("Performance-oriented")
            elif component == "year":
                reasons.append("Similar model year")
            elif component == "luxury" and target_features.get("is_luxury"):
                reasons.append("Luxury vehicle")
        
        return reasons if reasons else ["General similarity"]
    
    def _score_to_confidence(self, score: float) -> str:
        """Convert numeric score to confidence level."""
        if score >= 0.8:
            return "high"
        elif score >= 0.5:
            return "medium"
        else:
            return "low"
    
    def get_personalized_recommendations(
        self,
        browsing_history: List[Dict[str, Any]],
        candidates: List[Dict[str, Any]],
        limit: int = 6
    ) -> List[Dict[str, Any]]:
        """
        Get recommendations based on a user's browsing history.
        
        Aggregates preferences from multiple viewed vehicles to generate
        personalized recommendations.
        
        Args:
            browsing_history: List of vehicles the user has viewed
            candidates: List of candidate vehicles to score
            limit: Maximum number of recommendations to return
            
        Returns:
            List of recommendation dictionaries
        """
        if not browsing_history:
            return []
        
        # Extract features from all browsed vehicles
        history_features = [self.extract_features(v) for v in browsing_history]
        
        # Aggregate preferences
        body_style_counts: Dict[str, int] = {}
        fuel_type_counts: Dict[str, int] = {}
        drivetrain_counts: Dict[str, int] = {}
        price_buckets: List[int] = []
        all_features: List[str] = []
        performance_count = 0
        luxury_count = 0
        
        for features in history_features:
            if features["body_style"]:
                body_style_counts[features["body_style"]] = \
                    body_style_counts.get(features["body_style"], 0) + 1
            if features["fuel_type"]:
                fuel_type_counts[features["fuel_type"]] = \
                    fuel_type_counts.get(features["fuel_type"], 0) + 1
            if features["drivetrain"]:
                drivetrain_counts[features["drivetrain"]] = \
                    drivetrain_counts.get(features["drivetrain"], 0) + 1
            
            price_buckets.append(features["price_bucket"])
            all_features.extend(features["features"])
            
            if features["is_performance"]:
                performance_count += 1
            if features["is_luxury"]:
                luxury_count += 1
        
        # Create synthetic "ideal" vehicle profile
        def get_most_common(counts: Dict[str, int]) -> str:
            if not counts:
                return ""
            return max(counts.items(), key=lambda x: x[1])[0]
        
        avg_price_bucket = round(sum(price_buckets) / len(price_buckets)) if price_buckets else 3
        
        ideal_profile = {
            "body_style": get_most_common(body_style_counts),
            "fuel_type": get_most_common(fuel_type_counts),
            "drivetrain": get_most_common(drivetrain_counts),
            "price_bucket": avg_price_bucket,
            "features": list(set(all_features)),  # Unique features
            "is_performance": performance_count > len(browsing_history) / 2,
            "is_luxury": luxury_count > len(browsing_history) / 2,
            "year": 0,  # Not used for aggregate matching
            "mileage_bucket": 0,
            "make": "",
            "model": "",
            "trim": "",
            "stock_number": ""
        }
        
        # Get viewed stock numbers to exclude
        viewed_stocks = set()
        for f in history_features:
            if f["stock_number"]:
                viewed_stocks.add(f["stock_number"])
        # Also get raw stock numbers from browsing history
        for v in browsing_history:
            raw_stock = v.get("Stock Number") or v.get("stockNumber") or v.get("stock_number")
            if raw_stock:
                viewed_stocks.add(raw_stock)
        
        # Score candidates against ideal profile
        scored_vehicles = []
        
        for candidate in candidates:
            candidate_features = self.extract_features(candidate)
            
            # Check both extracted and raw stock numbers
            candidate_stock = candidate_features["stock_number"]
            raw_stock = candidate.get("Stock Number") or candidate.get("stockNumber")
            
            if candidate_stock in viewed_stocks or raw_stock in viewed_stocks:
                continue
            
            score, component_scores = self.calculate_similarity(ideal_profile, candidate_features)
            
            if score >= 0.25:  # Lower threshold for personalized
                match_reasons = self._generate_match_reasons(component_scores, candidate_features)
                
                scored_vehicles.append({
                    "vehicle": candidate,
                    "score": round(score, 3),
                    "component_scores": {k: round(v, 3) for k, v in component_scores.items()},
                    "match_reasons": match_reasons,
                    "confidence": self._score_to_confidence(score),
                    "personalized": True
                })
        
        scored_vehicles.sort(key=lambda x: x["score"], reverse=True)
        
        return scored_vehicles[:limit]


# Module-level convenience functions
_default_recommender: Optional[VehicleRecommender] = None


def get_recommender() -> VehicleRecommender:
    """Get or create the default recommender instance."""
    global _default_recommender
    if _default_recommender is None:
        _default_recommender = VehicleRecommender()
    return _default_recommender


def get_recommendations(
    source_vehicle: Dict[str, Any],
    candidates: List[Dict[str, Any]],
    **kwargs
) -> List[Dict[str, Any]]:
    """Convenience function to get recommendations using default recommender."""
    return get_recommender().get_recommendations(source_vehicle, candidates, **kwargs)


def get_personalized_recommendations(
    browsing_history: List[Dict[str, Any]],
    candidates: List[Dict[str, Any]],
    **kwargs
) -> List[Dict[str, Any]]:
    """Convenience function to get personalized recommendations."""
    return get_recommender().get_personalized_recommendations(
        browsing_history, candidates, **kwargs
    )
