// routes/blog.js  (корень проекта: /routes/blog.js)
const express = require('express');
const router = express.Router();
const { Blog } = require('../models');
const { authMiddleware } = require('../protected');

// --- ВАЖНО: сначала админские пути, потом динамический "/:slug" ---

// GET /api/blog/admin/list — все записи (включая черновики)
router.get('/admin/list', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });
    const posts = await Blog.find(
      { tenantId: String(req.tenant.id) },
      null,
      { $tenantId: req.tenant.id }
    )
      .sort({ createdAt: -1 })
      .lean();
    res.json(posts);
  } catch (e) { next(e); }
});

// POST /api/blog — создать
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });

    const payload = {
      title: req.body.title,
      slug: req.body.slug,
      excerpt: req.body.excerpt || '',
      content: req.body.content || '',
      coverImage: req.body.coverImage || null,
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      published: !!req.body.published,
    };

    const doc = new Blog(payload);
    doc.$locals = { $tenantId: req.tenant.id }; // поставит tenantId в pre('save')
    await doc.save();

    res.json(doc);
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: 'Slug уже используется' });
    }
    next(e);
  }
});

// PUT /api/blog/:id — обновить
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });

    const fields = {
      title: req.body.title,
      slug: req.body.slug,
      excerpt: req.body.excerpt ?? '',
      content: req.body.content ?? '',
      coverImage: req.body.coverImage ?? null,
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      published: !!req.body.published,
      updatedAt: new Date(),
    };

    const updated = await Blog.findOneAndUpdate(
      { _id: req.params.id, tenantId: String(req.tenant.id) },
      fields,
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: 'Пост не найден' });
    res.json(updated);
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: 'Slug уже используется' });
    }
    next(e);
  }
});

// DELETE /api/blog/:id — удалить
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });
    await Blog.deleteOne({ _id: req.params.id, tenantId: String(req.tenant.id) });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// -------- ПУБЛИЧНЫЕ --------

// GET /api/blog — список опубликованных
router.get('/', async (req, res, next) => {
  try {
    const posts = await Blog.find(
      { tenantId: String(req.tenant.id), published: true },
      null,
      { $tenantId: req.tenant.id }
    )
      .sort({ createdAt: -1 })
      .lean();
    res.json(posts);
  } catch (e) { next(e); }
});

// GET /api/blog/:slug — одна опубликованная запись
router.get('/:slug', async (req, res, next) => {
  try {
    const post = await Blog.findOne(
      { tenantId: String(req.tenant.id), slug: req.params.slug, published: true },
      null,
      { $tenantId: req.tenant.id }
    ).lean();
    if (!post) return res.status(404).json({ error: 'Пост не найден' });
    res.json(post);
  } catch (e) { next(e); }
});

module.exports = router;
