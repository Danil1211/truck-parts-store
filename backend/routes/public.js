// backend/routes/public.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { Tenant, User, SiteSettings } = require('../models');

const FRONT_URL   = process.env.FRONT_URL   || 'http://localhost:5173';
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'storo-shop.com';

// Ссылка для входа владельца: сразу в админ-логин
function buildLoginUrl(tenant) {
  const prod = process.env.NODE_ENV === 'production';
  // Если на тенанте есть кастомный домен – используем его
  if (prod && tenant.customDomain) {
    return `https://${tenant.customDomain.replace(/\/+$/,'')}/admin/login`;
  }
  if (prod && tenant.subdomain) {
    return `https://${tenant.subdomain}.${BASE_DOMAIN}/admin/login`;
  }
  // dev / локалка
  return `${FRONT_URL.replace(/\/+$/,'')}/admin/login?tenant=${tenant._id}`;
}

const plans = {
  free:  { products: 100 },
  basic: { products: 2000 },
  pro:   { products: 20000 },
};

router.get('/plans', (_req, res) => res.json(plans));

// Утилита: нормализация и валидация поддомена
function normalizeSubdomain(s) {
  const sub = String(s || '').trim().toLowerCase();
  // разрешаем a-z, 0-9 и дефис; без ведущего/замыкающего дефиса; длина 3–63
  if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(sub)) {
    return null;
  }
  return sub;
}

// Регистрация арендатора (создание магазина)
router.post('/signup', async (req, res, next) => {
  try {
    let { company, subdomain, email, password, plan = 'free' } = req.body;

    if (!company || !subdomain || !email || !password) {
      return res.status(400).json({ error: 'company, subdomain, email, password required' });
    }

    // Валидации
    const normSub = normalizeSubdomain(subdomain);
    if (!normSub) {
      return res.status(400).json({ error: 'Некорректный поддомен (разрешены: a-z, 0-9, дефис; 3–63 символа, без дефиса в начале/конце)' });
    }
    subdomain = normSub;
    email = String(email).trim().toLowerCase();

    if (!plans[plan]) plan = 'free';

    // Мягкая проверка дубликатов для человеческой ошибки
    const subExists = await Tenant.findOne({ subdomain }).lean();
    if (subExists) {
      return res.status(409).json({ error: 'subdomain already in use' });
    }

    // создаём арендатора
    const tenant = await Tenant.create({
      name: company,
      subdomain,
      plan,
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 дней
      isBlocked: false,
    });

    // владелец магазина (админ)
    await User.create({
      tenantId: tenant._id.toString(),
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name: company,
      phone: '',
      isAdmin: true,
      role: 'owner',
    });

    // базовые настройки сайта
    await SiteSettings.create({
      tenantId: tenant._id.toString(),
      siteName: company,
      contacts: { email, phone: '' },
    });

    res.json({
      ok: true,
      tenantId: tenant._id.toString(),
      subdomain: tenant.subdomain,
      loginUrl: buildLoginUrl(tenant), // сразу ссылка на /admin/login
    });
  } catch (e) {
    // Красиво разворачиваем уникальные индексы (subdomain / unique парные индексы и т.п.)
    if (e && e.code === 11000) {
      const field = Object.keys(e.keyPattern || {})[0] || 'field';
      return res.status(409).json({ error: `${field} already in use` });
    }
    next(e);
  }
});

module.exports = router;
