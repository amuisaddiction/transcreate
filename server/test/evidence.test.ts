import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvidenceLedger, generateEditSpans } from '../src/services/evidence.js';
import { QlooObservation, ReferenceDecision } from '../src/agent/contracts.js';

test('buildEvidenceLedger builds receipts strictly from real observation records', () => {
  const observation: QlooObservation = {
    id: 'obs_12345',
    operation: 'insights',
    endpoint: '/v2/insights',
    argsRedacted: { signal: 'Friends', market: 'Mumbai' },
    responseSummary: { topCandidate: 'Sarabhai vs Sarabhai', affinity: 0.88 },
    latencyMs: 45,
    timestamp: '2026-10-29T04:00:00.000Z',
    cacheHit: false,
    isSynthetic: false,
  };

  const decision: ReferenceDecision = {
    referenceId: 'ref_1',
    originalText: 'Friends',
    kind: 'tv',
    action: 'swap',
    chosenCandidate: {
      id: 'cand_1',
      name: 'Sarabhai vs Sarabhai',
      kind: 'tv',
      affinity: 0.88,
      popularity: 0.85,
      sourceObservationId: 'obs_12345',
    },
    reason: 'Demonstrated high affinity in Mumbai target market',
    rejectedCandidates: [],
    evidenceObservationIds: ['obs_12345'],
    modelInterpretation: 'Urban ensemble comedy milestone match.',
  };

  const receipts = buildEvidenceLedger([decision], [observation]);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].referenceId, 'ref_1');
  assert.equal(receipts[0].qlooObservation?.observationId, 'obs_12345');
  assert.equal(receipts[0].qlooObservation?.affinity, 0.88);
  assert.equal(receipts[0].qlooObservation?.isSynthetic, false);
  assert.match(receipts[0].limitations, /aggregate cultural affinities/);
});

test('generateEditSpans creates correct inline markup structure', () => {
  const original = 'Our new campaign is the Friends reunion of productivity apps.';
  const decisions: ReferenceDecision[] = [
    {
      referenceId: 'ref_1',
      originalText: 'Friends',
      kind: 'tv',
      action: 'swap',
      chosenCandidate: {
        id: 'cand_1',
        name: 'Sarabhai vs Sarabhai',
        kind: 'tv',
        sourceObservationId: 'obs_1',
      },
      reason: 'High affinity',
      rejectedCandidates: [],
      evidenceObservationIds: ['obs_1'],
      modelInterpretation: 'Parallel sitcom',
    },
  ];

  const spans = generateEditSpans(original, decisions);
  assert.equal(spans.length, 3);
  assert.equal(spans[0].type, 'text');
  assert.equal(spans[0].originalText, 'Our new campaign is the ');
  assert.equal(spans[1].type, 'swapped');
  assert.equal(spans[1].originalText, 'Friends');
  assert.equal(spans[1].replacementText, 'Sarabhai vs Sarabhai');
  assert.equal(spans[2].type, 'text');
  assert.equal(spans[2].originalText, ' reunion of productivity apps.');
});
