const express = require('express');
const router = express.Router();
const { Product } = require('./models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// =========== Multer config ===========
const uploadsDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, base + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage });

// === Получить все товары ===
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при загрузке товаров' });
  }
});

// === Получить один товар по ID ===
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Товар не найден' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: 'Неверный ID' });
  }
});

// === СОЗДАТЬ товар с загрузкой фото ===
router.post(
  '/',
  upload.array('images', 10), // максимум 10 фото
  async (req, res) => {
    try {
      const files = req.files || [];
      const images = files.map(f => '/uploads/products/' + f.filename);

      const {
        name,
        sku,
        description,
        group,
        hasProps,
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
  }
);

module.exports = router;
