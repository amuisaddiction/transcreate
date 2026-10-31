import test from 'node:test';
import assert from 'node:assert/strict';
import { runLocalization } from '../src/agent/runLocalization.js';
import { ProviderLLMClient } from '../src/adapters/llm/ProviderLLMClient.js';
import { HttpQlooClient } from '../src/adapters/qloo/HttpQlooClient.js';
import { IQlooClient, QlooDiscoveryResult, QlooHealthResult, QlooResolutionResult } from '../src/adapters/qloo/QlooClient.js';

test('Qloo API 401 auth failure records error in trace, sets action to unresolved, and preserves copy', async () => {
  const failingQloo: IQlooClient = {
    mode: 'live',
    async healthCheck(): Promise<QlooHealthResult> {
      return { ok: false, mode: 'live', message: 'Qloo authentication failed (HTTP 401)' };
    },
    async resolveEntity(): Promise<QlooResolutionResult> {
      throw new Error('Qloo authentication failed (HTTP 401). Verify credentials.');
    },
    async discoverCandidates(): Promise<QlooDiscoveryResult> {
      throw new Error('Should not be called');
    },
  };

  const llm = new ProviderLLMClient();
  const result = await runLocalization(
    {
      copy: 'Our new campaign is the Friends reunion of productivity apps.',
      market: 'Mumbai',
    },
    failingQloo,
    llm
  );

  assert.equal(result.verified, true);
  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0].action, 'unresolved');
  assert.match(result.decisions[0].reason, /Qloo API error/i);
  // Preserves original text without mangling
  assert.equal(result.transcreatedCopy, 'Our new campaign is the Friends reunion of productivity apps.');
  // Trace records the resolution error explicitly
  const errorTrace = result.trace.find((t) => t.status === 'error' && t.stage === 'resolution');
  assert.ok(errorTrace, 'Trace should include an error event for resolution');
  assert.match(errorTrace.message, /401/);
});

test('Empty Qloo discovery results triggers keep action and retains original reference', async () => {
  const emptyDiscoveryQloo: IQlooClient = {
    mode: 'live',
    async healthCheck(): Promise<QlooHealthResult> {
      return { ok: true, mode: 'live', latencyMs: 50 };
    },
    async resolveEntity(text: string, kind?: any): Promise<QlooResolutionResult> {
      return {
        status: 'exact',
        entity: { id: 'ent_friends_123', name: 'Friends', type: kind || 'tv' },
        observation: {
          id: 'obs_res_123',
          timestamp: new Date().toISOString(),
          operation: 'resolveEntity',
          endpoint: '/search',
          isSynthetic: false,
        },
      };
    },
    async discoverCandidates(): Promise<QlooDiscoveryResult> {
      return {
        candidates: [],
        observation: {
          id: 'obs_disc_456',
          timestamp: new Date().toISOString(),
          operation: 'discoverCandidates',
          endpoint: '/v2/insights',
          isSynthetic: false,
        },
      };
    },
  };

  const llm = new ProviderLLMClient();
  const result = await runLocalization(
    {
      copy: 'Our new campaign is the Friends reunion of productivity apps.',
      market: 'Mumbai',
    },
    emptyDiscoveryQloo,
    llm
  );

  assert.equal(result.verified, true);
  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0].action, 'keep');
  assert.equal(result.decisions[0].chosenCandidate, undefined);
  assert.equal(result.transcreatedCopy, 'Our new campaign is the Friends reunion of productivity apps.');
});

test('Qloo discovery error records trace error and safely preserves original reference', async () => {
  const errorDiscoveryQloo: IQlooClient = {
    mode: 'live',
    async healthCheck(): Promise<QlooHealthResult> {
      return { ok: true, mode: 'live', latencyMs: 40 };
    },
    async resolveEntity(text: string, kind?: any): Promise<QlooResolutionResult> {
      return {
        status: 'exact',
        entity: { id: 'ent_friends_123', name: 'Friends', type: kind || 'tv' },
        observation: {
          id: 'obs_res_123',
          timestamp: new Date().toISOString(),
          operation: 'resolveEntity',
          endpoint: '/search',
          isSynthetic: false,
        },
      };
    },
    async discoverCandidates(): Promise<QlooDiscoveryResult> {
      throw new Error('Qloo rate limit exceeded (HTTP 429)');
    },
  };

  const llm = new ProviderLLMClient();
  const result = await runLocalization(
    {
      copy: 'Our new campaign is the Friends reunion of productivity apps.',
      market: 'Mumbai',
    },
    errorDiscoveryQloo,
    llm
  );

  assert.equal(result.verified, true);
  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0].action, 'keep');
  assert.match(result.decisions[0].reason, /discovery error/i);
  assert.equal(result.transcreatedCopy, 'Our new campaign is the Friends reunion of productivity apps.');
  const errorTrace = result.trace.find((t) => t.status === 'error' && t.stage === 'discovery');
  assert.ok(errorTrace, 'Trace should include an error event for discovery failure');
});

test('HttpQlooClient redacts secret API key from healthCheck failures', async () => {
  const secretKey = 'qloo_live_secret_key_abcdef9876543210';
  // Point to a non-existent port to force network connection failure
  const client = new HttpQlooClient(secretKey, 'http://127.0.0.1:59999');

  const health = await client.healthCheck();
  assert.equal(health.ok, false);
  assert.equal(health.mode, 'live');
  assert.ok(health.message);
  // Ensure the raw secret key was not leaked into the health message
  assert.equal(health.message.includes(secretKey), false);
});

