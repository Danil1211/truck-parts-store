// routes/categories.js
const express = require('express');
const router = express.Router();

const { Category } = require('./models');
const { authMiddleware } = require('./protected');
const withTenant = require('./middleware/withTenant');

// все роуты работают в контексте арендатора
router.use(withTenant);

/**
 * GET /api/categories
 * Список категорий арендатора
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId || 'default';
    const categories = await Category.find({ tenantId }).lean();
    res.json(categories);
  } catch (err) {
    console.error('Ошибка получения категорий:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * POST /api/categories
 * Создание категории (только админ)
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Только для админа' });
    }
    const tenantId = req.tenantId || 'default';
    const { name, slug, parentId = null } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Название и slug обязательны' });
    }

    const category = await Category.create({
      tenantId,
      name: String(name).trim(),
      slug: String(slug).trim(),
      parentId: parentId || null,
    });

    res.status(201).json(category);
  } catch (err) {
    console.error('Ошибка создания категории:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * PUT /api/categories/:id
 * Обновление категории (только админ)
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Только для админа' });
    }
    const tenantId = req.tenantId || 'default';

    const updated = await Category.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      req.body,
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Ошибка обновления категории:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * DELETE /api/categories/:id
 * Удаление категории (только админ)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Только для админа' });
    }
    const tenantId = req.tenantId || 'default';

    const deleted = await Category.findOneAndDelete({ _id: req.params.id, tenantId });
    if (!deleted) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    res.status(204).end();
  } catch (err) {
    console.error('Ошибка удаления категории:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
