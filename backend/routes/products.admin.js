// backend/routes/products.admin.js
const express = require('express');
const router = express.Router();

const { Product, Group } = require('../models/models'); // ✅ правильный импорт
const { authMiddleware } = require('./protected');      // ✅ лежит в routes
const withTenant = require('../middleware/withTenant');

// Все эндпоинты здесь — только под конкретного арендатора
router.use(withTenant);

/**
 * GET /api/products/admin
 * Параметры:
 *  q           - строка поиска по имени (regex, i)
 *  group       - ИД группы (у тебя product.group хранится строкой)
 *  groupId     - альтернативное имя параметра (поддерживаем оба)
 *  inStock     - "true" | "false"
 *  page        - номер страницы (1)
 *  limit       - размер страницы (20)
 */
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const {
      q = '',
      group = '',
      groupId = '',
      inStock = '',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {
      tenantId: String(req.tenant.id), // ✅ всегда tenant.id
    };

    if (q) {
      filter.name = { $regex: q.trim(), $options: 'i' };
    }

    // Фильтр по группе
    const groupFilter = (groupId || group || '').trim();
    if (groupFilter) {
      filter.group = groupFilter; // у тебя group в товаре — строка
    }

    if (inStock === 'true') {
      filter.availability = 'В наличии';
    } else if (inStock === 'false') {
      filter.availability = { $ne: 'В наличии' };
    }

    const [items, total] = await Promise.all([
      Product.find(filter)
        .select('name price images availability group')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (e) {
    console.error('products.admin list error:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/products/groups
 * Группы для фильтра витрины
 */
router.get('/groups', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const groups = await Group.find({ tenantId: String(req.tenant.id) })
      .select('name parentId')
      .sort({ order: 1 })
      .lean();

    res.json(groups || []);
  } catch (e) {
    console.error('products.admin groups error:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
