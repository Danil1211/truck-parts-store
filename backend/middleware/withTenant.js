// backend/middleware/withTenant.js
const { Tenant } = require('../models');

// очень простой кэш: ключ -> { val, exp }
const cache = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 минут

function getCached(key) {
  const rec = cache.get(key);
  if (!rec) return null;
  if (Date.now() > rec.exp) { cache.delete(key); return null; }
  return rec.val;
}
function setCached(key, val) { cache.set(key, { val, exp: Date.now() + TTL_MS }); }

module.exports = async function withTenant(req, res, next) {
  // Глобальные маршруты, которым tenant не нужен
  const isGlobal =
    req.path.startsWith('/api/public')   ||
    req.path.startsWith('/api/superadmin') ||
    req.path.startsWith('/webhooks')     ||
    req.path.startsWith('/healthz');

  // 1) Dev: можно явно передать id арендатора
  const headerTenant = req.headers['x-tenant-id'];
  const queryTenant  = req.query.tenant;

  let tenantId = headerTenant || queryTenant || null;

  // 2) Prod: определяем по хосту (поддомен/кастом-домен)
  let host = (req.headers.host || req.hostname || '').toLowerCase();
  if (host.includes(':')) host = host.split(':')[0]; // убрать порт, если есть

  if (!tenantId) {
    if (host.endsWith('.storo-shop.com')) {
      // demo.storo-shop.com -> demo
      const sub = host.split('.')[0];
      const k = `sub:${sub}`;
      tenantId = getCached(k);
      if (!tenantId) {
        const t = await Tenant.findOne({ subdomain: sub }).select('_id').lean();
        if (t) { tenantId = String(t._id); setCached(k, tenantId); }
      }
    } else if (host) {
      // кастомный домен
      const k = `dom:${host}`;
      tenantId = getCached(k);
      if (!tenantId) {
        const t = await Tenant.findOne({ customDomain: host }).select('_id').lean();
        if (t) { tenantId = String(t._id); setCached(k, tenantId); }
      }
    }
  }

  if (!isGlobal && !tenantId) {
    return res.status(400).json({ error: 'Tenant not resolved' });
  }

  req.tenantId = tenantId || null;    // ВСЕГДА кладём именно ObjectId арендатора
  req.tenant   = { id: tenantId || null };

  next();
};
