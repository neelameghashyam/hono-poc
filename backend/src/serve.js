import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import { serve } from '@hono/node-server';
import app from './app.js';

const port = parseInt(process.env.BACKEND_PORT || '3001', 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`HONO POC Backend running at http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});
