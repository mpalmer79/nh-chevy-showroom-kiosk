# ADR-0004: Hybrid in-memory + Redis + Postgres state storage

**Status:** Accepted
**Date:** 2025-12

## Context

The kiosk has three distinct categories of state with different
access patterns and durability requirements:

1. **Conversation state.** What the customer just said, what entities
   were extracted (budget, trade-in, color preference), which vehicles
   were discussed, what stage of the conversation we're in. High churn,
   accessed every turn, valuable only during the session.
2. **Durable business artifacts.** Worksheets, leads, captured contact
   info, conversation outcomes. Low churn, accessed for analytics and
   staff follow-up after the session ends.
3. **Cache.** Tool results, vehicle detail lookups, payment
   calculations that get reused within and across sessions.

A single storage choice for all three would compromise all three.

## Decision

The kiosk uses three storage tiers:

| Category | L1 | L2 | Durable |
|----------|----|----|---------|
| Conversation state | Python dict (per-process) | Redis | none |
| Business artifacts | none | none | Postgres (or JSON file fallback) |
| Cache | none | Redis | none |

Conversation state lives in `ConversationStateManager`
(`backend/app/services/conversation_state.py`). Worksheets, leads, and
outcomes go to Postgres via SQLAlchemy. The JSON file fallback in
`backend/app/database.py` activates when no `DATABASE_URL` is configured
— a development affordance, not a production pattern.

## Consequences

**Positive:**
- Each category gets storage matching its access pattern. Conversation
  state turns are <10ms; worksheet writes are durable and queryable.
- Postgres holds only what's worth analyzing later. We don't burden
  the durable store with high-churn turn-by-turn state.
- Single-pod deployments work without Redis (L1 alone suffices).
  Multi-pod deployments use Redis as the shared L2 — same code path,
  config-flag activated.
- The JSON fallback means the kiosk demos on a clean laptop without
  spinning up Postgres.

**Negative:**
- Three storage systems means three failure modes. We mitigate with
  a clear boundary: business-artifact failures abort the operation
  (the worksheet didn't save — surface the error); conversation-state
  failures degrade to "treat as new session" rather than crashing.
- Redis is technically optional but operationally required for any
  deployment with more than one backend pod. We document this in
  [`docs/DEVELOPMENT.md`](../DEVELOPMENT.md).
- The JSON fallback can drift from the SQLAlchemy schema. We treat it
  as dev-only and gate it behind explicit config; a production
  deployment without `DATABASE_URL` is a misconfiguration, not a
  feature.

**Why not Postgres for everything?** Conversation state mutations
happen on every turn (every customer message). Pushing each mutation
through SQL costs latency the kiosk can't afford on top of the LLM
roundtrip. Why not Redis for everything? Worksheet history needs to
be queryable for sales-manager review long after the conversation
ended; Redis is the wrong tool for that.
