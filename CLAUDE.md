# QUIRK AI KIOSK — Comprehensive Upgrade Game Plan

## For Claude Code: Read this entire document before starting. Execute phases in order. Commit after each numbered task completes successfully. Do NOT skip tasks. Do NOT create README or documentation files unless explicitly listed as a task. Preserve ALL existing functionality — especially the `searchInventory()` function in `AIAssistant.tsx` with its `colorKeywords` and `modelKeywords` maps, and the Admin Login link in any hero sections.

## CRITICAL RULES (read before every task)

1. **REACT_APP_API_URL already includes `/v1`** — NEVER add `/v1/` prefix to API endpoints in `frontend/src/components/api.ts`. This causes the double `/v1/v1/` bug.
2. **Preserve `searchInventory()` in `AIAssistant.tsx`** — it contains `colorKeywords` + `modelKeywords` maps for "blue Equinox" searches. NEVER overwrite or remove this function.
3. **Admin Login link** — if any file has an Admin Login link in the top-right of a hero section, preserve it in all edits.
4. **"Digital Worksheet" terminology** — never use "4-square worksheet". Always say "Digital Worksheet".
5. **ALWAYS clear filters** when navigating to inventory/browse screens to prevent stale filter state.
6. **Physical showroom kiosk context** — customer is ALREADY IN STORE. AI acts as in-person salesperson. Never says "come in" or "find someone."
7. **Backend URL**: `https://quirk-backend-production.up.railway.app/`
8. **When modifying any component**, check if corresponding test files in `frontend/src/__tests__/` need updates, and update them.
9. **Run `npm test -- --ci --watchAll=false --passWithNoTests` after each frontend change** to verify nothing broke.
10. **Run `cd backend && pytest tests/ -v --tb=short` after each backend change** to verify nothing broke.

---

## PHASE 1: Frontend TypeScript Migration (Convert all .js → .tsx)

The following 19 JavaScript files need conversion to TypeScript. For each file: rename to `.tsx`, add proper type annotations using types from `frontend/src/types/index.ts`, fix any `any` types with proper interfaces, and ensure the component uses `React.FC<Props>` with a properly typed props interface. Import `KioskComponentProps` from `../../types` where the component receives `navigateTo`, `updateCustomerData`, `customerData`.

### Task 1.1: Convert core app files
- Convert `frontend/src/App.js` → `App.tsx`
- Convert `frontend/src/index.js` → `index.tsx`
- Convert `frontend/src/setupTests.js` → `setupTests.ts`
- Update any imports across the project that reference these files

### Task 1.2: Convert component files (batch 1 — simple components)
Convert these files from `.js` to `.tsx` with full type annotations:
- `frontend/src/components/Errorboundary.js` → `Errorboundary.tsx` — Add proper `ErrorBoundaryProps` and `ErrorBoundaryState` interfaces
- `frontend/src/components/Header.js` → `Header.tsx`
- `frontend/src/components/Screensaver.js` → `Screensaver.tsx`
- `frontend/src/components/Placeholder.tsx` — already TSX, but add proper types if missing
- `frontend/src/components/gmColors.js` → `gmColors.ts` (data file, no JSX)
- `frontend/src/components/vehicleCategories.js` → `vehicleCategories.ts` (data file, no JSX)

### Task 1.3: Convert component files (batch 2 — medium components)
- `frontend/src/components/FilterModal.js` → `FilterModal.tsx` — Type the filter state, options, and callbacks
- `frontend/src/components/LeadForm.js` → `LeadForm.tsx` — Type form fields and submission handler
- `frontend/src/components/Useapi.js` → `Useapi.tsx` — Type hook return values and API responses
- `frontend/src/components/Customerhandoff.js` → `Customerhandoff.tsx` — Uses `KioskComponentProps`

### Task 1.4: Convert component files (batch 3 — complex components)
- `frontend/src/components/Guidedquiz.js` → `Guidedquiz.tsx` — Type quiz answers, question interfaces, navigation callbacks
- `frontend/src/components/Paymentcalculator.js` → `Paymentcalculator.tsx` — Type payment params, calculation results

