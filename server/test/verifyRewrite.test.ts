import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyRewrite } from '../src/services/verifyRewrite.js';
import { ReferenceDecision } from '../src/agent/contracts.js';

test('verifyRewrite passes when replacement is accurately included and original is removed', () => {
  const original = 'Our new campaign is the Friends reunion of productivity apps.';
  const rewritten = 'Our new campaign is the Sarabhai vs Sarabhai reunion of productivity apps.';
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
      reason: 'High affinity in Mumbai market',
      rejectedCandidates: [],
      evidenceObservationIds: ['obs_1'],
      modelInterpretation: 'Strong ensemble sitcom parallel',
    },
  ];

  const result = verifyRewrite(original, rewritten, decisions);
  assert.equal(result.ok, true);
  assert.equal(result.violations.length, 0);
});

test('verifyRewrite fails when expected replacement is missing from rewritten copy', () => {
  const original = 'Our new campaign is the Friends reunion of productivity apps.';
  const rewritten = 'Our new campaign is the Office reunion of productivity apps.';
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
      reason: 'High affinity in Mumbai market',
      rejectedCandidates: [],
      evidenceObservationIds: ['obs_1'],
      modelInterpretation: 'Strong ensemble sitcom parallel',
    },
  ];

  const result = verifyRewrite(original, rewritten, decisions);
  assert.equal(result.ok, false);
  assert.match(result.violations[0], /Expected replacement "Sarabhai vs Sarabhai" was not found/);
});

test('verifyRewrite fails when original reference remains unswapped', () => {
  const original = 'Our new campaign is the Friends reunion of productivity apps.';
  const rewritten = 'Our new campaign is the Friends and Sarabhai vs Sarabhai reunion.';
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
      reason: 'High affinity in Mumbai market',
      rejectedCandidates: [],
      evidenceObservationIds: ['obs_1'],
      modelInterpretation: 'Strong ensemble sitcom parallel',
    },
  ];

  const result = verifyRewrite(original, rewritten, decisions);
  assert.equal(result.ok, false);
  assert.match(result.violations[0], /Original reference "Friends" was still detected/);
});

test('verifyRewrite fails when an unauthorized rejected candidate is hallucinated into copy', () => {
  const original = 'Our new campaign is the Friends reunion of productivity apps.';
  const rewritten = 'Our new campaign is the Sarabhai vs Sarabhai and Taarak Mehta reunion of productivity apps.';
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
      reason: 'High affinity in Mumbai market',
      rejectedCandidates: [
        {
          candidateId: 'cand_2',
          candidateName: 'Taarak Mehta',
          reason: 'Lower affinity index',
        },
      ],
      evidenceObservationIds: ['obs_1'],
      modelInterpretation: 'Strong ensemble sitcom parallel',
    },
  ];

  const result = verifyRewrite(original, rewritten, decisions);
  assert.equal(result.ok, false);
  assert.match(result.violations[0], /Unauthorized rejected candidate "Taarak Mehta" appeared/);
});
