import { EditSpan, EvidenceReceipt, QlooObservation, ReferenceDecision } from '../agent/contracts.js';

export function buildEvidenceLedger(
  decisions: ReferenceDecision[],
  observations: QlooObservation[]
): EvidenceReceipt[] {
  const observationMap = new Map<string, QlooObservation>();
  for (const obs of observations) {
    observationMap.set(obs.id, obs);
  }

  const receipts: EvidenceReceipt[] = [];

  for (const decision of decisions) {
    // Find associated observation(s)
    const linkedObs = decision.evidenceObservationIds
      .map((id) => observationMap.get(id))
      .filter((o): o is QlooObservation => Boolean(o));

    const primaryObs = linkedObs[0];

    const receipt: EvidenceReceipt = {
      referenceId: decision.referenceId,
      originalReference: decision.originalText,
      action: decision.action,
      chosenReplacement: decision.chosenCandidate?.name,
      qlooObservation: primaryObs
        ? {
            observationId: primaryObs.id,
            operation: primaryObs.operation,
            endpoint: primaryObs.endpoint,
            entityId: decision.chosenCandidate?.id,
            entityName: decision.chosenCandidate?.name,
            popularity: decision.chosenCandidate?.popularity,
            affinity: decision.chosenCandidate?.affinity,
            rawExcerpt: primaryObs.responseSummary,
            isSynthetic: primaryObs.isSynthetic,
          }
        : undefined,
      modelInterpretation: decision.modelInterpretation,
      decisionReason: decision.reason,
      limitations:
        'Qloo scores represent aggregate cultural affinities across audience cohorts. They are not predictive of individual consumer behaviour or causal intent.',
      provenance: {
        timestamp: primaryObs?.timestamp || new Date().toISOString(),
        observationIds: linkedObs.map((o) => o.id),
      },
    };

    receipts.push(receipt);
  }

  return receipts;
}

export function generateEditSpans(
  originalCopy: string,
  decisions: ReferenceDecision[]
): EditSpan[] {
  if (decisions.length === 0) {
    return [{ type: 'text', originalText: originalCopy }];
  }

  const spans: EditSpan[] = [];
  let currentIndex = 0;

  // Find position of each reference in the original copy
  const positioned = decisions
    .map((d) => {
      const idx = originalCopy.indexOf(d.originalText, currentIndex);
      return { decision: d, start: idx, end: idx !== -1 ? idx + d.originalText.length : -1 };
    })
    .filter((p) => p.start !== -1)
    .sort((a, b) => a.start - b.start);

  for (const pos of positioned) {
    // Text before this reference
    if (pos.start > currentIndex) {
      spans.push({
        type: 'text',
        originalText: originalCopy.slice(currentIndex, pos.start),
      });
    }

    const d = pos.decision;
    if (d.action === 'swap' && d.chosenCandidate) {
      spans.push({
        type: 'swapped',
        originalText: d.originalText,
        replacementText: d.chosenCandidate.name,
        referenceId: d.referenceId,
      });
    } else if (d.action === 'keep') {
      spans.push({
        type: 'kept',
        originalText: d.originalText,
        referenceId: d.referenceId,
      });
    } else {
      spans.push({
        type: 'unresolved',
        originalText: d.originalText,
        referenceId: d.referenceId,
      });
    }

    currentIndex = pos.end;
  }

  // Trailing text
  if (currentIndex < originalCopy.length) {
    spans.push({
      type: 'text',
      originalText: originalCopy.slice(currentIndex),
    });
  }

  return spans;
}
