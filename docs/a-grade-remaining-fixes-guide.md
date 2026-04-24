# NH Chevy Showroom Kiosk A-Grade Remaining Fixes Guide

## Purpose

This document is an instruction manual for **Claude Code** to raise the current state of the NH Chevy Showroom Kiosk repo from roughly **B+** to **A / A- production quality**.

It is based on:
- direct review of the updated repo
- comparison against the prior repo review
- the remaining weaknesses identified after the recent improvements
- the owner's feedback in this conversation

This guide is **not** asking for a rewrite.
It is asking for a **careful hardening pass** with emphasis on:
- predictable production behavior
- maintainability
- operational clarity
- low-risk refactoring

## Important constraints from the owner

Claude Code must follow these constraints while making changes:

1. **Do not address the admin/auth observation in this phase.**
   - Do not spend time redesigning admin access, admin endpoint protection, or related authorization policy.
   - Treat that work as intentionally deferred.

2. **Do not perform a risky rewrite of `ai_v3.py`.**
   - The owner is specifically concerned about destabilizing AI behavior.
   - `ai_v3.py` is not merely a random large file to cut apart aggressively.
   - The prior guidance was to treat it as the orchestration/controller layer for AI flow, not the single source of business knowledge.
   - Only make low-risk, behavior-preserving extractions if absolutely necessary.

3. **Do not force `conversation_state.py` and `api.ts` into the same refactor as `ai_v3.py`.**
   - They do not have to move together.
   - Evaluate them independently by responsibility.

4. **Preserve the current daily inventory upload workflow.**
   - The owner uploads an inventory spreadsheet daily.
   - That workflow is acceptable for now.
   - Changes should improve reliability and validation around that process, not replace it with an entirely different ingestion model.

5. **Do not write flashy or speculative architecture.**
   - Favor practical, durable, traditional engineering choices.
   - The goal is to make the current system trustworthy, not trendy.

---

## Current assessment

The repo improved meaningfully after the last round of changes. Major wins already landed:
- version alignment across Dockerfiles and docs
- better inventory parsing with header-aware validation
- stricter production startup/readiness behavior
- a low-risk extraction from `ai_v3.py`
- better documentation and test coverage around inventory parsing

The repo is now much closer to production quality, but the following issues still hold it back from an A-grade evaluation:

1. **Too much fallback complexity remains in core behavior**
2. **`conversation_state.py` is still too large and multi-purpose**
3. **`frontend/src/components/api.ts` is still too large**
4. **Several frontend components remain oversized and hard to maintain**
5. **CI enforcement is still too soft in places**
6. **The settings/runtime policy still feels transitional instead of fully crisp**

These are the remaining issues this guide addresses.

---

## Success criteria

Claude Code should consider this effort successful only if the repo ends in a state where:

- production behavior is more deterministic and less dependent on silent fallback paths
- large files are reduced by extracting responsibilities, not by scattering logic randomly
- frontend service/API code is easier to reason about
- the biggest UI components are simpler and more modular
- CI catches more real problems instead of merely reporting them
- settings and startup policy are easier to understand and harder to misconfigure
- existing behavior remains stable
- inventory upload workflow continues to work cleanly

Claude Code should preserve or improve existing tests and add targeted tests when moving responsibilities.

---

# 1. Reduce fallback complexity in production behavior

## Why this matters

This is the biggest remaining blocker to an A-grade evaluation.

The repo still carries too many fallback paths in or near core runtime behavior, including variations of:
- JSON/file-based persistence
- in-memory cache fallbacks
- degraded AI fallback behavior
- legacy disk persistence paths in conversation state handling

Fallbacks are not inherently bad, but they become dangerous when production behavior can drift into them too easily, too quietly, or too inconsistently.

The repo already made progress by tightening readiness and startup rules. The next step is to make production behavior **cleaner and more explicit**.

## Instructions for Claude Code

### Objective
Make production runtime paths more deterministic without breaking development convenience.

### Required approach

