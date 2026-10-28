import test from 'node:test';
import assert from 'node:assert/strict';
import { runLocalization } from '../src/agent/runLocalization.js';
import { SampleQlooClient } from '../src/adapters/qloo/SampleQlooClient.js';
import { ProviderLLMClient } from '../src/adapters/llm/ProviderLLMClient.js';

test('runLocalization transcreates Friends in Mumbai to Sarabhai vs Sarabhai with verified trace', async () => {
  const qloo = new SampleQlooClient();
  const llm = new ProviderLLMClient();

  const result = await runLocalization(
    {
      copy: 'Our new campaign is the Friends reunion of productivity apps.',
      market: 'Mumbai',
    },
    qloo,
    llm
  );

  assert.equal(result.verified, true);
  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0].originalText, 'Friends');
  assert.equal(result.decisions[0].action, 'swap');
  assert.equal(result.decisions[0].chosenCandidate?.name, 'Sarabhai vs Sarabhai');
  assert.match(result.transcreatedCopy, /Sarabhai vs Sarabhai reunion of productivity apps/);
  assert.equal(result.receipts.length, 1);
  assert.equal(result.receipts[0].qlooObservation?.isSynthetic, true);
  assert.ok(result.trace.length >= 4);
});

test('runLocalization preserves original copy when no cultural references are present', async () => {
  const qloo = new SampleQlooClient();
  const llm = new ProviderLLMClient();

  const result = await runLocalization(
    {
      copy: 'Our software provides real-time collaboration and analytics for agile development teams.',
      market: 'Mumbai',
    },
    qloo,
    llm
  );

  assert.equal(result.decisions.length, 0);
  assert.equal(result.transcreatedCopy, result.originalCopy);
  assert.equal(result.verified, true);
});
