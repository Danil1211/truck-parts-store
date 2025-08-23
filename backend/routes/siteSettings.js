// backend/routes/siteSettings.js
const express = require('express');
const router = express.Router();
const { SiteSettings } = require('../models/models');
const { authMiddleware } = require('./protected');
const withTenant = require('../middleware/withTenant');

// парсим крупные тела только в этом роутере (5MB достаточно для base64 логотипов)
router.use(express.json({ limit: '5mb' }));
router.use(express.urlencoded({ extended: true, limit: '5mb' }));

// мультитенант
router.use(withTenant);

/** нормализация меню */
function sanitizeMenuArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((it, idx) => {
      const item = it || {};
      const title = String(item.title ?? '').trim() || 'Без названия';
      const url = String(item.url ?? '/').trim() || '/';
      const visible = !!item.visible;
      const order = Number.isFinite(Number(item.order)) ? Number(item.order) : idx;
      return { title, url, visible, order };
    })
    .sort((a, b) => a.order - b.order);
}

/** нормализация витрины */
function sanitizeShowcase(showcase) {
  const sc = showcase || {};
  const enabled = !!sc.enabled;
  let productIds = [];
  if (Array.isArray(sc.productIds)) {
    productIds = sc.productIds.filter(Boolean).map(String).slice(0, 24);
  }
  return { enabled, productIds };
}

/** собираем апдейт — целыми объектами (без точечных $set по глубине) */
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
    const sc = sanitizeShowcase(body.showcase);
    $set.showcase = { enabled: sc.enabled, productIds: sc.productIds };
  }

  if ('siteLogo' in body) $set.siteLogo = body.siteLogo ?? null; // base64/URL
  if ('favicon'  in body) $set.favicon  = body.favicon  ?? null; // base64/URL

  $set.updatedAt = new Date();
  return { $set };
}

/** GET /api/site-settings */
router.get('/', async (req, res) => {
  try {
    const doc = await SiteSettings.findOneAndUpdate(
      { tenantId: req.tenantId },
      { $setOnInsert: { tenantId: req.tenantId } },
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

    const update = buildUpdateFromBody(req.body);

    const updated = await SiteSettings.findOneAndUpdate(
      { tenantId: req.tenantId },
      { ...update, $set: { ...update.$set, tenantId: req.tenantId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    res.json(updated);
  } catch (err) {
    console.error('Ошибка обновления настроек:', err);
    res.status(500).json({ error: 'Ошибка обновления настроек' });
  }
});

module.exports = router;
