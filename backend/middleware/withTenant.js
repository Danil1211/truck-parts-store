// backend/middleware/withTenant.js
const { Tenant } = require('../models/models');

const BASE_DOMAIN = (process.env.BASE_DOMAIN || 'storo-shop.com').toLowerCase();

/**
 * Извлекаем hostname из строки (host header, origin, referer и т.п.)
 */
function toHostname(value = '') {
  try {
    if (!value) return '';
    // если приходит как "example.com:443"
    if (!value.includes('://') && value.includes(':')) {
      return value.split(':')[0].toLowerCase();
    }
    // если полноценный origin/url
    if (value.includes('://')) {
      return new URL(value).hostname.toLowerCase();
    }
    return String(value || '').toLowerCase();
  } catch {
    return String(value || '').toLowerCase();
  }
}

/**
 * Находим арендатора по hostname (субдомен *.BASE_DOMAIN или кастомный домен)
 */
async function findTenantByHostname(hostname) {
  if (!hostname) return null;

  // кастомный домен
  const byCustom = await Tenant.findOne({ customDomain: hostname }).lean();
  if (byCustom) return byCustom;

  // поддомен *.BASE_DOMAIN
  if (
    hostname.endsWith(`.${BASE_DOMAIN}`) &&
    hostname !== BASE_DOMAIN &&
    hostname !== `www.${BASE_DOMAIN}`
  ) {
    const sub = hostname.slice(0, -(BASE_DOMAIN.length + 1));
    if (sub && sub !== 'www') {
      const bySub = await Tenant.findOne({ subdomain: sub }).lean();
      if (bySub) return bySub;
    }
  }

  return null;
}

module.exports = async function withTenant(req, res, next) {
  try {
    // 1) Явный tenantId (хедер)
    const headerTenantId = (req.headers['x-tenant-id'] || req.headers['x-tenant'] || '').toString().trim();
    if (headerTenantId) {
      const t = await Tenant.findById(headerTenantId).lean();
      if (t) {
        req.tenant = t;
        req.tenantId = t._id.toString();
        return next();
      }
    }

    // 2) Query (?tenant=...)
    if (req.query && req.query.tenant) {
      const t = await Tenant.findById(req.query.tenant.toString()).lean();
      if (t) {
        req.tenant = t;
        req.tenantId = t._id.toString();
        return next();
      }
    }

    // 3) По домену (origin → referer → x-forwarded-host → host)
    const originHost  = toHostname(req.headers.origin);
    const refererHost = toHostname(req.headers.referer);
    const xfwdHost    = toHostname(req.headers['x-forwarded-host']);
    const host        = toHostname(req.headers.host);

    let t =
      (originHost  && await findTenantByHostname(originHost))  ||
      (refererHost && await findTenantByHostname(refererHost)) ||
      (xfwdHost    && await findTenantByHostname(xfwdHost))    ||
      (host        && await findTenantByHostname(host));

    if (!t) {
      console.error("❌ Tenant not resolved", {
        originHost,
        refererHost,
        xfwdHost,
        host,
      });
      return res.status(403).json({ error: 'Tenant not resolved' });
    }

    req.tenant = t;
    req.tenantId = t._id.toString();
    return next();
  } catch (e) {
    console.error('withTenant error:', e);
    return res.status(500).json({ error: 'Tenant resolver error' });
  }
};
