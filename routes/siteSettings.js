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
    res.json(settings.toObject());
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

    // Обновляем простые поля
    if (typeof req.body.siteName !== 'undefined') settings.siteName = req.body.siteName;
    if (typeof req.body.contacts !== 'undefined') settings.contacts = req.body.contacts;
    if (typeof req.body.siteLogo !== 'undefined') settings.siteLogo = req.body.siteLogo;
    if (typeof req.body.favicon !== 'undefined') settings.favicon = req.body.favicon;
    if (typeof req.body.template !== 'undefined') settings.display.template = req.body.template;

    // Аккуратное обновление display с глубоким мерджем
    if (typeof req.body.display !== 'undefined') {
      const newDisplay = req.body.display;

      settings.display.categories = typeof newDisplay.categories !== 'undefined' ? newDisplay.categories : settings.display.categories;
      settings.display.showcase = typeof newDisplay.showcase !== 'undefined' ? newDisplay.showcase : settings.display.showcase;
      settings.display.promos = typeof newDisplay.promos !== 'undefined' ? newDisplay.promos : settings.display.promos;
      settings.display.blog = typeof newDisplay.blog !== 'undefined' ? newDisplay.blog : settings.display.blog;
      settings.display.chat = typeof newDisplay.chat !== 'undefined' ? newDisplay.chat : settings.display.chat;
      settings.display.template = typeof newDisplay.template !== 'undefined' ? newDisplay.template : settings.display.template;

      // Глубокое слияние для palette
      if (typeof newDisplay.palette === 'object' && newDisplay.palette !== null) {
        settings.display.palette = {
          ...(settings.display.palette.toObject ? settings.display.palette.toObject() : settings.display.palette),
          ...newDisplay.palette
        };
      }
    }

    settings.updatedAt = new Date();

    await settings.save();

    res.json(settings.toObject());
  } catch (err) {
    console.error('Ошибка обновления настроек:', err);
    res.status(500).json({ error: 'Ошибка обновления настроек' });
  }
});

module.exports = router;
