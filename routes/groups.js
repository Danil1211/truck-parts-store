const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Group = require('../models').Group;
const Product = require('../models').Product;

// === Multer для загрузки изображений ===
const uploadDir = path.join(__dirname, '..', 'uploads', 'groups');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Можно загружать только изображения!'));
    }
    cb(null, true);
  }
});

// === Получить все корневые группы с подгруппами, отсортированные по order ===
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({ parentId: null })
      .sort({ order: 1 })
      .populate({
        path: 'children',
        options: { sort: { order: 1 } },
        populate: { path: 'children', options: { sort: { order: 1 } } }
      });
    res.status(200).json(groups);
  } catch (error) {
    console.error('Ошибка при получении групп:', error);
    res.status(500).json({ message: 'Ошибка при получении групп' });
  }
});

// === Получить одну группу + подгруппы + товары ===
router.get('/:id/full', async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = await Group.findById(groupId);

    // Защита: если группы нет — явно вернуть ошибку и залогировать
    if (!group) {
      console.log('Группа не найдена:', groupId);
      return res.status(404).json({ error: 'Группа не найдена', groupId });
    }

    const subgroups = await Group.find({ parentId: groupId });

    let products = [];
    if (subgroups.length === 0) {
      products = await Product.find({ group: groupId });
    }

    // Логи для дебага
    console.log('GROUP FULL:', {
      groupId,
      groupName: group.name,
      subgroups: subgroups.length,
      products: products.length
    });

    res.json({
      group,
      subgroups,
      products,
    });
  } catch (err) {
    console.error('Ошибка при получении полной инфы по группе:', err);
    res.status(500).json({ error: 'Ошибка загрузки группы', details: err.message });
  }
});

// ... остальные маршруты выше и ниже, их не трогай
module.exports = router;
