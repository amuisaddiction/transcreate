import { randomUUID } from 'node:crypto';
import { ILLMClient } from '../adapters/llm/LLMClient.js';
import { ProviderLLMClient } from '../adapters/llm/ProviderLLMClient.js';
import { IQlooClient } from '../adapters/qloo/QlooClient.js';
import { getQlooClient } from '../adapters/qloo/index.js';
import {
  Candidate,
  LocalizationResult,
  LocalizeRequest,
  QlooEntity,
  QlooObservation,
  ReferenceDecision,
  TraceEvent,
} from './contracts.js';
import { buildEvidenceLedger, generateEditSpans } from '../services/evidence.js';
import { verifyRewrite } from '../services/verifyRewrite.js';

export async function runLocalization(
  request: LocalizeRequest,
  qlooClient: IQlooClient = getQlooClient(),
  llmClient: ILLMClient = new ProviderLLMClient()
): Promise<LocalizationResult> {
  const startTime = Date.now();
  const trace: TraceEvent[] = [];
  const observations: QlooObservation[] = [];
  const decisions: ReferenceDecision[] = [];

  const addTrace = (
    stage: TraceEvent['stage'],
    status: TraceEvent['status'],
    message: string,
    durationMs?: number,
    details?: Record<string, unknown>
  ) => {
    trace.push({
      id: `evt_${randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      stage,
      status,
      message,
      durationMs,
      details,
    });
  };

  addTrace('extraction', 'info', `Beginning analysis of ${request.copy.length} character copy for market: ${request.market}.`);

  // Step 1: Reference Extraction
  const extractStart = Date.now();
  const extracted = await llmClient.extractReferences(request.copy);
  const extractDuration = Date.now() - extractStart;

  if (extracted.length === 0) {
    addTrace('extraction', 'warning', 'No supported cultural references (movie, tv, artist, brand) identified in source copy.', extractDuration);
    return {
      originalCopy: request.copy,
      transcreatedCopy: request.copy,
      edits: [{ type: 'text', originalText: request.copy }],
      decisions: [],
      receipts: [],
      trace,
      mode: qlooClient.mode,
      verified: true,
      retryCount: 0,
      executionTimeMs: Date.now() - startTime,
    };
  }

  addTrace(
    'extraction',
    'success',
    `Extracted ${extracted.length} reference(s): ${extracted.map((e) => `"${e.originalText}" (${e.kind})`).join(', ')}.`,
    extractDuration,
    { count: extracted.length }
  );

  // Step 2 & 3: Resolve Entities & Discover Candidates for each reference
  for (const ref of extracted) {
    const resolveStart = Date.now();
    let resolution;
    try {
      resolution = await qlooClient.resolveEntity(ref.originalText, ref.kind);
      observations.push(resolution.observation);
    } catch (apiErr: any) {
      const errMsg = apiErr.message || 'Qloo API request failed';
      addTrace('resolution', 'error', `Qloo API failure during resolution of "${ref.originalText}": ${errMsg}`, Date.now() - resolveStart);
      decisions.push({
        referenceId: ref.id,
        originalText: ref.originalText,
        kind: ref.kind,
        action: 'unresolved',
        reason: `Qloo API error: ${errMsg}. Original reference retained.`,
        rejectedCandidates: [],
        evidenceObservationIds: [],
        modelInterpretation: 'API failure prevented live cultural intelligence resolution. Original copy retained.',
      });
      continue;
    }

    const resolveDuration = Date.now() - resolveStart;

    if (resolution.status === 'not_found' || !resolution.entity) {
      addTrace(
        'resolution',
        'warning',
        `Could not resolve "${ref.originalText}" in Qloo cultural ontology. Retaining original reference.`,
        resolveDuration,
        { reference: ref.originalText }
      );

      decisions.push({
        referenceId: ref.id,
        originalText: ref.originalText,
        kind: ref.kind,
        action: 'keep',
        reason: `Qloo could not resolve "${ref.originalText}" to a canonical entity. Retaining original.`,
        rejectedCandidates: [],
        evidenceObservationIds: [resolution.observation.id],
        modelInterpretation: 'Unverified cultural entities are retained to prevent hallucinations.',
      });
      continue;
    }

    if (resolution.status === 'ambiguous') {
      addTrace(
        'resolution',
        'warning',
        `Reference "${ref.originalText}" is ambiguous with multiple Qloo matches.`,
        resolveDuration,
        { candidateCount: resolution.candidates?.length }
      );

      decisions.push({
        referenceId: ref.id,
        originalText: ref.originalText,
        kind: ref.kind,
        action: 'unresolved',
        reason: `Ambiguous match for "${ref.originalText}". Requires editorial confirmation.`,
        rejectedCandidates: [],
        evidenceObservationIds: [resolution.observation.id],
        modelInterpretation: 'Multiple entities found; system pauses rather than guessing.',
        ambiguousChoices: resolution.candidates?.map((c) => ({ id: c.id, name: c.name, popularity: c.popularity })),
      });
      continue;
    }

    const entity = resolution.entity;
    addTrace(
      'resolution',
      'success',
      `Resolved "${ref.originalText}" to Qloo entity "${entity.name}" (${entity.type}) [ID: ${entity.id.slice(0, 8)}...].`,
      resolveDuration,
      { entityId: entity.id, name: entity.name }
    );

    // Discover candidates conditioned on target market
    const discoveryStart = Date.now();
    let discovery;
    try {
      discovery = await qlooClient.discoverCandidates({
        referenceEntity: entity,
        targetKind: ref.kind,
        market: request.market,
        limit: 5,
      });
      observations.push(discovery.observation);
    } catch (apiErr: any) {
      const errMsg = apiErr.message || 'Qloo candidate discovery failed';
      addTrace('discovery', 'error', `Qloo candidate discovery failed for "${entity.name}": ${errMsg}`, Date.now() - discoveryStart);
      decisions.push({
        referenceId: ref.id,
        originalText: ref.originalText,
        kind: ref.kind,
        action: 'keep',
        reason: `Qloo candidate discovery error: ${errMsg}. Retaining original reference.`,
        rejectedCandidates: [],
        evidenceObservationIds: [resolution.observation.id],
        modelInterpretation: 'Candidate discovery error. Fallback to original reference to prevent hallucination.',
      });
      continue;
    }

    const discoveryDuration = Date.now() - discoveryStart;

    addTrace(
      'discovery',
      'success',
      `Retrieved ${discovery.candidates.length} candidate(s) for "${entity.name}" in ${request.market}.`,
      discoveryDuration,
      { candidates: discovery.candidates.map((c) => c.name) }
    );

    // Evaluate candidates with LLM
    const decisionStart = Date.now();
    const evaluation = await llmClient.evaluateCandidates({
      copy: request.copy,
      targetMarket: request.market,
      reference: ref,
      originalEntity: entity,
      candidates: discovery.candidates,
    });
    const decisionDuration = Date.now() - decisionStart;

    let chosenCandidate: Candidate | undefined;
    if (evaluation.action === 'swap' && evaluation.chosenCandidateId) {
      // Invariant: Chosen candidate ID MUST exist in the Qloo-returned candidates list
      chosenCandidate = discovery.candidates.find((c) => c.id === evaluation.chosenCandidateId);
      if (!chosenCandidate) {
        // Fallback to top candidate or keep
        chosenCandidate = discovery.candidates[0];
      }
    }

    decisions.push({
      referenceId: ref.id,
      originalText: ref.originalText,
      kind: ref.kind,
      action: chosenCandidate ? 'swap' : 'keep',
      chosenCandidate,
      reason: evaluation.reason,
      rejectedCandidates: evaluation.rejectedCandidates,
      evidenceObservationIds: [resolution.observation.id, discovery.observation.id],
      modelInterpretation: evaluation.modelInterpretation,
    });

    addTrace(
      'decision',
      'success',
      `Decision for "${ref.originalText}": ${chosenCandidate ? `SWAP -> "${chosenCandidate.name}"` : 'KEEP ORIGINAL'} (${evaluation.reason})`,
      decisionDuration
    );
  }

  // Step 4: Constrained Rewriting & Verification Loop (Bounded Retries <= 2)
  let transcreatedCopy = request.copy;
  let verified = false;
  let retryCount = 0;
  const maxRetries = 2;

  while (retryCount <= maxRetries) {
    const rewriteStart = Date.now();
    transcreatedCopy = await llmClient.rewriteCopy({
      originalCopy: request.copy,
      targetMarket: request.market,
      decisions,
    });
    const rewriteDuration = Date.now() - rewriteStart;

    addTrace(
      'rewrite',
      'info',
      retryCount === 0 ? 'Generated initial transcreated copy.' : `Generated retry #${retryCount} copy.`,
      rewriteDuration
    );

    const verifyCheck = verifyRewrite(request.copy, transcreatedCopy, decisions);
    if (verifyCheck.ok) {
      verified = true;
      addTrace('verification', 'success', 'Rewrite verification passed: all approved replacements validated with no unauthorized entities.');
      break;
    } else {
      retryCount += 1;
      addTrace(
        'verification',
        'warning',
        `Verification failed: ${verifyCheck.violations.join('; ')}. ${retryCount <= maxRetries ? 'Retrying rewrite...' : 'Max retries reached.'}`
      );

      if (retryCount > maxRetries) {
        // Final fallback: keep original copy if rewrite fails verification
        addTrace('verification', 'error', 'Final rewrite verification failed. Reverting to original copy for safety.');
        transcreatedCopy = request.copy;
        // Mark swaps as keep
        for (const d of decisions) {
          if (d.action === 'swap') {
            d.action = 'keep';
            d.reason += ' (Reverted to original due to rewrite verification safety guard).';
          }
        }
      }
    }
  }

  // Step 5: Evidence Ledger & Edit Spans Assembly
  const receipts = buildEvidenceLedger(decisions, observations);
  const edits = generateEditSpans(request.copy, decisions);

  return {
    originalCopy: request.copy,
    transcreatedCopy,
    edits,
    decisions,
    receipts,
    trace,
    mode: qlooClient.mode,
    verified,
    retryCount,
    executionTimeMs: Date.now() - startTime,
  };
}
