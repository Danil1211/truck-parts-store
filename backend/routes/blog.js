// backend/routes/blog.js
const express = require('express');
const router = express.Router();
const { Blog } = require('../models/models');
const { authMiddleware } = require('./protected');

/* ==============================
   АДМИНСКИЕ РОУТЫ
============================== */

// GET /api/blog/admin/list — все записи (включая черновики)
router.get('/admin/list', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });
    if (!req.tenant?.id) return res.status(400).json({ error: 'No tenant' });

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

// POST /api/blog — создать запись
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });
    if (!req.tenant?.id) return res.status(400).json({ error: 'No tenant' });

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
    doc.$locals = { $tenantId: req.tenant.id }; // tenantId проставится в pre('save')
    await doc.save();

    res.json(doc);
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ error: 'Slug уже используется' });
    }
    next(e);
  }
});

// PUT /api/blog/:id — обновить запись
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });
    if (!req.tenant?.id) return res.status(400).json({ error: 'No tenant' });

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
    if (e?.code === 11000) {
      return res.status(409).json({ error: 'Slug уже используется' });
    }
    next(e);
  }
});

// DELETE /api/blog/:id — удалить запись
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });
    if (!req.tenant?.id) return res.status(400).json({ error: 'No tenant' });

    await Blog.deleteOne({ _id: req.params.id, tenantId: String(req.tenant.id) });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ==============================
   ПУБЛИЧНЫЕ РОУТЫ
============================== */

// GET /api/blog — список опубликованных постов
router.get('/', async (req, res, next) => {
  try {
    if (!req.tenant?.id) return res.status(400).json({ error: 'No tenant' });

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
    if (!req.tenant?.id) return res.status(400).json({ error: 'No tenant' });

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
