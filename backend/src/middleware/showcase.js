

let requestCounter = 0;

export const showcaseMiddleware = async (c, next) => {
  requestCounter++;
  const requestId = `hono-${Date.now()}-${requestCounter}`;
  const startedAt = Date.now();

  // Demonstrate c.set() — store values on context
  c.set('requestId', requestId);
  c.set('startedAt', startedAt);
  c.set('showcaseUser', { id: 'demo', role: 'viewer' });

  // Add custom response headers (visible in browser devtools)
  c.header('X-Request-Id', requestId);
  c.header('X-Powered-By', 'Hono');
  c.header('X-Hono-Version', '4.x');

  await next();

  // After handler — add timing header
  const elapsed = Date.now() - startedAt;
  c.header('X-Response-Time', `${elapsed}ms`);
};