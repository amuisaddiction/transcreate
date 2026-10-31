# Hackathon Submission Checklist

## Status Legend
- `[x]` Completed and verified.
- `[~]` Partially completed or in progress.
- `[ ]` Not started.

---

## 1. Initial Audit & Setup
- [x] Workspace inspected and verified.
- [x] Starter documentation read and synthesized.
- [x] Git repository initialized with clean history and MIT license.
- [x] Node.js 20+ compatibility fixed across client and server package versions.

## 2. API & Integration Proof
- [x] Official `@qloo/qloo-harness` inspected and upstream schemas analyzed.
- [x] Supported endpoints documented: `/search`, `/entities`, `/v2/insights`.
- [x] Header authentication (`X-Api-Key`) and correlation ID propagation implemented.
- [x] Market-conditioned candidate discovery (`/v2/insights` with `signal.location.query`) verified.
- [x] Error handling (auth, rate limits, timeouts) and secret redaction verified.
- [x] `docs/QLOO_SMOKE_TESTS.md` created with verified schemas.

## 3. Agentic Workflow
- [x] Reference extraction for movies, TV shows, artists, and brands.
- [x] Canonical entity resolution via Qloo search.
- [x] Ambiguity handling (flags multiple candidates rather than guessing).
- [x] Candidate shortlist retrieval and affinity ranking for target market.
- [x] Provenance constraint: candidate choices restricted strictly to Qloo-returned IDs.
- [x] Real "keep original" path when evidence is below threshold (< 0.70 affinity) or empty.
- [x] Constrained rewriting (replaces only reference phrases, preserves surrounding context).
- [x] Deterministic rewrite verification engine with bounded retries (<= 2).
- [x] Evidence ledger generated from server observations with immutable observation IDs.
- [x] Full execution trace recording timestamps, durations, and stage statuses.

## 4. UI/UX & Interaction Quality
- [x] Signature editorial identity ("The Proof Sheet") with Fraunces, Newsreader, and IBM Plex Mono fonts.
- [x] Source pane with live character counter (<= 900) and preset chips.
- [x] Interactive proof pane with red strike marks (`<del>`), green replacement underlines (`<ins>`), and status stamps.
- [x] Clickable proof marks linking directly to corresponding evidence receipts.
- [x] Evidence Ledger separating Qloo observations, model interpretations, and policy decisions.
- [x] Visual affinity metric bars.
- [x] Expandable execution trace timeline with millisecond latencies.
- [x] One-click "Copy Final Text" with toast feedback.
- [x] Honest status badge (`LIVE — QLOO CONNECTED` vs `SAMPLE — NOT QLOO DATA`).
- [x] Responsive layout with mobile tabs and horizontal scroll prevention.
- [x] Keyboard focus visible rings and `prefers-reduced-motion` support.

## 5. Quality, Testing & Security
- [x] All 14 automated unit and integration tests passing (`npm test`).
- [x] Production build passing cleanly for both client and server (`npm run build`).
- [x] Server-side secrets isolated in `server/.env` (never exposed via `VITE_` or client bundle).
- [x] `.env` verified ignored by Git.
- [x] Zero credential leaks in source code, logs, or documentation.
- [x] Comprehensive documentation in `README.md` and `docs/`.