1. **Map all fallback paths first before changing them.**
   - Identify every place where the system can fall back from a preferred dependency to a secondary storage/cache/runtime behavior.
   - Document those paths in a short internal note or comment structure.
   - Separate them into:
     - development-only fallback
     - test-only fallback
     - acceptable production degradation
     - unacceptable production fallback

2. **Restrict production to a single clear path wherever possible.**
   - In production, prefer one authoritative persistence path and one authoritative cache path.
   - Do not allow production to silently drift into “temporary” fallback mechanisms unless they are explicitly intended and clearly observable.

3. **Make development and production policy unmistakably different.**
   - Development may keep convenience fallbacks.
   - Production should either:
     - start cleanly on required infrastructure, or
     - fail with clear diagnostics
   - Avoid ambiguous “warn and continue” logic for core dependencies in production.

4. **Keep fallback code only where it still serves a valid purpose.**
   - Remove dead or legacy fallback branches that are no longer needed after recent improvements.
   - If a fallback remains, annotate its intended environment and rationale clearly.

5. **Improve observability around any remaining fallback behavior.**
   - If the application ever enters a degraded mode outside development, logs should make that unmistakable.
   - Readiness/health reporting should reflect that state appropriately.

### Acceptance criteria

- Production behavior no longer depends on silent fallback mechanisms for core persistence/cache behavior.
- Development still works locally without excessive friction.
- Remaining fallback logic is clearly categorized and justified.
- Startup, readiness, and logs consistently reflect runtime mode.

### Things Claude Code must avoid

- Do not remove useful local development ergonomics without replacing them thoughtfully.
- Do not introduce a breaking infrastructure dependency without aligning startup/readiness behavior.
- Do not create a tangle of environment flags that is harder to understand than the current setup.

---

# 2. Refactor `conversation_state.py` carefully

## Why this matters

`conversation_state.py` remains one of the largest and most responsibility-heavy files in the repo.

It appears to combine multiple concerns such as:
- session lifecycle and state mutation
- persistence/cache interaction
- phone/session lookup
- cleanup/index maintenance
- compatibility or legacy persistence behavior

This is a maintainability issue, but it is also a reliability issue because concentrated complexity becomes fragile over time.

The owner does **not** want a risky rewrite. That concern is valid.

## Instructions for Claude Code

### Objective
Reduce complexity in `conversation_state.py` by extracting responsibilities into clearer modules while preserving current behavior.

### Required approach

1. **Do not rewrite the state model from scratch.**
   - Preserve existing behavior and data flow.
   - Refactor by extraction, not reinvention.

2. **First identify responsibility boundaries inside the file.**
   Claude Code should separate at least these logical areas:
   - state/session lifecycle management
   - persistence adapter behavior
   - lookup/index helpers
   - cleanup/retention behavior
   - compatibility/legacy behavior

3. **Extract helper modules or service collaborators with stable interfaces.**
   - The main goal is to reduce the file’s responsibility density.
   - Keep the public behavior stable.
   - Favor a small number of meaningful modules rather than many tiny files.

4. **Keep the central orchestration layer readable.**
   - After extraction, there should still be an easy-to-follow central service entry point.
   - Do not scatter logic so widely that future debugging becomes harder.

5. **Preserve state semantics exactly unless a bug is proven.**
   - The refactor should be behavior-preserving.
   - If Claude Code discovers a bug, fix it deliberately and document it in the change summary.

6. **Add or strengthen targeted tests around extracted responsibilities.**
   - Especially for session retrieval, persistence decisions, lookup behavior, and cleanup behavior.

### Acceptance criteria

- `conversation_state.py` is materially smaller and more focused.
- Extracted modules have clear responsibility boundaries.
- Existing state behavior remains intact.
- Tests cover the moved logic adequately.

### Things Claude Code must avoid

- Do not couple this refactor to `ai_v3.py` unless truly necessary.
- Do not redesign how memory/state works at the product level.
- Do not introduce a new abstraction layer unless it clearly simplifies maintenance.

---

# 3. Break up `frontend/src/components/api.ts`

## Why this matters