### Task 1.5: Convert calculator and quiz sub-components
- `frontend/src/components/calculator/FinanceCalculator.js` → `FinanceCalculator.tsx`
- `frontend/src/components/calculator/LeaseCalculator.js` → `LeaseCalculator.tsx`
- `frontend/src/components/calculator/index.js` → `index.ts`
- `frontend/src/components/quiz/LeaseHelpModal.js` → `LeaseHelpModal.tsx`
- `frontend/src/components/quiz/QuestionCard.js` → `QuestionCard.tsx`
- `frontend/src/components/quiz/QuizProgress.js` → `QuizProgress.tsx`
- `frontend/src/components/quiz/index.js` → `index.ts`

### Task 1.6: Convert data files and hooks
- `frontend/src/data/paymentOptions.js` → `paymentOptions.ts` — Export typed constants
- `frontend/src/data/quizQuestions.js` → `quizQuestions.ts` — Create `QuizQuestion` interface
- `frontend/src/hooks/usePaymentCalc.js` → `usePaymentCalc.ts` — Type hook params and return
- `frontend/src/hooks/useQuiz.js` → `useQuiz.ts` — Type quiz state and actions
- `frontend/src/hooks/index.js` → `index.ts`

### Task 1.7: Convert page files
- `frontend/src/pages/HomePage.js` → `HomePage.tsx`
- `frontend/src/pages/SearchPage.js` → `SearchPage.tsx`
- `frontend/src/pages/VehicleDetailPage.js` → `VehicleDetailPage.tsx`
- `frontend/src/styles/theme.js` → `theme.ts` — Type the theme object

### Task 1.8: Enable strict TypeScript
Update `frontend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "es2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"]
}
```
Fix ALL resulting TypeScript errors across the codebase. This will likely require adding proper null checks, typing event handlers, and removing remaining `any` types. Do not suppress errors with `// @ts-ignore` — fix them properly.

### Task 1.9: Verify and fix
- Run `npx tsc --noEmit` and fix every error
- Run `npm test -- --ci --watchAll=false --passWithNoTests` and fix any test failures
- Run `npm run build` and fix any build errors

---

## PHASE 2: Frontend File Naming Consistency

### Task 2.1: Rename component files to PascalCase
Rename the following files to consistent PascalCase. Update ALL imports across the entire project for each rename. Check `Kioskapp.tsx`, `api.ts`, test files, and any other files that import these components.

| Current Name | New Name |
|---|---|
| `Kioskapp.tsx` | `KioskApp.tsx` |
| `Welcomescreen.tsx` | `WelcomeScreen.tsx` |
| `Inventoryresults.tsx` | `InventoryResults.tsx` |
| `Vehicledetail.tsx` | `VehicleDetail.tsx` |
| `Stocklookup.tsx` | `StockLookup.tsx` |
| `Protectionpackages.tsx` | `ProtectionPackages.tsx` |
| `Paymentcalculator.tsx` | `PaymentCalculator.tsx` |
| `Trafficlog.tsx` | `TrafficLog.tsx` |
| `Errorboundary.tsx` | `ErrorBoundary.tsx` |
| `Customerhandoff.tsx` | `CustomerHandoff.tsx` |
| `Guidedquiz.tsx` | `GuidedQuiz.tsx` |

After renaming, update the imports in:
- `KioskApp.tsx` (the main orchestrator that imports all components)
- Any test files in `frontend/src/__tests__/`
- Any other file that imports these components

### Task 2.2: Update CI workflow
In `.github/workflows/ci-frontend.yml`, no path changes needed since `frontend/**` catches everything. Verify the workflow still passes.

---

## PHASE 3: Frontend Styling Architecture

### Task 3.1: Create a design tokens file
Create `frontend/src/styles/tokens.ts`:
```typescript
export const colors = {
  // Brand
  quirkBlue: '#0077b6',
  quirkBlueDark: '#005a8c',
  quirkGold: '#D1AD57',
  
  // Neutrals  
  white: '#ffffff',
  grayLight: '#f5f5f5',
  gray100: '#f0f0f0',
  gray200: '#e5e5e5',
  gray300: '#d4d4d4',
  gray400: '#a3a3a3',
  gray500: '#737373',
  gray600: '#525252',
  gray700: '#404040',
  gray800: '#262626',
  dark: '#1a1a2e',
  
  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Backgrounds
  bgPrimary: '#ffffff',
  bgSecondary: '#f8fafc',
  bgChat: '#ffffff',
  bgUserBubble: '#0077b6',
  bgAssistantBubble: '#f0f0f0',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const;

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '22px',
    xxl: '28px',
    heading: '36px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const borderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px rgba(0,0,0,0.07)',
  lg: '0 10px 15px rgba(0,0,0,0.1)',
  card: '0 2px 8px rgba(0,0,0,0.08)',
} as const;
```

