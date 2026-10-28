import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { healthRouter } from './routes/health.js';
import { marketsRouter } from './routes/markets.js';
import { localizeRouter } from './routes/localize.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

export const app = express();

app.use(cors());
app.use(express.json({ limit: '64kb' }));

// API routes
app.use('/api', healthRouter);
app.use('/api', marketsRouter);
app.use('/api', localizeRouter);

// Serve static client bundle if built
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
      if (err) next();
    });
  });
}

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected internal error occurred.',
  });
});
