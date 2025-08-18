// backend/middleware/withTenant.js
const { Tenant } = require('../models');

const isObjectId = (s) => typeof s === 'string' && /^[0-9a-f]{24}$/i.test(s);

function subFromHost(host) {
  if (!host) return null;
  const h = String(host).toLowerCase();
  if (!h.endsWith('.storo-shop.com')) return null;
  const sub = h.split('.')[0];
  if (!sub || sub === 'www' || sub === 'api') return null;
  return sub;
}

function hostFromHeader(req, headerName) {
  try {
    const v = req.get(headerName);
    if (!v) return null;
    return new URL(v).hostname;
  } catch { return null; }
}

module.exports = async function withTenant(req, res, next) {
  // кандидаты
  const headerTenant = req.get('x-tenant-id');     // может быть _id или поддомен
  const queryTenant  = req.query.tenant || req.query.tenantId;

  const hostSub   = subFromHost(req.hostname || req.headers.host);
  const originSub = subFromHost(hostFromHeader(req, 'origin'))
                 || subFromHost(hostFromHeader(req, 'referer'));

  // глобальные маршруты без tenant
  const isGlobal =
    req.path.startsWith('/api/public')     ||
    req.path.startsWith('/api/superadmin') ||
    req.path.startsWith('/webhooks')       ||
    req.path.startsWith('/healthz')        ||
    req.path.startsWith('/api/cors-check');

  let hint = headerTenant || queryTenant || hostSub || originSub;

  if (!isGlobal && !hint) {
    return res.status(400).json({ error: 'Tenant not resolved' });
  }

  try {
    let tenantId = null;
    let tenantSub = hostSub || originSub || null;

    if (hint) {
      if (isObjectId(hint)) {
        tenantId = hint.toLowerCase();
      } else {
        const t = await Tenant.findOne({ subdomain: hint })
          .select('_id subdomain')
          .lean();
        if (!t && !isGlobal) {
          return res.status(400).json({ error: 'Tenant not found' });
        }
        if (t) {
          tenantId  = String(t._id);
          tenantSub = t.subdomain;
        }
      }
    }

    req.tenantId = tenantId || null;
    req.tenant   = { id: tenantId || null, subdomain: tenantSub };
    next();
  } catch (e) {
    console.error('withTenant error:', e);
    res.status(500).json({ error: 'Tenant resolver failed' });
  }
};
