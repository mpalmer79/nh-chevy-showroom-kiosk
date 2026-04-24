# Rebrand Action Plan: `quirk-ai-kiosk` → `nh-chevy-showroom-kiosk`

**For Claude Code. Read this entire document before starting. Execute phases strictly in order. Commit after every numbered task completes and tests pass. Do NOT skip tasks. Do NOT invent scope.**

---

## 0. Mission, constraints, and success criteria

### 0.1 What this rebrand is

The product is being renamed from **"Quirk AI Kiosk"** to **"New Hampshire Chevrolet Sales Showroom Kiosk"**. Every `Quirk` / `quirk` / `QUIRK` reference must be removed from the codebase — user-facing strings, internal identifiers, logger names, container names, env defaults, CSS custom properties, test assertions, docs, and comments. **Chevrolet branding is retained** — this is still a Chevy-focused demo, and Chevy product names (Silverado, Equinox, Tahoe, etc.) and the GM model decoder stay exactly as they are.

### 0.2 Inventory (measured, not estimated)

A full ripgrep across `*.ts`, `*.tsx`, `*.js`, `*.jsx`, `*.py`, `*.md`, `*.json`, `*.yml`, `*.yaml`, `*.html`, `*.css`, `*.toml`, `*.ini`, `*.sh`, `*.env*`, `*.cfg`, and `Dockerfile*` produced:

- **296 matches** of `quirk` (case-insensitive) across **92 files**
- **37 distinct string forms** — from `QUIRK` (display) to `quirkBlue` (token key), `quirk-kiosk-frontend` (container), `quirk_ai.recommendations_v2` (logger), `--quirk-green` (CSS var), `quirk-ai-network` (docker network), `quirkchevynh.com` (domain), `quirk_conversations` (DB concept), and so on
- **84** Python, **66** TSX, **51** Markdown, **45** TS, **16** CSS, **12** YAML, **6** JSON, **4** shell, plus env files and Dockerfiles

A naked `sed -i 's/quirk/nh-chevy/g'` **will not work**. Three classes of hazard:

1. **Casing is semantic.** `QUIRK` is a display string, `Quirk` is a proper noun in copy, `quirk` is an identifier. They map to different replacements.
2. **Compound identifiers span scopes.** `quirkBlue` (TypeScript token) and `--quirk-green` (CSS variable) refer to different concepts — blue was the dealership brand, green was a later visual theme. Both must go, but they're conceptually distinct.
3. **Domain leakage.** `quirkchevynh.com`, `quirk-backend-production.up.railway.app`, Slack channel `#chevynh-sales-kiosk`, Sentry DSN scaffolds — these point to infrastructure Michael no longer controls. They must be scrubbed to neutral placeholders, not retargeted to new live infrastructure that doesn't exist yet.

### 0.3 Naming decisions (these are final — do not re-derive)