### Task 3.2: Migrate inline styles in AIAssistant components
Refactor the `frontend/src/components/AIAssistant/styles.ts` file to import and use tokens from `../../styles/tokens`. Replace hardcoded color values, font sizes, spacing, and border-radius values with token references. Do NOT change the visual appearance — only swap literal values for token references.

### Task 3.3: Migrate DigitalWorksheet styles
The `frontend/src/components/DigitalWorksheet.css` file (701 lines) should be converted to a TypeScript style object (`DigitalWorksheet.styles.ts`) that uses the design tokens. Update `DigitalWorksheet.tsx` to import from the new styles file instead of the CSS file. Preserve all existing visual styling.

### Task 3.4: Migrate modelBudgetSelectorStyles
Refactor `frontend/src/components/modelBudgetSelectorStyles.ts` (874 lines) to use design tokens. Replace hardcoded values with token references.

### Task 3.5: Update SalesManagerDashboard styles
Refactor `frontend/src/components/SalesManagerDashboard/styles.ts` to use design tokens.

---

## PHASE 4: Backend — Persistent State Storage

### Task 4.1: Create Redis cache integration
Update `backend/app/core/cache.py` to add a Redis implementation alongside the existing `InMemoryCache`. The Redis class should:
- Use `redis.asyncio` (add `redis[hiredis]>=5.0.0` to requirements.txt)
- Connect via `REDIS_URL` environment variable
- Fall back to `InMemoryCache` if Redis is not configured
- Support `get`, `set`, `delete`, `exists` with JSON serialization
- Support TTL on all set operations
- Add a `get_cache()` singleton factory function

Add to `backend/app/core/settings.py`:
```python
redis_url: Optional[str] = Field(default=None, description="Redis connection URL")

@property
def is_redis_configured(self) -> bool:
    return bool(self.redis_url)
```

### Task 4.2: Persist ConversationState to Redis
Modify `backend/app/services/conversation_state.py`:
- Add a `persist_state()` method that serializes `ConversationState` to JSON and stores in Redis with key `conv:{session_id}` and 24-hour TTL
- Add a `load_state()` method that deserializes from Redis
- Modify `get_or_create_state()` to check Redis first, then in-memory, then create new
- Keep in-memory dict as L1 cache, Redis as L2. Write-through: every state update writes to both.
- Modify `get_state_by_phone()` to also check Redis (store phone→session_id mapping as `phone:{digits}`)
- Handle Redis connection failures gracefully — fall back to in-memory-only mode with a warning log

### Task 4.3: Persist Worksheets to Redis
Modify `backend/app/services/worksheet_service.py`:
- Add Redis persistence for worksheets with key `ws:{worksheet_id}` and 24-hour TTL
- Add `session_ws:{session_id}` key that stores list of worksheet IDs for a session
- Write-through to both in-memory and Redis
- Load from Redis on cache miss
- Handle Redis down gracefully

### Task 4.4: Add Redis health check
Update the health check in `backend/app/main.py` to include Redis status:
```python
# Redis check
try:
    cache = get_cache()
    if hasattr(cache, 'ping'):
        redis_ok = await cache.ping()
        health_status["checks"]["redis"] = {
            "status": "healthy" if redis_ok else "unhealthy"
        }
    else:
        health_status["checks"]["redis"] = {"status": "in_memory_fallback"}
except Exception as e:
    health_status["checks"]["redis"] = {"status": "unavailable"}
```

### Task 4.5: Add environment variable for Redis
Add `REDIS_URL` to:
- `backend/.env.example`
- `backend/.env.development`
- `docker-compose.yml` (add a Redis service):
```yaml
  redis:
    image: redis:7-alpine
    container_name: quirk-kiosk-redis
    ports:
      - "6379:6379"
    networks:
      - quirk-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
```
Update the backend service in docker-compose to add `REDIS_URL=redis://redis:6379/0`

