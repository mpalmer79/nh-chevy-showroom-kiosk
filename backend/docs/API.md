# NH Chevy Showroom Kiosk API Documentation

**Base URL**: `REPLACE_ME_BACKEND_URL`
**API Version**: 3.0.0
**Interactive Docs**: Available at `/docs` in development mode only

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Response Format](#error-response-format)
- [Core Endpoints](#core-endpoints)
- [V1 Endpoints](#v1-endpoints)
  - [Inventory](#inventory)
  - [Leads](#leads)
  - [Analytics](#analytics)
  - [Traffic](#traffic)
  - [Trade-In](#trade-in)
  - [Text-to-Speech](#text-to-speech)
  - [Photo Analysis](#photo-analysis)
- [V3 Endpoints](#v3-endpoints)
  - [Intelligent AI Chat](#intelligent-ai-chat)
  - [Digital Worksheet](#digital-worksheet)

---

## Authentication

Most endpoints are currently open (Beta mode). The following authentication mechanisms are available but not enforced on all routes:

- **JWT Tokens**: Used for admin/manager endpoints. Pass as `Authorization: Bearer <token>`.
- **API Service Key**: For service-to-service calls. Set via `API_SERVICE_KEY` environment variable.
- **Admin API Key**: For dashboard access. Set via `ADMIN_API_KEY` environment variable.
- **Session ID**: Passed via `X-Session-ID` header for rate limiting and session tracking.

## Rate Limiting

| Scope | Limit | Identifier |
|-------|-------|-----------|
| AI Chat (`/api/v3/ai/chat`) | 30 requests/minute | Session ID or IP |
| AI Chat Stream (`/api/v3/ai/chat/stream`) | 30 requests/minute | Session ID or IP |
| General API | 100 requests/minute | IP address |

When rate limited, the API returns HTTP `429 Too Many Requests`.

## Error Response Format

All errors follow a consistent structure:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "details": {}
}
```

Common error codes:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `AI_SERVICE_ERROR` | 503 | Claude API unavailable |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

All responses include the following headers:
- `X-Request-ID`: Unique request identifier (8 chars)
- `X-Process-Time`: Request processing duration (e.g., `0.123s`)

---

## Core Endpoints

### GET /

API root with service information.

**Response:**
```json
{
  "service": "NH Chevy Showroom Kiosk API",
  "status": "running",
  "version": "3.0.0",
  "environment": "production",
  "docs": "disabled",
  "features": {
    "v1": ["inventory", "recommendations", "leads", "analytics", "traffic", "trade-in", "tts"],
    "v2": ["enhanced-recommendations"],
    "v3": ["smart-recommendations", "intelligent-ai-chat", "digital-worksheet"]
  },
  "storage": "postgresql"
}
```

### GET /api/health

Comprehensive health check. Returns status of all service dependencies.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-23T12:00:00",
  "service": "showroom-kiosk-api",
  "version": "3.0.0",
  "environment": "production",
  "checks": {
    "database": { "status": "healthy", "type": "postgresql" },
    "ai_service": { "status": "configured", "provider": "anthropic", "model": "claude-sonnet-4-5-20250929" },
    "inventory": { "status": "healthy", "vehicle_count": 350 },
    "intelligent_ai": { "status": "healthy", "inventory_indexed": 350 },
    "worksheet_service": { "status": "healthy", "active_worksheets": 5 }
  }
}
```

### GET /api/health/live

Kubernetes liveness probe. Returns `{"status": "alive"}`.

### GET /api/health/ready

Kubernetes readiness probe. Returns `{"status": "ready"}` or HTTP 503 if the database is unavailable.

---

## V1 Endpoints

### Inventory

**Prefix**: `/api/v1/inventory`

#### GET /api/v1/inventory

Get all vehicles with optional filters. Returns vehicles sorted by price (descending).

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | string | Filter by model name (partial match) |
| `body_style` | string | Filter by body style (Truck, SUV, Sedan, Coupe, Van, Electric) |
| `make` | string | Filter by make (exact match) |
| `min_price` | float | Minimum price filter |
| `max_price` | float | Maximum price filter |
| `fuel_type` | string | Filter by fuel type (Gasoline, Electric, Hybrid) |
| `status` | string | Filter by status (In Stock, In Transit) |
| `cab_type` | string | Filter by cab style (Regular Cab, Double Cab, Crew Cab) |

**Response:**
```json
{
  "vehicles": [
    {
      "id": "v12345",
      "vin": "1GCUYDED1RZ123456",
      "year": 2025,
      "make": "Chevrolet",
      "model": "Silverado 1500",
      "trim": "LT Trail Boss",
      "body": "4WD Crew Cab 147\"",
      "bodyStyle": "Truck",
      "exteriorColor": "Black",
      "interiorColor": "Jet Black",
      "mileage": 0,
      "price": 54999.00,
      "msrp": 56700.00,
      "engine": "6.2L V8",
      "transmission": "10-Speed Automatic",
      "drivetrain": "4WD",
      "fuelType": "Gasoline",
      "mpgCity": 17,
      "mpgHighway": 23,
      "evRange": null,
      "features": ["Apple CarPlay", "Z71 Off-Road Package", "Heated Seats"],
      "imageUrl": "https://upload.wikimedia.org/...",
      "status": "In Stock",
      "stockNumber": "12345",
      "cabStyle": "Crew Cab",
      "bedLength": "Short Bed"
    }
  ],
  "total": 350,
  "featured": [...]
}
```

#### GET /api/v1/inventory/featured

Get featured vehicles (up to 8, one per model family).

**Response:** Array of `Vehicle` objects.

#### GET /api/v1/inventory/search

Search inventory by keyword across all fields.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (min 1 character) |

**Response:**
```json
{
  "vehicles": [...],
  "total": 12,
  "query": "blue equinox"
}
```

#### GET /api/v1/inventory/models

Get available models with count and price ranges.

**Response:**
```json
{
  "models": {
    "Silverado 1500": { "count": 45, "minPrice": 35000, "maxPrice": 72000 },
    "Equinox": { "count": 30, "minPrice": 28000, "maxPrice": 38000 }
  },
  "total": 15
}
```

#### GET /api/v1/inventory/models/{make}

Get models for a specific make from the NHTSA VPIC API. Used for trade-in vehicle selection.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `make` | string | Vehicle make (e.g., "Chevrolet", "Toyota") |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | string | Model year to filter by |

**Response:** Array of model name strings, sorted alphabetically.

```json
["Blazer", "Bolt EUV", "Bolt EV", "Camaro", "Colorado", "Equinox", "Malibu", "Silverado 1500"]
```

#### GET /api/v1/inventory/stats

Get inventory statistics.

**Response:**
```json
{
  "total": 350,
  "byBodyStyle": { "Truck": 120, "SUV": 150, "Sedan": 30 },
  "byStatus": { "In Stock": 300, "In Transit": 50 },
  "byCabStyle": { "Crew Cab": 80, "Double Cab": 30 },
  "priceRange": { "min": 22500, "max": 105000, "avg": 48500 }
}
```

#### GET /api/v1/inventory/{vehicle_id}

Get a single vehicle by its ID (e.g., `v12345`).

**Response:** Single `Vehicle` object. Returns 404 if not found.

#### GET /api/v1/inventory/vin/{vin}

Get a vehicle by VIN. Case-insensitive.

**Response:** Single `Vehicle` object. Returns 404 if not found.

#### GET /api/v1/inventory/stock/{stock_number}

Get a vehicle by stock number.

**Response:** Single `Vehicle` object. Returns 404 if not found.

---

### Leads

**Prefix**: `/api/v1/leads`

#### POST /api/v1/leads

Submit a new customer lead.

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "2075551234",
  "context_vin": "1GCUYDED1RZ123456",
  "context_page": "Kiosk Showroom"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | string | Yes | Customer first name |
| `last_name` | string | Yes | Customer last name |
| `email` | string (email) | Yes | Customer email |
| `phone` | string | No | Customer phone number |
| `context_vin` | string | No | VIN of vehicle being viewed |
| `context_page` | string | No | Page/context where lead originated |

**Response:**
```json
{
  "id": "A1B2C3D4",
  "status": "success",
  "message": "Thank you! A sales representative will contact you shortly.",
  "created_at": "2026-02-23T12:00:00"
}
```

#### POST /api/v1/leads/test-drive

Schedule a test drive appointment.

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "phone": "2075559876",
  "vehicle_id": "v12345",
  "preferred_date": "2026-03-01",
  "preferred_time": "2:00 PM"
}
```

**Response:** Same as `POST /api/v1/leads`.

#### POST /api/v1/leads/info-request

Request more information about a vehicle.

**Request Body:**
```json
{
  "first_name": "Bob",
  "last_name": "Jones",
  "email": "bob@example.com",
  "vehicle_id": "v12345",
  "questions": "Does this truck come with a bed liner?"
}
```

**Response:** Same as `POST /api/v1/leads`.

#### GET /api/v1/leads/stats

Get lead statistics for internal dashboard.

**Response:**
```json
{
  "total_leads": 42,
  "by_type": { "general": 20, "test_drive": 15, "info_request": 7 },
  "by_status": { "new": 30, "pending_confirmation": 12 },
  "recent": [...]
}
```

---

### Analytics

**Prefix**: `/api/v1/analytics`

#### POST /api/v1/analytics/session/start

Start a new analytics session when a customer touches the kiosk.

**Request Body:**
```json
{
  "kioskId": "DEV-KIOSK-001"
}
```

**Response:** Session details with generated ID.

#### POST /api/v1/analytics/session/end

End a kiosk session.

**Request Body:**
```json
{
  "sessionId": "session-uuid"
}
```

#### POST /api/v1/analytics/view

Track a vehicle detail page view.

**Request Body:**
```json
{
  "vehicleId": "v12345",
  "sessionId": "session-uuid"
}
```

**Response:** `{"status": "tracked"}`

#### POST /api/v1/analytics/interaction

Track generic user interactions (button clicks, filter changes, etc.).

**Request Body:**
```json
{
  "eventType": "filter_applied",
  "eventData": { "filter": "bodyStyle", "value": "Truck" },
  "sessionId": "session-uuid",
  "timestamp": "2026-02-23T12:00:00"
}
```

**Response:** `{"status": "tracked"}`

#### GET /api/v1/analytics/dashboard

Get aggregated analytics dashboard data.

**Response:** Dashboard statistics including session counts, popular vehicles, and interaction summaries.

#### GET /api/v1/analytics/vehicle/{vehicle_id}

Get analytics for a specific vehicle (view counts, engagement metrics).

---

### Traffic

**Prefix**: `/api/v1/traffic`

Kiosk session tracking for the Sales Manager Dashboard. All timestamps are in Eastern Time (America/New_York). Supports PostgreSQL with JSON file fallback.

#### POST /api/v1/traffic/session

Log or update a kiosk session. Creates a new session if `sessionId` is not found, otherwise updates the existing one.

**Request Body:**
```json
{
  "sessionId": "K20260223120000ABC123",
  "customerName": "John Doe",
  "phone": "2075551234",
  "path": "ai-chat",
  "currentStep": "vehicle-detail",
  "vehicle": {
    "stockNumber": "12345",
    "year": 2025,
    "make": "Chevrolet",
    "model": "Silverado 1500",
    "trim": "LT Trail Boss",
    "msrp": 56700,
    "salePrice": 54999
  },
  "vehicleInterest": {
    "model": "Silverado",
    "cab": "Crew Cab",
    "colors": ["Black", "Red"]
  },
  "budget": {
    "min": 40000,
    "max": 60000,
    "downPaymentPercent": 10
  },
  "tradeIn": {
    "hasTrade": true,
    "vehicle": { "year": "2020", "make": "Ford", "model": "F-150", "mileage": 45000 },
    "hasPayoff": true,
    "payoffAmount": 15000
  },
  "payment": {
    "type": "finance",
    "monthly": 650,
    "term": 72,
    "downPayment": 5000
  },
  "vehicleRequested": false,
  "actions": ["viewed_inventory", "used_ai_chat"],
  "chatHistory": [
    { "role": "user", "content": "Show me trucks under $60k", "timestamp": "2026-02-23T12:00:00" },
    { "role": "assistant", "content": "Here are some great options...", "timestamp": "2026-02-23T12:00:02" }
  ]
}
```

All fields except `sessionId` are optional.

**Response:**
```json
{
  "sessionId": "K20260223120000ABC123",
  "status": "success",
  "message": "Session logged to PostgreSQL",
  "storage": "postgresql"
}
```

#### GET /api/v1/traffic/active

Get active kiosk sessions for the Sales Manager Dashboard.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeout_minutes` | int | 30 | Minutes of inactivity before session is inactive (1-120) |

**Response:**
```json
{
  "sessions": [
    {
      "sessionId": "K20260223120000ABC123",
      "customerName": "John Doe",
      "phone": "2075551234",
      "startTime": "2026-02-23T12:00:00-05:00",
      "lastActivity": "2026-02-23T12:15:00-05:00",
      "currentStep": "vehicle-detail",
      "vehicleInterest": { "model": "Silverado", "cab": "Crew Cab", "colors": ["Black"] },
      "budget": { "min": 40000, "max": 60000 },
      "tradeIn": { "hasTrade": true, "vehicle": {...} },
      "selectedVehicle": { "stockNumber": "12345", "model": "Silverado 1500", "price": 54999 },
      "chatHistory": [...],
      "managerNotes": null
    }
  ],
  "count": 3,
  "timeout_minutes": 30,
  "server_time": "2026-02-23T12:20:00-05:00",
  "timezone": "America/New_York",
  "storage": "postgresql"
}
```

#### GET /api/v1/traffic/log

Get traffic log entries (paginated) for the admin dashboard.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | int | 50 | Results per page (1-500) |
| `offset` | int | 0 | Pagination offset |
| `date_from` | string | null | Filter from date (YYYY-MM-DD) |
| `date_to` | string | null | Filter to date (YYYY-MM-DD) |
| `filter_today` | bool | false | Show only today's sessions |

**Response:**
```json
{
  "total": 150,
  "limit": 50,
  "offset": 0,
  "sessions": [...],
  "timezone": "America/New_York",
  "server_time": "2026-02-23T12:20:00-05:00",
  "storage": "postgresql"
}
```

#### GET /api/v1/traffic/log/{session_id}

Get details for a specific session including full chat history.

**Response:** Full session object with all fields.

#### GET /api/v1/traffic/dashboard/{session_id}

Get a single session formatted for the dashboard view.

#### GET /api/v1/traffic/stats

Get aggregate traffic statistics.

**Response:**
```json
{
  "total_sessions": 1250,
  "active_now": 3,
  "today": 18,
  "today_date": "2026-02-23",
  "by_path": { "ai-chat": 600, "browse": 400, "quiz": 250 },
  "with_vehicle_selected": 450,
  "with_trade_in": 200,
  "vehicle_requests": 180,
  "completed_handoffs": 320,
  "with_ai_chat": 600,
  "conversion_rate": 25.6,
  "timezone": "America/New_York",
  "storage": "postgresql"
}
```

#### DELETE /api/v1/traffic/log/{session_id}

Delete a specific session.

**Response:** `{"status": "deleted", "sessionId": "...", "storage": "postgresql"}`

#### DELETE /api/v1/traffic/log

Clear all traffic log entries.

**Response:** `{"status": "cleared", "message": "Deleted 150 sessions", "storage": "postgresql"}`

#### GET /api/v1/traffic/storage-status

Check which storage backend is active.

**Response:**
```json
{
  "postgresql_configured": true,
  "postgresql_connected": true,
  "active_storage": "postgresql",
  "json_fallback_available": true
}
```

---

### Trade-In

**Prefix**: `/api/v1/trade-in`

#### GET /api/v1/trade-in/decode/{vin}

Decode a VIN using the NHTSA VPIC API.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `vin` | string | 17-character Vehicle Identification Number |

**Validation Rules:**
- Must be exactly 17 characters
- Cannot contain I, O, or Q

**Response:**
```json
{
  "year": 2020,
  "make": "Ford",
  "model": "F-150",
  "trim": "XLT",
  "bodyClass": "Pickup",
  "driveType": "4WD/4-Wheel Drive/4x4",
  "fuelType": "Gasoline",
  "engineCylinders": 8,
  "displacementL": 5.0,
  "transmissionStyle": "Automatic",
  "doors": 4,
  "errorCode": "0",
  "errorMessage": null
}
```

**Error Responses:**
- `400`: Invalid VIN format or characters
- `502`: NHTSA API error
- `504`: NHTSA API timeout

---

### Text-to-Speech

**Prefix**: `/api/v1/tts`

Uses ElevenLabs API with browser fallback when not configured.

#### GET /api/v1/tts/status

Check TTS availability.

**Response:**
```json
{
  "available": true,
  "provider": "elevenlabs",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "voices": {
    "rachel": "21m00Tcm4TlvDq8ikWAM",
    "domi": "AZnzlk1XvdvUeBnXmlld"
  }
}
```

#### POST /api/v1/tts/speak

Convert text to speech. Returns an `audio/mpeg` stream.

**Request Body:**
```json
{
  "text": "Welcome to New Hampshire Chevrolet! How can I help you today?",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "stability": 0.5,
  "similarity_boost": 0.8,
  "style": 0.5
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `text` | string | (required) | Text to convert (max 5000 chars) |
| `voice_id` | string | Default voice | ElevenLabs voice ID |
| `stability` | float | 0.5 | Voice stability (0-1, lower = more expressive) |
| `similarity_boost` | float | 0.8 | Similarity to original voice (0-1) |
| `style` | float | 0.5 | Style exaggeration (0-1) |

**Response:** Binary `audio/mpeg` stream.

**Error:** Returns `503` with `{"fallback": true}` if ElevenLabs is not configured or errors. The frontend should fall back to browser speech synthesis.

#### GET /api/v1/tts/voices

List available ElevenLabs voices (requires API key).

---

### Photo Analysis

**Prefix**: `/api/v1/trade-in-photos`

Uses Claude Vision API to analyze trade-in vehicle photos.

#### POST /api/v1/trade-in-photos/analyze

Analyze trade-in vehicle photos for condition assessment.

**Request Body:**
```json
{
  "photos": [
    {
      "id": "front",
      "data": "base64-encoded-image-data-or-data-url",
      "mimeType": "image/jpeg"
    },
    {
      "id": "interior",
      "data": "data:image/jpeg;base64,/9j/4AAQ...",
      "mimeType": "image/jpeg"
    }
  ],
  "vehicleInfo": {
    "year": "2020",
    "make": "Ford",
    "model": "F-150",
    "mileage": "45000"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `photos` | array | Yes | At least one photo |
| `photos[].id` | string | Yes | Photo type: "front", "rear", "interior", "odometer", "damage" |
| `photos[].data` | string | Yes | Base64-encoded image data |
| `photos[].mimeType` | string | No | MIME type (default: image/jpeg) |
| `vehicleInfo` | object | No | Vehicle context for more accurate analysis |

**Response:**
```json
{
  "overallCondition": "good",
  "conditionScore": 75,
  "confidenceLevel": "high",
  "summary": "Vehicle is in good overall condition with minor cosmetic wear consistent with age and mileage.",
  "detectedMileage": "45,230",
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
    "Touch-up paint recommended for front bumper scratch"
  ],
  "estimatedConditionAdjustment": "-5% to -10%"
}
```

#### GET /api/v1/trade-in-photos/health

Health check for the photo analysis service.

**Response:** `{"status": "healthy", "service": "photo_analysis"}`

---

## V3 Endpoints

### Intelligent AI Chat

**Prefix**: `/api/v3/ai`

AI-powered conversational assistant with persistent memory, tool use, and semantic vehicle retrieval.

#### POST /api/v3/ai/chat

Send a message to the AI assistant. The AI maintains conversation state across turns and can use tools to search inventory, calculate budgets, create worksheets, and notify staff.

**Rate Limit**: 30 requests/minute per session.

**Headers:**
- `X-Session-ID`: Kiosk session identifier (used for rate limiting)

**Request Body:**
```json
{
  "message": "Show me trucks under $60k with a crew cab",
  "session_id": "K20260223120000ABC123",
  "conversation_history": [
    { "role": "user", "content": "Hi, I'm looking for a new truck" },
    { "role": "assistant", "content": "Welcome! I'd love to help you find the perfect truck..." }
  ],
  "customer_name": "John"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | Customer's message |
| `session_id` | string | Yes | Kiosk session ID |
| `conversation_history` | array | No | Previous messages for context (last 10 used) |
| `customer_name` | string | No | Customer's first name |

**Response:**
```json
{
  "message": "Great news! I found several crew cab trucks under $60,000...",
  "vehicles": [
    {
      "stock_number": "12345",
      "model": "2025 Silverado 1500 LT Trail Boss",
      "price": 54999,
      "match_reasons": ["Under $60k budget", "Crew cab configuration", "4WD"],
      "score": 0.92
    }
  ],
  "conversation_state": {
    "stage": "browsing",
    "interest_level": "warm",
    "customer_name": "John",
    "budget_max": 60000,
    "message_count": 3
  },
  "tools_used": ["search_vehicles"],
  "staff_notified": false,
  "worksheet_id": null,
  "metadata": {
    "prompt_version": "3.7.0",
    "model": "claude-sonnet-4-5-20250929",
    "latency_ms": 2340.5,
    "tool_iterations": 2,
    "conversation_stage": "browsing",
    "interest_level": "warm"
  }
}
```

When the AI cannot reach the Claude API, it returns a fallback response with `metadata.fallback: true`.

#### POST /api/v3/ai/chat/stream

Streaming version of intelligent chat. Returns Server-Sent Events (SSE) with progressive updates.

**Rate Limit**: 30 requests/minute per session.

**Request Body:** Same as `POST /api/v3/ai/chat`.

**Response:** `text/event-stream` with the following event types:

| Event | Data | Description |
|-------|------|-------------|
| `thinking` | `{"status": "processing"}` | AI is processing (sent immediately) |
| `tool_start` | `{"tool": "search_vehicles"}` | Tool execution beginning |
| `tool_result` | `{"tool": "search_vehicles", "success": true}` | Tool execution complete |
| `text_delta` | `{"text": "Here are "}` | Incremental text chunk from Claude |
| `vehicles` | `{"vehicles": [...]}` | Vehicle recommendations found |
| `worksheet` | `{"worksheet_id": "uuid"}` | Digital Worksheet created |
| `done` | `{"tools_used": [...], "staff_notified": false}` | Response complete |
| `error` | `{"error": "message"}` | Error occurred |

**Example SSE stream:**
```
event: thinking
data: {"status": "processing"}

event: tool_start
data: {"tool": "search_vehicles"}

event: tool_result
data: {"tool": "search_vehicles", "success": true}

event: vehicles
data: {"vehicles": [{"stock_number": "12345", "model": "2025 Silverado 1500", "price": 54999}]}

event: text_delta
data: {"text": "I found some great trucks"}

event: text_delta
data: {"text": " that match what you're looking for!"}

event: done
data: {"tools_used": ["search_vehicles"], "staff_notified": false, "worksheet_id": null}
```

#### POST /api/v3/ai/notify-staff

Notify dealership staff when a customer requests assistance.

**Headers:**
- `X-Session-ID`: Kiosk session identifier

**Request Body:**
```json
{
  "notification_type": "sales",
  "message": "Customer interested in stock #12345, ready for test drive",
  "vehicle_stock": "12345",
  "vehicle_info": {
    "model": "2025 Silverado 1500 LT Trail Boss",
    "price": 54999
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `notification_type` | string | No | Type: "sales", "vehicle_request", "appraisal", "finance" (default: "sales") |
| `message` | string | Yes | What the customer needs |
| `vehicle_stock` | string | No | Stock number if applicable |
| `vehicle_info` | object | No | Additional vehicle details |

**Response:**
```json
{
  "success": true,
  "slack_sent": true,
  "sms_sent": true,
  "email_sent": false,
  "errors": []
}
```

#### GET /api/v3/ai/state/{session_id}

Get current conversation state for a session.

**Response:** Full conversation state object including stage, interest level, budget, preferences, discussed vehicles, etc.

#### POST /api/v3/ai/state/{session_id}/favorite/{stock_number}

Mark a vehicle as a favorite for a session.

**Response:** `{"status": "ok", "stock_number": "12345"}`

#### GET /api/v3/ai/lookup/phone/{phone_number}

Look up a previous conversation by phone number. Used for conversation continuity across visits.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `phone_number` | string | 10-digit phone number |

**Response:**
```json
{
  "found": true,
  "phone_last_four": "1234",
  "conversation": { ... }
}
```

Returns 404 if no conversation found, 400 if phone number is not 10 digits.

#### POST /api/v3/ai/state/{session_id}/phone/{phone_number}

Save customer phone number for future conversation lookup.

**Response:**
```json
{
  "status": "ok",
  "phone_last_four": "1234",
  "message": "Phone saved. Customer can continue conversation in future visits."
}
```

#### POST /api/v3/ai/state/{session_id}/finalize

Finalize a conversation and record its outcome.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `outcome` | string | Optional outcome value |

**Response:** Conversation outcome record.

#### GET /api/v3/ai/analytics

Get AI conversation analytics (tool usage, stage distributions, outcomes).

#### GET /api/v3/ai/analytics/suggestions

Get AI-generated suggestions for improving conversation quality.

#### GET /api/v3/ai/health

Health check for the intelligent AI service.

**Response:**
```json
{
  "status": "healthy",
  "version": "3.7.0",
  "model": "claude-sonnet-4-5-20250929",
  "api_key_configured": true,
  "retriever_fitted": true,
  "inventory_count": 350
}
```

---

### Digital Worksheet

**Prefix**: `/api/v3/worksheet`

Digital Worksheet endpoints for deal structuring. Customer-facing and manager-facing endpoints. Includes WebSocket support for real-time updates.

#### POST /api/v3/worksheet/create

Create a new Digital Worksheet. Called by the AI when a customer is ready to discuss numbers.

**Request Body:**
```json
{
  "session_id": "K20260223120000ABC123",
  "stock_number": "12345",
  "customer_name": "John Doe",
  "customer_phone": "2075551234",
  "customer_email": "john@example.com",
  "down_payment": 5000,
  "trade_in_value": 15000,
  "trade_in_payoff": 10000
}
```

**Response:**
```json
{
  "success": true,
  "worksheet": {
    "id": "uuid",
    "session_id": "K20260223120000ABC123",
    "status": "draft",
    "vehicle": {
      "stock_number": "12345",
      "year": 2025,
      "make": "Chevrolet",
      "model": "Silverado 1500",
      "msrp": 56700,
      "selling_price": 54999
    },
    "term_options": [
      { "term_months": 60, "apr": 5.9, "monthly_payment": 850, "is_selected": false },
      { "term_months": 72, "apr": 6.4, "monthly_payment": 735, "is_selected": true },
      { "term_months": 84, "apr": 6.9, "monthly_payment": 655, "is_selected": false }
    ],
    "lead_score": 65,
    "created_at": "2026-02-23T12:00:00",
    "updated_at": "2026-02-23T12:00:00"
  },
  "message": "Worksheet created for 2025 Silverado 1500"
}
```

#### GET /api/v3/worksheet/{worksheet_id}

Get a worksheet by ID.

**Response:** `WorksheetResponse` with full worksheet details. Returns 404 if not found.

#### PATCH /api/v3/worksheet/{worksheet_id}

Update worksheet values (customer-side). Recalculates all dependent fields.

**Request Body (all fields optional):**
```json
{
  "down_payment": 7500,
  "trade_in_value": 18000,
  "customer_phone": "2075551234",
  "customer_email": "john@example.com"
}
```

**Response:** `WorksheetResponse` with updated worksheet.

#### POST /api/v3/worksheet/{worksheet_id}/select-term/{term_months}

Select a financing term.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `worksheet_id` | string | Worksheet ID |
| `term_months` | int | Term length: 60, 72, or 84 |

**Response:** `WorksheetResponse` with updated term selection.

#### POST /api/v3/worksheet/{worksheet_id}/ready

Customer indicates they are ready to proceed. Changes status to READY, notifies sales manager, and boosts lead score.

**Response:**
```json
{
  "success": true,
  "worksheet": { ... },
  "message": "A sales manager has been notified and will be with you shortly!"
}
```

#### POST /api/v3/worksheet/{worksheet_id}/send

Send worksheet to customer via SMS or email.

**Request Body:**
```json
{
  "method": "sms",
  "destination": "2075551234"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `method` | string | Yes | "sms" or "email" |
| `destination` | string | Yes | Phone number (10 digits) or email address |

#### GET /api/v3/worksheet/session/{session_id}

Get all worksheets for a session (customer may have compared multiple vehicles).

**Response:**
```json
{
  "success": true,
  "worksheets": [...],
  "total_count": 2
}
```

#### GET /api/v3/worksheet/manager/active

Get all active worksheets for the sales floor dashboard. Sorted by lead score (descending).

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `min_score` | int | 0 | Minimum lead score filter (0-100) |

**Response:** Array of `WorksheetSummary` objects.

#### GET /api/v3/worksheet/manager/ready

Get worksheets where the customer has indicated they are ready (hot leads only).

**Response:** Array of `WorksheetSummary` objects with status=READY.

#### POST /api/v3/worksheet/manager/{worksheet_id}/review

Manager starts reviewing a worksheet.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `manager_id` | string | Yes | Manager's user ID |
| `manager_name` | string | No | Manager's display name |

#### PATCH /api/v3/worksheet/manager/{worksheet_id}

Manager updates worksheet (notes, status, price adjustment).

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `manager_id` | string | Yes | Manager's user ID |

**Request Body:** `WorksheetManagerUpdate` fields (notes, adjustment, status).

#### POST /api/v3/worksheet/manager/{worksheet_id}/counter-offer

Send a counter-offer to the customer. Changes status to NEGOTIATING.

**Request Body:**
```json
{
  "adjustment": -1500,
  "notes": "Best price we can do with current incentives",
  "manager_id": "mgr-001"
}
```

#### POST /api/v3/worksheet/manager/{worksheet_id}/accept

Manager accepts the deal. Changes status to ACCEPTED.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `manager_id` | string | Yes | Manager accepting the deal |

#### POST /api/v3/worksheet/manager/{worksheet_id}/decline

Decline/close a worksheet.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `manager_id` | string | Yes | Manager declining |
| `reason` | string | No | Reason for decline |

---

### WebSocket Endpoints

#### WS /api/v3/worksheet/ws/{worksheet_id}

Real-time updates for a specific worksheet. Both customers and managers connect here.

**Messages received by client:**

| Type | Description |
|------|-------------|
| `worksheet_updated` | Full worksheet state after any change |
| `status_changed` | Status transition with old/new status |
| `counter_offer` | Manager counter-offer with adjustment details |
| `customer_ready` | Customer clicked "I'm Ready" |

**Messages sent by client:**

| Type | Description |
|------|-------------|
| `ping` | Keepalive (server responds with `pong`) |

#### WS /api/v3/worksheet/ws/manager/feed

Real-time feed of all worksheet activity for the sales floor dashboard.

**Messages received by client:**

| Type | Description |
|------|-------------|
| `initial_state` | All active worksheets on connect |
| `new_worksheet` | New worksheet created |
| `worksheet_updated` | Any worksheet changed |
| `hot_lead` | Lead score exceeded threshold |
| `customer_ready` | Customer ready to deal |
