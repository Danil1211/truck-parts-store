// routes/site-settings.js
const express = require('express');
const router = express.Router();
const { SiteSettings } = require('../models');
const { authMiddleware } = require('../protected');
const withTenant = require('../middleware/withTenant');

/* подключаем tenant */
router.use(withTenant);

/**
 * Нормализация пунктов меню.
 */
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

/**
 * Нормализация витрины.
 */
function sanitizeShowcase(showcase) {
  const sc = showcase || {};
  const enabled = !!sc.enabled;
  let productIds = [];
  if (Array.isArray(sc.productIds)) {
    productIds = sc.productIds.filter(Boolean).map(String).slice(0, 24);
  }
  return { enabled, productIds };
}

/**
 * Собираем $set из body
 */
function buildUpdateFromBody(body = {}) {
  const $set = {};

  if ('siteName' in body) $set['siteName'] = body.siteName;

  if ('contacts' in body && body.contacts) {
    const c = body.contacts;
    if ('phone' in c)           $set['contacts.phone'] = c.phone;
    if ('phoneComment' in c)    $set['contacts.phoneComment'] = c.phoneComment;
    if ('email' in c)           $set['contacts.email'] = c.email;
    if ('contactPerson' in c)   $set['contacts.contactPerson'] = c.contactPerson;
    if ('address' in c)         $set['contacts.address'] = c.address;
    if ('phones' in c)          $set['contacts.phones'] = Array.isArray(c.phones) ? c.phones : [];

    if ('chatSettings' in c && c.chatSettings) {
      const ch = c.chatSettings;
      if ('startTime' in ch)     $set['contacts.chatSettings.startTime'] = ch.startTime;
      if ('endTime' in ch)       $set['contacts.chatSettings.endTime'] = ch.endTime;
      if ('workDays' in ch)      $set['contacts.chatSettings.workDays'] = Array.isArray(ch.workDays) ? ch.workDays : [];
      if ('iconPosition' in ch)  $set['contacts.chatSettings.iconPosition'] = ch.iconPosition;
      if ('color' in ch)         $set['contacts.chatSettings.color'] = ch.color;
      if ('greeting' in ch)      $set['contacts.chatSettings.greeting'] = ch.greeting;
    }
  }

  if ('display' in body && body.display) {
    const d = body.display;
    if ('categories' in d) $set['display.categories'] = d.categories;
    if ('showcase'   in d) $set['display.showcase'] = d.showcase;
    if ('promos'     in d) $set['display.promos'] = d.promos;
    if ('blog'       in d) $set['display.blog'] = d.blog;
    if ('chat'       in d) $set['display.chat'] = d.chat;
    if ('template'   in d) $set['display.template'] = d.template;

    if (d.palette && typeof d.palette === 'object') {
      for (const [k, v] of Object.entries(d.palette)) {
        $set[`display.palette.${k}`] = v;
      }
    }
  }

  // Меню
  if ('verticalMenu' in body)   $set['verticalMenu'] = sanitizeMenuArray(body.verticalMenu);
  if ('horizontalMenu' in body) $set['horizontalMenu'] = sanitizeMenuArray(body.horizontalMenu);

  // Витрина
  if ('showcase' in body) {
    const sc = sanitizeShowcase(body.showcase);
    $set['showcase.enabled'] = sc.enabled;
    $set['showcase.productIds'] = sc.productIds;
  }

  if ('siteLogo' in body) $set['siteLogo'] = body.siteLogo ?? null;
  if ('favicon'  in body) $set['favicon']  = body.favicon ?? null;

  $set['updatedAt'] = new Date();
  return { $set };
}

/**
 * GET /api/site-settings
 */
router.get('/', async (req, res) => {
  try {
    const doc = await SiteSettings.findOneAndUpdate(
      { tenantId: req.tenantId },
      { $setOnInsert: { tenantId: req.tenantId } },
      { new: true, upsert: true }
    ).lean();

    return res.json(doc);
  } catch (err) {
    console.error('site-settings GET error:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * PUT /api/site-settings
 */
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

    return res.json(updated);
  } catch (err) {
    console.error('Ошибка обновления настроек:', err);
    return res.status(500).json({ error: 'Ошибка обновления настроек' });
  }
});

module.exports = router;