### Task 4.6: Write tests for Redis persistence
Create `backend/tests/test_redis_cache.py`:
- Test InMemoryCache get/set/delete/TTL behavior
- Test ConversationState serialization round-trip
- Test Worksheet serialization round-trip
- Test graceful fallback when Redis unavailable
- Mock Redis for unit tests (don't require actual Redis in CI)

---

## PHASE 5: Backend — SSE Streaming for AI Responses

### Task 5.1: Create streaming chat endpoint
Add a NEW endpoint to `backend/app/routers/ai_v3.py` — do NOT modify the existing `/chat` endpoint:

```python
from fastapi.responses import StreamingResponse
import json

@router.post("/chat/stream")
@ai_limiter.limit("30/minute")
async def intelligent_chat_stream(
    chat_request: IntelligentChatRequest,
    background_tasks: BackgroundTasks,
    request: Request
):
    """
    Streaming version of intelligent chat.
    Returns Server-Sent Events with progressive updates.
    
    Event types:
    - thinking: AI is processing (sent immediately)
    - tool_start: Tool execution beginning
    - tool_result: Tool execution complete
    - text_delta: Incremental text from Claude
    - vehicles: Vehicle recommendations
    - worksheet: Worksheet created
    - done: Response complete with final metadata
    - error: Error occurred
    """
    async def event_stream():
        # ... implementation that yields SSE events
        # Use Anthropic streaming API: stream=True in the messages.create call
        # Yield each text delta as it arrives
        # Yield tool use events as they happen
        pass
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
```

The streaming endpoint should:
1. Immediately yield `event: thinking` so the UI knows processing started
2. Build the same system prompt and context as the existing `/chat` endpoint
3. Call Anthropic API with `stream=True`
4. For each text delta from the stream, yield `event: text_delta` with the text chunk
5. When Claude invokes a tool, yield `event: tool_start` with the tool name
6. Execute the tool (reuse existing `execute_tool` function), yield `event: tool_result`
7. If vehicles are found, yield `event: vehicles` with the vehicle data
8. If a worksheet is created, yield `event: worksheet` with the worksheet ID
9. After all processing, yield `event: done` with final metadata (tools_used, staff_notified, etc.)
10. On any error, yield `event: error` with the error message

### Task 5.2: Add streaming support to frontend API layer
Add a new method to `frontend/src/components/api.ts`:
```typescript
chatWithAIStream(
  message: string,
  sessionId: string,
  conversationHistory: ChatMessage[],
  customerName?: string,
  onTextDelta: (text: string) => void,
  onVehicles?: (vehicles: Vehicle[]) => void,
  onToolStart?: (toolName: string) => void,
  onWorksheet?: (worksheetId: string) => void,
  onDone?: (metadata: Record<string, unknown>) => void,
  onError?: (error: string) => void,
): Promise<void>
```

This method should:
- Use `fetch()` with the streaming endpoint URL
- Read the response body as a stream using `ReadableStream`
- Parse SSE events and call the appropriate callbacks
- Handle reconnection on network errors

### Task 5.3: Update AIAssistant to use streaming
Modify `frontend/src/components/AIAssistant/AIAssistant.tsx`:
- Add a `useStreamingChat` boolean state (default `true`)
- When streaming is enabled, use `api.chatWithAIStream()` instead of `api.chatWithAI()`
- Show text as it arrives (append to message content on each `text_delta`)
- Show a "thinking" indicator that updates with tool names as they execute
- Show vehicles progressively as they arrive
- Fall back to non-streaming `chatWithAI()` if the stream errors out
- **PRESERVE the existing `searchInventory()` function with colorKeywords and modelKeywords** — do not touch it

### Task 5.4: Write tests for streaming
- Create `backend/tests/test_streaming.py` — test SSE event format, error handling, tool execution during stream
- Update `frontend/src/__tests__/AIAssistant.test.tsx` — add tests for streaming mode with mocked EventSource/fetch

---

## PHASE 6: Backend — Database Migrations with Alembic

### Task 6.1: Initialize Alembic
Create the Alembic migration structure:
```
backend/
  alembic/
    versions/
    env.py
    script.py.mako
  alembic.ini
```

Configure `alembic/env.py` to:
- Use the async engine from `app.database`
- Import all models from `app.models/`
- Support both online (connected) and offline (SQL generation) modes
- Use the `DATABASE_URL` environment variable

Configure `alembic.ini` with:
- `sqlalchemy.url` pointing to env var
- Proper logging

### Task 6.2: Create initial migration
Generate an initial migration that captures the current schema:
- `traffic_sessions` table (from `app/models/traffic_session.py`)
- `worksheets` table (from `app/models/worksheet.py`)
- Any other models that exist

### Task 6.3: Create conversation_state migration
Create a new migration to add a `conversation_states` table:
```sql
CREATE TABLE conversation_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(15),
    customer_email VARCHAR(254),
    budget_min FLOAT,
    budget_max FLOAT,
    monthly_payment_target FLOAT,
    down_payment FLOAT,
    stage VARCHAR(30) DEFAULT 'greeting',
    interest_level VARCHAR(20) DEFAULT 'cold',
    message_count INTEGER DEFAULT 0,
    state_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_conv_state_session ON conversation_states(session_id);
CREATE INDEX idx_conv_state_phone ON conversation_states(customer_phone) WHERE customer_phone IS NOT NULL;
CREATE INDEX idx_conv_state_stage ON conversation_states(stage);
```

### Task 6.4: Update CI to run migrations
Add a migration check step to `.github/workflows/ci-backend.yml`:
```yaml
- name: 🔄 Check Alembic Migrations
  run: |
    alembic check 2>&1 || echo "Migration check completed"
  env:
    DATABASE_URL: sqlite:///test.db
```

---

## PHASE 7: Comprehensive Testing

### Task 7.1: Backend integration tests
Create `backend/tests/test_api_integration.py` with tests that:
- Test the full `/api/v3/ai/chat` endpoint with a mock Anthropic response
- Test `/api/v3/worksheets` CRUD lifecycle (create → update → get → list)
- Test `/api/v1/inventory` with various filter combinations
- Test `/api/v1/traffic` session lifecycle (start → events → end)
- Test `/api/v3/ai/chat/stream` SSE event format
- Test rate limiting returns 429 after threshold
- Test health check returns all service statuses
- Use `httpx.AsyncClient` with the FastAPI `TestClient`
- Mock external services (Anthropic API, Slack, Twilio) but test full request → response flow

### Task 7.2: Backend edge case tests
Create `backend/tests/test_edge_cases.py`:
- Test conversation state with unicode characters (Spanish language support)
- Test entity extraction with edge case inputs: empty strings, very long messages (5000+ chars), messages with only emojis, SQL injection attempts
- Test budget calculator with edge cases: $0 down, $0 monthly, negative values, extremely large values
- Test VIN sanitization with malformed VINs
- Test concurrent session creation (multiple sessions simultaneously)
- Test inventory search with no results
- Test worksheet creation with non-existent stock number

### Task 7.3: Frontend component tests — fill gaps
Create or update test files for components that don't have tests yet:
- Create `frontend/src/__tests__/DigitalWorksheet.test.tsx` — test worksheet display, term selection, "I'm Ready" button
- Create `frontend/src/__tests__/CustomerHandoff.test.tsx` — test handoff flow
- Create `frontend/src/__tests__/StockLookup.test.tsx` — test stock number input and validation
- Create `frontend/src/__tests__/GuidedQuiz.test.tsx` — verify it exists, add tests for quiz flow completion
- Create `frontend/src/__tests__/FilterModal.test.tsx` — test filter selection and reset
- Create `frontend/src/__tests__/MarketValueTrends.test.tsx` — test chart rendering

For each test file, follow the pattern established in existing tests:
- Mock the `api` module with all functions the component calls
- Mock `navigateTo`, `updateCustomerData`, `customerData` props
- Test rendering, user interactions, and state changes
- Use `@testing-library/react` and `@testing-library/user-event`

### Task 7.4: Frontend hook tests
Create `frontend/src/__tests__/hooks/`:
- `usePaymentCalc.test.ts` — test finance and lease calculations
- `useQuiz.test.ts` — test quiz state transitions
- `useSpeechRecognition.test.ts` — test with mocked SpeechRecognition API
- `useTextToSpeech.test.ts` — test with mocked speechSynthesis API
- `useDataExtraction.test.ts` — test entity extraction from messages

### Task 7.5: E2E test setup with Playwright
Create `frontend/e2e/` directory with:

`frontend/e2e/kiosk-flow.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Kiosk Customer Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('welcome screen renders with all navigation options', async ({ page }) => {
    await expect(page.getByText(/welcome/i)).toBeVisible();
    // Test all navigation buttons are present
  });

  test('can navigate to AI assistant and send a message', async ({ page }) => {
    // Click AI assistant button
    // Type a message
    // Verify message appears in chat
    // Verify loading indicator shows
  });

  test('can browse inventory and view vehicle details', async ({ page }) => {
    // Navigate to inventory
    // Verify vehicles render
    // Click a vehicle
    // Verify detail page shows
  });

  test('can use model budget selector flow', async ({ page }) => {
    // Navigate through category → model → budget → results
  });

  test('screensaver activates after inactivity', async ({ page }) => {
    // Wait for screensaver timeout
    // Verify screensaver shows
    // Touch to dismiss
  });
});
```

Create `frontend/playwright.config.ts` if not exists:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    viewport: { width: 1920, height: 1080 }, // Kiosk resolution
  },
});
```

### Task 7.6: Update CI for coverage enforcement
Update `frontend/package.json` jest config to enforce coverage thresholds:
```json
"coverageThreshold": {
  "global": {
    "branches": 65,
    "functions": 70,
    "lines": 75,
    "statements": 75
  }
}
```

Update `.github/workflows/ci-frontend.yml` to include coverage:
```yaml
- name: 🔬 Run Tests with Coverage
  run: npm run test:coverage -- --ci
  env:
    CI: true
