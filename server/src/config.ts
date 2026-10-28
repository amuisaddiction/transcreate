import 'dotenv/config';
import { z } from 'zod';

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(3001),
  MODE: z.enum(['live', 'sample']).default('sample'),
  QLOO_API_KEY: z.string().optional().default(''),
  QLOO_BASE_URL: z.string().url().default('https://hackathon.api.qloo.com'),
  LLM_PROVIDER: z.string().default('gemini'),
  LLM_API_KEY: z.string().optional().default(''),
});

const parsed = ConfigSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid server configuration:', parsed.error.format());
  process.exit(1);
}

export const config = {
  port: parsed.data.PORT,
  mode: (parsed.data.QLOO_API_KEY && parsed.data.MODE === 'live') ? 'live' : 'sample',
  qlooApiKey: parsed.data.QLOO_API_KEY,
  qlooBaseUrl: parsed.data.QLOO_BASE_URL.replace(/\/+$/, ''),
  llmProvider: parsed.data.LLM_PROVIDER,
  llmApiKey: parsed.data.LLM_API_KEY,
  isLive: Boolean(parsed.data.QLOO_API_KEY && parsed.data.MODE === 'live'),
};

/** Redacts sensitive keys from any string or object */
export function redactSecret(value?: string | null): string {
  if (!value) return '';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
