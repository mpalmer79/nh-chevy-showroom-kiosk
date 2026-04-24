# NH Chevy Showroom Kiosk - Intelligent AI Upgrade (V3)

## Overview

The V3 AI system transforms the kiosk from a simple chat wrapper into an intelligent sales assistant with:

| Feature | Before (V1/V2) | After (V3) |
|---------|----------------|------------|
| **Memory** | Stateless - each message isolated | Persistent state across conversation |
| **Vehicle Search** | Keyword matching only | Semantic TF-IDF retrieval |
| **Context** | Static summary passed to Claude | Dynamic context based on accumulated knowledge |
| **Actions** | No real actions | Tool use for search, notifications, favorites |
| **Learning** | None | Outcome tracking with pattern analysis |

---

## New Endpoints

### Main Chat Endpoint
```
POST /api/v3/ai/chat
```

**Request:**
```json
{
  "message": "I'm looking for a truck to tow my boat",
  "session_id": "kiosk-session-abc123",
  "customer_name": "Mike",
  "conversation_history": [
    {"role": "user", "content": "Hi there"},
    {"role": "assistant", "content": "Welcome! How can I help?"}
  ]
}
```

**Response:**
```json
{
  "message": "Great choice! For towing, I'd recommend our Silverado lineup...",
  "vehicles": [
    {
      "stock_number": "M12345",
      "model": "2025 Silverado 1500 LT",
      "price": 52000,
      "match_reasons": ["Tows up to 13,300 lbs", "Within budget"],
      "score": 87.5
    }
  ],
  "conversation_state": {
    "stage": "browsing",
    "interest_level": "warm",
    "budget": {"max": 55000},
    "preferences": {"types": ["truck"], "use_cases": ["towing"]}
  },
  "tools_used": ["search_inventory"],
  "staff_notified": false,
  "metadata": {
    "prompt_version": "3.0.0",
    "latency_ms": 1250,
    "conversation_stage": "browsing"
  }
}
```

### Get Conversation State
```
GET /api/v3/ai/state/{session_id}
```

### Mark Vehicle Favorite
```
POST /api/v3/ai/state/{session_id}/favorite/{stock_number}
```

### Finalize Conversation
```
POST /api/v3/ai/state/{session_id}/finalize?outcome=lead_submitted
```

### Analytics
```
GET /api/v3/ai/analytics
```

### Improvement Suggestions
```
GET /api/v3/ai/analytics/suggestions
```

---

## Available Tools

| Tool | Purpose | When Used |
|------|---------|-----------|
| `search_inventory` | Semantic vehicle search | Customer describes needs |
| `get_vehicle_details` | Get specific vehicle info | Discussing stock numbers |
| `find_similar_vehicles` | Find alternatives | Customer wants comparisons |
| `notify_staff` | Alert sales/appraisal/finance | Ready for test drive or appraisal |
| `mark_favorite` | Save customer preference | Customer likes a vehicle |

---

## File Structure
```
backend/app/services/
├── conversation_state.py    # Persistent conversation memory
├── vehicle_retriever.py     # Semantic TF-IDF retrieval
└── outcome_tracker.py       # Outcome logging for learning

backend/app/routers/
└── ai_v3.py                 # Intelligent AI router with tools

backend/tests/
└── test_intelligent_ai.py   # Comprehensive tests
```

---

## Health Check
```
GET /api/v3/ai/health
```

Returns:
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "model": "claude-sonnet-4-20250514",
  "api_key_configured": true,
  "retriever_fitted": true,
  "inventory_count": 250
}
```