```

Update `.github/workflows/ci-backend.yml` to include coverage:
```yaml
- name: 🧪 Run Tests with Coverage
  run: pytest tests/ -v --tb=short --cov=app --cov-report=term-missing --cov-fail-under=70
  env:
    ENVIRONMENT: test
    ANTHROPIC_API_KEY: test-key-for-ci
```

Add `pytest-cov` usage to the backend CI (already in requirements.txt).

---

## PHASE 8: Documentation

### Task 8.1: Create API documentation
Create `backend/docs/API.md`:
- Document every endpoint with method, path, request body, response body, and example
- Group by version (v1, v2, v3)
- Include authentication requirements (which endpoints need API keys)
- Include rate limiting info
- Include error response format
- Auto-generate from the FastAPI OpenAPI schema where possible

### Task 8.2: Create architecture documentation
Create `docs/ARCHITECTURE.md` in project root:
- System diagram (text-based using Mermaid syntax) showing Frontend → Backend → Claude API → External Services
- Data flow for key user journeys: AI Chat, Vehicle Search, Digital Worksheet, Staff Notification
- Service layer overview: what each service does and its dependencies
- State management: conversation state lifecycle, worksheet lifecycle
- Deployment architecture: Railway, environment variables, database, Redis

### Task 8.3: Create development setup guide
Create `docs/DEVELOPMENT.md` in project root:
- Prerequisites (Node 20, Python 3.11, Docker)
- Environment variable setup (reference `.env.example` files)
- Running locally with Docker Compose
- Running frontend and backend separately
- Running tests
- Database setup and migrations
- Common issues and solutions

### Task 8.4: Add inline documentation to key services
Add or improve JSDoc/docstrings in these files (add missing documentation, don't rewrite existing good docs):
- `frontend/src/components/api.ts` — Document every exported function with params, return type, and usage example
- `backend/app/ai/tool_executor.py` — Document each tool handler function
- `backend/app/services/conversation_state.py` — Document the state lifecycle and stage transitions
- `backend/app/services/lead_scoring.py` — Document scoring weights and tier thresholds

---

## PHASE 9: Dependency Updates

### Task 9.1: Update backend dependencies
Update `backend/requirements.txt` to current stable versions. For each package, update the pinned version:
```
fastapi>=0.115.0,<1.0.0
uvicorn[standard]>=0.30.0
pydantic[email]>=2.10.0
pydantic-settings>=2.6.0
httpx>=0.27.0
openpyxl>=3.1.5
pandas>=2.2.0
numpy>=1.26.4
asyncpg>=0.30.0
sqlalchemy[asyncio]>=2.0.36
alembic>=1.14.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
bcrypt>=4.2.0
slowapi>=0.1.9
sentry-sdk[fastapi]>=2.0.0
python-json-logger>=2.0.7
scikit-learn>=1.5.0
pytest>=8.0.0
pytest-asyncio>=0.24.0
pytest-cov>=5.0.0
redis[hiredis]>=5.0.0
```

After updating, run `pytest tests/ -v --tb=short` and fix any compatibility issues.

### Task 9.2: Update frontend dependencies
Update `frontend/package.json` dependencies:
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-scripts": "5.0.1",
    "axios": "^1.7.0",
    "framer-motion": "^11.0.0",
    "recharts": "^2.13.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "web-vitals": "^4.0.0"
  }
}
```