| Context | Old | New |
|---|---|---|
| Product display name | `QUIRK AI Kiosk` / `Quirk AI Kiosk` | `New Hampshire Chevrolet Sales Showroom Kiosk` |
| Short display name | `QUIRK` | `NH Chevy` (uppercase in logos: `NH CHEVY`) |
| Header brand line | `Quirk Chevrolet` | `New Hampshire Chevrolet` |
| AI assistant self-reference | `Quirk AI` | `Showroom AI` |
| Repo / package slug | `quirk-ai-kiosk` | `nh-chevy-showroom-kiosk` |
| Python logger root | `quirk_kiosk` / `quirk_ai` | `showroom_kiosk` |
| Docker network | `quirk-network` / `quirk-ai-network` | `showroom-network` |
| Docker container prefix | `quirk-kiosk-*` | `showroom-kiosk-*` |
| DB / Redis logical name (when referenced) | `quirk_kiosk` | `showroom_kiosk` |
| Dealership copy | `Quirk Chevrolet` / `Quirk Auto Dealers` | `New Hampshire Chevrolet` |
| Manchester, NH reference | `Manchester, NH` | keep as-is (it's a geographic fact) |
| CSS brand tokens | `--quirk-green*`, `quirkBlue`, `quirkGold` | `--brand-green*`, `brandBlue`, `brandGold` |
| Chevy/GM product terms | `Silverado`, `Equinox`, etc. | **unchanged** |
| "Chevrolet" in copy | present | **unchanged** |

### 0.4 External artifacts that point to dead infrastructure

These URLs and channels appear in code and docs and reference infrastructure Michael no longer owns. Replace with neutral placeholders, not new live endpoints:

| Old | Replace with |
|---|---|
| `https://quirk-backend-production.up.railway.app` | `http://localhost:8000` in dev configs; `REPLACE_ME_BACKEND_URL` in production env examples |
| `https://quirk-frontend-production.up.railway.app` | `http://localhost:3000` in dev; `REPLACE_ME_FRONTEND_URL` in production |
| `https://quirk-ai-kiosk.netlify.app` / `.vercel.app` / `.railway.app` (in CORS defaults) | **remove from CORS defaults entirely** — leave CORS_ORIGINS empty in examples with a comment that deployers must populate |
| `https://quirkchevynh.com/inventory` | `https://example.com/inventory` with a `// TODO: set to real dealership domain` comment |
| Slack channel `#chevynh-sales-kiosk` | `#showroom-kiosk-alerts` in docs; channel is configured via env var in code, so this change is doc-only |
| GitHub repo `github.com/mpalmer79/quirk-ai-kiosk` in README clone command | `github.com/mpalmer79/nh-chevy-showroom-kiosk` (update when repo is actually renamed on GitHub) |
| CI path reference `/home/runner/work/quirk-ai-kiosk/quirk-ai-kiosk/backend` in two test files | delete the `sys.path.insert` line — it's a CI-specific hack and should use a proper conftest.py |

### 0.5 Explicit non-goals

- **Do not** touch any Chevrolet, GM, or vehicle-model string. The GM model decoder stays as-is.
- **Do not** rename public API routes, database table names, URL paths, or env variable names. Renaming `ANTHROPIC_API_KEY`, `REACT_APP_API_URL`, `DATABASE_URL`, `PBS_API_KEY`, etc. is **out of scope** — those are ecosystem conventions, not Quirk branding.
- **Do not** change the color palette itself. `--quirk-green: #22c55e` becomes `--brand-green: #22c55e` — the hex does not change. Hex changes are a design decision, not a rebrand task.
- **Do not** add features, fix unrelated bugs, refactor code, or modernize patterns. This rebrand touches only what must change.
- **Do not** rename files on disk except where explicitly listed in Phase 9 (documentation file rename). Component file names like `KioskApp.tsx` stay the same.
- **Do not** rewrite docstrings or comments unless they contain "Quirk." Preserve existing voice and tone.
- **Do not** regenerate `package-lock.json` from scratch. It contains one incidental `quirk` reference (almost certainly inside a nested dependency description, not the root package name) and should be regenerated by `npm install` at the end of Phase 2, not hand-edited.

### 0.6 Success criteria (the rebrand is done when all are true)

1. `grep -ri "quirk" .` from repo root returns **zero results** across source files (excluding `.git/`, `node_modules/`, `build/`, `dist/`, `__pycache__/`, and `.venv/`).
2. `grep -ri "chevynh" .` returns **zero results**.
3. Backend tests pass: `cd backend && pytest tests/ -v --tb=short` — exit 0.
4. Frontend unit tests pass: `cd frontend && npm test -- --ci --watchAll=false` — exit 0.
5. Frontend builds: `cd frontend && npm run build` — exit 0.
6. TypeScript typechecks: `cd frontend && npx tsc --noEmit` — exit 0.
7. `docker-compose config` validates — exit 0.
8. The app renders and the Welcome screen shows `NH CHEVY` in the logo position and `New Hampshire Chevrolet` as the dealership line (verified by running `npm start` and a manual eyeball).
9. A git log shows atomic commits, one per numbered task, each with tests green in that task's scope.

### 0.7 CRITICAL RULES (read before every task)

1. **Atomic commits, never bulk commits.** Every numbered task in this plan ends with a single `git commit`. Never batch two tasks into one commit.
2. **Two-file-per-session discipline still applies.** If a task spans more than two files, split the task — edit the first two, commit, then edit the next two, commit again. Exception: Phase 4 (logger rename) edits many files with one mechanical change; handle as described in its block.
3. **Run the local test suite after every code-edit task**, not just at phase boundaries. Frontend changes run `npm test -- --ci --watchAll=false --passWithNoTests`. Backend changes run `pytest tests/ -v --tb=short`. If tests break and the cause is the rebrand itself (e.g., a test asserts `screen.getByText('QUIRK')`), update the assertion in the same commit.
4. **Preserve `searchInventory()` in `AIAssistant.tsx`** — it contains `colorKeywords` + `modelKeywords` maps critical to "blue Equinox"-style searches. This file has zero Quirk references in the search logic itself; only surrounding copy may need edits.
5. **Preserve the `/v1` URL prefix convention.** `REACT_APP_API_URL` already includes `/v1`. Never add a second `/v1/` when editing URLs.
6. **Preserve the "customer is in-store" voice.** The AI never says "come in" or "visit us." Rebrand copy must keep this rule.
7. **Preserve "Digital Worksheet" terminology** — never "4-square worksheet."
8. **Do not delete the `CLAUDE.md` file** — update it in Phase 9. It is the source of truth for future sessions.
9. **If anything is ambiguous, stop and ask.** Do not guess. Do not fall back to a previous task's convention to resolve a new ambiguity.
10. **Do not rename `.env` files or change env variable keys.** Only edit values and comment blocks.

---

## 1. Phase layout

Phases run in strict order. Each phase is self-contained: if Phase N's verification fails, fix before starting Phase N+1. Do not skip ahead.

| Phase | Scope | Files | Risk | Order reason |
|---|---|---|---|---|
| 1 | Setup, branch, baseline | N/A | low | Baseline must precede edits |
| 2 | Package metadata + repo identifiers | 2 files | low | Decouples repo name from everything else |
| 3 | Environment config + docker-compose | 8 files | medium | Config lies underneath runtime; fix first so later phases can boot |
| 4 | Backend logger names + module docstrings | ~30 files, mechanical | low | Pure find/replace; isolates a huge chunk of matches |
| 5 | Backend AI prompts + user-facing strings | 4 files | **high** | Touches the system prompt; must be reviewed closely |
| 6 | Frontend design tokens + CSS custom properties | 4 files | medium | Must precede component edits that import the tokens |
| 7 | Frontend components — user-facing copy | ~16 files | **high** | The bulk of visible rebrand; split into sub-tasks |
| 8 | Test files — assertions and fixtures | ~6 files | medium | Must follow component edits so assertions match reality |
| 9 | Docs, CLAUDE.md, doc file rename | ~8 files | low | Docs describe the finished system; must come last |
| 10 | Verification, full test run, build, manual eyeball | N/A | — | Prove success criteria |

---

## PHASE 1: Setup and baseline

### Task 1.1: Branch and baseline verification

```bash
git checkout -b rebrand/nh-chevy-showroom-kiosk
git status   # must be clean
cd backend && pytest tests/ -v --tb=short 2>&1 | tail -20
cd ../frontend && npm install && npm test -- --ci --watchAll=false --passWithNoTests 2>&1 | tail -20
cd ..
```

If either test suite fails on a clean tree, **stop**. Do not start the rebrand on top of broken tests — you will not be able to tell rebrand-induced failures from pre-existing ones. Report the failures and wait.

If both pass, commit nothing yet (no changes made). Continue.

### Task 1.2: Write a single baseline grep snapshot for later diffing

```bash
grep -rni "quirk\|chevynh" . \
  --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=build \
  --exclude-dir=dist --exclude-dir=__pycache__ --exclude-dir=.venv \
  --exclude="*.lock" --exclude="package-lock.json" \
  > /tmp/rebrand-baseline.txt
wc -l /tmp/rebrand-baseline.txt   # expect ~296 + a handful of chevynh
```

This file is a reference. Do not commit it. Phase 10 will compare against a post-rebrand grep to confirm zero remaining matches.

**Commit:** none.

---

## PHASE 2: Package metadata and repo identifiers

Two files, one commit. The repo name lives in two places.

### Task 2.1: `frontend/package.json`

- Change `"name": "quirk-ai-kiosk"` to `"name": "nh-chevy-showroom-kiosk"`.
- Do not touch `version`, `dependencies`, or `scripts`.

### Task 2.2: `README.md` — top-of-file only (title, badges, clone URL)

In this task, edit **only** the first ~40 lines of `README.md`:

- Title: `# QUIRK AI Kiosk` → `# New Hampshire Chevrolet Sales Showroom Kiosk`
- Subtitle: `**AI-Powered Showroom Experience for Quirk Chevrolet NH**` → `**AI-Powered Showroom Experience for a New Hampshire Chevrolet Dealership**`
- Badge URLs pointing at `mpalmer79/quirk-ai-kiosk` → `mpalmer79/nh-chevy-showroom-kiosk`
- `git clone https://github.com/mpalmer79/quirk-ai-kiosk.git` → `git clone https://github.com/mpalmer79/nh-chevy-showroom-kiosk.git`
- `cd quirk-ai-kiosk` → `cd nh-chevy-showroom-kiosk`

The rest of the README is handled in Phase 9. Do not touch it yet.

### Verification (Phase 2)

```bash
cd frontend && npm install   # regenerates package-lock.json with new name
cd ..
grep -n "quirk-ai-kiosk" frontend/package.json README.md   # expect zero matches in scope
```

### Commit

```
git add frontend/package.json frontend/package-lock.json README.md
git commit -m "rebrand: rename package and top-of-README identifiers

- frontend/package.json: quirk-ai-kiosk -> nh-chevy-showroom-kiosk
- README.md: title, badges, clone URL updated
- package-lock.json regenerated via npm install

Part of quirk -> nh-chevy rebrand. Further README sections handled in Phase 9."
```

---

## PHASE 3: Environment config and Docker

Config is foundational — later phases assume these defaults, so fix them first. Touch only the files listed.

### Task 3.1: `docker-compose.yml`

Replace in this exact mapping:

| Old | New |
|---|---|
| `# QUIRK AI Kiosk - Local Development Stack` | `# New Hampshire Chevrolet Showroom Kiosk - Local Development Stack` |
| `container_name: quirk-kiosk-frontend` | `container_name: showroom-kiosk-frontend` |
| `container_name: quirk-kiosk-backend` | `container_name: showroom-kiosk-backend` |
| `container_name: quirk-kiosk-ai` | `container_name: showroom-kiosk-ai` |
| `container_name: quirk-kiosk-redis` | `container_name: showroom-kiosk-redis` |
| `REACT_APP_DEALERSHIP=Quirk Chevrolet` | `REACT_APP_DEALERSHIP=New Hampshire Chevrolet` |
| `networks:\n  quirk-network:` (top-level) | `networks:\n  showroom-network:` |
| `name: quirk-ai-network` | `name: showroom-kiosk-network` |
| Every `- quirk-network` under service `networks:` lists | `- showroom-network` |

Verify with:
```bash
docker-compose config > /dev/null   # must exit 0
grep -n "quirk" docker-compose.yml   # expect zero
```

### Task 3.2: `backend/.env.example` and `backend/.env.development`

In both files:

- Header comment block `# QUIRK AI KIOSK - Backend Environment Configuration` → `# NH CHEVY SHOWROOM KIOSK - Backend Environment Configuration`
- Any other `Quirk` literal in comments → `New Hampshire Chevrolet`
- Leave all variable keys untouched. Leave `CORS_ORIGINS=` empty with comment: `# Comma-separated list of allowed origins. Populate per environment.`

### Task 3.3: `frontend/.env.example`, `frontend/.env.development`, `frontend/.env.production`

- Header comment `# QUIRK AI KIOSK - Frontend Environment Configuration` → `# NH CHEVY SHOWROOM KIOSK - Frontend Environment Configuration`
- `REACT_APP_DEALERSHIP=Quirk Chevrolet` → `REACT_APP_DEALERSHIP=New Hampshire Chevrolet`
- Any URL defaults pointing at `quirk-backend-production.up.railway.app` → replace with the placeholder `REPLACE_ME_BACKEND_URL` and add a comment: `# Set to your deployed backend URL, e.g. https://your-api.example.com/api/v1`

### Task 3.4: Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile`)

Replace only comments or LABEL lines containing `Quirk`. Do not change `WORKDIR`, `EXPOSE`, `CMD`, `ENTRYPOINT`, `COPY`, `RUN`, or any build step. Example:

```
# Before: # Quirk AI Kiosk - Backend Dockerfile
# After:  # NH Chevy Showroom Kiosk - Backend Dockerfile
```

### Task 3.5: `scripts/generate-lock-files.sh` and `scripts/verify-deployment.sh`

Replace:
- Comment headers mentioning Quirk → NH Chevy Showroom Kiosk
- Any echo'd strings mentioning Quirk → corresponding new strings
- URL probes pointing at `quirk-backend-production.up.railway.app` → derive from an env var `BACKEND_URL` with a default of `http://localhost:8000`. If the script has no structure for this, leave the URL as a placeholder variable `${BACKEND_URL:-http://localhost:8000}` and document.

### Verification (Phase 3)

```bash
grep -rn "quirk\|Quirk\|QUIRK" docker-compose.yml backend/.env.* frontend/.env.* backend/Dockerfile frontend/Dockerfile scripts/
# expect zero matches
docker-compose config > /dev/null && echo "compose OK"
```

### Commit (one per sub-task — five commits total in Phase 3)

Commit in this order: 3.1 → 3.2 → 3.3 → 3.4 → 3.5. Each commit message of the form:

```
rebrand(config): <one-line summary>

<what changed, why it's safe, what did not change>
```

Do not proceed to Phase 4 until `docker-compose config` validates and all 3.x verifications show zero matches.

---

## PHASE 4: Backend logger names + module docstrings (mechanical)

This phase is large in file count but mechanical: a rename of the logger root. ~30 Python files, mostly one or two lines each.

### Task 4.1: Identify all logger declarations

```bash
grep -rn 'logging.getLogger("quirk_' backend/app/ backend/ai_service/ | wc -l
grep -rn 'logging.getLogger("quirk_' backend/app/ backend/ai_service/
```

Expect output resembling:
```
backend/app/main.py:46:logger = logging.getLogger("quirk_kiosk")
backend/app/core/cache.py:19:logger = logging.getLogger("quirk_kiosk.cache")
...
```

### Task 4.2: Logger name mapping

| Old prefix | New prefix |
|---|---|
| `quirk_kiosk` | `showroom_kiosk` |
| `quirk_ai` | `showroom_kiosk.ai` |

Rationale: consolidate under a single root (`showroom_kiosk`) with `.ai` as a sub-logger, which is more conventional Python logging. If you believe this consolidation causes a log-filter regression, abort and ask — but in practice these loggers are all configured through the same root handler, so sub-naming is cosmetic.

### Task 4.3: Execute the logger rename

Edit each file's `logging.getLogger(...)` line. In the same pass, update the file's top-of-file module docstring where it says `Quirk AI Kiosk - <component>`:

```python
# Before:
"""Quirk AI Kiosk - Caching Layer"""
logger = logging.getLogger("quirk_kiosk.cache")

# After:
"""NH Chevy Showroom Kiosk - Caching Layer"""
logger = logging.getLogger("showroom_kiosk.cache")
```

Files in scope (non-exhaustive — use the grep output from 4.1 as authoritative):
- `backend/app/main.py`, `backend/app/__init__.py`, `backend/app/database.py`
- `backend/app/core/{cache,security,logging,auth,middleware,settings,exceptions,dependencies,recommendation_engine}.py`
- `backend/app/ai/{helpers,prompts,tool_executor,tools,__init__}.py`
- `backend/app/routers/{ai_v3,auth,leads,photo_analysis,recommendations_v2,smart_recommendations,traffic,worksheet}.py`
- `backend/app/services/{budget_calculator,conversation_state,lead_scoring,notifications,outcome_tracker,payment_calculator,smart_recommendations,vehicle_normalizer,vehicle_retriever,worksheet_service,__init__}.py`
- `backend/app/models/worksheet.py`
- `ai_service/predictor/{__init__,server}.py`

**Split strategy:** the two-file-per-session rule is suspended for this mechanical pass — logger rename is a single conceptual change. Edit in batches of ~8 files per commit, grouped by package (core, routers, services, ai, models, ai_service). This produces ~5 commits in Phase 4.

### Task 4.4: Don't touch — explicit list

- `backend/app/routers/worksheet.py` line containing `doc_fee: float = 599  # Quirk standard` — the comment references Quirk standard, change to `# Dealership standard`. This is the only inline business-logic comment that needs the word removed.
- Any variable, function, class, API route, or database table name. Loggers and docstrings only.

### Verification (Phase 4)

```bash
grep -rn "quirk" backend/ ai_service/ --include="*.py" | grep -v "test_"
# Expect zero matches. Test files are handled in Phase 8.
cd backend && pytest tests/ -v --tb=short 2>&1 | tail -30
# All tests still pass — loggers are not asserted on
```

If a test fails because it imports from `quirk_kiosk`-named logger indirectly, that's a Phase 8 concern — note it but do not fix in this commit.

### Commits (Phase 4)

5 commits, one per package batch:

```
rebrand(backend): rename loggers + docstrings in app/core/
rebrand(backend): rename loggers + docstrings in app/routers/
rebrand(backend): rename loggers + docstrings in app/services/
rebrand(backend): rename loggers + docstrings in app/ai/ + top-level
rebrand(backend): rename loggers + docstrings in ai_service/
```

---

## PHASE 5: Backend AI prompts and user-facing strings

**High risk. The system prompt drives every AI interaction.** Read the current prompt in full before editing.

### Task 5.1: `backend/app/ai/prompts.py` — the system prompt

Open the file. Locate `SYSTEM_PROMPT_TEMPLATE`. It begins:

> `"You are a knowledgeable, friendly AI sales assistant on an interactive kiosk INSIDE the Quirk Chevrolet showroom. The customer is standing in front of you RIGHT NOW."`

Replace **Quirk Chevrolet** with **New Hampshire Chevrolet** in every occurrence in this file. Leave every other word of the prompt untouched — voice rules, conversation heuristics, formatting directives, model decoder references, tool-calling guidance, the "customer is in-store" rule. Read the full file and confirm there are no second-order references to Quirk (e.g., sample responses that say "at Quirk we...") before committing.

### Task 5.2: `backend/app/main.py` — API title, description, service name

```python
# Before:
title="Quirk AI Kiosk API",
description="AI-powered vehicle recommendation and customer interaction system for Quirk Auto Dealers",
...
"service": "Quirk AI Kiosk API",
...
"service": "quirk-kiosk-api",

# After:
title="NH Chevy Showroom Kiosk API",
description="AI-powered vehicle recommendation and customer interaction system for a New Hampshire Chevrolet dealership",
...
"service": "NH Chevy Showroom Kiosk API",
...
"service": "showroom-kiosk-api",
```

Also update any log lines: `logger.info("Quirk AI Kiosk API starting...")` → `logger.info("NH Chevy Showroom Kiosk API starting...")`.

### Task 5.3: `backend/app/core/settings.py` — CORS defaults

The current CORS default list contains five `quirk-*` Railway/Netlify/Vercel URLs. **Remove all five.** The default list should be reduced to just the local-dev entries:

```python
# Default CORS origins — production origins must be supplied via CORS_ORIGINS env var
DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
]
```

Add an inline comment explaining that production deployments must set `CORS_ORIGINS`. This is a security hardening as much as a rebrand step — defaulting CORS to old infrastructure that Michael no longer owns is actively dangerous.

### Task 5.4: `backend/app/routers/worksheet.py` — doc fee comment

Change the `# Quirk standard` comment as noted in Task 4.4 if not already caught. This line is included here for redundancy.

### Verification (Phase 5)

```bash
grep -rn "quirk\|Quirk\|QUIRK" backend/app/ --include="*.py"
# Expect zero
cd backend && pytest tests/ -v --tb=short 2>&1 | tail -30
# Some tests will fail here — test_api_integration.py and test_api_endpoints.py assert
# data["service"] == "Quirk AI Kiosk API". Those are fixed in Phase 8.
# Note the failing test names and do not fix them in this phase.
```

### Commits (Phase 5)

4 commits, one per sub-task:

```
rebrand(ai): update SYSTEM_PROMPT_TEMPLATE dealership reference
rebrand(backend): update FastAPI app title, description, service name
rebrand(backend): remove old production URLs from CORS defaults
rebrand(backend): generalize "Quirk standard" doc fee comment
```

---

## PHASE 6: Frontend design tokens and CSS custom properties

Must precede component edits — components import these tokens.

### Task 6.1: `frontend/src/styles/tokens.ts` — token key rename

| Old | New |
|---|---|
| `quirkBlue: '#0077b6'` | `brandBlue: '#0077b6'` |
| `quirkBlueDark: '#005a8c'` | `brandBlueDark: '#005a8c'` |
| `quirkGold: '#D1AD57'` | `brandGold: '#D1AD57'` |

Hex values do not change.

### Task 6.2: `frontend/src/styles/theme.ts`

Check for any token keys named `quirk*`. If present, apply the same rename (`quirkX` → `brandX`).

### Task 6.3: `frontend/src/index.css` — CSS custom properties

| Old | New |
|---|---|
| `--quirk-green: #22c55e;` | `--brand-green: #22c55e;` |
| `--quirk-green-light: #22c55e;` | `--brand-green-light: #22c55e;` |
| `--quirk-green-dark: #15803d;` | `--brand-green-dark: #15803d;` |
| `--quirk-green-glow: rgba(34, 197, 94, 0.4);` | `--brand-green-glow: rgba(34, 197, 94, 0.4);` |

Every `var(--quirk-green*)` call site in the same file must be updated to `var(--brand-green*)`. There are ~9 such call sites in `index.css`.

### Task 6.4: Audit all `colors.quirkBlue` / `colors.quirkGold` / `colors.quirkBlueDark` imports

```bash
grep -rn "colors\.quirk" frontend/src/
```

Expect output across AIAssistant, KioskApp, and possibly other component style files. Each match must become `colors.brand*`. This is a mechanical rename across the files — edit each file in-place. Do not reorder imports or refactor anything else.

**Files typically affected:**
- `frontend/src/components/AIAssistant/styles.ts` (~15 references per the earlier grep)
- `frontend/src/components/KioskApp.tsx`
- Any other file surfaced by the grep above

**Split strategy:** one commit per file, two files per session per the standing discipline.

### Verification (Phase 6)

```bash
grep -rn "quirk" frontend/src/styles/ frontend/src/index.css   # zero
grep -rn "colors\.quirk\|--quirk" frontend/src/   # zero
cd frontend && npx tsc --noEmit 2>&1 | tail -20   # no type errors
cd frontend && npm test -- --ci --watchAll=false --passWithNoTests 2>&1 | tail -20
# Tests may still fail on assertion content — but should not fail on type errors
```

### Commits (Phase 6)

- One commit for `tokens.ts` + `theme.ts` (design system source of truth)
- One commit for `index.css` (CSS custom properties)
- One commit per file for the style-import rename

Typical commit count: 4–6.

---

## PHASE 7: Frontend components — user-facing copy

**The highest-touch phase.** 16 component files contain user-visible Quirk references. Two-file-per-session discipline is strict here; do not exceed it.

### Task 7.1: File list and session batching

Process in this order. Each row = one commit.

| Session | Files | What changes |
|---|---|---|
| 7.1.a | `WelcomeScreen.tsx`, `Header.tsx` (if present) | Greeting text, dealership name in copy |
| 7.1.b | `KioskApp.tsx`, `Screensaver.tsx` | `<span>QUIRK</span>` → `<span>NH CHEVY</span>`; `Quirk Chevrolet` → `New Hampshire Chevrolet`; style key `logoQuirk` → `logoBrand` |
| 7.1.c | `AIAssistant/constants.ts`, `AIAssistant/styles.ts` | Self-reference strings; any remaining `quirk` identifier |
| 7.1.d | `CustomerHandoff.tsx`, `LeadForm.tsx` | "A Quirk team member..." → "A team member..."; lead-form header text |
| 7.1.e | `GoogleReviews.tsx` | Mock review text mentions "Quirk". Replace with "the dealership" or "New Hampshire Chevrolet" where it fits naturally. **Do not reword the review** — only substitute the dealership name. Example: "The team at Quirk went above and beyond" → "The team at New Hampshire Chevrolet went above and beyond." |
| 7.1.f | `QRCodeModal.tsx` | `QUIRK CHEVROLET` header → `NEW HAMPSHIRE CHEVROLET`; `Quirk Chevrolet • Manchester, NH • quirkchevynh.com` → `New Hampshire Chevrolet • Manchester, NH • example.com`; `baseUrl = 'https://quirkchevynh.com/inventory'` → `baseUrl = process.env.REACT_APP_INVENTORY_URL ?? 'https://example.com/inventory'` and add a TODO comment |
| 7.1.g | `InventoryResults.tsx`, `InventorySyncDashboard.tsx` | Module docstring comments; `title="View on QuirkChevyNH.com"` → `title="View on dealership inventory site"` |
| 7.1.h | `TradeInEstimator.tsx`, `InstantCashOffer.tsx` | Module docstring comments only |
| 7.1.i | `VehicleDetail.tsx`, `MarketValueTrends.tsx` | Module docstring comments only |
| 7.1.j | `DigitalWorksheet.tsx` | `DEFAULT_API_URL = process.env.REACT_APP_API_URL \|\| 'https://quirk-backend-production.up.railway.app'` → change the fallback to `'http://localhost:8000/api/v1'` |
| 7.1.k | `SalesManagerDashboard/*.tsx`, `SalesManagerDashboard/constants.ts` | Any Quirk references in manager-facing copy |
| 7.1.l | `VINScanner.tsx`, `Useapi.tsx`, `modelBudgetSelectorStyles.ts` | Residual references surfaced by grep |
| 7.1.m | `frontend/public/manifest.json`, `frontend/public/index.html` | PWA manifest: `short_name`, `name`, `description`, `title`, `meta description` |

### Task 7.2: Style-key rename subtlety

`Screensaver.tsx` defines a style key `logoQuirk` at line ~121 and uses it at line ~31 as `styles.logoQuirk`. Both must change to `logoBrand` in the same edit. Verify with:

```bash
grep -n "logoQuirk" frontend/src/components/Screensaver.tsx   # must return zero after edit
```

Similar pattern for `KioskApp.tsx` if `styles.logoQuirk` or `styles.logoText` is used — check and rename consistently.

### Task 7.3: The `quirkPrice*` style keys

`InventoryResults.tsx` and possibly `VehicleCard.tsx` use style keys `quirkPrice`, `quirkPriceLabel`, `quirkPriceRow`, `quirkPriceValue`. These are the "dealership discounted price" block. Rename:

| Old | New |
|---|---|
| `quirkPrice` | `dealerPrice` |
| `quirkPriceLabel` | `dealerPriceLabel` |
| `quirkPriceRow` | `dealerPriceRow` |
| `quirkPriceValue` | `dealerPriceValue` |

Within each affected file: rename the style definition and every call site.

### Task 7.4: Per-file verification

After every session in Task 7.1, run:

```bash
cd frontend && npx tsc --noEmit 2>&1 | tail -5
cd frontend && npm test -- --ci --watchAll=false --passWithNoTests --testPathPattern="<edited-file-basename>" 2>&1 | tail -15
```

If the test pattern fails because a test asserts on old copy, **do not fix the test here.** Note it for Phase 8. Continue only if the failure is limited to string-assertion mismatches. If the failure is a type error or runtime error, stop and fix before committing.

### Commits (Phase 7)

One commit per session (13 commits). Commit message template:

```
rebrand(frontend): <component-area> copy + identifiers

<files changed>
<what did and did not change>
```

---

## PHASE 8: Tests — assertions and fixtures

Tests were intentionally not updated earlier. Now they must be, or the suite stays red.

### Task 8.1: Backend tests

Files:
- `backend/tests/test_api_integration.py` — line 52: `assert data["service"] == "Quirk AI Kiosk API"` → `"NH Chevy Showroom Kiosk API"`
- `backend/tests/test_api_endpoints.py` — line 132: same change
- `backend/tests/test_ai_router.py` — line 11: delete the `sys.path.insert` line entirely. It hardcodes a GitHub Actions runner path. Add a proper `conftest.py` at `backend/tests/conftest.py` with:
  ```python
  import sys
  from pathlib import Path
  sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
  ```
  Only create this file if it does not already exist.
- `backend/tests/test_traffic.py` — line 14: same treatment as `test_ai_router.py`. If `conftest.py` was created in the previous step, just delete the `sys.path.insert` from this file.

Run after:
```bash
cd backend && pytest tests/ -v --tb=short 2>&1 | tail -30
```
Must be green.

### Task 8.2: Frontend unit tests

Files:
- `frontend/src/__tests__/WelcomeScreen.test.tsx` — update assertions from `/Quirk AI/i`, `/Welcome to Quirk Chevrolet/i`, `/Chat with Quirk AI/i` to match the new copy (`/Showroom AI/i`, `/Welcome to New Hampshire Chevrolet/i`, `/Chat with Showroom AI/i`). Preserve the surrounding `describe`/`test` structure exactly.
- `frontend/src/__tests__/KioskApp.test.tsx` — update every `screen.getByText('QUIRK')` to `screen.getByText('NH CHEVY')`; every `'Quirk Chevrolet'` to `'New Hampshire Chevrolet'`.

Run after:
```bash
cd frontend && npm test -- --ci --watchAll=false 2>&1 | tail -30
```
Must be green.

### Task 8.3: E2E tests (Playwright)

- `frontend/e2e/smoke.spec.ts`
- `frontend/e2e/kiosk-flow.spec.ts`

Rebrand references in `describe` block names, `getByText()` calls, and `locator('header').getByText('QUIRK')` lookups. Same rename convention as unit tests.

**Do not run Playwright here** — E2E requires a live app, which is a Phase 10 concern. Type-check only:

```bash
cd frontend && npx tsc --noEmit
```

### Commits (Phase 8)

3 commits: backend tests, frontend unit tests, E2E tests.

---

## PHASE 9: Docs, CLAUDE.md, doc file rename

The app is rebranded. Now documentation catches up.

### Task 9.1: `README.md` — full body

Phase 2 handled the top ~40 lines. Now process the rest. Replace:
- Every `Quirk` / `quirk` → `New Hampshire Chevrolet` / `nh-chevy-showroom-kiosk` as appropriate to context
- Slack channel `#chevynh-sales-kiosk` → `#showroom-kiosk-alerts` (example channel name)
- Backend URL references → `REPLACE_ME_BACKEND_URL` placeholder with a TODO note
- `Quirk Auto Dealers` → `the dealership` where it reads naturally; otherwise `New Hampshire Chevrolet`

### Task 9.2: `CLAUDE.md`

Same treatment as README. Additionally:
- The "CRITICAL RULES" list item mentioning the backend URL must update the placeholder as above
- Slack channel mention → updated
- The "Preserve `searchInventory()`" rule — unchanged
- The "Admin Login link" rule — unchanged

### Task 9.3: `docs/` directory

Files:
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT.md`
- `docs/quirk-kiosk-A-grade-remaining-fixes-guide.md` — **rename this file** to `docs/a-grade-remaining-fixes-guide.md` using `git mv`, then edit content.

### Task 9.4: `backend/docs/API.md` and `backend/INTELLIGENT_AI_UPGRADE.md`

Standard copy replacement. No file renames here.

### Verification (Phase 9)

```bash
grep -rn "quirk\|Quirk\|QUIRK\|chevynh\|ChevyNH" . \
  --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=build \
  --exclude-dir=dist --exclude-dir=__pycache__ --exclude-dir=.venv \
  --exclude="*.lock" --exclude="package-lock.json"
# Expect zero output. If any lines appear, they are the punch list.
```

### Commits (Phase 9)

One commit per file or closely-coupled file pair. Typical count: 5–6.

---

## PHASE 10: Final verification

### Task 10.1: Greps (the success criteria)

```bash
grep -ri "quirk" . \
  --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=build \
  --exclude-dir=dist --exclude-dir=__pycache__ --exclude-dir=.venv \
  --exclude="*.lock" --exclude="package-lock.json"
# MUST be empty

grep -ri "chevynh" . \
  --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=build \
  --exclude-dir=dist --exclude-dir=__pycache__ --exclude-dir=.venv
# MUST be empty
```

If either produces output, open each match, fix, and commit (one file per commit) before proceeding.

### Task 10.2: Backend typecheck and tests

```bash
cd backend && pytest tests/ -v --tb=short
# All tests green

cd backend && python -c "from app.main import app; print('import OK')"
# No import errors
```

### Task 10.3: Frontend typecheck, tests, and build

```bash
cd frontend && npx tsc --noEmit
cd frontend && npm test -- --ci --watchAll=false
cd frontend && npm run build
# All three exit 0
```

### Task 10.4: Docker validation

```bash
docker-compose config > /dev/null && echo "compose OK"
# docker-compose up is not required — config validation is sufficient for this rebrand
```

### Task 10.5: Manual eyeball

```bash
cd frontend && npm start &
# Open http://localhost:3000
# Confirm visually:
#   - Header logo reads "NH CHEVY"
#   - Dealership line reads "New Hampshire Chevrolet"
#   - AI greeting does not say "Quirk"
#   - Welcome screen headings look right
# Stop the dev server.
```

### Task 10.6: Commit manifest

Final sanity check — ensure every commit in the rebrand branch is prefixed `rebrand(...)`:

```bash
git log --oneline main..HEAD | grep -v "^[a-f0-9]* rebrand"
# Should be empty — every commit on this branch is a rebrand commit
```

### Task 10.7: Open the PR

PR title: `Rebrand: Quirk AI Kiosk → NH Chevy Showroom Kiosk`

PR description template:

```markdown
## Summary
Rebrands the former "Quirk AI Kiosk" to "New Hampshire Chevrolet Sales Showroom Kiosk." All Quirk references have been removed from code, docs, tests, config, and comments. Chevrolet product branding is retained.

## Scope
- 92 files touched across 10 phases
- ~296 `quirk` references removed + a handful of `chevynh` domain/channel references
- No feature work, no refactors, no unrelated fixes

## Verification
- [x] `grep -ri "quirk" .` returns zero
- [x] `grep -ri "chevynh" .` returns zero
- [x] `pytest tests/ -v` passes
- [x] `npm test` passes
- [x] `npm run build` succeeds
- [x] `npx tsc --noEmit` clean
- [x] `docker-compose config` validates
- [x] Manual spot check at localhost:3000

## External coordination required (not in this PR)
- Rename GitHub repo `quirk-ai-kiosk` → `nh-chevy-showroom-kiosk`
- Update any deployed backend/frontend URLs in your own environment's `.env` files
- Reconfigure Slack channel routing if you want a different notification channel
- DNS: the old `quirkchevynh.com` QR link is now a placeholder `example.com` — point to a real domain when available
```

---

## Appendix A: Failure modes and rollback

### A.1 A phase verification fails

Stop. Do not proceed. Fix the issue. If the fix requires more than ~3 files of edits or changes a decision in this plan, stop and surface the issue rather than improvising.

### A.2 A downstream phase reveals an upstream mistake

Example: Phase 7 reveals that a component imports a token that Phase 6 renamed incorrectly. Fix in place on the Phase 7 branch, commit with a message prefix `rebrand(fix):`. Do not rebase Phase 6.

### A.3 Full rollback

```bash
git checkout main
git branch -D rebrand/nh-chevy-showroom-kiosk
```

The rebrand branch is never merged until Phase 10 verification is clean. There is no partial-rebrand intermediate state on main.

---

## Appendix B: Things this plan intentionally does not do

- **Does not rename API routes or database table names.** Those are consumer-facing contracts. A rebrand is the wrong time to change them.
- **Does not update the Sentry / observability project names.** Those are operational configurations and should be updated in the deploy environment, not code.
- **Does not touch any of the GM model decoder logic, `colorKeywords`, or `modelKeywords` maps.** Those are product logic, not branding.
- **Does not introduce a design system refactor.** The discussion about rebuilding a `nh-chevy-design` skill on the VeriFlow pattern is a separate piece of work.
- **Does not update deployment infrastructure** (Railway project names, Netlify site names, DNS). Those live outside the repo and are the user's responsibility after merge.
- **Does not rename component file paths.** `KioskApp.tsx` stays `KioskApp.tsx`; only its contents change. Renaming files compounds diff review complexity with no product benefit.

---

## Appendix C: Quick-reference replacement table

When in doubt, consult this. If a string isn't listed, pause and ask.

| Context | Find | Replace |
|---|---|---|
| Display brand (uppercase) | `QUIRK` | `NH CHEVY` |
| Proper noun in copy | `Quirk Chevrolet` | `New Hampshire Chevrolet` |
| Proper noun (generic) | `Quirk Auto Dealers` | `the dealership` (or `New Hampshire Chevrolet` if specific) |
| Product name | `Quirk AI Kiosk` | `NH Chevy Showroom Kiosk` |
| AI self-reference | `Quirk AI` | `Showroom AI` |
| Package/repo slug | `quirk-ai-kiosk` | `nh-chevy-showroom-kiosk` |
| Python logger root | `quirk_kiosk` | `showroom_kiosk` |
| Python logger ai | `quirk_ai` | `showroom_kiosk.ai` |
| Docker network | `quirk-network` / `quirk-ai-network` | `showroom-network` / `showroom-kiosk-network` |
| Container prefix | `quirk-kiosk-` | `showroom-kiosk-` |
| Service header | `quirk-kiosk-api` | `showroom-kiosk-api` |
| TypeScript token | `quirkBlue`, `quirkGold`, `quirkBlueDark` | `brandBlue`, `brandGold`, `brandBlueDark` |
| CSS custom property | `--quirk-green*` | `--brand-green*` |
| Style key | `logoQuirk` | `logoBrand` |
| Style key | `quirkPrice*` | `dealerPrice*` |
| Old backend URL | `quirk-backend-production.up.railway.app` | `REPLACE_ME_BACKEND_URL` (env examples) or `http://localhost:8000/api/v1` (dev defaults) |
| Old frontend URLs | `quirk-*.netlify.app`, `.vercel.app`, `.railway.app` | remove entirely |
| Old dealership site | `quirkchevynh.com` | `example.com` + TODO |
| Slack channel | `#chevynh-sales-kiosk` | `#showroom-kiosk-alerts` (docs only) |
| Doc filename | `quirk-kiosk-A-grade-remaining-fixes-guide.md` | `a-grade-remaining-fixes-guide.md` |

---

*End of plan. Execute Phase 1.*
