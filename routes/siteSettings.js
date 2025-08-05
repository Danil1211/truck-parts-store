const express = require('express');
const router = express.Router();
const { SiteSettings } = require('../models');
const { authMiddleware } = require('../protected');

// Получить текущие настройки сайта
router.get('/', async (req, res) => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings();
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить настройки (ТОЛЬКО АДМИН)
router.put('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings();
    }

    // --- Обновление только разрешённых полей! ---
    const allowed = [
      'siteName',
      'contacts',
      'display',
      'siteLogo',
      'favicon',
      'palette',    // <-- палитра цветов!
      'template',   // <-- текущий дизайн/шаблон!
    ];
    for (const key of allowed) {
      if (typeof req.body[key] !== 'undefined') settings[key] = req.body[key];
    }
    settings.updatedAt = new Date();

    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления настроек' });
  }
});

module.exports = router;
