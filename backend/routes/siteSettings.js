// backend/routes/siteSettings.js
const express = require('express');
const router = express.Router();
const { SiteSettings } = require('../models/models');
const { authMiddleware } = require('./protected');
const withTenant = require('../middleware/withTenant');

router.use(express.json({ limit: '5mb' }));
router.use(express.urlencoded({ extended: true, limit: '5mb' }));

router.use(withTenant);

function sanitizeMenuArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((it, idx) => {
    const item = it || {};
    return {
      title: String(item.title ?? '').trim() || 'Без названия',
      url: String(item.url ?? '/').trim() || '/',
      visible: !!item.visible,
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : idx,
    };
  }).sort((a, b) => a.order - b.order);
}

function sanitizeShowcase(showcase) {
  const sc = showcase || {};
  return {
    enabled: !!sc.enabled,
    productIds: Array.isArray(sc.productIds)
      ? sc.productIds.filter(Boolean).map(String).slice(0, 24)
      : [],
  };
}

function buildUpdateFromBody(body = {}) {
  const $set = {};

  if ('siteName' in body) $set.siteName = body.siteName ?? '';

  if (body.contacts && typeof body.contacts === 'object') {
    const c = body.contacts;
    const ch = c.chatSettings || {};
    $set.contacts = {
      phone: c.phone ?? '',
      phoneComment: c.phoneComment ?? '',
      email: c.email ?? '',
      contactPerson: c.contactPerson ?? '',
      address: c.address ?? '',
      phones: Array.isArray(c.phones) ? c.phones.map(String) : [],
      chatSettings: {
        startTime: ch.startTime ?? '09:00',
        endTime: ch.endTime ?? '18:00',
        workDays: Array.isArray(ch.workDays) ? ch.workDays : [],
        iconPosition: ch.iconPosition ?? 'left',
        color: ch.color ?? '#2291ff',
        greeting: ch.greeting ?? '',
      },
    };
  }

  if (body.display && typeof body.display === 'object') {
    const d = body.display;
    $set.display = {
      categories: !!d.categories,
      showcase: !!d.showcase,
      promos: !!d.promos,
      blog: !!d.blog,
      chat: !!d.chat,
      template: d.template || 'standard',
      palette: { ...(typeof d.palette === 'object' ? d.palette : {}) },
    };
  }

  if ('verticalMenu' in body)   $set.verticalMenu   = sanitizeMenuArray(body.verticalMenu);
  if ('horizontalMenu' in body) $set.horizontalMenu = sanitizeMenuArray(body.horizontalMenu);

  if ('showcase' in body) {
    const sc = sanitizeShowcase(body.showcase);
    $set.showcase = sc;
  }

  if ('siteLogo' in body) $set.siteLogo = body.siteLogo ?? null;
  if ('favicon'  in body) $set.favicon  = body.favicon  ?? null;

  $set.updatedAt = new Date();
  return { $set };
}

/** GET /api/site-settings */
router.get('/', async (req, res) => {
  try {
    console.log("🌍 GET /api/site-settings tenantId:", req.tenantId);

    const doc = await SiteSettings.findOneAndUpdate(
      { tenantId: String(req.tenantId) },
      { $setOnInsert: { tenantId: String(req.tenantId) } },
      { new: true, upsert: true }
    ).lean();

    res.json(doc);
  } catch (err) {
    console.error('❌ site-settings GET error:', err);
    res.status(500).json({ error: 'Ошибка сервера', details: String(err) });
  }
});

/** PUT /api/site-settings */
router.put('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin && req.user?.role !== 'owner') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    console.log("📝 PUT /api/site-settings tenantId:", req.tenantId);
    console.log("📝 Request body:", JSON.stringify(req.body, null, 2));

    const update = buildUpdateFromBody(req.body);
    console.log("🛠 Update object:", JSON.stringify(update, null, 2));

    const updated = await SiteSettings.findOneAndUpdate(
      { tenantId: String(req.tenantId) },
      { ...update, $set: { ...update.$set, tenantId: String(req.tenantId) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!updated) {
      console.error("⚠️ SiteSettings update returned null");
      return res.status(500).json({ error: 'Не удалось обновить настройки' });
    }

    res.json(updated.toObject ? updated.toObject() : updated);
  } catch (err) {
    console.error('🔥 Ошибка обновления настроек:', err);
    res.status(500).json({ error: 'Ошибка обновления настроек', details: String(err) });
  }
});

module.exports = router;
