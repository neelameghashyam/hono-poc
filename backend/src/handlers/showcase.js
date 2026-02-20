/**
 * HONO SHOWCASE HANDLERS
 * Each handler demonstrates a specific Hono feature.
 */

export const routingBasic = (c) => {
  return c.json({
    feature: 'routing',
    method: c.req.method,
    path: c.req.path,
    message: 'Basic route matched!',
    tip: 'app.get() / .post() / .put() / .delete() — define routes by method and path',
  });
};

export const routingParams = (c) => {
  const id = c.req.param('id');
  const version = c.req.param('version');
  return c.json({
    feature: 'routing.params',
    params: { id, version },
    matched: c.req.path,
    tip: 'Use :param in route paths — access via c.req.param("name")',
  });
};

export const routingQuery = (c) => {
  const all = {};
  const url = new URL(c.req.url);
  url.searchParams.forEach((v, k) => { all[k] = v; });
  return c.json({
    feature: 'routing.query',
    query: all,
    tip: 'c.req.query("key") for single param, iterate URLSearchParams for all',
  });
};

export const middlewareDemo = (c) => {
  const requestId = c.get('requestId');
  const startedAt = c.get('startedAt');
  const elapsed = startedAt ? `${Date.now() - startedAt}ms` : 'unknown';
  return c.json({
    feature: 'middleware',
    context_from_middleware: {
      requestId,
      elapsed,
      showcaseUser: c.get('showcaseUser'),
    },
    tip: 'Middleware sets values on context with c.set(). Handlers read them with c.get().',
    middleware_chain: [
      'cors() — built-in CORS middleware',
      'showcaseMiddleware — sets requestId, startedAt, showcaseUser',
      'this handler — reads those values',
    ],
    check_response_headers: ['X-Request-Id','X-Response-Time','X-Powered-By','X-Hono-Version'],
  });
};

export const contextDemo = (c) => {
  const headers = {};
  c.req.raw.headers.forEach((val, key) => { headers[key] = val; });
  return c.json({
    feature: 'context',
    what_is_context: 'c carries req, res, env and custom state through the entire lifecycle',
    context_properties: {
      'c.req.method': c.req.method,
      'c.req.path': c.req.path,
      'c.req.url': c.req.url,
      'c.get("requestId")': c.get('requestId'),
      'c.get("startedAt")': c.get('startedAt'),
      'c.get("showcaseUser")': c.get('showcaseUser'),
    },
    incoming_headers: headers,
    tip: 'Context is typed in TypeScript — c.get/c.set are fully type-safe with generics',
  });
};

export const validationDemo = async (c) => {
  let body = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({
      feature: 'validation', valid: false,
      errors: [{ field: 'body', message: 'Invalid or missing JSON body' }],
      tip: 'Send Content-Type: application/json with a JSON body',
    }, 400);
  }

  const errors = [];
  if (!body.name || typeof body.name !== 'string') {
    errors.push({ field: 'name', message: 'required — must be a string' });
  } else if (body.name.length < 2) {
    errors.push({ field: 'name', message: 'must be at least 2 characters' });
  }
  if (!body.email || typeof body.email !== 'string') {
    errors.push({ field: 'email', message: 'required — must be a string' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push({ field: 'email', message: 'must be a valid email address' });
  }
  if (body.age !== undefined) {
    if (typeof body.age !== 'number' || body.age < 0 || body.age > 150) {
      errors.push({ field: 'age', message: 'must be a number between 0 and 150' });
    }
  }

  if (errors.length > 0) {
    return c.json({
      feature: 'validation', valid: false, errors, received: body,
      tip: 'In production: use @hono/zod-validator middleware',
    }, 400);
  }

  return c.json({
    feature: 'validation', valid: true, data: body,
    message: 'All fields passed validation!',
    production_code: "import { zValidator } from '@hono/zod-validator';\nconst schema = z.object({\n  name: z.string().min(2),\n  email: z.string().email(),\n});\napp.post('/users', zValidator('json', schema), handler);",
  });
};

export const corsDemo = (c) => {
  return c.json({
    feature: 'cors',
    message: 'CORS is handled by hono/cors middleware — check the response headers!',
    config_used: {
      origin: 'dynamic — returns the request origin',
      allowMethods: ['GET','POST','PUT','DELETE','OPTIONS'],
      allowHeaders: ['Content-Type','Authorization'],
      exposeHeaders: ['X-Request-Id','X-Response-Time'],
    },
    setup_code: "import { cors } from 'hono/cors';\napp.use('/api/*', cors({\n  origin: (origin) => origin,\n  allowMethods: ['GET','POST','PUT','DELETE'],\n}));",
    check_headers: ['Access-Control-Allow-Origin','Access-Control-Allow-Methods'],
    tip: 'Open Network tab in DevTools — see CORS headers on this response',
    docs: 'https://hono.dev/docs/middleware/builtin/cors',
  });
};