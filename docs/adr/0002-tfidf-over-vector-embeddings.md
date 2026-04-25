# ADR-0002: TF-IDF retrieval over vector embeddings

**Status:** Accepted
**Date:** 2025-12

## Context

The AI assistant needs to find vehicles matching a customer query
("blue Equinox under $35k", "something good for towing", "the truck I
saw with the tan interior"). The candidate set is the dealership's
inventory — typically 100–300 vehicles per rooftop. Three retrieval
approaches were considered:

1. **Vector embeddings** (OpenAI `text-embedding-3-small` or similar).
   Encode each vehicle's text once, encode the query at request time,
   compute cosine similarity.
2. **Lexical keyword matching** (Postgres full-text, Elasticsearch).
   Tokenize and rank with BM25 or similar.
3. **TF-IDF.** Fit a TF-IDF vectorizer on vehicle text at startup, score
   queries by cosine over the resulting sparse vectors.

## Decision

The kiosk uses TF-IDF in `backend/app/services/vehicle_retriever.py`
(`SemanticVehicleRetriever`). The vectorizer is a hand-rolled
`TFIDFVectorizer` class defined in the same file — no scikit-learn
dependency for retrieval. It is fit once at startup over inventory text
(model name, trim, body style, color, drivetrain, key features); queries
are transformed at request time and scored against the corpus by cosine
similarity.

## Consequences

**Positive:**
- A query against a 200-vehicle corpus returns in single-digit
  milliseconds — well under the budget for a kiosk that already pays
  ~1–3s of latency on the LLM call. Embedding APIs add 100–300ms per
  query, which is meaningful relative to that budget.
- No external API dependency for retrieval. The kiosk continues to work
  with the LLM offline (it can return tool results even if Claude is
  rate-limited or down).
- No per-query cost. Embedding APIs charge per call; on a busy Saturday
  this matters.
- The signal at this scale is dominated by token overlap. "Silverado"
  in the query matches "Silverado" in the corpus — semantic similarity
  on top of that buys little because the model name itself is the
  highest-information token.

**Negative:**
- Synonym handling is weaker than embeddings. "Big truck" doesn't match
  "Silverado 2500HD" without the right tokens in the corpus text. We
  partially compensate by enriching corpus text with synonyms during
  the load phase (body style "pickup" added alongside "truck", etc.).
- Cross-language queries fail entirely. Not a concern for this market.
- If inventory grows past ~5000 vehicles per rooftop (it won't for
  Chevy retail), TF-IDF stays fast but quality degrades because IDF
  weights mean less in a homogeneous corpus.

**Reversibility.** This decision is fully reversible at the
`SemanticVehicleRetriever` interface boundary. Swapping to embeddings
is a one-class change.
