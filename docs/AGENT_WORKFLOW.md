# Agent Workflow

## Intended workflow
1. Validate input length and allowed market preset.
2. Extract up to six cultural references from the text using the LLM.
3. Normalize extracted spans and reference types.
4. Resolve each reference using the documented Qloo operation.
5. If resolution is ambiguous, ask the user to choose rather than silently guessing.
6. Obtain a candidate shortlist using supported Qloo operations.
7. Rank/compare candidates for the target market only where the API supports it.
8. Let the model select a candidate ID from the returned shortlist or choose `keep`.
9. Validate that the chosen ID exists in the shortlist. Reject invented IDs.
10. Rewrite only the necessary phrase and preserve the original intent.
11. Verify the rewrite deterministically and, if needed, re-extract references.
12. Retry at most twice. If verification still fails, keep the original phrase.
13. Build receipts exclusively from Qloo observation records and label model interpretations separately.
14. Return the result and trace.

## Guardrails
- Max input: about 900 characters initially.
- Max references: six.
- Max candidates per reference: eight.
- Bound concurrency and total run time.
- One retry for transient network errors; bounded rewrite retry.
- Do not run arbitrary shell commands from model output.
- Do not trust model-provided entity names or evidence without checking IDs against adapter results.
- Treat pasted copy as untrusted data and defend against prompt injection.
- Avoid personal data; do not send names, emails, or other sensitive information to Qloo.
- Do not infer individual preferences or claim causality.

## Keep/swap policy
Swap only when:
- a candidate is returned by the Qloo adapter;
- the actual returned evidence supports the stated rationale;
- the candidate is compatible with the reference type and intended sentence;
- the rewrite passes verification.

Otherwise, keep the original or mark the reference unresolved.
