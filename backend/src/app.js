import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { stream, streamSSE } from 'hono/streaming';
import { HTTPException } from 'hono/http-exception';

import { health } from './handlers/health.js';
import { showcaseMiddleware } from './middleware/showcase.js';
import {
  routingBasic,
  routingParams,
  routingQuery,
  middlewareDemo,
  contextDemo,
  validationDemo,
  corsDemo,
} from './handlers/showcase.js';

const app = new Hono();

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  '/api/*',
  cors({
    origin: (origin) => origin || process.env.FRONTEND_URL || 'http://localhost:5173',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-Request-Id', 'X-Response-Time', 'X-Powered-By', 'X-Hono-Version'],
  })
);

// ── PUBLIC ROUTES ─────────────────────────────────────────────────────────────
app.get('/api/health', health);



// ── SHOWCASE ROUTES ───────────────────────────────────────────────────────────
// All showcase routes go through the showcase middleware (timing, requestId, etc.)
app.use('/api/showcase/*', showcaseMiddleware);

// 1. Routing demos
app.get('/api/showcase/routing/basic', routingBasic);
app.get('/api/showcase/routing/query', routingQuery);
app.get('/api/showcase/routing/:version/:id', routingParams);

// Method chaining demo — same path, different methods
app
  .get('/api/showcase/routing/methods', (c) =>
    c.json({ method: 'GET', tip: 'GET — read data', feature: 'routing.methods' })
  )
  .post('/api/showcase/routing/methods', (c) =>
    c.json({ method: 'POST', tip: 'POST — create data', feature: 'routing.methods' })
  )
  .put('/api/showcase/routing/methods', (c) =>
    c.json({ method: 'PUT', tip: 'PUT — update data', feature: 'routing.methods' })
  )
  .delete('/api/showcase/routing/methods', (c) =>
    c.json({ method: 'DELETE', tip: 'DELETE — remove data', feature: 'routing.methods' })
  );

// 2. Middleware demo
app.get('/api/showcase/middleware', middlewareDemo);

// 3. Context demo
app.get('/api/showcase/context', contextDemo);

// 4. Validation demo
app.post('/api/showcase/validation', validationDemo);

// 5. Streaming demo — plain text stream
app.get('/api/showcase/streaming', async (c) => {
  const lines = [
    '🔥 Hono streaming started...',
    '⚡ Chunk 1 — streamed at ' + new Date().toISOString(),
    '📦 Chunk 2 — Hono supports ReadableStream natively',
    '🚀 Chunk 3 — Works on Node.js, Cloudflare Workers, Deno, Bun',
    '✅ Stream complete!',
  ];

  return stream(c, async (s) => {
    for (const line of lines) {
      await s.write(line + '\n');
      await s.sleep(350);
    }
  });
});

// 5b. SSE demo
app.get('/api/showcase/sse', (c) => {
  return streamSSE(c, async (s) => {
    for (let i = 0; i < 6; i++) {
      await s.writeSSE({
        event: 'message',
        data: JSON.stringify({
          count: i + 1,
          ts: new Date().toISOString(),
          msg: `Server-Sent Event #${i + 1}`,
        }),
      });
      await new Promise((r) => setTimeout(r, 500));
    }
    await s.writeSSE({ event: 'done', data: JSON.stringify({ msg: 'Stream ended' }) });
  });
});

// 6. Error handling demo
app.get('/api/showcase/error', (c) => {
  const type = c.req.query('type') || 'http';

  if (type === 'http') {
    throw new HTTPException(422, {
      message: 'Unprocessable Entity — intentional HTTPException demo',
    });
  }
  if (type === 'notfound') {
    throw new HTTPException(404, { message: 'Resource not found — intentional 404' });
  }
  if (type === 'server') {
    throw new Error('Unhandled server error — caught by app.onError()');
  }

  return c.json({
    tip: 'Add ?type=http, ?type=notfound or ?type=server to trigger errors',
    available: ['http', 'notfound', 'server'],
  });
});

// 7. CORS demo
app.get('/api/showcase/cors', corsDemo);
app.options('/api/showcase/cors', corsDemo); // preflight

// ── CENTRALIZED ERROR HANDLER ──────────────────────────────────────────────
// This is a Hono feature — one place to handle ALL unhandled errors
app.onError((err, c) => {
  console.error('[onError]', err.message);

  if (err instanceof HTTPException) {
    return c.json(
      {
        feature: 'error-handling',
        error: {
          code: 'HTTP_EXCEPTION',
          status: err.status,
          message: err.message,
        },
        tip: 'HTTPException is caught by app.onError — return structured JSON errors consistently',
      },
      err.status
    );
  }

  return c.json(
    {
      feature: 'error-handling',
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
      tip: 'app.onError() is the last line of defence — catches everything',
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: { code: 'NOT_FOUND', message: `Route ${c.req.method} ${c.req.path} not found` },
      tip: 'app.notFound() handles unmatched routes',
    },
    404
  );
});

export default app;