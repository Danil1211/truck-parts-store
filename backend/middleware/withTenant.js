// backend/middleware/withTenant.js
const jwt = require('jsonwebtoken');
const { Types } = require('mongoose');
const { Tenant } = require('../models/models');

const BASE_DOMAIN = (process.env.BASE_DOMAIN || 'storo-shop.com').toLowerCase();

function toHostname(value = '') {
  try {
    const s = String(value || '').trim();
    if (!s) return '';
    if (!s.includes('://') && s.includes(':')) {
      return s.split(':')[0].toLowerCase();
    }
    if (s.includes('://')) {
      return new URL(s).hostname.toLowerCase();
    }
    return s.toLowerCase();
  } catch {
    return String(value || '').toLowerCase();
  }
}

async function findTenantByHostname(hostname) {
  if (!hostname) return null;

  // убираем www.
  hostname = hostname.replace(/^www\./, '');

  // custom domain
  const byCustom = await Tenant.findOne({ customDomain: hostname }).lean();
  if (byCustom) return byCustom;

  // subdomain.base-domain
  if (
    hostname.endsWith(`.${BASE_DOMAIN}`) &&
    hostname !== BASE_DOMAIN
  ) {
    const sub = hostname.slice(0, -(BASE_DOMAIN.length + 1));
    if (sub && sub !== 'www') {
      const bySub = await Tenant.findOne({ subdomain: sub }).lean();
      if (bySub) return bySub;
    }
  }
  return null;
}

async function findTenantByIdMaybe(id) {
  if (!id) return null;
  const val = String(id).trim();
  if (!val) return null;
  try {
    if (Types.ObjectId.isValid(val)) {
      const t = await Tenant.findById(val).lean();
      if (t) return t;
    }
  } catch {}
  return null;
}

module.exports = async function withTenant(req, res, next) {
  try {
    // 1) жёсткий x-tenant-id (из фронта)
    const headerTid = (req.headers['x-tenant-id'] || req.headers['x-tenant'] || '').toString().trim();
    if (headerTid) {
      const t = await findTenantByIdMaybe(headerTid);
      if (t) {
        req.tenant = t;
        req.tenantId = t._id.toString();
        return next();
      }
    }

    // 2) ?tenant= / ?tid=
    const queryTid = (req.query?.tenant || req.query?.tid || '').toString().trim();
    if (queryTid) {
      const t = await findTenantByIdMaybe(queryTid);
      if (t) {
        req.tenant = t;
        req.tenantId = t._id.toString();
        return next();
      }
    }

    // 3) cookie tid
    const cookie = (req.headers.cookie || '');
    const m = cookie.match(/(?:^|;\s*)tid=([a-f0-9]{24})/i);
    if (m?.[1]) {
      const t = await findTenantByIdMaybe(m[1]);
      if (t) {
        req.tenant = t;
        req.tenantId = t._id.toString();
        return next();
      }
    }

    // 4) Authorization: Bearer <jwt> (tenantId внутри токена)
    const auth = (req.headers.authorization || '').trim();
    if (auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim();
      try {
        const payload = jwt.decode(token);
        const tid = payload?.tenantId || payload?.tid;
        if (tid) {
          const t = await findTenantByIdMaybe(tid);
          if (t) {
            req.tenant = t;
            req.tenantId = t._id.toString();
            return next();
          }
        }
      } catch {}
    }

    // 5) по хостам: Origin → Referer → X-Forwarded-Host → Host
    const originHost  = toHostname(req.headers.origin);
    const refererHost = toHostname(req.headers.referer);
    const xfwdHost    = toHostname(req.headers['x-forwarded-host']);
    const host        = toHostname(req.headers.host);

    let t =
      (originHost  && await findTenantByHostname(originHost)) ||
      (refererHost && await findTenantByHostname(refererHost)) ||
      (xfwdHost    && await findTenantByHostname(xfwdHost)) ||
      (host        && await findTenantByHostname(host));

    if (!t) {
      // healthchecks, HEAD / и т.п.: пропускаем без арендатора, чтобы платформа не падала на 403
      if (req.method === 'HEAD' || req.path === '/' || req.path === '/healthz') {
        return res.status(204).end();
      }
      console.error("❌ Tenant not resolved", {
        originHost, refererHost, xfwdHost, host,
        headers: {
          host: req.headers.host,
          origin: req.headers.origin,
          referer: req.headers.referer,
        }
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
