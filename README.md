# Transcreate

**A cultural editing studio for adapting existing copy to a target audience—with evidence, restraint, and a self-checking agent workflow.**

Transcreate identifies supported cultural references in existing English content, uses Qloo's hackathon API to investigate audience-relevant alternatives, proposes only evidence-supported edits, and verifies the rewritten copy before presenting it.

> **Status:** Starter scaffold. Live Qloo integration is not verified until the server-side smoke tests pass.
> Never describe SAMPLE output as Qloo data. Never put API keys in client code or commit them.

## Product principles

- Edit existing content; do not merely generate new copy.
- Qloo observations and model interpretations are separate.
- Every proposed replacement must map to a real candidate returned by the server-side Qloo adapter.
- “Keep original” and “unresolved” are valid outcomes.
- No invented resonance scores, fake evidence, or claims about individuals.
- The UI must visibly distinguish `LIVE` from `SAMPLE`.

## Project structure

See [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md).

## Requirements

- Node.js 20+ (verify against the current Qloo harness requirements)
- npm
- A Qloo Agentic Hackathon API key
- An LLM API key for the selected provider (optional until the LLM adapter is implemented)

## Quick start

```bash
npm install
cp server/.env.example server/.env
# Add credentials to server/.env locally. Do not commit it.
npm run dev
```

The initial scaffold may only show the frontend shell and health status. Follow [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md) to implement the API adapter and agent workflow. Do not claim the app is fully functional until the live smoke tests pass.

## Security

- Store `QLOO_API_KEY` only in `server/.env` or the deployment provider's server-side secrets.
- Never use `VITE_QLOO_API_KEY`.
- Do not paste keys into GitHub, client-side source, screenshots, demo videos, logs, or public prompts.
- If a key has been exposed, rotate it if possible or ask the Qloo hackathon team for a replacement.
- `.env` files are ignored by Git.

## Quality gates

Before submission:
1. Run the live Qloo smoke tests and record actual supported operations and response fields.
2. Test the full resolve → rank → choose/keep → rewrite → verify workflow.
3. Confirm all evidence receipts are derived from actual server-side Qloo observations.
4. Run `npm run test` and `npm run build`.
5. Test the deployed URL in a private/incognito browser with no login.
6. Add the MIT license, keep the repository public, and document limitations.

## Documentation

- [Product brief](docs/PRODUCT_BRIEF.md)
- [UI/UX design system](docs/UI_UX_DESIGN.md)
- [Tech stack](docs/TECH_STACK.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Qloo integration and smoke tests](docs/QLOO_INTEGRATION.md)
- [Agent workflow](docs/AGENT_WORKFLOW.md)
- [Security and privacy](docs/SECURITY.md)
- [Testing plan](docs/TESTING.md)
- [Build plan](docs/BUILD_PLAN.md)
- [Submission checklist](docs/SUBMISSION_CHECKLIST.md)
- [Project structure](docs/PROJECT_STRUCTURE.md)
