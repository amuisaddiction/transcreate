# Transcreate — UI/UX Design Specification

## Design concept: The Proof Sheet
The product should feel like a thoughtful editorial copy desk—not a generic chatbot or analytics dashboard. The user sees their text being marked up, then can inspect the evidence behind each change.

## Visual identity
- Paper background: `#F4EFE6`
- Ink: `#16130F`
- Proof red: `#B3321F` (strikes, corrections, unresolved marks)
- Ledger green: `#1F6F5C` (Qloo evidence, only when evidence exists)
- Supporting neutrals: muted stone and warm grey
- Fonts: Fraunces for display, Newsreader for reading text, IBM Plex Mono for trace/receipts. Use free, legally hosted font files or a reputable font provider.
- Keep contrast accessible; verify all text/background pairs before release.
- Avoid decorative gradients, excessive glassmorphism, tiny low-contrast labels, and generic AI sparkles.

## Landing page
1. Top bar: wordmark `TRANSCREATE`, short descriptor, `LIVE`/`SAMPLE` status.
2. Hero headline: “Make the reference land.”
3. Subheading: “Adapt existing copy to a new cultural context—with evidence behind every edit.”
4. Interactive example showing a struck phrase and a proposed replacement. Mark it as illustrative until it comes from a real run.
5. Three-step explanation: Find references → Compare evidence → Verify the edit.
6. Trust strip: “No forced swaps. No invented evidence. You stay in control.”
7. One primary CTA: `Open the studio`.

## Studio desktop layout
- Header: product name, current mode badge, API health.
- Control ribbon: target market preset, optional audience band only if the API truly supports it, example chips, Run button.
- Main work area:
  - Source pane: editable original text and character count.
  - Proof pane: final copy with clear inline marks for kept, swapped, ambiguous, and unresolved references.
  - Evidence ledger: receipts for the selected reference.
- Bottom trace drawer: timestamp/order, operation, duration, cache status, bounded retry events.
- Keep copy and proof readable; do not cram every technical detail into the primary viewport.

## Studio mobile layout
Use three tabs: `Source`, `Proof`, `Trace`. Evidence receipts open as a bottom sheet. Controls must not overflow horizontally.

## Proof mark states
- `SWAPPED`: strike the original and show replacement; accessible text label required.
- `KEPT`: indicate that the original was retained.
- `UNRESOLVED`: show that Qloo did not provide enough usable evidence.
- `AMBIGUOUS`: ask the user to select the intended entity.
- Never rely on colour alone; pair colour with labels/icons.

## Evidence receipt
Each receipt has separate blocks:
1. **Qloo observation** — only fields actually returned by the Qloo API, with operation and entity identifier where available.
2. **Model interpretation** — clearly labelled as model-generated explanation.
3. **Decision** — swap, keep, or unresolved, with reason.
4. **Limits** — what this evidence does not establish.
5. **Provenance** — observation IDs linked to trace events.

Never create a receipt from a model-generated statement alone.

## Motion
- Mark animation: 150–250 ms, restrained.
- Respect `prefers-reduced-motion`.
- Do not use parallax or motion that delays the core task.
- Animation should not obscure text or evidence.

## Required states
- Idle with example loaded
- Running: extracting, resolving, ranking, rewriting, verifying
- Ambiguous entity requiring a choice
- Candidate rejected and retrying
- No supported references found
- No candidate evidence: keep original
- Qloo auth failure, rate limit, timeout, unavailable
- LLM failure with any already-collected Qloo evidence preserved
- Partial success
- Sample mode with persistent `SAMPLE — NOT QLOO DATA` label
- Live mode only after a real server-side health/smoke check

## Accessibility checklist
- Full keyboard operation and visible focus rings
- Escape closes dialogs/sheets
- `aria-live` for status and trace updates
- Focus is moved sensibly when ambiguity requires a choice
- Text labels supplement all colour-coded marks
- Respect reduced motion
- Test small screens and zoom
- Run an automated accessibility check before submission

## Example copy
- CTA: `Transcreate this copy`
- Empty state: `Paste a short piece of copy to begin.`
- No reference: `No supported cultural references found. Nothing was changed.`
- Weak evidence: `We couldn't verify a better fit. The original stays.`
- API failure: `Qloo is temporarily unavailable. No live recommendation was made.`
- Sample label: `SAMPLE — NOT QLOO DATA`
- Live label: `LIVE — QLOO CONNECTED` only after an actual successful health check.
