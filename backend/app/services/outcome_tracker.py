"""
Outcome Tracker Service
Logs conversation outcomes for AI learning and performance analysis.

Features:
- Tracks conversation outcomes (lead, test drive, sale, abandoned)
- Records successful conversation patterns
- Provides analytics for prompt improvement
- Stores interaction quality signals
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
from collections import defaultdict
import json
import logging
import os

from app.services.conversation_state import ConversationState, ConversationStage, InterestLevel

logger = logging.getLogger("showroom_kiosk.ai.outcome_tracker")


class ConversationOutcome(str, Enum):
    """Possible conversation outcomes"""
    # Positive outcomes
    LEAD_SUBMITTED = "lead_submitted"
    TEST_DRIVE_SCHEDULED = "test_drive_scheduled"
    APPRAISAL_REQUESTED = "appraisal_requested"
    SALES_HANDOFF = "sales_handoff"
    FINANCE_INQUIRY = "finance_inquiry"
    
    # Neutral outcomes
    BROWSING_COMPLETE = "browsing_complete"
    INFORMATION_GATHERED = "information_gathered"
    
    # Negative outcomes
    ABANDONED = "abandoned"
    OBJECTION_EXIT = "objection_exit"
    NO_MATCH = "no_match"
    FRUSTRATED = "frustrated"
    
    # Unknown
    UNKNOWN = "unknown"


class InteractionQuality(str, Enum):
    """Quality rating of AI interaction"""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


@dataclass
class InteractionSignal:
    """A signal about interaction quality"""
    signal_type: str
    description: str
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class OutcomeRecord:
    """Complete record of a conversation and its outcome"""
    session_id: str
    outcome: ConversationOutcome
    quality: InteractionQuality
    
    started_at: datetime
    ended_at: datetime
    duration_seconds: int
    message_count: int
    
    final_stage: ConversationStage
    final_interest: InterestLevel
    stages_visited: List[str]
    
    vehicles_discussed: int
    favorites_count: int
    objections_raised: int
    objections_addressed: int
    
    successful_patterns: List[str] = field(default_factory=list)
    failed_patterns: List[str] = field(default_factory=list)
    signals: List[Dict[str, Any]] = field(default_factory=list)
    key_moments: List[Dict[str, Any]] = field(default_factory=list)
    
    prompt_version: Optional[str] = None
    customer_segment: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "outcome": self.outcome.value,
            "quality": self.quality.value,
            "started_at": self.started_at.isoformat(),
            "ended_at": self.ended_at.isoformat(),
            "duration_seconds": self.duration_seconds,
            "message_count": self.message_count,
            "final_stage": self.final_stage.value,
            "final_interest": self.final_interest.value,
            "stages_visited": self.stages_visited,
            "vehicles_discussed": self.vehicles_discussed,
            "favorites_count": self.favorites_count,
            "objections_raised": self.objections_raised,
            "objections_addressed": self.objections_addressed,
            "successful_patterns": self.successful_patterns,
            "failed_patterns": self.failed_patterns,
            "signals": self.signals,
            "key_moments": self.key_moments,
            "prompt_version": self.prompt_version,
            "customer_segment": self.customer_segment,
        }


class OutcomeTracker:
    """Tracks conversation outcomes and extracts learning patterns."""
    
    OUTCOME_SCORES = {
        ConversationOutcome.LEAD_SUBMITTED: 100,
        ConversationOutcome.TEST_DRIVE_SCHEDULED: 90,
        ConversationOutcome.SALES_HANDOFF: 85,
        ConversationOutcome.APPRAISAL_REQUESTED: 80,
        ConversationOutcome.FINANCE_INQUIRY: 75,
        ConversationOutcome.BROWSING_COMPLETE: 40,
        ConversationOutcome.INFORMATION_GATHERED: 30,
        ConversationOutcome.NO_MATCH: 20,
        ConversationOutcome.OBJECTION_EXIT: 15,
        ConversationOutcome.ABANDONED: 10,
        ConversationOutcome.FRUSTRATED: 5,
        ConversationOutcome.UNKNOWN: 0,
    }
    
    def __init__(self, storage_path: Optional[str] = None):
        self.storage_path = storage_path or "/tmp/showroom_kiosk_outcomes"
        self._outcomes: List[OutcomeRecord] = []
        self._session_signals: Dict[str, List[InteractionSignal]] = defaultdict(list)
        os.makedirs(self.storage_path, exist_ok=True)
    
    def record_signal(self, session_id: str, signal_type: str, description: str) -> None:
        """Record an interaction quality signal during conversation"""
        signal = InteractionSignal(signal_type=signal_type, description=description)
        self._session_signals[session_id].append(signal)
    
    def finalize_conversation(
        self,
        state: ConversationState,
        outcome: Optional[ConversationOutcome] = None,
        prompt_version: Optional[str] = None
    ) -> OutcomeRecord:
        """Finalize a conversation and record its outcome."""
        if outcome is None:
            outcome = self._infer_outcome(state)
        
        quality = self._assess_quality(state)
        successful, failed = self._extract_patterns(state, outcome)
        segment = self._determine_segment(state)
        
        record = OutcomeRecord(
            session_id=state.session_id,
            outcome=outcome,
            quality=quality,
            started_at=state.started_at,
            ended_at=state.last_activity,
            duration_seconds=int((state.last_activity - state.started_at).total_seconds()),
            message_count=state.message_count,
            final_stage=state.stage,
            final_interest=state.interest_level,
            stages_visited=self._get_stages_visited(state),
            vehicles_discussed=len(state.discussed_vehicles),
            favorites_count=len(state.favorite_vehicles),
            objections_raised=len(state.objections),
            objections_addressed=len([o for o in state.objections if o.addressed]),
            successful_patterns=successful,
            failed_patterns=failed,
            signals=[
                {"type": s.signal_type, "description": s.description}
                for s in self._session_signals.get(state.session_id, [])
            ],
            key_moments=state.key_moments,
            prompt_version=prompt_version,
            customer_segment=segment,
        )
        
        self._outcomes.append(record)
        self._persist_record(record)
        
        if state.session_id in self._session_signals:
            del self._session_signals[state.session_id]
        
        logger.info(f"Conversation finalized: {state.session_id} - outcome={outcome.value}")
        return record
    
    def _infer_outcome(self, state: ConversationState) -> ConversationOutcome:
        """Infer outcome from conversation state"""
        if state.staff_notified:
            if state.staff_notification_type == 'sales':
                return ConversationOutcome.SALES_HANDOFF
            elif state.staff_notification_type == 'appraisal':
                return ConversationOutcome.APPRAISAL_REQUESTED
            elif state.staff_notification_type == 'finance':
                return ConversationOutcome.FINANCE_INQUIRY
        
        if state.test_drive_requested:
            return ConversationOutcome.TEST_DRIVE_SCHEDULED
        if state.appraisal_requested:
            return ConversationOutcome.APPRAISAL_REQUESTED
        if state.customer_phone or state.customer_email:
            return ConversationOutcome.LEAD_SUBMITTED
        if state.frustration_signals > 3:
            return ConversationOutcome.FRUSTRATED
        if state.needs_spouse_approval and not any(o.addressed for o in state.objections):
            return ConversationOutcome.OBJECTION_EXIT
        if state.message_count < 3:
            return ConversationOutcome.ABANDONED
        if len(state.discussed_vehicles) == 0:
            return ConversationOutcome.NO_MATCH
        if state.interest_level in [InterestLevel.WARM, InterestLevel.HOT]:
            return ConversationOutcome.BROWSING_COMPLETE
        return ConversationOutcome.INFORMATION_GATHERED
    
    def _assess_quality(self, state: ConversationState) -> InteractionQuality:
        """Assess interaction quality from state"""
        score = 0
        if state.message_count >= 5:
            score += 20
        if len(state.discussed_vehicles) >= 2:
            score += 20
        if state.budget_max:
            score += 15
        if state.preferred_types:
            score += 15
        if state.favorite_vehicles:
            score += 15
        if state.interest_level == InterestLevel.HOT:
            score += 15
        if state.frustration_signals > 0:
            score -= 20 * state.frustration_signals
        score -= 10 * len([o for o in state.objections if not o.addressed])
        if state.message_count < 3:
            score -= 20
        
        if score >= 70:
            return InteractionQuality.EXCELLENT
        elif score >= 50:
            return InteractionQuality.GOOD
        elif score >= 30:
            return InteractionQuality.FAIR
        return InteractionQuality.POOR
    
    def _extract_patterns(self, state: ConversationState, outcome: ConversationOutcome) -> tuple:
        """Extract successful and failed patterns from conversation"""
        successful, failed = [], []
        outcome_score = self.OUTCOME_SCORES[outcome]
        
        if state.budget_max and state.preferred_types:
            if outcome_score >= 40:
                successful.append("budget_and_type_discovery")
            else:
                failed.append("budget_and_type_discovery")
        
        if len(state.discussed_vehicles) >= 3:
            if state.favorite_vehicles:
                successful.append("multi_vehicle_engagement_with_selection")
            else:
                failed.append("multi_vehicle_engagement_no_selection")
        
        if state.objections:
            addressed_ratio = len([o for o in state.objections if o.addressed]) / len(state.objections)
            if addressed_ratio >= 0.5 and outcome_score >= 40:
                successful.append("objection_handling")
            elif addressed_ratio < 0.5:
                failed.append("objection_handling")
        
        if state.has_trade_in:
            if state.trade_payoff or state.trade_monthly_payment:
                successful.append("trade_in_info_capture")
            else:
                failed.append("trade_in_incomplete")
        
        if state.needs_spouse_approval:
            if outcome_score >= 70:
                successful.append("spouse_objection_overcome")
            else:
                failed.append("spouse_objection_not_overcome")
        
        return successful, failed
    
    def _determine_segment(self, state: ConversationState) -> Optional[str]:
        """Determine customer segment from preferences"""
        if 'truck' in state.preferred_types:
            if state.min_towing and state.min_towing >= 10000:
                return 'heavy_towing'
            return 'truck_buyer'
        if 'suv' in state.preferred_types:
            if state.min_seating and state.min_seating >= 7:
                return 'large_family'
            return 'suv_family'
        if state.fuel_preference == 'electric':
            return 'ev_shopper'
        if state.budget_max and state.budget_max < 35000:
            return 'budget_conscious'
        if state.budget_max and state.budget_max >= 60000:
            return 'premium_buyer'
        return 'general'
    
    def _get_stages_visited(self, state: ConversationState) -> List[str]:
        """Extract unique stages visited during conversation"""
        stages = {'greeting'}
        if state.budget_max or state.preferred_types:
            stages.add('discovery')
        if state.discussed_vehicles:
            stages.add('browsing')
        if len(state.discussed_vehicles) >= 2:
            stages.add('comparing')
        if state.has_trade_in:
            stages.add('trade_in')
        if state.monthly_payment_target:
            stages.add('financing')
        if state.objections:
            stages.add('objection')
        stages.add(state.stage.value)
        return list(stages)
    
    def _persist_record(self, record: OutcomeRecord) -> None:
        """Persist outcome record to storage"""
        filename = f"{record.session_id}_{record.ended_at.strftime('%Y%m%d_%H%M%S')}.json"
        filepath = os.path.join(self.storage_path, filename)
        try:
            with open(filepath, 'w') as f:
                json.dump(record.to_dict(), f, indent=2)
        except Exception as e:
            logger.error(f"Failed to persist outcome record: {e}")
    
    def get_analytics(self, since: Optional[datetime] = None, segment: Optional[str] = None) -> Dict[str, Any]:
        """Get analytics on conversation outcomes."""
        records = self._outcomes
        if since:
            records = [r for r in records if r.ended_at >= since]
        if segment:
            records = [r for r in records if r.customer_segment == segment]
        
        if not records:
            return {"total_conversations": 0}
        
        total = len(records)
        outcome_counts = defaultdict(int)
        quality_counts = defaultdict(int)
        segment_counts = defaultdict(int)
        total_score, total_duration, total_messages, total_vehicles = 0, 0, 0, 0
        pattern_success = defaultdict(lambda: {"success": 0, "fail": 0})
        
        for record in records:
            outcome_counts[record.outcome.value] += 1
            quality_counts[record.quality.value] += 1
            if record.customer_segment:
                segment_counts[record.customer_segment] += 1
            total_score += self.OUTCOME_SCORES[record.outcome]
            total_duration += record.duration_seconds
            total_messages += record.message_count
            total_vehicles += record.vehicles_discussed
            for pattern in record.successful_patterns:
                pattern_success[pattern]["success"] += 1
            for pattern in record.failed_patterns:
                pattern_success[pattern]["fail"] += 1
        
        positive_outcomes = sum(
            outcome_counts[o.value] for o in [
                ConversationOutcome.LEAD_SUBMITTED,
                ConversationOutcome.TEST_DRIVE_SCHEDULED,
                ConversationOutcome.SALES_HANDOFF,
                ConversationOutcome.APPRAISAL_REQUESTED,
            ]
        )
        
        return {
            "total_conversations": total,
            "conversion_rate": positive_outcomes / total if total > 0 else 0,
            "average_score": total_score / total if total > 0 else 0,
            "average_duration_seconds": total_duration / total if total > 0 else 0,
            "average_messages": total_messages / total if total > 0 else 0,
            "average_vehicles_discussed": total_vehicles / total if total > 0 else 0,
            "outcomes": dict(outcome_counts),
            "quality_distribution": dict(quality_counts),
            "segments": dict(segment_counts),
            "pattern_effectiveness": {
                pattern: {
                    "success_rate": data["success"] / (data["success"] + data["fail"])
                    if (data["success"] + data["fail"]) > 0 else 0,
                    "total_uses": data["success"] + data["fail"],
                }
                for pattern, data in pattern_success.items()
            },
        }
    
    def get_improvement_suggestions(self) -> List[Dict[str, Any]]:
        """Get suggestions for AI improvement based on outcome patterns."""
        suggestions = []
        analytics = self.get_analytics()
        
        if analytics["total_conversations"] < 10:
            return [{"type": "info", "message": "Need more data for meaningful suggestions"}]
        
        if analytics["conversion_rate"] < 0.3:
            suggestions.append({
                "type": "critical",
                "area": "conversion",
                "message": "Conversion rate is below 30%. Review discovery questions and vehicle matching.",
                "metric": analytics["conversion_rate"],
            })
        
        poor_quality = analytics["quality_distribution"].get("poor", 0)
        if poor_quality / analytics["total_conversations"] > 0.2:
            suggestions.append({
                "type": "warning",
                "area": "quality",
                "message": "Over 20% of conversations have poor quality. Check for frustrated users.",
                "metric": poor_quality / analytics["total_conversations"],
            })
        
        for pattern, data in analytics.get("pattern_effectiveness", {}).items():
            if data["total_uses"] >= 5 and data["success_rate"] < 0.4:
                suggestions.append({
                    "type": "improvement",
                    "area": "pattern",
                    "message": f"Pattern '{pattern}' has low success rate ({data['success_rate']:.0%})",
                    "pattern": pattern,
                    "metric": data["success_rate"],
                })
        
        abandoned = analytics["outcomes"].get("abandoned", 0)
        if abandoned / analytics["total_conversations"] > 0.25:
            suggestions.append({
                "type": "warning",
                "area": "engagement",
                "message": "High abandonment rate. Improve initial engagement and greeting.",
                "metric": abandoned / analytics["total_conversations"],
            })
        
        return suggestions


# Module-level singleton
_tracker: Optional[OutcomeTracker] = None


def get_outcome_tracker() -> OutcomeTracker:
    """Get or create the outcome tracker instance"""
    global _tracker
    if _tracker is None:
        _tracker = OutcomeTracker()
    return _tracker
