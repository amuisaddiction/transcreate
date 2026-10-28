# Architecture

## High-level flow

```text
Browser (React UI)
   |
   | POST /api/localize
   v
Node/Express orchestration layer
   |-- Input validation and size limits
   |-- LLM adapter: extract references
   |-- Qloo adapter: resolve/search/describe/rank as supported
   |-- Decision validator: candidate ID must belong to returned shortlist
   |-- LLM adapter: constrained rewrite
   |-- Verification and bounded retry
   |-- Evidence/trace builder
   v
JSON result (or SSE after basic flow is stable)
```

## Suggested backend modules
- `server/src/index.ts` — server entry point
- `server/src/app.ts` — Express app and routes
- `server/src/config.ts` — environment parsing and safe startup checks
- `server/src/routes/health.ts` — health and mode endpoint
- `server/src/routes/localize.ts` — request validation and orchestration entry point
- `server/src/agent/runLocalization.ts` — agent pipeline
- `server/src/agent/contracts.ts` — shared types
- `server/src/adapters/qloo/QlooClient.ts` — adapter interface
- `server/src/adapters/qloo/HarnessQlooClient.ts` — official harness integration, implemented after inspecting installed CLI help/docs
- `server/src/adapters/qloo/SampleQlooClient.ts` — clearly labelled synthetic UI fixtures
- `server/src/adapters/llm/LLMClient.ts` — provider interface
- `server/src/adapters/llm/ProviderLLMClient.ts` — selected provider implementation
- `server/src/services/evidence.ts` — receipts from real observations only
- `server/src/services/verifyRewrite.ts` — deterministic verification
- `server/src/services/cache.ts` — bounded cache
- `server/src/services/rateLimit.ts` — request protection

## Core contracts (initial draft)

```ts
export type ReferenceKind = "movie" | "tv" | "artist" | "brand";
export type DecisionAction = "swap" | "keep" | "unresolved";
export type ReferenceStatus = "kept" | "swapped" | "unresolved" | "ambiguous";

export interface QlooObservation {
  id: string;
  operation: string;
  argsRedacted: Record<string, unknown>;
  responseSummary: unknown;
  latencyMs: number;
  cacheHit: boolean;
}

export interface Candidate {
  id: string;
  name: string;
  kind?: ReferenceKind;
  sourceObservationId: string;
}

export interface ReferenceDecision {
  referenceId: string;
  action: DecisionAction;
  reason: string;
  chosenCandidateId?: string;
  rejected: Array<{ candidateId: string; reason: string }>;
  evidenceObservationIds: string[];
  modelInterpretation?: string;
}
```

Adapt these types to actual Qloo response fields after smoke tests; do not assume all fields exist.

## API routes
- `GET /api/health`: return mode and dependency status without exposing secrets.
- `GET /api/markets`: return only market presets tested against the real API.
- `POST /api/localize`: accept short text and a tested market preset; return result, decisions, observations, and trace.
- Add streaming only if it is reliable on the chosen host.

## Provenance invariant
Every receipt that claims to contain Qloo evidence must point to one or more `QlooObservation` records created by the server adapter from actual API responses. Sample observations must be labelled synthetic and cannot be displayed as live evidence.
