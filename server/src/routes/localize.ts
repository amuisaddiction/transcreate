import { Router } from 'express';
import { LocalizeRequestSchema } from '../agent/contracts.js';
import { runLocalization } from '../agent/runLocalization.js';

export const localizeRouter = Router();

localizeRouter.post('/localize', async (req, res) => {
  const parsed = LocalizeRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'Request payload validation failed.',
      issues: parsed.error.format(),
    });
  }

  try {
    const result = await runLocalization(parsed.data);
    return res.json(result);
  } catch (err: any) {
    console.error('Localization pipeline error:', err);
    return res.status(500).json({
      error: 'LOCALIZATION_FAILED',
      message: err.message || 'An error occurred during cultural localization.',
    });
  }
});
