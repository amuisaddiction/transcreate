# Testing Plan

## Unit tests
- Input validation and character limits
- Reference normalization and span validation
- Candidate ID must exist in the returned candidate set
- Empty Qloo results lead to `keep` or `unresolved`
- Ambiguous reference triggers a choice request
- Rewrite verification detects unexpected references
- Failed verification retries only within the configured bound
- Evidence builder rejects model-only claims as Qloo evidence
- Sample mode cannot generate live Qloo receipts
- Errors redact API keys and sensitive values

## Integration tests
- `/api/health` does not expose secrets
- Qloo adapter handles real documented response shapes
- Qloo auth failure becomes a clear unavailable state
- Qloo timeout/rate limit becomes a recoverable state
- Complete localize request works with a test adapter
- Live smoke test passes with a real key (run locally; do not include secrets in CI)

## UI tests
- Run action and loading states
- Accessible keyboard flow
- Ambiguity choice flow
- Evidence receipt opens and closes
- Copy final text
- LIVE and SAMPLE labels are always clear
- Responsive layout on mobile widths
- Reduced-motion preference is respected

## Before each push
```bash
npm run test
npm run build
```

Do not claim these checks passed until they have actually been run and their exit status inspected.
