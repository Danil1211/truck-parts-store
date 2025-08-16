// routes/products.admin.js
const express = require('express');
const router = express.Router();
const { Product, Group } = require('../models');
const { authMiddleware } = require('../protected');

/**
 * GET /api/products/admin
 * Параметры:
 *  q           - поиск по имени (regex, i)
 *  group       - строка из поля Product.group (у тебя это строка)
 *  inStock     - "true" | "false"
 *  page        - номер страницы (1)
 *  limit       - размер страницы (20)
 *
 * Примечание:
 *   inStock === true трактуем как availability === "published"
 */
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });

    const {
      q = '',
      group = '',
      inStock = '',
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (q) {
      filter.name = { $regex: q.trim(), $options: 'i' };
    }

    // Фильтр по группе (строка)
    if (group) {
      filter.group = group;
    }

    // Фильтр наличия на базе availability
    if (inStock === 'true')  filter.availability = 'published';
    if (inStock === 'false') filter.availability = { $ne: 'published' };

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Product.find(filter)
        .select('name price images availability group')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
    });
  } catch (e) {
    console.error('products.admin list error:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * Группы для фильтра витрины.
 * Если используешь свою коллекцию Group — отдаём её.
 * Если нет групп — вернём пустой массив, это не ошибка.
 */
router.get('/groups', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });
    const groups = await Group.find({}).select('name parentId').lean();
    res.json(groups || []);
  } catch (e) {
    console.error('products.admin groups error:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
