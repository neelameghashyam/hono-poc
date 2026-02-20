export const health = (c) => {
  return c.json({
    status: 'healthy',
    service: 'wipo-poc-backend',
    timestamp: new Date().toISOString(),
    devMode: process.env.DEV_BYPASS_AUTH === 'true',
  });
};
