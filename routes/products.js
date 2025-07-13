const express = require('express');
const router = express.Router();
const { Product } = require('../models');
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

// ===================
// GET /api/products — получить все товары
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.error('Ошибка при загрузке товаров:', err);
    res.status(500).json({ error: 'Ошибка при загрузке товаров' });
  }
});

// ===================
// POST /api/products — добавить товар
router.post(
  '/',
  upload.array('images', 10),
  async (req, res) => {
    try {
      console.log('FILES:', req.files);
      console.log('BODY:', req.body);

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
  }
);

// ===================
// DELETE /api/products/:id — удалить товар по ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    // Удаляем файлы изображений товара
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
