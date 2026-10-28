# Transcreate — Main Project Brief

## One-line pitch
Transcreate is an evidence-backed cultural editing studio that adapts existing English copy for a chosen audience using Qloo cultural intelligence and a self-checking AI agent.

## Problem
A cultural reference that feels familiar in one market may be confusing or irrelevant in another. Creators, startups, and small agencies often need to adapt existing campaigns without losing their original intent.

## Target users
Primary: creators, startups, and small agencies adapting English-language copy for a specific market.
Secondary example: public-awareness and nonprofit campaign teams.

## Core workflow
1. Paste or load a short example of existing copy.
2. Select a target market from presets that have actually passed API smoke tests.
3. Extract supported references: movies, TV shows, artists, and brands.
4. Resolve references with Qloo. Ask the user to choose when the match is ambiguous.
5. Compare the original reference and a bounded candidate shortlist using actual supported Qloo operations.
6. Choose a candidate only if the evidence supports it; otherwise keep the original or mark it unresolved.
7. Rewrite only the relevant phrase while preserving the original intent.
8. Verify that the final rewrite contains only allowed retained references and chosen replacements.
9. Show an evidence receipt and trace for each decision.

## Why Qloo matters
Qloo should materially change candidate ranking or the keep/swap decision. If the actual API cannot support a claimed market comparison, remove that claim rather than simulate it.

## Differentiators
- Edits existing copy instead of generating from scratch.
- Verifies its own rewritten output.
- Has a real “keep original” path.
- Separates Qloo-returned evidence from the model's interpretation.
- Shows a transparent execution trace.
- Makes uncertainty visible instead of inventing confidence.

## Success criteria
- A real Qloo-backed workflow completes on the public demo.
- No fabricated Qloo observations or unsupported scores.
- Every changed reference has a traceable evidence receipt.
- A judge can understand the value in under one minute.
- Repository setup instructions work from a clean clone.

## Non-goals for the hackathon
Accounts, persistent user history, broad translation, image generation, arbitrary long documents, unsupported market claims, and elaborate analytics.

## Constraints
- The API key stays server-side.
- Sample mode is visibly marked `SAMPLE — NOT QLOO DATA`.
- Use no more than six references per run initially.
- Begin with short copy (roughly 900 characters maximum).
- Market presets are added only after they pass real API tests.
- Do not promise a win; optimize for implementation, design, impact, and idea quality.
