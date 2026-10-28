import test from 'node:test';
import assert from 'node:assert/strict';
import { redactSecret } from '../src/config.js';
import { app } from '../src/app.js';
import { healthRouter } from '../src/routes/health.js';

test('redactSecret redacts sensitive strings safely', () => {
  assert.equal(redactSecret('short'), '********');
  assert.equal(redactSecret('qloo_live_key_abcdef1234567890'), 'qloo...7890');
  assert.equal(redactSecret(''), '');
  assert.equal(redactSecret(undefined), '');
});

test('health endpoint does not expose raw secret credentials', async () => {
  // Test health router directly without requiring network socket binding
  let responseBody: any = null;
  const mockReq = {} as any;
  const mockRes = {
    json(data: any) {
      responseBody = data;
      return this;
    },
  } as any;

  // Retrieve the route handler registered on /health
  const layer = healthRouter.stack.find((s) => s.route?.path === '/health');
  assert.ok(layer?.route?.stack?.[0]?.handle, 'Health route handler should be registered');
  const handler = layer.route.stack[0].handle;

  await handler(mockReq, mockRes, () => {});

  assert.ok(responseBody, 'Should return a response body');
  assert.equal(typeof responseBody.mode, 'string');
  assert.equal(typeof responseBody.qlooConfigured, 'boolean');
  // Ensure raw credentials are never present in output
  assert.equal(responseBody.qlooApiKey, undefined);
  assert.equal(responseBody.llmApiKey, undefined);
});
