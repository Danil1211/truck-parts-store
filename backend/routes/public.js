// backend/routes/public.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { Tenant, User, SiteSettings } = require('../models');

const FRONT_URL = process.env.FRONT_URL || 'http://localhost:5173';

// Ссылка для входа владельца: сразу в админ-логин
function buildLoginUrl(tenant) {
  const prod = process.env.NODE_ENV === 'production';
  if (prod && tenant.subdomain) {
    return `https://${tenant.subdomain}.storo-shop.com/admin/login`;
  }
  return `${FRONT_URL}/admin/login?tenant=${tenant._id}`;
}

const plans = {
  free:  { products: 100 },
  basic: { products: 2000 },
  pro:   { products: 20000 },
};

router.get('/plans', (_req, res) => res.json(plans));

// Регистрация арендатора (создание магазина)
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
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 дней
      isBlocked: false,
    });

    await User.create({
      tenantId: tenant._id.toString(),
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      name: company,
      phone: '',
      isAdmin: true,
      role: 'owner',
    });

    await SiteSettings.create({
      tenantId: tenant._id.toString(),
      siteName: company,
      contacts: { email, phone: '' },
    });

    res.json({
      ok: true,
      tenantId: tenant._id.toString(),
      subdomain: tenant.subdomain,
      loginUrl: buildLoginUrl(tenant),
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
