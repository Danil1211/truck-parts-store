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
      ? sc.productIds.filter(Boolean).map(id => id.toString()).slice(0, 24)
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
      phones: Array.isArray(c.phones) ? c.phones : [],
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
    $set.showcase = sanitizeShowcase(body.showcase);
  }

  if ('siteLogo' in body) $set.siteLogo = body.siteLogo ?? null;
  if ('favicon'  in body) $set.favicon  = body.favicon  ?? null;

  $set.updatedAt = new Date();
  return { $set };
}

/** GET /api/site-settings */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenant._id; // ⚡ ObjectId, НЕ строка
    const doc = await SiteSettings.findOneAndUpdate(
      { tenantId },
      { $setOnInsert: { tenantId } },
      { new: true, upsert: true }
    ).lean();
    res.json(doc);
  } catch (err) {
    console.error('site-settings GET error:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/** PUT /api/site-settings */
router.put('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const tenantId = req.tenant._id; // ⚡ ObjectId
    const update = buildUpdateFromBody(req.body);

    const updated = await SiteSettings.findOneAndUpdate(
      { tenantId },
      { ...update, $set: { ...update.$set, tenantId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!updated) {
      return res.status(500).json({ error: 'Не удалось обновить настройки' });
    }

    res.json(updated.toObject ? updated.toObject() : updated);
  } catch (err) {
    console.error('Ошибка обновления настроек:', err);
    res.status(500).json({ error: 'Ошибка обновления настроек' });
  }
});

module.exports = router;