`api.ts` is still oversized and handling too many frontend-to-backend concerns in one place.

This is not the same as the AI knowledge problem. It is a frontend maintainability problem.

The goal is not to be clever. The goal is to make it obvious where each request path lives.

## Instructions for Claude Code

### Objective
Split the frontend API layer by business concern so it is easier to maintain and safer to extend.

### Required approach

1. **Identify natural service boundaries inside the current file.**
   The likely categories include:
   - chat/AI
   - inventory
   - worksheet/deal desk functionality
   - analytics/traffic/logging
   - shared request helpers and types

2. **Extract service modules by concern.**
   - Each module should own a coherent slice of API behavior.
   - Shared request handling should move to a small common utility layer.
   - Shared types should live where they can be reused cleanly.

3. **Preserve frontend call signatures where practical.**
   - Avoid creating unnecessary churn across the component tree.
   - If the exported API surface changes, keep the migration straightforward.

4. **Reduce cross-concern coupling.**
   - Inventory calls should not live beside analytics concerns unless they share real infrastructure.
   - Keep each module’s responsibility obvious.

5. **Keep naming plain and durable.**
   - Do not introduce confusing service naming, excessive wrappers, or pseudo-enterprise patterns.

### Acceptance criteria

- `api.ts` is no longer a single oversized catch-all file.
- The new API layer is organized by concern.
- Frontend call sites remain understandable and stable.
- Request utilities and shared types are centralized sensibly.

### Things Claude Code must avoid

- Do not turn the frontend API layer into a maze of tiny files.
- Do not mix unrelated concerns into a generic “utils” dumping ground.
- Do not change behavior just for style.

---

# 4. Reduce the size and complexity of the largest frontend components

## Why this matters

The repo still has several very large React components, including inventory and comparison-related UI files.
These large files make future feature work slower and increase the odds of regression.

This is not about aesthetics. It is about keeping the UI understandable.

## Instructions for Claude Code

### Objective
Refactor the largest frontend components into smaller, well-named presentation and helper units without changing user-visible behavior.

### Required approach

1. **Target the biggest components first.**
   Prioritize components like:
   - inventory results rendering
   - vehicle comparison rendering
   - any other component still carrying too much display logic, formatting, filtering, and event handling in one file

2. **Extract by responsibility, not by arbitrary line count.**
   Good extraction targets include:
   - presentational row/card components
   - display/formatting helpers
   - comparison table sections
   - filter/sort UI subcomponents
   - reusable rendering primitives

3. **Keep parent components as orchestrators.**
   - Parent files should coordinate state and composition.
   - Child components should handle focused rendering concerns.

4. **Avoid over-fragmentation.**
   - Do not create dozens of tiny files that obscure the feature structure.
   - Favor a few meaningful subcomponents and helpers per feature.

5. **Preserve behavior and visual output.**
   - This is a structural refactor, not a redesign.
   - Keep props clear and narrow.

6. **Strengthen tests if component extraction touches important behavior.**
   - Especially for comparison logic, filtering behavior, and result rendering.

### Acceptance criteria

- Largest frontend components are materially smaller.
- UI logic is easier to follow by feature area.
- Parent/child responsibilities are clearer.
- Existing behavior remains stable.

### Things Claude Code must avoid

- Do not redesign the product UX during this task.
- Do not introduce a complicated state-management change just to split a file.
- Do not extract trivial one-use components unless they clearly improve readability.

---

# 5. Tighten CI enforcement gradually but meaningfully

## Why this matters

The repo’s CI/CD story is already decent, but some important checks still use soft enforcement such as `continue-on-error`.

That keeps the pipeline informative, but not fully trustworthy.
An A-grade repo should move toward a state where important quality gates actually gate.

## Instructions for Claude Code

### Objective
Make CI more authoritative without causing unnecessary pipeline instability.

### Required approach

1. **Audit all current soft-fail checks.**
   - Identify which jobs or steps currently report problems without blocking merges/deploys.
   - Categorize them as:
     - safe to make blocking now
     - needs cleanup before becoming blocking
     - should remain advisory for now

