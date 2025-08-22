// backend/routes/public.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { Tenant, User, SiteSettings } = require('../models/models');

const FRONT_URL   = (process.env.FRONT_URL   || 'http://localhost:5173').replace(/\/+$/, '');
const BASE_DOMAIN = (process.env.BASE_DOMAIN || 'storo-shop.com').replace(/\/+$/, '');
const SECRET      = process.env.JWT_SECRET || 'tenant_secret';

/* ========================= helpers ========================= */

function buildLoginUrl(tenant) {
  const prod = process.env.NODE_ENV === 'production';
  if (prod && tenant.customDomain) {
    return `https://${tenant.customDomain.replace(/\/+$/, '')}/admin/login`;
  }
  if (prod && tenant.subdomain) {
    return `https://${tenant.subdomain}.${BASE_DOMAIN}/admin/login`;
  }
  return `${FRONT_URL}/admin/login?tenant=${tenant._id}`;
}

function slugifyCompany(name) {
  const map = {
    а:'a', б:'b', в:'v', г:'g', ґ:'g', д:'d', е:'e', є:'ie', ё:'e', ж:'zh', з:'z', и:'i', і:'i', ї:'i', й:'i',
    к:'k', л:'l', м:'m', н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'h', ц:'ts', ч:'ch',
    ш:'sh', щ:'shch', ь:'', ю:'iu', я:'ia', ы:'y', э:'e',
  };
  let s = String(name || '').toLowerCase();
  s = s.replace(/[а-яёіїєґ]/g, ch => map[ch] ?? ch);
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
  if (!s) s = 'shop';
  if (s.length < 3) s = `${s}-shop`;
  return s.slice(0, 30).replace(/^-+|-+$/g, '');
}

function isValidSub(s) {
  return /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(s);
}

async function allocateSubdomain(base) {
  let candidate = base;
  const exists = async (sub) => !!(await Tenant.findOne({ subdomain: sub }).lean());
  if (!await exists(candidate)) return candidate;

  const suffixes = ['-shop', '-store', '-online'];
  for (const suf of suffixes) {
    const c = (base + suf).slice(0, 63);
    if (isValidSub(c) && !await exists(c)) return c;
  }
  for (let i = 0; i < 20; i++) {
    const c = `${base}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 63);
    if (isValidSub(c) && !await exists(c)) return c;
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`.slice(0, 63);
}

/* ========================= routes ========================= */

/**
 * POST /api/public/trial
 * Body: { email, company, phone? }
 * Resp: { ok, tenantId, subdomain, token, loginUrl, adminEmail, adminPassword }
 */
router.post('/trial', async (req, res) => {
  const stage = { at: 'A:validate' };
  try {
    let { company, email, phone = '' } = req.body || {};
    if (!company || !email) {
      return res.status(400).json({ error: 'company and email required', stage: stage.at });
    }
    email = String(email).trim().toLowerCase();

    // B: subdomain
    stage.at = 'B:allocateSubdomain';
    const base = slugifyCompany(company);
    const subdomain = await allocateSubdomain(base);
    if (!isValidSub(subdomain)) {
      return res.status(400).json({ error: 'failed to allocate subdomain', stage: stage.at });
    }

    // C: create tenant  (ВАЖНО: plan -> 'free', чтобы пройти enum; триал ведём по currentPeriodEnd)
    stage.at = 'C:createTenant';
    const tenant = await Tenant.create({
      name: company,
      subdomain,
      plan: 'free', // вместо 'trial' — enum-safe
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      isBlocked: false,
      // без 'contacts': поле может отсутствовать в схеме Tenant
    });

    // D: create owner
    stage.at = 'D:createOwner';
    const password = crypto.randomBytes(4).toString('hex'); // 8 символов
    const passwordHash = await bcrypt.hash(password, 10);
    const owner = await User.create({
      tenantId: String(tenant._id),
      email,
      passwordHash,
      name: company,
      phone: phone || '',
      isAdmin: true,
      role: 'owner',
    });

    // E: site settings (контакты на сайт — полезны и не ломают Tenant)
    stage.at = 'E:createSettings';
    await SiteSettings.create({
      tenantId: String(tenant._id),
      siteName: company,
      contacts: { email, phone: phone || '' },
    });

    // F: sign token
    stage.at = 'F:signToken';
    const token = jwt.sign(
      { id: String(owner._id), tenantId: String(tenant._id), role: 'owner' },
      SECRET,
      { expiresIn: '12h' }
    );

    const loginUrl = buildLoginUrl(tenant);

    return res.json({
      ok: true,
      tenantId: String(tenant._id),
      subdomain: tenant.subdomain,
      token,
      loginUrl,
      adminEmail: email,
      adminPassword: password,
    });
  } catch (e) {
    if (e && e.code === 11000) {
      const field = Object.keys(e.keyPattern || {})[0] || 'field';
      console.error('public/trial DUP', stage.at, e?.message);
      return res.status(409).json({ error: `${field} already in use`, stage: stage.at });
    }
    console.error('public/trial ERROR', stage.at, e?.message, e?.stack);
    return res.status(500).json({ error: 'Server error', stage: stage.at });
  }
});

module.exports = router;
