// backend/middleware/withTenant.js
const { Tenant } = require('../models');

// Помощник: 24-символьный hex ObjectId?
const isObjectId = (s) => typeof s === 'string' && /^[0-9a-f]{24}$/i.test(s);

module.exports = async function withTenant(req, res, next) {
  // 1) кандидат из заголовка/квери/поддомена
  const headerTenant = req.get('x-tenant-id');         // может быть _id или поддомен
  const queryTenant  = req.query.tenant;               // то же
  const host         = String(req.hostname || req.headers.host || '').toLowerCase();

  let hostSub = null;
  if (host.endsWith('.storo-shop.com')) {
    const sub = host.split('.')[0];
    // игнорируем служебные
    if (sub && sub !== 'www' && sub !== 'api') hostSub = sub;
  }

  // 2) глобальные маршруты – без tenant
  const isGlobal =
    req.path.startsWith('/api/public')   ||
    req.path.startsWith('/api/superadmin') ||
    req.path.startsWith('/webhooks')     ||
    req.path.startsWith('/healthz')      ||
    req.path.startsWith('/api/cors-check');

  let hint = headerTenant || queryTenant || hostSub;

  if (!isGlobal && !hint) {
    return res.status(400).json({ error: 'Tenant not resolved' });
  }

  // 3) если это уже ObjectId — берём как есть,
  //    иначе трактуем как поддомен и резолвим в _id
  let tenantId = null;
  let tenantSub = hostSub || null;

  try {
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

    // 4) положим в req
    req.tenantId = tenantId || null;
    req.tenant   = { id: tenantId || null, subdomain: tenantSub };

    return next();
  } catch (e) {
    console.error('withTenant error:', e);
    return res.status(500).json({ error: 'Tenant resolver failed' });
  }
};
