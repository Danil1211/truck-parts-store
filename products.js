const express = require('express');
const router = express.Router();
const { Product } = require('./models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// =========== Multer config ===========
const uploadsDir = path.join(__dirname, '../uploads/products');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true }); // !!! ВАЖНО

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, base + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage });

router.post(
  '/',
  upload.array('images', 10),
  async (req, res) => {
    try {
      console.log('FILES:', req.files); // <--- Смотри сюда!
      console.log('BODY:', req.body);

      const files = req.files || [];
      const images = files.map(f => '/uploads/products/' + f.filename);

      // ... остальные поля
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
