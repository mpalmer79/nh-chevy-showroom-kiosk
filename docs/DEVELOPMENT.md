# Quirk AI Kiosk -- Development Setup Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 20.x | Frontend React application |
| **Python** | 3.10+ | Backend FastAPI application |
| **Docker & Docker Compose** | Latest | Full-stack local development |
| **Git** | Latest | Version control |

Optional:
- **PostgreSQL** 15+ (if running the database locally without Docker)
- **Redis** 7+ (if running Redis locally without Docker)

---

## Quick Start with Docker Compose

The fastest way to get the full stack running locally.

```bash
# Clone the repository
git clone <repo-url>
cd quirk-ai-kiosk

# Copy environment files
cp backend/.env.example backend/.env

# Edit backend/.env and add your Anthropic API key
# ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Start all services
docker-compose up --build
```

This starts:
- **Frontend** at `http://localhost:3000`
- **Backend** at `http://localhost:8000`
- **API Docs** at `http://localhost:8000/docs` (development mode)

To stop all services:
```bash
docker-compose down
```

---

## Running Frontend and Backend Separately

For active development with hot reloading, it is faster to run each service outside Docker.

### Backend Setup

```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env: set ANTHROPIC_API_KEY at minimum

# Run the development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`.

**Key environment variables for backend:**

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key from [console.anthropic.com](https://console.anthropic.com/) |
| `ENVIRONMENT` | No | `development` (default) or `production` |
| `DATABASE_URL` | No | PostgreSQL URL. Falls back to JSON file storage if not set. |
| `REDIS_URL` | No | Redis URL. Falls back to in-memory cache if not set. |
| `JWT_SECRET_KEY` | No | Required for production auth. Any string works for dev. |

See `backend/.env.example` for the complete list of available variables.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will be available at `http://localhost:3000` with hot reloading.

**Key environment variables for frontend** (set in `.env` or shell):

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_URL` | `http://localhost:8000/api/v1` | Backend API base URL (includes `/v1`) |
| `REACT_APP_KIOSK_ID` | `DEV-KIOSK-001` | Kiosk identifier |
| `REACT_APP_DEALERSHIP` | `Quirk Chevrolet` | Dealership name |

**IMPORTANT**: `REACT_APP_API_URL` already includes `/v1`. Do not add `/v1/` to API endpoint paths in the frontend code, or it will produce a double `/v1/v1/` bug.

---

## Running Tests

### Backend Tests

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Run all tests
pytest tests/ -v --tb=short

# Run with coverage
pytest tests/ -v --tb=short --cov=app --cov-report=term-missing

# Run a specific test file
pytest tests/test_api_integration.py -v

# Run tests matching a pattern
pytest tests/ -v -k "test_chat"
```

### Frontend Tests

```bash
cd frontend

# Run tests in watch mode (interactive)
npm test

# Run tests in CI mode (non-interactive, single pass)
npm run test:ci

# Run with coverage report
npm run test:coverage

# Type checking
npm run type-check
# or
npx tsc --noEmit
```

### End-to-End Tests (Playwright)

```bash
cd frontend

# Install Playwright browsers (first time)
npm run playwright:install

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed browser (visible)
npm run test:e2e:headed
```

E2E tests require both frontend (`http://localhost:3000`) and backend (`http://localhost:8000`) to be running.

---

## Database Setup

### Using PostgreSQL Locally

```bash
# With Docker (recommended)
docker run -d \
  --name quirk-postgres \
  -e POSTGRES_USER=quirk \
  -e POSTGRES_PASSWORD=quirk_dev \
  -e POSTGRES_DB=quirk_kiosk \
  -p 5432:5432 \
  postgres:15-alpine

# Set DATABASE_URL in backend/.env
# DATABASE_URL=postgresql://quirk:quirk_dev@localhost:5432/quirk_kiosk
```

### Without PostgreSQL

If `DATABASE_URL` is not set, the backend automatically falls back to:
- JSON file storage for traffic sessions (`backend/data/traffic_log.json`)
- In-memory storage for conversation state and worksheets

This is fine for development and testing.

### Running Migrations (Alembic)

```bash
cd backend

# Check current migration status
alembic current

# Generate a new migration after model changes
alembic revision --autogenerate -m "description of changes"

# Apply all pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# View migration history
alembic history
```

The Alembic configuration lives in:
- `backend/alembic.ini` -- connection settings
- `backend/alembic/env.py` -- migration environment
- `backend/alembic/versions/` -- migration files

---

## Using Redis Locally

```bash
# With Docker
docker run -d \
  --name quirk-redis \
  -p 6379:6379 \
  redis:7-alpine

# Set REDIS_URL in backend/.env
# REDIS_URL=redis://localhost:6379/0
```

Without Redis, the backend uses in-memory caching only. Conversation state and worksheets will be lost on server restart.

---

## Inventory Data

Vehicle inventory is loaded from a PBS DMS Excel export at `backend/data/inventory.xlsx`. This file is read into memory when the backend starts.

To update inventory:
1. Export from PBS DMS as Excel
2. Replace `backend/data/inventory.xlsx`
3. Restart the backend

The Excel file expects these columns:
- `Stock Number`, `VIN`, `Year`, `Make`, `Model`, `Trim`
- `Model Number` (GM model code, e.g., CK10543)
- `Body`, `Body Type`, `Exterior Color`, `Cylinders`
- `MSRP`, `Category`

---

## Project Structure

```
quirk-ai-kiosk/
  backend/
    app/
      ai/               # AI module: tools, prompts, helpers, executor
      core/             # Settings, security, exceptions, cache
      models/           # Pydantic/SQLAlchemy models
      repositories/     # Data access (analytics)
      routers/          # API route handlers
      services/         # Business logic services
    alembic/            # Database migrations
    data/               # Inventory Excel + JSON fallback files
    tests/              # pytest test files
    requirements.txt
    Dockerfile
    .env.example
  frontend/
    src/
      components/       # React components (AIAssistant, DigitalWorksheet, etc.)
      hooks/            # Custom React hooks
      pages/            # Page-level components
      styles/           # Design tokens and theme
      types/            # TypeScript type definitions
      __tests__/        # Jest test files
    e2e/                # Playwright E2E tests
    public/             # Static assets
    package.json
    tsconfig.json
    Dockerfile
  docs/                 # Project documentation
  docker-compose.yml
  CLAUDE.md             # AI coding assistant instructions
```

---

## Common Issues and Solutions

### Backend: "No inventory file found"

The backend expects `backend/data/inventory.xlsx`. Make sure the file exists:
```bash
ls -la backend/data/inventory.xlsx
```
If missing, the backend will run with an empty inventory (0 vehicles).

### Backend: "ANTHROPIC_API_KEY not configured"

The AI chat endpoint will return fallback responses without the API key. Set it in `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

### Frontend: Double `/v1/v1/` in API calls

The `REACT_APP_API_URL` environment variable already includes `/v1`. Do not prepend `/v1/` to endpoint paths in `frontend/src/components/api.ts`.

Correct: `${API_URL}/inventory`
Incorrect: `${API_URL}/v1/inventory`

### Frontend: Tests fail with "Cannot find module"

After renaming or moving files, clear the Jest cache:
```bash
cd frontend
npx jest --clearCache
npm test
```

### Backend: "PostgreSQL connection failed - using JSON fallback"

This is a warning, not an error. The backend works without PostgreSQL by falling back to JSON file storage. To connect PostgreSQL, set `DATABASE_URL` in `backend/.env`.

### Backend: Redis connection errors

Redis is optional. If `REDIS_URL` is not set or Redis is unreachable, the backend falls back to in-memory caching with a warning log. No action needed for development.

### Docker: Port conflicts

If ports 3000 or 8000 are already in use:
```bash
# Check what is using the port
lsof -i :3000
lsof -i :8000

# Or change ports in docker-compose.yml or environment variables
```

### Frontend: Build fails with TypeScript errors

Run the type checker to see all errors:
```bash
cd frontend
npx tsc --noEmit
```

Fix all reported errors. Do not use `// @ts-ignore` to suppress them.

---

## CI/CD

The project uses GitHub Actions for continuous integration:

- **Frontend CI** (`.github/workflows/ci-frontend.yml`): Runs on changes to `frontend/**`. Executes type checking, tests with coverage, and production build.
- **Backend CI** (`.github/workflows/ci-backend.yml`): Runs on changes to `backend/**`. Executes pytest with coverage.

Both workflows run automatically on pull requests targeting the main branch.
