import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const mode = process.env.MODE === 'live' ? 'live' : 'sample';

app.use(cors());
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_req, res) => {
  // Key presence is not proof of connectivity. qlooOk remains false until a real smoke check succeeds.
  res.json({
    mode,
    qlooConfigured: Boolean(process.env.QLOO_API_KEY),
    qlooOk: false,
    llmConfigured: Boolean(process.env.LLM_API_KEY),
    llmOk: false,
    note: 'Starter scaffold: live dependency checks are not implemented yet.'
  });
});

app.get('/api/markets', (_req, res) => {
  res.json({
    markets: [],
    note: 'Add only market presets verified by real Qloo smoke tests.'
  });
});

app.post('/api/localize', (_req, res) => {
  res.status(501).json({
    error: 'NOT_IMPLEMENTED',
    message: 'The localization pipeline is not implemented yet. No live recommendation was made.'
  });
});

app.listen(port, () => {
  console.log(`Transcreate server listening on port ${port}`);
});
