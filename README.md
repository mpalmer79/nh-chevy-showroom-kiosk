# New Hampshire Chevrolet Sales Showroom Kiosk

**AI-Powered Showroom Experience for a New Hampshire Chevrolet Dealership**

An interactive in-store kiosk system that enables customers to browse inventory, compare vehicles, get AI-powered recommendations, estimate trade-in values, and calculate payments — all through a touchscreen interface designed for the dealership showroom floor.

[![Backend CI](https://github.com/mpalmer79/nh-chevy-showroom-kiosk/actions/workflows/ci-backend.yml/badge.svg)](https://github.com/mpalmer79/nh-chevy-showroom-kiosk/actions/workflows/ci-backend.yml)
[![Frontend CI](https://github.com/mpalmer79/nh-chevy-showroom-kiosk/actions/workflows/ci-frontend.yml/badge.svg)](https://github.com/mpalmer79/nh-chevy-showroom-kiosk/actions/workflows/ci-frontend.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Node 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/mpalmer79/nh-chevy-showroom-kiosk.git
cd nh-chevy-showroom-kiosk

# Option 1: Docker (Recommended)
docker-compose up --build

# Option 2: Manual Setup
# Terminal 1 - Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm install
npm start
```

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Overview

The QUIRK AI Kiosk is a production-ready monorepo powering Quirk Auto Dealers' in-store customer experience. The system is designed with the understanding that **the customer is already in the showroom** — the AI assistant acts as a knowledgeable salesperson, not a website chatbot.

### Key Features

| Feature | Description |
|---------|-------------|
| **AI Sales Assistant** | Claude-powered conversational AI with text-to-speech, voice input, and smart inventory search |
| **Smart Recommendations** | Entity extraction from conversations with weighted similarity scoring |
| **Live Inventory** | Real-time PBS inventory integration with 250+ Chevrolet vehicles |
| **Trade-In Estimator** | 5-step guided flow with VIN decode, payoff/lender capture, condition rating, and photo upload |
| **Payment Calculator** | Finance and lease calculators with real-time payment estimates |
| **Sales Manager Dashboard** | Real-time Digital Worksheet with chat transcript viewing, session monitoring, and manager notes |
| **Staff Notifications** | Real-time Slack, SMS, and email alerts when customers request assistance |
| **Model Budget Selector** | Visual model selection with cab type, color preferences, and budget filtering |
| **Stock Lookup** | Direct stock number search for quick vehicle access |
| **Protection Packages** | F&I product presentation for GAP, extended warranty, and maintenance plans |
| **GM Model Decoder** | Automatic decoding of GM model numbers (CK10543 → Silverado 1500 Crew Cab 4WD) |

---

## Recent Improvements (December 2025)

### Staff Notification System
- **Slack Integration**: Real-time notifications to `#chevynh-sales-kiosk` when customers request assistance
- **Email Backup**: SendGrid/SMTP integration for notification redundancy
- **SMS Support**: Twilio integration for mobile alerts to sales staff
- **"Speak with a sales consultant" Button**: Prominent button on inventory pages and AI chat for instant staff notification

### AI Assistant Enhancements
- **GM Model Number Decoder**: 32+ model codes mapped (trucks, SUVs, EVs, sports cars, commercial)
- **Service Customer Flow**: Intelligent conversation rules that build rapport before showing inventory
- **MSRP Display Priority**: All vehicle cards now show MSRP first, then sale price
- **Transcript Notice**: "Transcript available upon request" displayed below chat input

### Sales Manager Dashboard
- **Manager Notes with Save**: Persistent notes per session with save button
- **Chat History Extraction**: Automatically extracts vehicles, trade-ins, and payment preferences from AI conversations
- **Digital Worksheet**: Full 4-square worksheet with editable fields

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        QUIRK AI KIOSK                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │    │   Backend    │    │  AI Service  │      │
│  │    (React)   │◄──►│  (FastAPI)   │◄──►│   (Python)   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Railway/    │    │  PostgreSQL  │    │   Claude     │      │
│  │  Vercel      │    │  + JSON FB   │    │   API        │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                             │                                   │
│                             ▼                                   │
│                      ┌──────────────┐                          │
│                      │ Notifications│                          │
│                      │ Slack/Email  │                          │
│                      └──────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Service | Tech Stack | Deployment |
|---------|------------|------------|
| **Frontend** | React 18, TypeScript | Railway / Vercel / Netlify |
| **Backend** | FastAPI, Python 3.11, slowapi | Railway |
| **AI Service** | Anthropic Claude API | Integrated via Backend |
| **Database** | PostgreSQL (prod) / JSON (fallback) | Railway Managed |
| **TTS** | ElevenLabs API (optional) | Via Backend |
| **Notifications** | Slack Webhooks, SendGrid, Twilio | Via Backend |

---

## Project Structure

```
quirk-ai-kiosk/
├── frontend/                    # React Kiosk Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── AIAssistant/            # Claude-powered chat module
│   │   │   │   ├── AIAssistant.tsx     # Main AI chat with voice & TTS
│   │   │   │   ├── components/
│   │   │   │   │   ├── ChatInput.tsx   # Input with consultant button
│   │   │   │   │   ├── Header.tsx      # Audio controls
│   │   │   │   │   └── VehicleCard.tsx # In-chat vehicle cards
│   │   │   │   └── styles.ts           # Component styles
│   │   │   ├── Kioskapp.tsx            # Main container & routing
│   │   │   ├── Inventoryresults.tsx    # Vehicle grid with filtering
│   │   │   ├── Vehicledetail.tsx       # Individual vehicle view
│   │   │   ├── VehicleCard.tsx         # Reusable vehicle display card
│   │   │   ├── VehicleComparison.tsx   # Side-by-side comparison
│   │   │   ├── ModelBudgetSelector.tsx # Model/cab/color/budget flow
│   │   │   ├── TradeInEstimator.tsx    # 5-step trade-in with photo upload
│   │   │   ├── Paymentcalculator.js    # Finance/lease calculator
│   │   │   ├── Protectionpackages.tsx  # F&I product presentation
│   │   │   ├── SalesManagerDashboard.tsx # Admin Digital Worksheet
│   │   │   ├── Stocklookup.tsx         # Stock number search
│   │   │   ├── Trafficlog.tsx          # Session analytics view
│   │   │   ├── Welcomescreen.tsx       # Kiosk entry point
│   │   │   ├── Guidedquiz.js           # Interactive needs assessment
│   │   │   ├── Customerhandoff.js      # Sales team notification
│   │   │   ├── LeadForm.js             # Customer info capture
│   │   │   └── api.ts                  # Typed API client layer
│   │   ├── __tests__/                  # Jest + React Testing Library
│   │   ├── types/                      # TypeScript definitions
│   │   ├── hooks/                      # Custom React hooks
│   │   ├── data/                       # Quiz questions, payment options
│   │   └── utils/                      # Vehicle helpers
│   ├── public/images/vehicles/         # Color-specific vehicle images
│   ├── e2e/                            # Playwright E2E tests
│   ├── Dockerfile
│   └── package.json
│
├── backend/                     # FastAPI Backend Service
│   ├── app/
│   │   ├── main.py                     # FastAPI entry point (v2.3.0)
│   │   ├── database.py                 # PostgreSQL + JSON fallback
│   │   ├── config.py                   # Environment configuration
│   │   ├── core/
│   │   │   ├── recommendation_engine.py # Weighted similarity scoring
│   │   │   ├── security.py             # API key management, sanitization
│   │   │   ├── settings.py             # Pydantic settings with notifications
│   │   │   ├── cache.py                # Response caching
│   │   │   ├── exceptions.py           # Custom exception classes
│   │   │   └── logging.py              # Structured logging
│   │   ├── routers/
│   │   │   ├── inventory.py            # /api/v1/inventory
│   │   │   ├── ai.py                   # /api/v1/ai (Claude chat)
│   │   │   ├── ai_v2.py                # /api/v2/ai (structured outputs)
│   │   │   ├── ai_v3.py                # /api/v3/ai (tools, memory, notifications)
│   │   │   ├── recommendations.py      # /api/v1/recommendations
│   │   │   ├── recommendations_v2.py   # /api/v2/recommendations
│   │   │   ├── smart_recommendations.py # /api/v3/smart (AI-enhanced)
│   │   │   ├── leads.py                # Lead submission & handoff
│   │   │   ├── analytics.py            # Analytics endpoints
│   │   │   ├── traffic.py              # Session tracking & dashboard
│   │   │   ├── trade_in.py             # VIN decode, valuation
│   │   │   ├── photo_analysis.py       # Trade-in photo processing
│   │   │   └── tts.py                  # ElevenLabs TTS integration
│   │   ├── services/
│   │   │   ├── notifications.py        # Slack, SMS, Email notifications
│   │   │   ├── conversation_state.py   # Session state management
│   │   │   ├── vehicle_retriever.py    # Semantic vehicle search
│   │   │   ├── entity_extraction.py    # NLP entity extraction
│   │   │   ├── inventory_enrichment.py # Derive missing vehicle fields
│   │   │   └── smart_recommendations.py # Conversation-aware recs
│   │   ├── models/
│   │   │   └── traffic_session.py      # Session data models
│   │   └── repositories/
│   │       ├── memory_repository.py    # In-memory storage
│   │       └── sqlite_repository.py    # SQLite fallback
│   ├── config/
│   │   └── recommender_config.json     # Recommendation weights
│   ├── data/
│   │   └── inventory.xlsx              # PBS inventory data
│   ├── tests/                          # Pytest test suite
│   ├── Dockerfile
│   └── requirements.txt
│
├── ai_service/                  # Standalone AI Service (Optional)
│   ├── predictor/
│   │   └── server.py
│   ├── models/
│   └── Dockerfile
│
├── .github/workflows/           # CI/CD pipelines
│   ├── ci-backend.yml
│   ├── ci-frontend.yml
│   ├── ci-ai-service.yml
│   └── e2e.yml
│
├── docker-compose.yml
├── LICENSE
└── README.md
```

---

## Staff Notification System

The kiosk can notify sales staff in real-time when customers need assistance.

### Notification Channels

| Channel | Configuration | Use Case |
|---------|--------------|----------|
| **Slack** | `SLACK_WEBHOOK_DEFAULT` | Primary - instant push to sales channel |
| **Email** | `SENDGRID_API_KEY` or SMTP | Backup - paper trail |
| **SMS** | Twilio credentials | Staff on the floor |

### Environment Variables

```bash
# Slack (Primary)
SLACK_WEBHOOK_DEFAULT=https://hooks.slack.com/services/T.../B.../xxx
SLACK_WEBHOOK_SALES=https://hooks.slack.com/services/...     # Optional team-specific
SLACK_WEBHOOK_APPRAISAL=https://hooks.slack.com/services/... # Optional
SLACK_WEBHOOK_FINANCE=https://hooks.slack.com/services/...   # Optional

# Email (via SendGrid - recommended)
SENDGRID_API_KEY=SG.xxxxxxxx
EMAIL_FROM_ADDRESS=kiosk@quirkchevrolet.com
EMAIL_FROM_NAME=Quirk AI Kiosk
EMAIL_NOTIFY_SALES=sales@quirkchevrolet.com
EMAIL_NOTIFY_DEFAULT=manager@quirkchevrolet.com

# Email (via SMTP - alternative)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SMS (via Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
SMS_NOTIFY_SALES=+1234567890,+0987654321
```

### Notification Flow

1. Customer taps "Speak with a sales consultant" button
2. Frontend calls `/api/v3/ai/notify-staff`
3. Backend sends notifications to all configured channels
4. Staff receives alert with:
   - Customer name (if known)
   - Vehicle of interest (stock number)
   - Budget and trade-in info
   - Link to Sales Manager Dashboard

---

## GM Model Number Decoder

The AI assistant automatically decodes GM model numbers from inventory data.

### Supported Model Codes

| Code | Vehicle |
|------|---------|
| CK10543 | Silverado 1500 Crew Cab Short Box 4WD |
| CK10743 | Silverado 1500 Crew Cab Standard Box 4WD |
| CK20743 | Silverado 2500HD Crew Cab Standard Box 4WD |
| CK30743 | Silverado 3500HD Crew Cab Standard Box 4WD |
| CK10706 | Tahoe 4WD |
| CK10906 | Suburban 4WD |
| 1PT26 | Equinox AWD LT |
| 1MB48 | Equinox EV AWD |
| 1YG07 | Corvette E-Ray |
| 1YR07 | Corvette ZR1 |
| ... | 32+ codes supported |

---

## Security Features

The application implements production-grade security measures:

| Feature | Implementation |
|---------|----------------|
| **API Key Protection** | `SecretValue` wrapper prevents accidental logging of secrets |
| **Rate Limiting** | slowapi with configurable limits per endpoint (30/min for AI) |
| **Input Sanitization** | XSS prevention, control character removal, length limits |
| **CORS Configuration** | Environment-based origin allowlists (strict in production) |
| **Request Tracking** | Unique request IDs for audit trails |
| **Health Checks** | Kubernetes-ready `/live` and `/ready` endpoints |
| **Phone Lookup Throttling** | Per-session rate limiting for phone number lookups |

```python
# Example: Secrets are never logged in plain text
>>> api_key = SecretValue("sk-ant-abc123...")
>>> print(api_key)
SecretValue(hash=7f3a2b1c...)
```

---

## API Documentation

Interactive API documentation is auto-generated by FastAPI and available at:

| Environment | Swagger UI | ReDoc | OpenAPI Spec |
|-------------|------------|-------|--------------|
| **Production** | [/docs](https://quirk-backend-production.up.railway.app/docs) | [/redoc](https://quirk-backend-production.up.railway.app/redoc) | [/openapi.json](https://quirk-backend-production.up.railway.app/openapi.json) |
| **Local** | [localhost:8000/docs](http://localhost:8000/docs) | [localhost:8000/redoc](http://localhost:8000/redoc) | [localhost:8000/openapi.json](http://localhost:8000/openapi.json) |

> 💡 **Tip:** Import the OpenAPI spec into [Postman](https://www.postman.com/) or [Insomnia](https://insomnia.rest/) for easy API testing.

---

## API Reference

### V3 Endpoints (Latest - AI with Tools)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v3/ai/chat` | POST | Intelligent AI chat with tools and memory |
| `/api/v3/ai/notify-staff` | POST | Trigger staff notifications (Slack/Email/SMS) |
| `/api/v3/ai/state/{session_id}` | GET | Get conversation state |
| `/api/v3/ai/lookup/phone/{phone}` | GET | Look up previous conversation by phone |

### V1 Endpoints (Core)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/inventory` | GET | List all vehicles with filtering |
| `/api/v1/inventory/stock/{stock_number}` | GET | Get vehicle by stock number |
| `/api/v1/inventory/vin/{vin}` | GET | Get vehicle by VIN |
| `/api/v1/inventory/search` | POST | Search with preferences |
| `/api/v1/recommendations/quiz` | POST | Quiz-based recommendations |
| `/api/v1/trade-in/vin/{vin}` | GET | Decode VIN for trade-in |
| `/api/v1/trade-in/estimate` | POST | Get trade-in valuation |
| `/api/v1/leads` | POST | Submit lead to CRM |
| `/api/v1/tts/speak` | POST | Generate speech audio |

### Traffic & Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/traffic/sessions` | GET | List active kiosk sessions |
| `/api/v1/traffic/sessions/{id}` | GET | Get session details |
| `/api/v1/traffic/stats` | GET | Aggregate statistics |
| `/api/v1/analytics/events` | POST | Log analytics events |

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key for AI features |

### Database

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (optional - falls back to JSON) |

### Authentication

| Variable | Description |
|----------|-------------|
| `JWT_SECRET_KEY` | Secret for JWT token signing (min 32 chars) |
| `ADMIN_API_KEY` | API key for dashboard access |

### Notifications

| Variable | Description |
|----------|-------------|
| `SLACK_WEBHOOK_DEFAULT` | Slack webhook URL for notifications |
| `SENDGRID_API_KEY` | SendGrid API key for email |
| `TWILIO_ACCOUNT_SID` | Twilio account for SMS |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Twilio phone number |

### Optional Services

| Variable | Description |
|----------|-------------|
| `ELEVENLABS_API_KEY` | ElevenLabs API for HD TTS |
| `ELEVENLABS_VOICE_ID` | Voice ID for TTS |
| `PBS_API_KEY` | PBS inventory API key |
| `CRM_API_KEY` | CRM integration key |

---

## Deployment

### Railway (Recommended)

Both frontend and backend are configured for Railway deployment:

```bash
# Backend deploys from /backend directory
# Frontend deploys from /frontend directory
# Set environment variables in Railway dashboard
```

**Production URLs:**
- Frontend: https://quirk-frontend-production.up.railway.app
- Backend: https://quirk-backend-production.up.railway.app

### Alternative Deployment Options

**Vercel (Frontend)**
```bash
cd frontend
vercel --prod
```

**Netlify (Frontend)**
```bash
cd frontend
netlify deploy --prod
```

**Docker (Any Platform)**
```bash
# Build images
docker build -t quirk-backend ./backend
docker build -t quirk-frontend ./frontend

# Run containers
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=xxx quirk-backend
docker run -p 3000:3000 quirk-frontend
```

### CI/CD

GitHub Actions workflows handle:

- **Backend** (`ci-backend.yml`): Python lint, pytest, Docker build
- **Frontend** (`ci-frontend.yml`): ESLint, Jest tests, build verification
- **AI Service** (`ci-ai-service.yml`): Build and push container
- **E2E** (`e2e.yml`): Playwright end-to-end tests

---

## Inventory Data

The system loads vehicle inventory from `backend/data/inventory.xlsx` (PBS export format).

### Supported Fields

| Field | Description | Example |
|-------|-------------|---------|
| Stock Number | Unique identifier | M37410 |
| Year | Model year | 2025 |
| Make | Manufacturer | Chevrolet |
| Model | Vehicle model | Silverado 1500 |
| Model Number | GM model code | CK10543 |
| Trim | Trim level | LT |
| MSRP | Manufacturer price | 52000 |
| Sale Price | Discounted price | 48500 |
| Body | Body description with drivetrain | 4WD Crew Cab 147" |
| Body Type | Category code | PKUP, APURP, VAN |

### Automatic Enrichment

Missing fields are automatically derived:

- **Drivetrain**: Extracted from Body field (4WD, AWD, 2WD)
- **Fuel Type**: Detected from Model name (EV → Electric)
- **Features**: Inferred from Trim (Z71 → Off-Road Package)
- **Seating/Towing**: Looked up by model
- **Model Description**: Decoded from GM Model Number

---

## Database

The backend supports dual storage modes:

| Mode | Trigger | Use Case |
|------|---------|----------|
| **PostgreSQL** | `DATABASE_URL` env var set | Production with persistent storage |
| **JSON Fallback** | No `DATABASE_URL` | Development and stateless deploys |

Session data structure includes:
- Customer info (name, phone)
- Vehicle interest (model, cab, colors)
- Budget (min, max, down payment %)
- Trade-in (vehicle, payoff, lender, monthly payment)
- Chat history (full AI conversation)
- Selected vehicle
- Staff notification status
- Action timestamps

---

## Troubleshooting

### Common Issues

**Backend won't start**
```bash
# Check if port is in use
lsof -i :8000

# Verify Python version
python --version  # Should be 3.11+

# Check dependencies
pip install -r requirements.txt --upgrade
```

**Frontend API errors**
```bash
# Verify backend is running
curl http://localhost:8000/api/health

# Check CORS settings in backend/.env
CORS_ORIGINS=http://localhost:3000
```

**AI responses failing**
```bash
# Verify API key is set
echo $ANTHROPIC_API_KEY

# Check backend logs for errors
docker-compose logs backend | grep -i anthropic
```

**Slack notifications not working**
```bash
# Test webhook directly
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test from kiosk"}' \
  $SLACK_WEBHOOK_DEFAULT
```

**Database connection issues**
```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT 1"

# Fall back to JSON storage (remove DATABASE_URL)
unset DATABASE_URL
```

### Health Check Endpoints

```bash
# Full health check
curl http://localhost:8000/api/health

# Liveness (is the service running?)
curl http://localhost:8000/api/health/live

# Readiness (is the service ready for traffic?)
curl http://localhost:8000/api/health/ready
```

---

## Known Limitations & Roadmap

### Current Limitations

| Area | Limitation |
|------|------------|
| **Field Naming** | Dual naming convention (camelCase + snake_case) requires defensive coding |
| **TypeScript** | Some components still in JavaScript |
| **State Management** | Prop drilling - no global state (Context/Redux) |
| **Styling** | Inline styles only - no CSS framework |
| **Notifications** | Push-based alerts work; real-time dashboard updates are pull-based |

### Future Improvements

- [ ] Complete TypeScript migration
- [ ] Add Redux Toolkit for state management
- [ ] Migrate to Tailwind CSS or styled-components
- [ ] Add WebSocket for real-time dashboard updates
- [ ] Implement offline mode with service workers
- [ ] Add multi-language support (i18n)
- [ ] PBS real-time inventory sync
- [ ] VIN Solutions CRM integration (ADF/XML format)
- [ ] Appointment scheduling tool
- [ ] Incentives data integration

---

## Performance

### Backend Optimizations

- Response caching for inventory queries
- Connection pooling for PostgreSQL
- Async/await throughout for non-blocking I/O
- Rate limiting to prevent abuse (30 requests/min for AI)
- Retry logic for external API calls

### Frontend Optimizations

- React.memo for expensive components
- Lazy loading for route components
- Image optimization for vehicle photos
- Session storage for client-side state
- localStorage for session persistence

### Recommended Specs

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Backend Server | 512MB RAM, 1 vCPU | 1GB RAM, 2 vCPU |
| Frontend Build | 1GB RAM | 2GB RAM |
| Database | 256MB RAM | 512MB RAM |

---

## Contributing

1. **Fork** the repository
2. **Create** a feature branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make** changes with appropriate tests
4. **Ensure** CI passes
   ```bash
   # Backend
   cd backend && pytest -v
   
   # Frontend
   cd frontend && npm test
   ```
5. **Submit** a pull request

### Code Style

- **Python**: Follow PEP 8, use type hints
- **TypeScript/JavaScript**: ESLint + Prettier
- **Commits**: Use conventional commits (`feat:`, `fix:`, `docs:`)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Support

For issues or questions:
- **GitHub Issues**: [Create an issue](https://github.com/mpalmer79/quirk-ai-kiosk/issues)
- **Quirk IT Team**: Contact internal IT support

---

*Built by mpalmer@quirkcars.com for Quirk Auto Dealers - New England's #1 Dealer*
