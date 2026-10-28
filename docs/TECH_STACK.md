# Tech Stack

## Recommended stack
| Layer | Choice | Purpose |
|---|---|---|
| Frontend | React + Vite + TypeScript | Fast, typed single-page application |
| Styling | CSS Modules or plain CSS with design tokens | Precise editorial visual system without unnecessary dependencies |
| Icons | `lucide-react` | Consistent accessible iconography |
| Backend | Node.js + TypeScript + Express | Secret-safe orchestration and API access |
| Qloo | Official Qloo Agentic Hackathon harness/API documented by the event | Actual cultural-intelligence operations |
| LLM | Provider adapter (Gemini or another currently available provider) | Extract, choose, and rewrite with schema validation |
| Validation | Zod | Validate model output and incoming requests |
| Tests | Vitest; Supertest for API tests | Unit and route tests |
| Hosting | One Node-capable host that supports long-lived HTTP/SSE if SSE is used | Serve frontend and backend from one public URL |
| Version control | Git + public GitHub repository | Source, history, review |
| License | MIT unless event/legal needs suggest otherwise | Open-source requirement |

## Important implementation rules
- Confirm current Node/npm and official Qloo harness requirements before pinning versions.
- Do not invent raw Qloo REST endpoints or request parameters. Use the official hackathon documentation and harness help output.
- The frontend must never call Qloo directly.
- Keep the Qloo adapter isolated so API changes do not spread across the app.
- Keep the LLM provider behind a small interface so the provider can be replaced.
- Use sample fixtures only for UI development; sample output must not create fake Qloo evidence receipts.
- Prefer a normal JSON response initially if SSE hosting is risky; add streaming only after the workflow works.
- Avoid extra dependencies unless a specific need is demonstrated.

## Environment variables (server only)
- `QLOO_API_KEY`
- `QLOO_BASE_URL` (use the hackathon server URL supplied by Qloo)
- `LLM_PROVIDER`
- `LLM_API_KEY`
- `MODE=sample|live`
- `PORT`

Never prefix server secrets with `VITE_`.
