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
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(clientDistPath, 'index.html');
  if (existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(200).send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <title>Transcreate Studio API</title>
        <style>body{font-family:serif;background:#F4EFE6;color:#16130F;padding:40px;line-height:1.6}h1{font-family:sans-serif}</style>
      </head>
      <body>
        <h1>Transcreate Editorial Studio API</h1>
        <p>The backend is running. Please run <code>npm run build</code> to compile the client proof sheet.</p>
        <p><a href="/api/health">Check /api/health</a></p>
      </body>
    </html>
  `);
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected internal error occurred.',
  });
});
