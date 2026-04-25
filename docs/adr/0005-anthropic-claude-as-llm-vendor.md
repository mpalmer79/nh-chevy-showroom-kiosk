# ADR-0005: Anthropic Claude as LLM vendor

**Status:** Accepted
**Date:** 2025-12

## Context

The conversational AI is the core product surface. The choice of
foundation model affects latency, cost, conversation quality, tool
use reliability, and behavioral consistency over long conversations.
Considered options:

1. **Anthropic Claude** (claude-sonnet-4-5)
2. **OpenAI GPT-4 family** (gpt-4o, gpt-4-turbo)
3. **Google Gemini** (gemini-1.5-pro, gemini-2.0-flash)
4. **Self-hosted open-weight models** (Llama 3.x, Mistral)

## Decision

The kiosk uses Anthropic Claude (model configured via env var, default
claude-sonnet-4-5) for all conversational AI.

## Consequences

**Positive:**
- Tool use reliability across multi-tool conversations is consistently
  high. Claude composes 2–4 tool calls per turn cleanly without
  prompting acrobatics. This matters because the kiosk's conversations
  routinely chain `search_inventory` → `get_vehicle_details` →
  `calculate_budget` in a single response.
- The system prompt voice ("you are a salesperson standing in front of
  the customer") is honored across turn 1 and turn 30 — Claude follows
  behavioral instructions tightly without drifting into chatbot voice.
- Anthropic's `web_search` built-in tool is available without separate
  integration work, which is occasionally useful for fresh facts
  outside the inventory corpus.

**Negative:**
- Single-vendor dependency. Anthropic outage = kiosk degraded to
  fallback responses (`backend/app/ai/helpers.py` defines the
  fallbacks). We accept this; the alternative is multi-vendor
  abstraction overhead.
- Cost is meaningful at scale. claude-sonnet-4-5 is more expensive
  per token than gpt-4o-mini. For a kiosk doing maybe 200 conversations
  a day, this is well within reason; for a fleet of kiosks across a
  dealer group, we'd revisit.
- No on-prem deployment option. Everything goes to Anthropic's API.
  Privacy implications are addressed by sending only conversation
  text (no PII like SSN, DL — those aren't collected) and by the
  upstream vendor's data retention policies.

**Reversibility.** All Claude calls go through
`backend/app/ai/tool_executor.py` and `backend/app/ai/helpers.py`.
Swapping vendors is a single-module change at the API client
boundary, plus reformatting the tool definitions to match the target
vendor's tool-use schema. Tool semantics translate cleanly across
Anthropic and OpenAI; Gemini's function-calling format requires more
adaptation.
