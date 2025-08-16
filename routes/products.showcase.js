const express = require('express');
const router = express.Router();
const { SiteSettings, Product } = require('../models');

/**
 * GET /api/products/showcase
 * Публичный эндпоинт для главной страницы.
 * Возвращает товары витрины в порядке, заданном в SiteSettings.showcase.productIds.
 * Не больше 24 штук. Только опубликованные.
 */
router.get('/showcase', async (req, res) => {
  try {
    const settings = await SiteSettings.findOne({}).lean();
    const enabled = !!settings?.showcase?.enabled;
    const ids = Array.isArray(settings?.showcase?.productIds)
      ? settings.showcase.productIds.map(String).slice(0, 24)
      : [];

    if (!enabled || ids.length === 0) {
      return res.json([]);
    }

    const items = await Product.find({
      _id: { $in: ids },
      availability: 'published',
    }).lean();

    // Сохраняем порядок
    const orderMap = new Map(ids.map((id, idx) => [String(id), idx]));
    items.sort((a, b) => (orderMap.get(String(a._id)) ?? 999) - (orderMap.get(String(b._id)) ?? 999));

    res.json(items);
  } catch (e) {
    console.error('showcase error:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
