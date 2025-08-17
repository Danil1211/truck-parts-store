// backend/middleware/withTenant.js
module.exports = function withTenant(req, res, next) {
  // 1) dev-режим: берём из заголовка X-Tenant-Id или ?tenant=
  const headerTenant = req.headers['x-tenant-id'];
  const queryTenant = req.query.tenant;

  // 2) prod-режим: определяем по поддомену *.storo-shop.com
  let hostTenant = null;
  const h = req.hostname || req.headers.host || '';
  if (h && h.endsWith('.storo-shop.com')) {
    hostTenant = h.split('.')[0]; // demo.storo-shop.com → demo
  }

  // 3) исключения — глобальные роуты не требуют tenant
  const isGlobal =
    req.path.startsWith('/api/public') ||
    req.path.startsWith('/api/superadmin') ||
    req.path.startsWith('/webhooks') ||
    req.path.startsWith('/healthz');

  // 4) выбираем tenantId
  const tenantId = headerTenant || queryTenant || hostTenant;

  if (!isGlobal && !tenantId) {
    return res.status(400).json({ error: 'Tenant not resolved' });
  }

  // кладём в req:
  req.tenantId = tenantId || null;
  req.tenant = { id: tenantId || null };
  next();
};
