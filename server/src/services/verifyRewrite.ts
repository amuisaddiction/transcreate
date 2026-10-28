import { ReferenceDecision } from '../agent/contracts.js';

export interface VerificationResult {
  ok: boolean;
  violations: string[];
}

export function verifyRewrite(
  originalCopy: string,
  rewrittenCopy: string,
  decisions: ReferenceDecision[]
): VerificationResult {
  const violations: string[] = [];

  for (const decision of decisions) {
    if (decision.action === 'swap') {
      const replacement = decision.chosenCandidate?.name;
      if (!replacement) {
        violations.push(`Decision marked as swap for "${decision.originalText}" but no candidate name provided.`);
        continue;
      }

      // 1. Replacement must be present in the rewritten copy
      if (!rewrittenCopy.includes(replacement)) {
        violations.push(`Expected replacement "${replacement}" was not found in the rewritten copy.`);
      }

      // 2. Original reference should no longer be present if it was intended to be replaced
      // (Unless it was part of an unrelated word or repeated phrase)
      if (rewrittenCopy.includes(decision.originalText) && decision.originalText !== replacement) {
        violations.push(`Original reference "${decision.originalText}" was still detected in the rewritten copy.`);
      }
    } else if (decision.action === 'keep') {
      // 3. Kept references must remain present in the copy
      if (!rewrittenCopy.includes(decision.originalText)) {
        violations.push(`Kept reference "${decision.originalText}" was unexpectedly removed or modified.`);
      }
    }
  }

  // 4. Check for hallucinated reference substitutions not approved by decisions
  // Prevent arbitrary injection of other known candidate names
  const allowedReplacements = new Set(
    decisions.filter((d) => d.action === 'swap' && d.chosenCandidate).map((d) => d.chosenCandidate!.name.toLowerCase())
  );

  for (const decision of decisions) {
    for (const rejected of decision.rejectedCandidates) {
      if (
        rewrittenCopy.toLowerCase().includes(rejected.candidateName.toLowerCase()) &&
        !allowedReplacements.has(rejected.candidateName.toLowerCase())
      ) {
        violations.push(`Unauthorized rejected candidate "${rejected.candidateName}" appeared in rewritten copy.`);
      }
    }
  }

  return {
    ok: violations.length === 0,
    violations,
  };
}
