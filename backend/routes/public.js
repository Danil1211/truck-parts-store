// backend/routes/public.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { Tenant, User, SiteSettings } = require('../models');

const FRONT_URL = process.env.FRONT_URL || 'http://localhost:5173';
const ADMIN_DEV_URL = process.env.ADMIN_DEV_URL || FRONT_URL;

/** Собираем все полезные ссылки для арендатора */
function buildUrls(tenant) {
  const prod = process.env.NODE_ENV === 'production';
  const sub = tenant.subdomain;

  if (prod && sub) {
    const base = `https://${sub}.storo-shop.com`;
    return {
      siteUrl: `${base}`,
      siteLoginUrl: `${base}/login`,
      adminUrl: `${base}/admin`,
      adminLoginUrl: `${base}/admin/login`,
    };
  }

  // dev
  const q = `?tenant=${tenant._id}`;
  return {
    siteUrl: FRONT_URL,
    siteLoginUrl: `${FRONT_URL}/login${q}`,
    adminUrl: `${ADMIN_DEV_URL}/admin${q}`,
    adminLoginUrl: `${ADMIN_DEV_URL}/admin/login${q}`,
  };
}

// тарифы (можно читать и с бэка фронту)
const plans = {
  free:  { products: 100 },
  basic: { products: 2000 },
  pro:   { products: 20000 },
};

router.get('/plans', (_req, res) => res.json(plans));

/** POST /api/public/signup — регистрация магазина (арендатора) */
router.post('/signup', async (req, res, next) => {
  try {
    const { company, subdomain, email, password, plan = 'free' } = req.body;

    if (!company || !subdomain || !email || !password) {
      return res.status(400).json({ error: 'company, subdomain, email, password required' });
    }

    // создаём арендатора
    const tenant = await Tenant.create({
      name: company.trim(),
      subdomain: String(subdomain).trim().toLowerCase(),
      plan,
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 дней
      isBlocked: false,
    });

    // владелец (админ)
    await User.create({
      tenantId: tenant._id.toString(),
      email: String(email).trim().toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      name: company.trim(),
      phone: '',
      isAdmin: true,
      role: 'owner',
    });

    // базовые настройки сайта
    await SiteSettings.create({
      tenantId: tenant._id.toString(),
      siteName: company.trim(),
      contacts: { email: String(email).trim().toLowerCase(), phone: '' },
    });

    const urls = buildUrls(tenant);

    // 👉 возвращаем и siteLoginUrl, и adminLoginUrl
    res.json({
      ok: true,
      tenantId: tenant._id.toString(),
      subdomain: tenant.subdomain,
      ...urls,
    });
  } catch (e) {
    if (e && e.code === 11000) {
      const field = Object.keys(e.keyPattern || {})[0] || 'field';
      return res.status(409).json({ error: `${field} already in use` });
    }
    next(e);
  }
});

module.exports = router;
