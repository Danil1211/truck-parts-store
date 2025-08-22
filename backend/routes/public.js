// backend/routes/public.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Tenant, User, SiteSettings } = require('../models/models'); // ✅ правильный путь

const FRONT_URL   = process.env.FRONT_URL   || 'http://localhost:5173';
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'storo-shop.com';

/**
 * Сборка URL входа в админку
 */
function buildLoginUrl(tenant) {
  const prod = process.env.NODE_ENV === 'production';
  if (prod && tenant.customDomain) {
    return `https://${tenant.customDomain.replace(/\/+$/, '')}/admin/login`;
  }
  if (prod && tenant.subdomain) {
    return `https://${tenant.subdomain}.${BASE_DOMAIN}/admin/login`;
  }
  return `${FRONT_URL.replace(/\/+$/, '')}/admin/login?tenant=${tenant._id}`;
}

/**
 * Валидация поддомена
 */
function normalizeSubdomain(s) {
  const sub = String(s || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(sub)) return null;
  return sub;
}

/**
 * POST /api/public/signup — регистрация арендатора (Trial 14 дней)
 */
router.post('/signup', async (req, res, next) => {
  try {
    let { company, subdomain, email } = req.body;

    if (!company || !subdomain || !email) {
      return res.status(400).json({ error: 'company, subdomain, email required' });
    }

    subdomain = normalizeSubdomain(subdomain);
    if (!subdomain) return res.status(400).json({ error: 'Некорректный поддомен' });

    email = String(email).trim().toLowerCase();

    // Проверка уникальности
    const exists = await Tenant.findOne({ subdomain }).lean();
    if (exists) return res.status(409).json({ error: 'subdomain already in use' });

    // Создаём арендатора
    const tenant = await Tenant.create({
      name: company,
      subdomain,
      plan: 'trial',
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 дней Trial
      isBlocked: false,
    });

    // Генерация случайного пароля для админа
    const password = crypto.randomBytes(4).toString('hex'); // 8 символов
    const passwordHash = await bcrypt.hash(password, 10);

    // Создаём администратора (owner)
    await User.create({
      tenantId: tenant._id.toString(),
      email,
      passwordHash,
      name: company,
      phone: '',
      isAdmin: true,
      role: 'owner',
    });

    // Создаём настройки сайта
    await SiteSettings.create({
      tenantId: tenant._id.toString(),
      siteName: company,
      contacts: { email, phone: '' },
    });

    // Ответ клиенту
    res.json({
      ok: true,
      tenantId: tenant._id.toString(),
      subdomain: tenant.subdomain,
      loginUrl: buildLoginUrl(tenant),
      adminEmail: email,
      adminPassword: password, // показываем сразу (пока заглушка)
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