Note: Stay on React 18 for now (React 19 requires a react-scripts update or migration to Vite which is out of scope). But update TypeScript to 5.x which is a major improvement.

After updating, run `npm test -- --ci --watchAll=false` and `npm run build` and fix any issues.

---

## PHASE 10: Backend — Prompt Caching

### Task 10.1: Implement Anthropic prompt caching
Modify `backend/app/routers/ai_v3.py` to use Anthropic's prompt caching for the system prompt.

In the API call to Anthropic, add cache control to the system prompt:
```python
# When building the messages payload for the Anthropic API call:
system_content = [
    {
        "type": "text",
        "text": system_prompt,
        "cache_control": {"type": "ephemeral"}
    }
]
```

This tells Anthropic to cache the system prompt across requests, significantly reducing costs since the system prompt is ~3000 tokens and identical for every request.

Also add the `anthropic-beta: prompt-caching-2024-07-31` header to the API request.

### Task 10.2: Add token usage logging
Add logging to track cache hit rates and token savings:
```python
# After receiving the Anthropic response:
usage = response.get("usage", {})
cache_creation = usage.get("cache_creation_input_tokens", 0)
cache_read = usage.get("cache_read_input_tokens", 0)
input_tokens = usage.get("input_tokens", 0)

logger.info(
    f"AI Token Usage - Input: {input_tokens}, "
    f"Cache Created: {cache_creation}, Cache Read: {cache_read}, "
    f"Output: {usage.get('output_tokens', 0)}, "
    f"Session: {chat_request.session_id}"
)
```

