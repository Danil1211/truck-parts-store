const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
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

// === Получить все группы (корневые и подгруппы), отсортированные по order ===
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find({})
      .sort({ order: 1 });
    res.status(200).json(groups);
  } catch (error) {
    console.error('Ошибка при получении групп:', error);
    res.status(500).json({ message: 'Ошибка при получении групп' });
  }
});

// === Получить только корневые группы ===
router.get('/root', async (req, res) => {
  try {
    const groups = await Group.find({ parentId: null })
      .sort({ order: 1 });
    res.status(200).json(groups);
  } catch (error) {
    console.error('Ошибка при получении корневых групп:', error);
    res.status(500).json({ message: 'Ошибка при получении корневых групп' });
  }
});

// === Получить одну группу + подгруппы + товары ===
router.get('/:id/full', async (req, res) => {
  try {
    const groupId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: 'Некорректный ID группы', groupId });
    }
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Группа не найдена', groupId });
    }
    const subgroups = await Group.find({ parentId: groupId });
    let products = [];
    if (subgroups.length === 0) {
      products = await Product.find({ group: groupId });
    }
    res.json({ group, subgroups, products });
  } catch (err) {
    console.error('Ошибка при получении полной инфы по группе:', err);
    res.status(500).json({ error: 'Ошибка загрузки группы', details: err.message });
  }
});

// === Получить одну группу по id ===
router.get('/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: 'Некорректный ID группы', groupId });
    }
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Группа не найдена', groupId });
    }
    res.json(group);
  } catch (err) {
    console.error('Ошибка при получении группы:', err);
    res.status(500).json({ error: 'Ошибка загрузки группы', details: err.message });
  }
});

// === Создать новую группу ===
router.post('/', upload.single('img'), async (req, res) => {
  try {
    const data = req.body;
    if (req.file) {
      data.img = `/uploads/groups/${req.file.filename}`;
    }
    const group = new Group(data);
    await group.save();
    res.status(201).json(group);
  } catch (err) {
    console.error('Ошибка при создании группы:', err);
    res.status(500).json({ error: 'Ошибка создания группы', details: err.message });
  }
});

// === Обновить группу ===
router.put('/:id', upload.single('img'), async (req, res) => {
  try {
    const groupId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: 'Некорректный ID группы', groupId });
    }
    const data = req.body;
    if (req.file) {
      data.img = `/uploads/groups/${req.file.filename}`;
    }
    const group = await Group.findByIdAndUpdate(groupId, data, { new: true });
    if (!group) {
      return res.status(404).json({ error: 'Группа не найдена', groupId });
    }
    res.json(group);
  } catch (err) {
    console.error('Ошибка при обновлении группы:', err);
    res.status(500).json({ error: 'Ошибка обновления группы', details: err.message });
  }
});

// === Удалить группу ===
router.delete('/:id', async (req, res) => {
  try {
    const groupId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ error: 'Некорректный ID группы', groupId });
    }
    const group = await Group.findByIdAndDelete(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Группа не найдена', groupId });
    }
    res.json({ success: true, deleted: group });
  } catch (err) {
    console.error('Ошибка при удалении группы:', err);
    res.status(500).json({ error: 'Ошибка удаления группы', details: err.message });
  }
});

module.exports = router;
