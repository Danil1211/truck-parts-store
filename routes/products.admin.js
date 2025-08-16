// backend/routes/products.admin.js
const express = require('express');
const router = express.Router();
const { Product, Group } = require('../models');
const { authMiddleware } = require('../protected');

// GET /api/products/admin?q=&groupId=&inStock=&page=&limit=
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });

    const {
      q = '',
      groupId = '',
      inStock = '',
      page = 1,
      limit = 20,
    } = req.query;

    const filter = { isDeleted: { $ne: true } };

    if (q) {
      filter.name = { $regex: q.trim(), $options: 'i' };
    }
    if (groupId) {
      filter.groupId = groupId;
    }
    if (inStock === 'true') filter.inStock = true;
    if (inStock === 'false') filter.inStock = false;

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      Product.find(filter)
        .select('name price images inStock groupId')
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
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Список групп (для фильтра)
router.get('/groups', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });
    const groups = await Group.find({}).select('name parentId').lean();
    res.json(groups);
  } catch (e) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
