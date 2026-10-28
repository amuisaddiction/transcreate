# Qloo Integration and Smoke Tests

## Credential handling
The Qloo hackathon email provides a hackathon-specific API server URL and key. Store the key in `server/.env`; never copy it into frontend code, screenshots, prompts, README, Git history, or logs. Use only the hackathon server URL specified by Qloo.

If the key has appeared in a screenshot or other public surface, treat it as exposed. Rotate it if the provider supports rotation; otherwise contact the hackathon team for guidance or a replacement.

## Do not guess the API
The exact supported operations and input parameters must come from the current official hackathon developer guide, starter kit, and installed harness help. Do not implement endpoints based on unrelated examples or other entrants' assumptions.

## Initial setup and discovery
1. Install the official Qloo hackathon harness using the exact command in the official starter kit.
2. Run its version/help commands.
3. Record the supported command syntax and workflows.
4. Make one small search request for a known entity.
5. Inspect the actual returned JSON and available fields.
6. Make one entity-detail request if supported.
7. Test market-conditioned ranking only if the documented operation supports it.
8. Record errors from a deliberately invalid key in a safe local test; never log the key.
9. Confirm latency and rate/quota guidance from official event documentation.

## Smoke-test record
Complete this table with observed results before implementing the full pipeline.

| Test | Expected evidence | Actual result |
|---|---|---|
| Harness version/help | Supported commands and workflows | TODO |
| Search known title | Entity IDs and types | TODO |
| Describe entity | Fields available for receipt | TODO |
| Rank shortlist | Actual ranking/score fields, if any | TODO |
| Compare two markets | Only if supported; record differences | TODO |
| Empty query/result | Stable empty state | TODO |
| Invalid key | Safe auth error, no secret leak | TODO |
| Timeout/rate limit | Recoverable error state | TODO |

## Evidence rules
- Store the operation name, redacted arguments, response summary, latency, cache status, and an observation ID.
- Do not send the user's full pasted copy to Qloo; send only the minimum entity/search inputs needed.
- Do not claim a market-specific result unless the actual operation supports that condition.
- Do not create a numeric score unless Qloo provides a meaningful, documented value and the UI explains it accurately.
- If the API does not provide enough evidence, keep the original reference.
- Never claim a Qloo observation came from a model response or a fixture.

## Live-mode gate
The UI may show `LIVE — QLOO CONNECTED` only after a real successful server-side Qloo request. A configured key alone is not proof of connectivity.
