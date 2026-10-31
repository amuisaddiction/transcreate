import { app } from './app.js';
import { config } from './config.js';

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Transcreate server running on port ${config.port} in ${config.mode.toUpperCase()} mode.`);
});
