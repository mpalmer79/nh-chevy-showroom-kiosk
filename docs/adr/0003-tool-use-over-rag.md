# ADR-0003: Tool use over retrieval-augmented generation

**Status:** Accepted
**Date:** 2025-12

## Context

The AI assistant needs access to dynamic data (inventory, vehicle
details, payment math) and the ability to take actions (notify staff,
create worksheets, save customer phone numbers). Two architectural
patterns were available:

1. **Retrieval-augmented generation (RAG).** Retrieve relevant context
   (e.g., top-N vehicles matching the query) and stuff it into the
   prompt. The LLM reads the context and answers.
2. **Tool use.** Define a set of functions the LLM can call; let the
   model decide which to invoke; execute the call; return the result;
   the model uses the result in its next turn.

## Decision

The kiosk uses tool use exclusively. Eleven tools are defined in
`backend/app/ai/tools.py` and dispatched via
`backend/app/ai/tool_executor.py`:

- `search_inventory` — semantic search over current inventory
- `get_vehicle_details` — full detail for a specific stock number
- `find_similar_vehicles` — alternatives to a vehicle of interest
- `calculate_budget` — payment math given price, down, term, APR
- `check_vehicle_affordability` — does this vehicle fit this budget
- `create_worksheet` — generate a Digital Worksheet for the deal
- `notify_staff` — page Sales/F&I/Service via Slack/SMS/email
- `mark_favorite` — flag a vehicle in conversation state
- `save_customer_phone` — capture contact info for follow-up
- `lookup_conversation` — recall prior session state
- Anthropic's built-in `web_search` — for fresh facts beyond the corpus

## Consequences

**Positive:**
- The model asks precise questions. Instead of pre-loading 50 vehicles
  into context "just in case," the model calls `search_inventory` with
  the customer's actual constraints. This keeps the prompt small,
  fast, and cheap.
- The model can take actions. RAG is read-only by design; tool use
  lets the AI execute (notify staff, create a worksheet) when the
  conversation reaches that point.
- Tools compose naturally. A typical conversation: customer asks for a
  truck → `search_inventory` → customer asks about payment →
  `calculate_budget` → customer wants to talk to someone →
  `notify_staff`. Each step is a discrete, testable function call.
- Tool results are structured. The model receives JSON, not prose, so
  it doesn't have to parse natural-language summaries of inventory
  rows.

**Negative:**
- Tool latency is additive. Each tool roundtrip adds a model
  inference cycle. A three-tool conversation costs three LLM calls
  versus RAG's one. We accept this because individual tool results are
  cheaper than dumping the whole corpus into the prompt.
- The model occasionally chains tools when it shouldn't (calling
  `search_inventory` twice with subtly different queries). We mitigate
  this in `backend/app/ai/prompts.py` with explicit guidance to commit
  to a query.
- Tool definitions must stay in sync with the executor implementations.
  We rely on strict pydantic schemas at the executor boundary to catch
  drift.

**Why not both?** RAG and tool use are not mutually exclusive in
principle. We chose tool use *exclusively* to keep the architecture
single-mode and the failure modes legible. Mixing the two adds two
debugging axes ("did the retrieval miss?" vs "did the tool call
fail?") that we don't think the value justifies at this scale.
