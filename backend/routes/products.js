// backend/routes/products.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { Product, Group, SiteSettings } = require('../models/models'); // ✅ правильный импорт
const { authMiddleware } = require('./protected');                    // ✅ лежит в routes
const withTenant = require('../middleware/withTenant');

/* =========================
   Multer (upload dir)
========================= */
const uploadsDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

/* =========================
   Helpers
========================= */
function normalizeAvailability(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'в наличии' || s === 'published') return 'В наличии';
  if (s === 'под заказ') return 'Под заказ';
  if (s === 'нет в наличии' || s === 'нет') return 'Нет в наличии';
  return 'Нет в наличии';
}

// все роуты ниже работают в контексте арендатора
router.use(withTenant);

/* =========================================================
   ВАЖНО: спец-маршруты должны идти выше /:id
========================================================= */

/**
 * GET /api/products/showcase
 */
router.get('/showcase', async (req, res) => {
  try {
    const st = await SiteSettings.findOne({ tenantId: String(req.tenant.id) }).lean();
    const ids = (st?.showcase?.productIds || []).map(String).slice(0, 24);
    if (!ids.length) return res.json([]);

    const items = await Product.find({ _id: { $in: ids }, tenantId: String(req.tenant.id) })
      .select('name price images availability group')
      .lean();

    for (const it of items) it.availability = normalizeAvailability(it.availability);

    const order = new Map(ids.map((id, i) => [String(id), i]));
    items.sort((a, b) => (order.get(String(a._id)) ?? 999) - (order.get(String(b._id)) ?? 999));

    res.json(items);
  } catch (e) {
    console.error('showcase error:', e);
    res.json([]);
  }
});

router.get('/recommend', (_req, res) => res.json([]));
router.get('/recent', (_req, res) => res.json([]));

/**
 * GET /api/products/admin
 */
router.get('/admin', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });

    const { q = '', group = '', groupId = '', inStock = '', page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { tenantId: String(req.tenant.id) };

    if (q) filter.name = { $regex: q.trim(), $options: 'i' };

    const groupFilter = (groupId || group || '').trim();
    if (groupFilter) filter.group = groupFilter;

    if (inStock === 'true') filter.availability = 'В наличии';
    if (inStock === 'false') filter.availability = { $ne: 'В наличии' };

    const [items, total] = await Promise.all([
      Product.find(filter)
        .select('name price images availability group')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    for (const it of items) it.availability = normalizeAvailability(it.availability);

    res.json({ items, total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 });
  } catch (e) {
    console.error('products.admin list error:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * GET /api/products/groups
 */
router.get('/groups', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });
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

/* =========================
   CRUD
========================= */

router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ tenantId: String(req.tenant.id) }).lean();
    products.forEach(p => (p.availability = normalizeAvailability(p.availability)));
    res.json(products);
  } catch (err) {
    console.error('Ошибка при загрузке товаров:', err);
    res.status(500).json({ error: 'Ошибка при загрузке товаров' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const prod = await Product.findOne({ _id: req.params.id, tenantId: String(req.tenant.id) }).lean();
    if (!prod) return res.status(404).json({ error: 'Товар не найден' });
    prod.availability = normalizeAvailability(prod.availability);
    res.json(prod);
  } catch {
    res.status(500).json({ error: 'Ошибка при получении товара' });
  }
});

router.post('/', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });

    const images = (req.files || []).map(f => '/uploads/products/' + f.filename);

    const {
      name, sku, description, group, hasProps, propsColor,
      queries, width, height, length, weight,
      price, unit, availability, stock,
    } = req.body;

    const product = new Product({
      tenantId: String(req.tenant.id),
      name, sku, description, group,
      hasProps: hasProps === 'true',
      propsColor, queries, width, height, length, weight,
      price, unit,
      availability: normalizeAvailability(availability),
      stock,
      images,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error('Ошибка при создании товара:', err);
    res.status(500).json({ error: 'Ошибка при создании товара' });
  }
});

router.patch('/:id', authMiddleware, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });

    const id = req.params.id;

    let serverImages = req.body.serverImages || [];
    if (typeof serverImages === 'string') serverImages = [serverImages];

    const newImages = (req.files || []).map(f => '/uploads/products/' + f.filename);
    const images = [...serverImages, ...newImages];

    const {
      name, sku, description, group, hasProps, propsColor,
      queries, width, height, length, weight,
      price, unit, availability, stock,
    } = req.body;

    const oldProduct = await Product.findOne({ _id: id, tenantId: String(req.tenant.id) });
    if (!oldProduct) return res.status(404).json({ error: 'Товар не найден' });

    const toDelete = (oldProduct.images || []).filter(img => !serverImages.includes(img));
    toDelete.forEach(img => {
      const filePath = path.join(__dirname, '..', img.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, err => err && console.error('unlink error:', filePath, err));
      }
    });

    const prod = await Product.findOneAndUpdate(
      { _id: id, tenantId: String(req.tenant.id) },
      {
        name, sku, description, group,
        hasProps: hasProps === 'true',
        propsColor, queries, width, height, length, weight,
        price, unit,
        availability: normalizeAvailability(availability),
        stock,
        images,
        updatedAt: new Date(),
      },
      { new: true, lean: true }
    );

    if (prod) prod.availability = normalizeAvailability(prod.availability);

    res.json(prod);
  } catch (err) {
    console.error('Ошибка при обновлении товара:', err);
    res.status(500).json({ error: 'Ошибка при обновлении товара' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });

    const product = await Product.findOneAndDelete({ _id: req.params.id, tenantId: String(req.tenant.id) });
    if (!product) return res.status(404).json({ error: 'Товар не найден' });

    (product.images || []).forEach(img => {
      const filePath = path.join(__dirname, '..', img.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, err => err && console.error('unlink error:', filePath, err));
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка при удалении товара:', err);
    res.status(500).json({ error: 'Ошибка при удалении' });
  }
});

module.exports = router;
