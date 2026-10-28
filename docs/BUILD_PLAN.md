# Build Plan — Prioritized

## P0: eligibility and technical proof
1. Create public repository and add MIT license.
2. Create frontend/backend skeleton and `.env.example`.
3. Install the official Qloo hackathon harness and inspect its actual help.
4. Complete Qloo smoke tests and record response shapes.
5. Implement one real Qloo-backed path end to end.
6. Add evidence provenance and honest error handling.
7. Deploy early and confirm the hosting environment can run the integration.

## P1: complete agent
1. Add structured reference extraction.
2. Resolve references and handle ambiguity.
3. Build candidate shortlist and market comparison only where supported.
4. Constrain model choices to returned candidate IDs.
5. Rewrite and verify; bounded retries, otherwise keep original.
6. Add tests for the guardrails.

## P2: signature UI
1. Build proof-sheet design tokens and typography.
2. Build source editor, proof output, and receipt ledger.
3. Add execution trace and honest status states.
4. Add responsive mobile tabs and keyboard/accessibility behavior.
5. Add restrained motion only after the flow works.

## P3: submission polish
1. README and method/limitations page.
2. Clean-clone setup test.
3. Test public demo in incognito and mobile.
4. Record a demo using real runs only.
5. Complete submission text and verify license/repo visibility.

## Hard gates
- No working key / no real Qloo request: do not represent the app as live.
- No verified market-conditioned operation: do not claim market-aware ranking.
- If time is short, cut animations and secondary pages before cutting the working API path.