2. **Prioritize lint and correctness checks first.**
   - If a check is consistently actionable and low-noise, it should become a real gate.
   - Security and audit checks may require phased tightening depending on current backlog.

3. **Improve signal before increasing strictness.**
   - If a check is noisy or unreliable, reduce the noise first.
   - Then convert it to blocking.

4. **Document the intended CI policy.**
   - Clarify which checks are advisory versus blocking and why.
   - Reduce ambiguity for future maintainers.

5. **Make deploy gating match production expectations.**
   - Pre-deploy and post-deploy verification should reflect the standards of a production-grade rollout.

### Acceptance criteria

- CI has fewer soft-fail quality gates.
- Blocking checks are sensible and reliable.
- Deploy confidence is improved without making the pipeline brittle.
- CI policy is easier to understand.

### Things Claude Code must avoid

- Do not flip every advisory check to blocking in one reckless pass.
- Do not preserve `continue-on-error` just because it is convenient.
- Do not create a policy that team members cannot realistically maintain.

---

# 6. Make settings and runtime policy more crisp

## Why this matters

The repo has improved production startup/readiness behavior, but the settings/runtime policy still feels transitional in places.

What holds the grade back is not just a specific flag. It is the overall feeling that runtime policy is spread across warnings, environment logic, and fallback behavior in a way that could still confuse future maintainers.

## Instructions for Claude Code

### Objective
Make environment expectations and runtime policy easier to understand, enforce, and operate.

### Required approach

1. **Centralize the policy conceptually.**
   - Ensure there is one clear place where environment/runtime expectations are expressed.
   - Settings should clearly distinguish among development, test, and production expectations.

2. **Reduce “warn and continue” ambiguity for important runtime requirements.**
   - For production-critical dependencies, prefer explicit validation outcomes.
   - A maintainer should be able to read settings/startup behavior and understand what is mandatory.

3. **Align startup, readiness, and settings validation.**
   - These three areas should tell the same story.
   - Avoid contradictions such as settings allowing something that readiness effectively rejects later.

4. **Improve naming and documentation around runtime modes.**
   - Make it obvious which behaviors are development conveniences and which are production expectations.

5. **Keep this policy boring and obvious.**
   - Favor clarity over abstraction.
   - The best result is one future maintainers do not have to interpret creatively.

### Acceptance criteria

- Runtime policy is easier to understand from settings and startup logic.
- Production requirements are explicit.
- Development conveniences are clearly separated from production expectations.
- Readiness, startup, and settings validation are aligned.

### Things Claude Code must avoid

- Do not over-engineer configuration handling.
- Do not introduce a large policy abstraction framework.
- Do not make runtime behavior depend on subtle combinations of flags.

---

# 7. `ai_v3.py` guidance for this phase

## Why this section exists

The owner explicitly raised concern that `ai_v3.py` might be the place where the knowledge they taught the Anthropic API lives.
That concern should shape the approach.

The earlier review concluded:
- `ai_v3.py` is primarily an orchestration/controller layer
- the AI “knowledge” is distributed across prompts, helpers, retrievers, tools, and state/context assembly
- risky refactoring in `ai_v3.py` should be avoided in this phase

## Instructions for Claude Code

### Objective
Avoid unnecessary churn in `ai_v3.py` while keeping the codebase maintainable.

### Required approach

1. **Do not treat `ai_v3.py` as the main problem in this pass.**
   - It is not the highest-value remaining weakness.
   - The repo already took a sensible low-risk step by extracting Anthropic client behavior.

2. **Only extract further if there is a very clear responsibility boundary.**
   Suitable low-risk candidates may include:
   - request/response assembly helpers
   - streaming event formatting
   - tool loop support helpers
   - error translation helpers

3. **Preserve prompt and orchestration behavior.**
   - Any extraction must be behavior-preserving.
   - Do not alter the assistant’s customer-facing response logic unless explicitly required by a bug fix.

