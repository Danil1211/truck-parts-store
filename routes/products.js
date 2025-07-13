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

// GET /api/products/:id — получить один товар
router.get('/:id', async (req, res) => {
  try {
    const prod = await Product.findById(req.params.id);
    if (!prod) return res.status(404).json({ error: "Товар не найден" });
    res.json(prod);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при получении товара' });
  }
});

// POST /api/products — добавить товар
router.post(
  '/',
  upload.array('images', 10),
  async (req, res) => {
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
  }
);

// PATCH /api/products/:id — обновить товар
router.patch(
  '/:id',
  upload.array('images', 10),
  async (req, res) => {
    try {
      const id = req.params.id;
      let serverImages = req.body.serverImages || [];
      if (typeof serverImages === "string") serverImages = [serverImages];

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

      // Удаляем старые изображения, которые больше не нужны
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
      );
      res.json(prod);
    } catch (err) {
      console.error('Ошибка при обновлении товара:', err);
      res.status(500).json({ error: "Ошибка при обновлении товара" });
    }
  }
);

// DELETE /api/products/:id — удалить товар по ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
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
