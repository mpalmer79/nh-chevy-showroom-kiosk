# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the
NH Chevy Showroom Kiosk. Each ADR captures a single architecturally
significant decision: the context, the alternatives considered, the
choice made, and the consequences.

We use a lightweight variant of the [Michael Nygard format][nygard]:
**Context · Decision · Consequences**, plus a status field
(`Accepted`, `Superseded`, or `Deprecated`).

## Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| [0001](./0001-pbs-excel-as-inventory-source-of-truth.md) | PBS Excel export as inventory source of truth | Accepted | 2025-12 |
| [0002](./0002-tfidf-over-vector-embeddings.md) | TF-IDF retrieval over vector embeddings | Accepted | 2025-12 |
| [0003](./0003-tool-use-over-rag.md) | Tool use over retrieval-augmented generation | Accepted | 2025-12 |
| [0004](./0004-hybrid-conversation-state-storage.md) | Hybrid in-memory + Redis + Postgres state storage | Accepted | 2025-12 |
| [0005](./0005-anthropic-claude-as-llm-vendor.md) | Anthropic Claude as LLM vendor | Accepted | 2025-12 |

## Adding a new ADR

Number sequentially. Title format: `NNNN-short-kebab-title.md`. Use
the structure of the existing ADRs as a template. Once an ADR is
merged, treat it as immutable — supersede with a new ADR rather than
editing in place.

[nygard]: https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
