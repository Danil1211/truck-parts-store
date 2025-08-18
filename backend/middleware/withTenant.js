// backend/middleware/withTenant.js
function pickSub(host) {
  if (!host) return null;
  const h = String(host).toLowerCase();
  if (!h.endsWith('.storo-shop.com')) return null;
  const sub = h.split('.')[0];
  // защитимся от служебных поддоменов
  if (!sub || sub === 'api' || sub === 'www') return null;
  return sub;
}

module.exports = function withTenant(req, res, next) {
  // 0) глобальные роуты без tenant
  const isGlobal =
    req.path.startsWith('/api/public') ||
    req.path.startsWith('/api/superadmin') ||
    req.path.startsWith('/webhooks') ||
    req.path.startsWith('/healthz');

  // 1) явные указания
  const headerTenant = req.headers['x-tenant-id'];
  const queryTenant  = req.query.tenant;

  // 2) из Host (работает, если запрашивают не api.*, а {shop}.storo-shop.com)
  const hostHeader = req.headers.host || req.hostname || '';
  const fromHost   = pickSub(hostHeader);

  // 3) из Origin/Referer (главный путь для запросов на api.storo-shop.com)
  let fromOrigin = null;
  try {
    if (req.headers.origin) {
      fromOrigin = pickSub(new URL(req.headers.origin).hostname);
    } else if (req.headers.referer) {
      fromOrigin = pickSub(new URL(req.headers.referer).hostname);
    }
  } catch (_) {}

  const tenantId = headerTenant || queryTenant || fromHost || fromOrigin;

  if (!isGlobal && !tenantId) {
    return res.status(400).json({ error: 'Tenant not resolved' });
  }

  req.tenantId = tenantId || null;
  req.tenant   = { id: tenantId || null };

  next();
};
