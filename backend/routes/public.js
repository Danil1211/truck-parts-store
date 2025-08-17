// backend/routes/public.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { Tenant, User, SiteSettings } = require('../models');

// URL фронта
const FRONT_URL = process.env.FRONT_URL || 'http://localhost:5173';

// 🔧 Функция построения ссылки для входа
function buildLoginUrl(tenant) {
  const prod = tenant.subdomain && (process.env.NODE_ENV === 'production');
  return prod
    ? `https://${tenant.subdomain}.storo-shop.com/login`   // 👈 заменил shopik.com → storo-shop.com
    : `${FRONT_URL}/login?tenant=${tenant._id}`;
}

// доступные тарифы
const plans = {
  free:  { products: 100 },
  basic: { products: 2000 },
  pro:   { products: 20000 },
};

router.get('/plans', (_req, res) => res.json(plans));

// регистрация нового арендатора
router.post('/signup', async (req, res, next) => {
  try {
    const { company, subdomain, email, password, plan = 'free' } = req.body;
    if (!company || !subdomain || !email || !password) {
      return res.status(400).json({ error: 'company, subdomain, email, password required' });
    }

    const tenant = await Tenant.create({
      name: company,
      subdomain,
      plan,
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 дней
    });

    await User.create({
      tenantId: tenant._id.toString(),
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name: company,
      phone: '',
      isAdmin: true,
      role: 'owner',
    });

    await SiteSettings.create({
      tenantId: tenant._id.toString(),
      siteName: company,
    });

    res.json({
      ok: true,
      tenantId: tenant._id.toString(),
      subdomain: tenant.subdomain,
      loginUrl: buildLoginUrl(tenant), // 👈 возвращаем новый URL
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
