// routes/products.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Product, SiteSettings } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// =========== Multer config ===========
const uploadsDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, base + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage });

/* =========================================================
   СПЕЦИАЛЬНЫЕ РОУТЫ (ставим ПЕРЕД `/:id`, чтобы не ловил их)
   ========================================================= */

// /api/products/showcase — витрина с настройками из SiteSettings
router.get('/showcase', async (_req, res) => {
  try {
    const settings = await SiteSettings.findOne({}).lean();
    const enabled = settings?.showcase?.enabled ?? false;
    const ids = (settings?.showcase?.productIds || []).slice(0, 24);

    if (!enabled || ids.length === 0) {
      return res.json([]); // пусто, если выключено или ничего не выбрано
    }

    const prods = await Product.find({
      _id: { $in: ids },
      availability: 'published',
    })
      .select('name price images availability group sku description')
      .lean();

    // Восстанавливаем исходный порядок по массиву ids
    const mapById = new Map(prods.map(p => [String(p._id), p]));
    const ordered = ids.map(id => mapById.get(String(id))).filter(Boolean);

    res.json(ordered);
  } catch (err) {
    console.error('Ошибка витрины:', err);
    res.json([]); // не валим фронт
  }
});

// /api/products/recommend — простая рекомендация (последние опубликованные)
router.get('/recommend', async (_req, res) => {
  try {
    const items = await Product.find({ availability: 'published' })
      .sort({ createdAt: -1 })
      .limit(8)
      .select('name price images availability group sku description')
      .lean();
    res.json(items);
  } catch (err) {
    console.error('recommend error:', err);
    res.json([]);
  }
});

// /api/products/recent — заглушка (если нет истории)
router.get('/recent', async (_req, res) => {
  try {
    res.json([]);
  } catch (err) {
    res.json([]);
  }
});

/* =========================
   ОСНОВНЫЕ РОУТЫ / CRUD
   ========================= */

// GET /api/products — получить все товары (базовый листинг)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().lean();
    res.json(products);
  } catch (err) {
    console.error('Ошибка при загрузке товаров:', err);
    res.status(500).json({ error: 'Ошибка при загрузке товаров' });
  }
});

// GET /api/products/:id — получить один товар
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    // если сюда вдруг прилетят спец-пути, страхуемся (не обяз., спец-роуты стоят выше)
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Некорректный id' });
    }

    const prod = await Product.findById(id).lean();
    if (!prod) return res.status(404).json({ error: 'Товар не найден' });
    res.json(prod);
  } catch (err) {
    console.error('Ошибка при получении товара:', err);
    res.status(500).json({ error: 'Ошибка при получении товара' });
  }
});

// POST /api/products — добавить товар
router.post('/', upload.array('images', 10), async (req, res) => {
  try {
    const files = req.files || [];
    const images = files.map(f => '/uploads/products/' + f.filename);

    const {
      name, sku, description, group, hasProps, propsColor,
      queries, width, height, length, weight,
      price, unit, availability, stock,
    } = req.body;

    const product = new Product({
      name,
      sku,
      description,
      group,
      hasProps: hasProps === 'true',
      propsColor,
      queries,
      width,
      height,
      length,
      weight,
      price,
      unit,
      availability,
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

// PATCH /api/products/:id — обновить товар
router.patch('/:id', upload.array('images', 10), async (req, res) => {
  try {
    const id = req.params.id;
    let serverImages = req.body.serverImages || [];
    if (typeof serverImages === 'string') serverImages = [serverImages];

    const files = req.files || [];
    const newImages = files.map(f => '/uploads/products/' + f.filename);
    const images = [...serverImages, ...newImages];

    const {
      name, sku, description, group, hasProps, propsColor,
      queries, width, height, length, weight,
      price, unit, availability, stock,
    } = req.body;

    const oldProduct = await Product.findById(id);
    if (!oldProduct) return res.status(404).json({ error: 'Товар не найден' });

    // Удаляем файлы, которые убрали с клиента
    const toDelete = (oldProduct.images || []).filter(img => !serverImages.includes(img));
    toDelete.forEach(img => {
      const filePath = path.join(__dirname, '..', img.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, err => {
          if (err) console.error('Ошибка удаления файла:', filePath, err);
        });
      }
    });

    const prod = await Product.findByIdAndUpdate(
      id,
      {
        name,
        sku,
        description,
        group,
        hasProps: hasProps === 'true',
        propsColor,
        queries,
        width,
        height,
        length,
        weight,
        price,
        unit,
        availability,
        stock,
        images,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();

    res.json(prod);
  } catch (err) {
    console.error('Ошибка при обновлении товара:', err);
    res.status(500).json({ error: 'Ошибка при обновлении товара' });
  }
});

// DELETE /api/products/:id — удалить товар по ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id).lean();
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }

    if (product.images && product.images.length) {
      product.images.forEach(img => {
        const filePath = path.join(__dirname, '..', img.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, err => {
            if (err) console.error('Ошибка удаления файла:', filePath, err);
          });
        }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка при удалении товара:', err);
    res.status(500).json({ error: 'Ошибка при удалении' });
  }
});

module.exports = router;
