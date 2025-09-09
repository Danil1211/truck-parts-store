// backend/middleware/withTenant.js
const jwt = require('jsonwebtoken');
const { Types } = require('mongoose');
const { Tenant } = require('../models/models');

const BASE_DOMAIN = (process.env.BASE_DOMAIN || 'storo-shop.com').toLowerCase();

function toHostname(value = '') {
  try {
    const s = String(value || '').trim();
    if (!s) return '';
    if (!s.includes('://') && s.includes(':')) return s.split(':')[0].toLowerCase();
    if (s.includes('://')) return new URL(s).hostname.toLowerCase();
    return s.toLowerCase();
  } catch {
    return String(value || '').toLowerCase();
  }
}

async function findTenantByHostname(hostname) {
  if (!hostname) return null;
  hostname = hostname.replace(/^www\./, '');

  const byCustom = await Tenant.findOne({ customDomain: hostname }).lean();
  if (byCustom) return byCustom;

  if (hostname.endsWith(`.${BASE_DOMAIN}`) && hostname !== BASE_DOMAIN) {
    const sub = hostname.slice(0, -(BASE_DOMAIN.length + 1));
    if (sub && sub !== 'www') {
      const bySub = await Tenant.findOne({ subdomain: sub }).lean();
      if (bySub) return bySub;
    }
  }
  return null;
}

async function findTenantByIdMaybe(val) {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (!Types.ObjectId.isValid(s)) return null;
  return await Tenant.findById(s).lean();
}

module.exports = async function withTenant(req, res, next) {
  try {
    // технические эндпоинты/методы пропускаем
    if (req.method === 'HEAD' || req.method === 'OPTIONS' || req.path === '/' || req.path === '/healthz') {
      return next();
    }

    // 1) X-Tenant-Id / X-Tenant
    const headerTid = (req.headers['x-tenant-id'] || req.headers['x-tenant'] || '').toString().trim();
    if (headerTid) {
      const t = await findTenantByIdMaybe(headerTid);
      if (t) { req.tenant = t; req.tenantId = t._id.toString(); return next(); }
    }

    // 2) query ?tenant / ?tid
    const queryTid = (req.query?.tenant || req.query?.tid || '').toString().trim();
    if (queryTid) {
      const t = await findTenantByIdMaybe(queryTid);
      if (t) { req.tenant = t; req.tenantId = t._id.toString(); return next(); }
    }

    // 3) cookie=tid
    const cookie = (req.headers.cookie || '');
    const m = cookie.match(/(?:^|;\s*)tid=([a-f0-9]{24})/i);
    if (m?.[1]) {
      const t = await findTenantByIdMaybe(m[1]);
      if (t) { req.tenant = t; req.tenantId = t._id.toString(); return next(); }
    }

    // 4) Authorization: Bearer <jwt> (только читаем payload)
    const auth = (req.headers.authorization || '').trim();
    if (auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim();
      try {
        const payload = jwt.decode(token);
        const tid = payload?.tenantId || payload?.tid;
        if (tid) {
          const t = await findTenantByIdMaybe(tid);
          if (t) { req.tenant = t; req.tenantId = t._id.toString(); return next(); }
        }
      } catch {}
    }

    // 5) hostы: Origin / Referer / X-Forwarded-Host / Host
    const originHost  = toHostname(req.headers.origin);
    const refererHost = toHostname(req.headers.referer);
    const xfwdHost    = toHostname(req.headers['x-forwarded-host']);
    const host        = toHostname(req.headers.host);

    let t =
      (originHost  && await findTenantByHostname(originHost)) ||
      (refererHost && await findTenantByHostname(refererHost)) ||
      (xfwdHost    && await findTenantByHostname(xfwdHost)) ||
      (host        && await findTenantByHostname(host));

    if (t) { req.tenant = t; req.tenantId = t._id.toString(); return next(); }

    // 6) ПОСЛЕДНИЙ резерв — тело запроса (JSON/FormData)
    const bodyTid = (req.body?.tenantId || req.body?.tenant || req.body?.tid || '').toString().trim();
    if (bodyTid) {
      const tb = await findTenantByIdMaybe(bodyTid);
      if (tb) { req.tenant = tb; req.tenantId = tb._id.toString(); return next(); }
    }

    // фейл — лог и 404, чтобы совпадало с прежней ошибкой в UI
    console.error("❌ Tenant not resolved", {
      method: req.method,
      path: req.path,
      originHost, refererHost, xfwdHost, host,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer,
        'x-tenant-id': req.headers['x-tenant-id'],
        authorization: req.headers.authorization ? 'present' : 'absent',
        contentType: req.headers['content-type']
      }
    });
    return res.status(404).json({ error: 'Ресурс не найден' });
  } catch (e) {
    console.error('withTenant error:', e);
    return res.status(500).json({ error: 'Tenant resolver error' });
  }
};