4. **Keep the file readable as the orchestrator.**
   - It is acceptable for `ai_v3.py` to remain an orchestrator if supporting responsibilities are moved out gradually.

### Acceptance criteria

- No risky AI behavior regressions are introduced.
- `ai_v3.py` remains stable and understandable.
- Any extraction is limited, justified, and low-risk.

### Things Claude Code must avoid

- Do not do a wholesale rewrite of `ai_v3.py`.
- Do not change prompts or AI behavior just to reduce line count.
- Do not tie this work to the `conversation_state.py` refactor unless truly necessary.

---

# 8. Preserve and strengthen the inventory upload workflow

## Why this section remains important

The owner confirmed that inventory is uploaded daily via spreadsheet.
That workflow is acceptable for now and should remain in place.

The earlier major issue was the parser mismatch against the real spreadsheet shape. That has already improved.
This phase should make sure the workflow remains reliable while the rest of the repo is hardened.

## Instructions for Claude Code

### Objective
Protect the current daily inventory upload path while improving reliability and operational clarity.

### Required approach

1. **Do not replace the daily upload model in this phase.**
   - Keep the current upload-driven workflow.

2. **Preserve compatibility with the known spreadsheet shape.**
   - The parser should continue to handle the current real-world inventory file cleanly.
   - Schema aliasing and validation should remain explicit and tested.

3. **Improve operator feedback where useful.**
   - Upload results, accepted rows, rejected rows, and reasons should be easy to understand.

4. **Ensure inventory ingestion remains covered by tests.**
   - Do not let later refactors accidentally break the working parser.

### Acceptance criteria

- The daily upload workflow continues working.
- Inventory parser behavior remains stable and validated.
- Errors and rejected rows are understandable.

### Things Claude Code must avoid

- Do not redesign inventory around a new sync/integration system in this pass.
- Do not loosen validation just to make uploads “succeed.”

---

# 9. Recommended execution order for Claude Code

Claude Code should perform work in this order unless it finds a compelling repo-specific reason to adjust slightly:

1. **Map and tighten fallback/runtime behavior**
2. **Refactor `conversation_state.py` by extraction**
3. **Split `frontend/src/components/api.ts` by concern**
4. **Refactor the largest frontend components**
5. **Tighten CI enforcement thoughtfully**
6. **Polish settings/runtime policy alignment**
7. **Touch `ai_v3.py` only if a small, safe extraction is obviously beneficial**
8. **Verify inventory upload flow still works cleanly**

This order is intentional:
- reliability and runtime clarity first
- maintainability next
- policy enforcement after structure is cleaner
- AI orchestrator changes last and only if low risk

---

# 10. Testing and validation expectations

Claude Code should not treat refactoring as complete until it validates impact.

## Required validation behavior

1. Run or update the most relevant test suites for each area changed.
2. Add focused tests when responsibilities move.
3. Re-check startup/readiness behavior when runtime policy changes.
4. Re-check the inventory upload flow after backend structural changes.
5. Confirm frontend build/test health after API/component refactors.

## Minimum expectation

Any extracted or reorganized logic must end in a state that is at least as testable as before.

---

# 11. What an A-grade end state looks like

Claude Code should aim for the following practical outcome:

- production runtime behavior is clear, explicit, and not quietly dependent on backup mechanisms
- `conversation_state.py` is no longer a giant multi-purpose file
- `api.ts` is split into clean feature-oriented API modules
- the largest React files are smaller and easier to reason about
- CI quality gates are more real and less advisory
- settings and runtime policy are easy to read and hard to misuse
- `ai_v3.py` remains stable and trustworthy
- daily inventory uploads continue working reliably

If Claude Code achieves that state without introducing regressions, the repo should move much closer to an **A / A-** level evaluation.

---

## Final instruction to Claude Code

Make the repo **more predictable, more maintainable, and more boring in production**.
Do not chase novelty.
Do not chase line-count vanity.
Do not destabilize working AI behavior.

Prioritize the changes that reduce operational risk and future maintenance burden while preserving the owner’s current workflow and product behavior.
