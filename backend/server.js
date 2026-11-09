import { createApp } from './app.js';
import { createPool } from './config.js';

const pool = createPool();
await pool.query('SELECT id FROM mixology LIMIT 0');
const app = createApp(pool);
const server = app.listen(3000, '127.0.0.1', () => {
  console.log('Mixology: http://127.0.0.1:3000');
});
async function stop() {
  server.close();
  server.closeIdleConnections();
  await pool.end();
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
