// Роуты для категорий
const express = require('express');
const router = express.Router();
const { Category } = require('./models');
const { authMiddleware } = require('./protected');

router.get('/', async (req, res) => {
  const categories = await Category.find();
  res.json(categories);
});

router.post('/', authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Только для админа' });
  const { name, slug } = req.body;
  const category = await Category.create({ name, slug });
  res.status(201).json(category);
});

router.put('/:id', authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Только для админа' });
  const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Только для админа' });
  await Category.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

module.exports = router;