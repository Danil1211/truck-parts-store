const express = require('express');
const router = express.Router();
const { SiteSettings } = require('../models');
const { authMiddleware } = require('../protected');

/**
 * Вспомогалка: формируем $set для deep-полей по присланному body.
 * Ничего лишнего не трогаем.
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

    // palette: копируем все ключи как есть (в т.ч. с дефисами)
    if (d.palette && typeof d.palette === 'object') {
      for (const [k, v] of Object.entries(d.palette)) {
        $set[`display.palette.${k}`] = v;
      }
    }
  }

  if ('siteLogo' in body) $set['siteLogo'] = body.siteLogo ?? null;
  if ('favicon'  in body) $set['favicon']  = body.favicon ?? null;

  // системное поле обновления
  $set['updatedAt'] = new Date();

  return { $set };
}

/**
 * GET /api/site-settings
 * Возвращаем один документ. Если нет — создаём дефолт через upsert.
 */
router.get('/', async (req, res) => {
  try {
    const doc = await SiteSettings.findOneAndUpdate(
      {},                              // всегда один документ
      { $setOnInsert: {} },            // если нет — создать с дефолтами из схемы
      { new: true, upsert: true }      // вернуть новый/существующий
    ).lean();

    return res.json(doc);
  } catch (err) {
    console.error('site-settings GET error:', err);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * PUT /api/site-settings
 * Только для админа. Делаем атомарный upsert с частичным $set.
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const update = buildUpdateFromBody(req.body);

    const updated = await SiteSettings.findOneAndUpdate(
      {},                 // один документ в коллекции
      update,
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    ).lean();

    return res.json(updated);
  } catch (err) {
    console.error('Ошибка обновления настроек:', err);
    return res.status(500).json({ error: 'Ошибка обновления настроек' });
  }
});

module.exports = router;
