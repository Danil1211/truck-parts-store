// backend/middleware/withTenant.js
const { Tenant } = require('../models/models');

// Перечень хостов API (через запятую), чтобы отличать их от витрин.
const API_HOSTS = (process.env.API_HOSTS || 'api.storo-shop.com')
  .split(',')
  .map(h => h.trim().toLowerCase())
  .filter(Boolean);

function hostToSubdomain(host) {
  if (!host) return null;
  host = host.toLowerCase();

  // наши витрины вида *.storo-shop.com
  if (!host.endsWith('.storo-shop.com')) return null;

  const sub = host.split('.')[0];
  // исключаем служебные поддомены
  if (sub === 'www' || sub === 'api') return null;
  return sub;
}

module.exports = async function withTenant(req, res, next) {
  // Глобальные маршруты — без арендатора
  const isGlobal =
    req.path.startsWith('/api/public') ||
    req.path.startsWith('/api/superadmin') ||
    req.path.startsWith('/webhooks') ||
    req.path.startsWith('/healthz') ||
    req.path.startsWith('/api/cors-check');

  if (isGlobal) {
    req.tenantId = null;
    req.tenant = null;
    return next();
  }

  let tenantId = (req.get('x-tenant-id') || req.query.tenant || '').toString().trim();
  let subdomain = (req.get('x-tenant-subdomain') || '').toString().trim();

  // 1) Если явно не передали — пытаемся вывести из хоста / origin
  if (!tenantId && !subdomain) {
    let host = (req.hostname || req.headers.host || '').toLowerCase();

    // Если это запрос на API-домен, смотрим откуда пришёл (Origin/Referer)
    if (API_HOSTS.includes(host)) {
      const from = (req.get('origin') || req.get('referer') || '').toLowerCase();
      try {
        if (from) host = new URL(from).hostname.toLowerCase();
      } catch {}
    }

    subdomain = hostToSubdomain(host);
  }

  // 2) Если есть субдомен, но нет id — найдём id в БД
  if (!tenantId && subdomain) {
    try {
      const t = await Tenant.findOne({ subdomain }).select('_id').lean();
      if (t) tenantId = String(t._id);
    } catch (e) {
      console.error('withTenant: lookup error:', e);
    }
  }

  if (!tenantId) {
    return res.status(403).json({ error: 'Tenant not resolved' });
  }

  req.tenantId = tenantId;
  req.tenant = { id: tenantId, subdomain: subdomain || null };
  next();
};