---

## PHASE 11: Final Validation

### Task 11.1: Full test suite
Run the complete test suite and fix any failures:
```bash
# Backend
cd backend && pytest tests/ -v --tb=short --cov=app --cov-report=term-missing

# Frontend
cd frontend && npm run test:coverage -- --ci --watchAll=false

# Type checking
cd frontend && npx tsc --noEmit

# Build
cd frontend && npm run build
```

### Task 11.2: Verify critical functionality
Manually verify these scenarios still work by reading the code paths:
1. AI chat flow: message → tool use → vehicle results → response
2. Digital Worksheet creation from AI chat
3. Staff notification dispatch (Slack/SMS/Email)
4. Conversation continuity via phone number lookup
5. Inventory search with filters (body style, price, model)
6. `searchInventory()` in AIAssistant.tsx still has colorKeywords and modelKeywords
7. Traffic logging records chat history
8. Health check endpoint returns all service statuses

### Task 11.3: Update version numbers
- Update `frontend/package.json` version to `"3.0.0"`
- Update `backend/app/main.py` FastAPI version to `"4.0.0"`
- Update `PROMPT_VERSION` in `backend/app/routers/ai_v3.py` to `"4.0.0"`

---

## Summary of Expected Changes

| Phase | Files Modified/Created | Estimated Scope |
|-------|----------------------|-----------------|
| 1. TypeScript Migration | ~30 files converted | High |
| 2. File Naming | ~15 files renamed, ~20 import updates | Medium |
| 3. Styling Architecture | ~6 files created/refactored | Medium |
| 4. Redis Persistence | ~8 files modified/created | High |
| 5. SSE Streaming | ~4 files modified/created | High |
| 6. Alembic Migrations | ~6 files created | Medium |
| 7. Testing | ~15 test files created/updated | High |
| 8. Documentation | ~4 doc files created | Medium |
| 9. Dependency Updates | 2 files updated | Low |
| 10. Prompt Caching | 1 file modified | Low |
| 11. Final Validation | Verification only | Low |

**Total: ~100+ files touched across 11 phases**
