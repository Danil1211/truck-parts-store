// backend/routes/public.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { Tenant, User, SiteSettings } = require('../models/models');

const FRONT_URL   = process.env.FRONT_URL   || 'http://localhost:5173';
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'storo-shop.com';
const JWT_SECRET  = process.env.JWT_SECRET  || 'tenant_secret';

/**
 * URL входа в админку
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
 * Приводим поддомен к валидному виду
 */
function normalizeSubdomain(s) {
  const sub = String(s || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(sub)) return null;
  return sub;
}

/**
 * Транслитерация/слуга для company → base subdomain
 * (простая карта для ru/ua символов + очистка)
 */
function slugifyCompanyToSub(company) {
  const map = {
    а:'a', б:'b', в:'v', г:'g', ґ:'g', д:'d', е:'e', ё:'e', є:'ie', ж:'zh', з:'z', и:'i', і:'i', ї:'i', й:'y',
    к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'h', ц:'c', ч:'ch',
    ш:'sh', щ:'sch', ь:'', ы:'y', э:'e', ю:'yu', я:'ya',
    ' ':'-', '_':'-'
  };
  let s = String(company || '').toLowerCase();
  s = s.replace(/[а-яёєіїґ _]/g, ch => map[ch] ?? ch);
  s = s.replace(/[^a-z0-9-]/g, '');
  s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (!s) s = 'shop';
  if (s.length < 3) s = (s + '-shop').slice(0, 20);
  return s.slice(0, 30);
}

/**
 * Генерация уникального поддомена (base, base-1, base-2, …)
 */
async function ensureUniqueSubdomain(base) {
  const reserved = new Set(['www', 'api', 'admin', 'static', 'cdn']);
  let candidate = base;
  if (reserved.has(candidate)) candidate = `${candidate}-shop`;

  // один шанс без суффикса
  let found = await Tenant.findOne({ subdomain: candidate }).lean();
  if (!found) return candidate;

  // добавляем числовой суффикс
  for (let i = 1; i <= 999; i++) {
    const c = `${candidate}-${i}`;
    found = await Tenant.findOne({ subdomain: c }).lean();
    if (!found) return c;
  }
  // крайний случай — случайный хвост
  return `${candidate}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * POST /api/public/trial — регистрация арендатора (Trial 14 дней)
 * ВХОД: { company, email, phone? }
 * ВЫХОД: { ok, tenantId, subdomain, token, loginUrl, adminEmail, adminPassword }
 */
router.post('/trial', async (req, res, next) => {
  try {
    let { company, email, phone } = req.body;

    if (!company || !email) {
      return res.status(400).json({ error: 'company, email required' });
    }

    email = String(email).trim().toLowerCase();

    // генерим base subdomain из company и гарантируем уникальность
    const base = slugifyCompanyToSub(company);
    const subdomain = await ensureUniqueSubdomain(base);
    const normalized = normalizeSubdomain(subdomain);
    if (!normalized) {
      return res.status(400).json({ error: 'Не удалось сформировать поддомен' });
    }

    // создаём арендатора
    const tenant = await Tenant.create({
      name: company,
      subdomain: normalized,
      plan: 'trial',
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 дней Trial
      isBlocked: false,
    });

    // генерим временный пароль для owner
    const password = crypto.randomBytes(4).toString('hex'); // 8 символов
    const passwordHash = await bcrypt.hash(password, 10);

    // создаём администратора (owner)
    const owner = await User.create({
      tenantId: tenant._id.toString(),
      email,
      passwordHash,
      name: company,
      phone: phone || '',
      isAdmin: true,
      role: 'owner',
    });

    // создаём дефолтные настройки сайта
    await SiteSettings.create({
      tenantId: tenant._id.toString(),
      siteName: company,
      contacts: { email, phone: phone || '' },
    });

    // токен для автологина в админку
    const token = jwt.sign(
      { id: owner._id, tenantId: tenant._id },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      ok: true,
      tenantId: tenant._id.toString(),
      subdomain: tenant.subdomain,
      token,
      loginUrl: buildLoginUrl(tenant),
      adminEmail: email,
      adminPassword: password, // можно скрыть позже
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
