"""
Semantic Vehicle Retriever
Intelligent inventory search using TF-IDF similarity scoring.

Features:
- Semantic matching beyond keyword search
- Preference-weighted scoring
- Dynamic relevance based on conversation context
- No external dependencies (pure Python implementation)
"""

from typing import Dict, Any, List, Optional, Tuple, Set
from dataclasses import dataclass
from collections import defaultdict
import math
import re
import logging

from app.services.inventory_enrichment import enrich_vehicle
from app.services.conversation_state import ConversationState

logger = logging.getLogger("showroom_kiosk.ai.vehicle_retriever")


@dataclass
class ScoredVehicle:
    """Vehicle with relevance score and match explanations"""
    vehicle: Dict[str, Any]
    score: float
    match_reasons: List[str]
    preference_matches: Dict[str, bool]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "vehicle": self.vehicle,
            "score": round(self.score, 3),
            "match_reasons": self.match_reasons,
            "preference_matches": self.preference_matches,
        }


class TFIDFVectorizer:
    """
    Simple TF-IDF implementation for vehicle text matching.
    No external dependencies required.
    """
    
    def __init__(self):
        self.vocabulary: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self.documents: List[List[str]] = []
    
    def _tokenize(self, text: str) -> List[str]:
        """Tokenize text into words"""
        text = text.lower()
        # Remove special characters, keep alphanumeric and spaces
        text = re.sub(r'[^a-z0-9\s]', ' ', text)
        tokens = text.split()
        # Remove very short tokens and common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'is', 'are', 'was', 'were', 'with'}
        return [t for t in tokens if len(t) > 1 and t not in stop_words]
    
    def fit(self, documents: List[str]) -> 'TFIDFVectorizer':
        """Fit the vectorizer on a corpus of documents"""
        self.documents = [self._tokenize(doc) for doc in documents]
        
        # Build vocabulary
        all_tokens = set()
        for tokens in self.documents:
            all_tokens.update(tokens)
        
        self.vocabulary = {token: idx for idx, token in enumerate(sorted(all_tokens))}
        
        # Calculate IDF for each term
        n_docs = len(self.documents)
        doc_freq = defaultdict(int)
        
        for tokens in self.documents:
            for token in set(tokens):  # Count each term once per doc
                doc_freq[token] += 1
        
        self.idf = {
            token: math.log((n_docs + 1) / (freq + 1)) + 1
            for token, freq in doc_freq.items()
        }
        
        return self
    
    def transform(self, text: str) -> Dict[str, float]:
        """Transform text to TF-IDF vector (as sparse dict)"""
        tokens = self._tokenize(text)
        
        if not tokens:
            return {}
        
        # Calculate term frequency
        tf = defaultdict(int)
        for token in tokens:
            tf[token] += 1
        
        # Normalize TF
        max_tf = max(tf.values()) if tf else 1
        
        # Calculate TF-IDF
        vector = {}
        for token, count in tf.items():
            if token in self.idf:
                normalized_tf = 0.5 + 0.5 * (count / max_tf)
                vector[token] = normalized_tf * self.idf[token]
        
        return vector
    
    def similarity(self, vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        """Calculate cosine similarity between two sparse vectors"""
        if not vec1 or not vec2:
            return 0.0
        
        # Get common keys
        common_keys = set(vec1.keys()) & set(vec2.keys())
        
        if not common_keys:
            return 0.0
        
        # Calculate dot product
        dot_product = sum(vec1[k] * vec2[k] for k in common_keys)
        
        # Calculate magnitudes
        mag1 = math.sqrt(sum(v * v for v in vec1.values()))
        mag2 = math.sqrt(sum(v * v for v in vec2.values()))
        
        if mag1 == 0 or mag2 == 0:
            return 0.0
        
        return dot_product / (mag1 * mag2)


class SemanticVehicleRetriever:
    """
    Retrieves relevant vehicles using semantic similarity and preference matching.
    Combines TF-IDF text similarity with structured preference matching.
    """
    
    # Scoring weights
    WEIGHTS = {
        'text_similarity': 30,      # TF-IDF match
        'budget_match': 25,         # Within budget
        'type_match': 20,           # Body style match
        'feature_match': 15,        # Must-have features
        'use_case_match': 10,       # Matches use case
    }
    
    # Semantic expansions for better matching
    SEMANTIC_EXPANSIONS = {
        # Vehicle types
        'truck': ['pickup', 'silverado', 'colorado', 'work truck', 'towing'],
        'suv': ['sport utility', 'crossover', 'family vehicle'],
        'family': ['seating', 'space', 'kids', 'passengers', 'traverse', 'tahoe', 'suburban'],
        'electric': ['ev', 'zero emissions', 'battery', 'charging', 'eco friendly'],
        'luxury': ['premium', 'high country', 'premier', 'leather', 'upscale'],
        'sport': ['performance', 'fast', 'corvette', 'camaro', 'speed', 'horsepower'],
        
        # Features
        'towing': ['hitch', 'trailer', 'hauling', 'capacity', 'torque'],
        'safety': ['airbags', 'collision', 'assist', 'blind spot', 'lane departure'],
        'technology': ['infotainment', 'carplay', 'android auto', 'navigation', 'wireless'],
        'comfort': ['heated seats', 'climate', 'quiet', 'smooth ride'],
        'offroad': ['4wd', 'awd', '4x4', 'z71', 'trail', 'skid plates'],
        
        # Use cases
        'commute': ['efficient', 'mpg', 'fuel economy', 'daily driver'],
        'work': ['work truck', 'commercial', 'fleet', 'utility', 'durable'],
        'adventure': ['camping', 'outdoor', 'recreation', 'versatile'],
    }
    
    # Color synonyms
    COLOR_SYNONYMS = {
        'red': ['cherry', 'crimson', 'radiant red', 'cayenne'],
        'blue': ['navy', 'glacier', 'lakeshore', 'northsky', 'pacific'],
        'black': ['onyx', 'midnight', 'mosaic black'],
        'white': ['summit', 'pearl', 'arctic', 'iridescent'],
        'silver': ['metallic', 'sterling', 'satin steel'],
        'gray': ['grey', 'graphite', 'shadow', 'satin'],
        'green': ['evergreen', 'woodland'],
    }
    
    def __init__(self):
        self.vectorizer = TFIDFVectorizer()
        self.inventory: List[Dict[str, Any]] = []
        self.vehicle_vectors: List[Dict[str, float]] = []
        self._is_fitted = False
    
    def fit(self, inventory: List[Dict[str, Any]]) -> 'SemanticVehicleRetriever':
        """
        Fit the retriever on inventory data.
        Enriches vehicles and builds TF-IDF index.
        """
        # Enrich all vehicles
        self.inventory = [enrich_vehicle(v) for v in inventory]
        
        # Build text documents for each vehicle
        documents = [self._vehicle_to_text(v) for v in self.inventory]
        
        # Fit vectorizer
        self.vectorizer.fit(documents)
        
        # Pre-compute vehicle vectors
        self.vehicle_vectors = [
            self.vectorizer.transform(doc) for doc in documents
        ]
        
        self._is_fitted = True
        logger.info(f"Fitted retriever on {len(self.inventory)} vehicles")
        
        return self
    
    def _vehicle_to_text(self, vehicle: Dict[str, Any]) -> str:
        """Convert vehicle data to searchable text document"""
        parts = [
            str(vehicle.get('Year') or vehicle.get('year', '')),
            str(vehicle.get('Make') or vehicle.get('make', '')),
            str(vehicle.get('Model') or vehicle.get('model', '')),
            str(vehicle.get('Trim') or vehicle.get('trim', '')),
            str(vehicle.get('Body') or vehicle.get('body', '')),
            str(vehicle.get('bodyStyle', '')),
            str(vehicle.get('drivetrain', '')),
            str(vehicle.get('fuelType', '')),
            str(vehicle.get('exteriorColor') or vehicle.get('Exterior Color', '')),
        ]
        
        # Add features
        features = vehicle.get('features', [])
        if features:
            parts.extend(features)
        
        # Add derived attributes
        if vehicle.get('isElectric'):
            parts.append('electric ev zero emissions')
        if vehicle.get('isLuxury'):
            parts.append('luxury premium upscale')
        if vehicle.get('isPerformance'):
            parts.append('performance sport fast')
        
        # Add capacity info
        towing = vehicle.get('towingCapacity', 0)
        if towing >= 10000:
            parts.append('heavy towing high capacity')
        elif towing >= 5000:
            parts.append('towing capable')
        
        seating = vehicle.get('seatingCapacity', 5)
        if seating >= 7:
            parts.append('large family third row')
        elif seating >= 5:
            parts.append('family')
        
        return ' '.join(str(p) for p in parts if p)
    
    def _expand_query(self, query: str) -> str:
        """Expand query with semantic synonyms"""
        expanded_parts = [query]
        query_lower = query.lower()
        
        # Add semantic expansions
        for key, expansions in self.SEMANTIC_EXPANSIONS.items():
            if key in query_lower:
                expanded_parts.extend(expansions)
        
        # Add color synonyms
        for color, synonyms in self.COLOR_SYNONYMS.items():
            if color in query_lower:
                expanded_parts.extend(synonyms)
        
        return ' '.join(expanded_parts)
    
    def retrieve(
        self,
        query: str,
        conversation_state: Optional[ConversationState] = None,
        limit: int = 6,
        min_score: float = 0.1
    ) -> List[ScoredVehicle]:
        """
        Retrieve relevant vehicles based on query and conversation context.
        
        Args:
            query: Search query (natural language)
            conversation_state: Current conversation state for preference matching
            limit: Maximum number of results
            min_score: Minimum relevance score threshold
            
        Returns:
            List of ScoredVehicle objects sorted by relevance
        """
        if not self._is_fitted:
            logger.warning("Retriever not fitted, returning empty results")
            return []
        
        # Expand query semantically
        expanded_query = self._expand_query(query)
        query_vector = self.vectorizer.transform(expanded_query)
        
        scored_vehicles = []
        
        for idx, vehicle in enumerate(self.inventory):
            score = 0.0
            reasons = []
            pref_matches = {}
            
            # 1. Text similarity score
            text_sim = self.vectorizer.similarity(query_vector, self.vehicle_vectors[idx])
            text_score = text_sim * self.WEIGHTS['text_similarity']
            if text_sim > 0.1:
                score += text_score
                reasons.append(f"Matches search: {text_sim:.0%}")
            
            # 2. Budget match (if state available)
            if conversation_state and conversation_state.budget_max:
                price = self._get_price(vehicle)
                if price > 0:
                    if price <= conversation_state.budget_max:
                        budget_score = self.WEIGHTS['budget_match']
                        if conversation_state.budget_min and price >= conversation_state.budget_min:
                            budget_score *= 1.0  # Perfect fit
                        elif price <= conversation_state.budget_max * 0.8:
                            budget_score *= 0.9  # Under budget (good)
                        score += budget_score
                        reasons.append("Within budget")
                        pref_matches['budget'] = True
                    else:
                        # Penalize but don't exclude if close
                        over_pct = (price - conversation_state.budget_max) / conversation_state.budget_max
                        if over_pct <= 0.15:  # Within 15% over
                            score += self.WEIGHTS['budget_match'] * 0.3
                            reasons.append("Slightly over budget")
                        pref_matches['budget'] = False
            
            # 3. Type match
            if conversation_state and conversation_state.preferred_types:
                body_style = (vehicle.get('bodyStyle') or '').lower()
                model = (vehicle.get('Model') or vehicle.get('model') or '').lower()
                
                for pref_type in conversation_state.preferred_types:
                    pref_lower = pref_type.lower()
                    if pref_lower in body_style or pref_lower in model:
                        score += self.WEIGHTS['type_match']
                        reasons.append(f"Matches {pref_type} preference")
                        pref_matches['type'] = True
                        break
                    # Check semantic expansions
                    if pref_lower in self.SEMANTIC_EXPANSIONS:
                        for expansion in self.SEMANTIC_EXPANSIONS[pref_lower]:
                            if expansion in model or expansion in body_style:
                                score += self.WEIGHTS['type_match'] * 0.8
                                reasons.append(f"Related to {pref_type} preference")
                                pref_matches['type'] = True
                                break
            
            # 4. Feature match
            if conversation_state and conversation_state.preferred_features:
                vehicle_features = set(f.lower() for f in vehicle.get('features', []))
                vehicle_text = self._vehicle_to_text(vehicle).lower()
                
                matched_features = 0
                for feature in conversation_state.preferred_features:
                    feature_lower = feature.lower()
                    if feature_lower in vehicle_text or any(feature_lower in f for f in vehicle_features):
                        matched_features += 1
                
                if matched_features > 0:
                    feature_pct = matched_features / len(conversation_state.preferred_features)
                    score += self.WEIGHTS['feature_match'] * feature_pct
                    reasons.append(f"Has {matched_features} preferred features")
                    pref_matches['features'] = matched_features > 0
            
            # 5. Use case match
            if conversation_state and conversation_state.use_cases:
                for use_case in conversation_state.use_cases:
                    use_case_lower = use_case.lower()
                    matched = False
                    
                    if use_case_lower == 'towing' and vehicle.get('towingCapacity', 0) >= 5000:
                        score += self.WEIGHTS['use_case_match']
                        reasons.append(f"Can tow {vehicle.get('towingCapacity'):,} lbs")
                        matched = True
                    elif use_case_lower == 'family':
                        if vehicle.get('seatingCapacity', 5) >= (conversation_state.min_seating or 5):
                            score += self.WEIGHTS['use_case_match']
                            reasons.append(f"Seats {vehicle.get('seatingCapacity')}")
                            matched = True
                    elif use_case_lower in self.SEMANTIC_EXPANSIONS:
                        vehicle_text = self._vehicle_to_text(vehicle).lower()
                        if any(exp in vehicle_text for exp in self.SEMANTIC_EXPANSIONS[use_case_lower]):
                            score += self.WEIGHTS['use_case_match']
                            reasons.append(f"Good for {use_case}")
                            matched = True
                    
                    if matched:
                        pref_matches['use_case'] = True
                        break
            
            # 6. Boost for already discussed/favorited vehicles
            if conversation_state:
                stock = vehicle.get('Stock Number') or vehicle.get('stockNumber', '')
                if stock in conversation_state.favorite_vehicles:
                    score *= 1.5
                    reasons.append("Previously favorited")
                elif stock in conversation_state.discussed_vehicles:
                    score *= 1.2
                    reasons.append("Previously discussed")
                elif stock in conversation_state.rejected_vehicles:
                    score *= 0.3  # Significantly reduce rejected vehicles
            
            # Add to results if above threshold
            if score >= min_score:
                scored_vehicles.append(ScoredVehicle(
                    vehicle=vehicle,
                    score=score,
                    match_reasons=reasons,
                    preference_matches=pref_matches
                ))
        
        # Sort by score and return top results
        scored_vehicles.sort(key=lambda x: x.score, reverse=True)
        
        logger.debug(f"Retrieved {len(scored_vehicles[:limit])} vehicles for query: {query[:50]}")
        
        return scored_vehicles[:limit]
    
    def retrieve_similar(
        self,
        source_vehicle: Dict[str, Any],
        limit: int = 6
    ) -> List[ScoredVehicle]:
        """Find vehicles similar to a source vehicle"""
        if not self._is_fitted:
            return []
        
        source_text = self._vehicle_to_text(enrich_vehicle(source_vehicle))
        source_vector = self.vectorizer.transform(source_text)
        source_stock = source_vehicle.get('Stock Number') or source_vehicle.get('stockNumber', '')
        source_price = self._get_price(source_vehicle)
        
        scored_vehicles = []
        
        for idx, vehicle in enumerate(self.inventory):
            # Skip source vehicle
            stock = vehicle.get('Stock Number') or vehicle.get('stockNumber', '')
            if stock == source_stock:
                continue
            
            # Calculate similarity
            sim = self.vectorizer.similarity(source_vector, self.vehicle_vectors[idx])
            
            reasons = []
            score = sim * 100  # Scale to 0-100
            
            # Bonus for same body style
            if vehicle.get('bodyStyle') == source_vehicle.get('bodyStyle'):
                score += 20
                reasons.append(f"Same type ({vehicle.get('bodyStyle')})")
            
            # Bonus for similar price
            price = self._get_price(vehicle)
            if source_price > 0 and price > 0:
                price_diff = abs(price - source_price) / source_price
                if price_diff <= 0.1:
                    score += 15
                    reasons.append("Similar price")
                elif price_diff <= 0.2:
                    score += 10
            
            if score > 20:
                scored_vehicles.append(ScoredVehicle(
                    vehicle=vehicle,
                    score=score,
                    match_reasons=reasons,
                    preference_matches={}
                ))
        
        scored_vehicles.sort(key=lambda x: x.score, reverse=True)
        return scored_vehicles[:limit]
    
    def retrieve_by_criteria(
        self,
        body_style: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        min_seating: Optional[int] = None,
        min_towing: Optional[int] = None,
        fuel_type: Optional[str] = None,
        drivetrain: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Retrieve vehicles by structured criteria (for tool use).
        Returns raw vehicle dicts without scoring.
        """
        results = []
        
        for vehicle in self.inventory:
            # Body style filter
            if body_style:
                v_style = (vehicle.get('bodyStyle') or '').lower()
                if body_style.lower() not in v_style:
                    continue
            
            # Price filter
            price = self._get_price(vehicle)
            if min_price and price < min_price:
                continue
            if max_price and price > max_price:
                continue
            
            # Seating filter
            if min_seating:
                if (vehicle.get('seatingCapacity') or 5) < min_seating:
                    continue
            
            # Towing filter
            if min_towing:
                if (vehicle.get('towingCapacity') or 0) < min_towing:
                    continue
            
            # Fuel type filter
            if fuel_type:
                v_fuel = (vehicle.get('fuelType') or '').lower()
                if fuel_type.lower() not in v_fuel:
                    continue
            
            # Drivetrain filter
            if drivetrain:
                v_drive = (vehicle.get('drivetrain') or '').lower()
                if drivetrain.lower() not in v_drive:
                    continue
            
            results.append(vehicle)
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_vehicle_by_stock(self, stock_number: str) -> Optional[Dict[str, Any]]:
        """Get a specific vehicle by stock number"""
        stock_upper = stock_number.upper()
        for vehicle in self.inventory:
            v_stock = (vehicle.get('Stock Number') or vehicle.get('stockNumber') or '').upper()
            if v_stock == stock_upper:
                return vehicle
        return None
    
    def _get_price(self, vehicle: Dict[str, Any]) -> float:
        """Extract price from vehicle"""
        for field in ['MSRP', 'msrp', 'price', 'salePrice']:
            if field in vehicle and vehicle[field]:
                try:
                    return float(vehicle[field])
                except (ValueError, TypeError):
                    continue
        return 0.0
    
    def get_inventory_summary(self) -> Dict[str, Any]:
        """Get summary statistics about current inventory"""
        if not self.inventory:
            return {"total": 0}
        
        body_styles = defaultdict(int)
        price_ranges = {"under_30k": 0, "30k_50k": 0, "50k_75k": 0, "over_75k": 0}
        models = defaultdict(int)
        
        for vehicle in self.inventory:
            # Body style counts
            style = vehicle.get('bodyStyle', 'Other')
            body_styles[style] += 1
            
            # Price range counts
            price = self._get_price(vehicle)
            if price < 30000:
                price_ranges["under_30k"] += 1
            elif price < 50000:
                price_ranges["30k_50k"] += 1
            elif price < 75000:
                price_ranges["50k_75k"] += 1
            else:
                price_ranges["over_75k"] += 1
            
            # Model counts
            model = vehicle.get('Model') or vehicle.get('model', 'Unknown')
            models[model] += 1
        
        return {
            "total": len(self.inventory),
            "by_body_style": dict(body_styles),
            "by_price_range": price_ranges,
            "top_models": dict(sorted(models.items(), key=lambda x: -x[1])[:10]),
            "price_range": {
                "min": min(self._get_price(v) for v in self.inventory if self._get_price(v) > 0),
                "max": max(self._get_price(v) for v in self.inventory),
            }
        }


# Module-level singleton
_retriever: Optional[SemanticVehicleRetriever] = None


def get_vehicle_retriever() -> SemanticVehicleRetriever:
    """Get or create the vehicle retriever instance"""
    global _retriever
    if _retriever is None:
        _retriever = SemanticVehicleRetriever()
    return _retriever
