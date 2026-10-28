import express from 'express';
import cors from 'cors';
import { healthRouter } from './routes/health.js';
import { marketsRouter } from './routes/markets.js';
import { localizeRouter } from './routes/localize.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '64kb' }));

// API routes
app.use('/api', healthRouter);
app.use('/api', marketsRouter);
app.use('/api', localizeRouter);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected internal error occurred.',
  });
});
