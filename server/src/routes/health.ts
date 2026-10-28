import { Router } from 'express';
import { getQlooClient } from '../adapters/qloo/index.js';
import { config } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const qlooClient = getQlooClient();
  const qlooHealth = await qlooClient.healthCheck();

  res.json({
    status: 'ok',
    mode: qlooHealth.mode,
    qlooConfigured: Boolean(config.qlooApiKey),
    qlooOk: qlooHealth.ok,
    qlooMessage: qlooHealth.message,
    qlooLatencyMs: qlooHealth.latencyMs,
    llmConfigured: Boolean(config.llmApiKey),
    llmProvider: config.llmProvider,
    timestamp: new Date().toISOString(),
  });
});
