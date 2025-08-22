// backend/routes/products.showcase.js
const express = require('express');
const router = express.Router();
const { SiteSettings, Product } = require('../models/models'); // ✅ правильный импорт
const withTenant = require('../middleware/withTenant');

// единая нормализация
function normalizeAvailability(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'в наличии' || s === 'published') return 'В наличии';
  if (s === 'под заказ') return 'Под заказ';
  if (s === 'нет в наличии' || s === 'нет') return 'Нет в наличии';
  return 'Нет в наличии';
}

// подключаем tenant middleware
router.use(withTenant);

/**
 * GET /api/products/showcase
 * Публичный эндпоинт для главной страницы.
 * Возвращает товары витрины (максимум 24),
 * в порядке, заданном в SiteSettings.showcase.productIds.
 */
router.get('/showcase', async (req, res) => {
  try {
    const settings = await SiteSettings.findOne({ tenantId: String(req.tenant.id) }).lean();
    const enabled = !!settings?.showcase?.enabled;
    const ids = Array.isArray(settings?.showcase?.productIds)
      ? settings.showcase.productIds.map(String).slice(0, 24)
      : [];

    if (!enabled || ids.length === 0) {
      return res.json([]);
    }

    // ищем только свои товары
    const items = await Product.find({
      _id: { $in: ids },
      tenantId: String(req.tenant.id),
    })
      .select('name price images availability group')
      .lean();

    // нормализуем статусы
    for (const it of items) {
      it.availability = normalizeAvailability(it.availability);
    }

    // сохраним порядок
    const orderMap = new Map(ids.map((id, idx) => [String(id), idx]));
    items.sort(
      (a, b) =>
        (orderMap.get(String(a._id)) ?? 999) -
        (orderMap.get(String(b._id)) ?? 999)
    );

    res.json(items);
  } catch (e) {
    console.error('showcase error:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
