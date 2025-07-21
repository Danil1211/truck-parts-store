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

// === Сохранить новый порядок групп (DRAG & DROP) ===
router.put('/reorder', async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ message: 'orders array required' });
    }
    await Promise.all(
      orders.map(g =>
        Group.findByIdAndUpdate(g._id, { order: g.order })
      )
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка при обновлении порядка групп:', error);
    res.status(500).json({ message: 'Ошибка при обновлении порядка групп' });
  }
});

// === Создать новую группу ===
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, parentId, description } = req.body;
    let img = null;
    if (!name) return res.status(400).json({ message: 'Название группы обязательно' });

    if (req.file) {
      img = '/uploads/groups/' + req.file.filename;
      console.log('Загружен файл:', req.file.path, '->', img);
    } else {
      console.log('Файл не загружен!');
    }

    let order = 0;
    if (parentId) {
      const parent = await Group.findById(parentId).populate('children');
      order = parent && parent.children ? parent.children.length : 0;
    } else {
      const count = await Group.countDocuments({ parentId: null });
      order = count;
    }

    const newGroup = new Group({
      name,
      img,
      description: description || '',
      count: 0,
      published: 0,
      hidden: 0,
      deleted: 0,
      children: [],
      parentId: parentId || null,
      order
    });

    const group = await newGroup.save();

    if (parentId) {
      const parent = await Group.findById(parentId);
      if (parent) {
        parent.children.push(group._id);
        await parent.save();
      }
    }

    res.status(201).json(group);
  } catch (error) {
    console.error('Ошибка при создании группы:', error);
    res.status(500).json({ message: 'Ошибка при создании группы', error: error.message });
  }
});

// === Обновить группу ===
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description } = req.body;
    let update = { name, description };
    if (req.file) {
      update.img = '/uploads/groups/' + req.file.filename;
      console.log('Обновлён файл:', req.file.path, '->', update.img);
    }
    const group = await Group.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!group) return res.status(404).json({ message: 'Группа не найдена' });
    res.status(200).json(group);
  } catch (error) {
    console.error('Ошибка при обновлении группы:', error);
    res.status(500).json({ message: 'Ошибка при обновлении группы', error: error.message });
  }
});

// === Удалить группу ===
router.delete('/:id', async (req, res) => {
  try {
    const group = await Group.findByIdAndDelete(req.params.id);
    if (!group) return res.status(404).json({ message: 'Группа не найдена' });
    res.status(200).json({ message: 'Группа удалена' });
  } catch (error) {
    console.error('Ошибка при удалении группы:', error);
    res.status(500).json({ message: 'Ошибка при удалении группы' });
  }
});

// === Получить одну группу по ID ===
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Группа не найдена' });
    res.status(200).json(group);
  } catch (error) {
    console.error('Ошибка при получении группы:', error);
    res.status(500).json({ message: 'Ошибка при получении группы' });
  }
});

// === Получить одну группу + подгруппы + товары ===
router.get('/:id/full', async (req, res) => {
  try {
    const groupId = req.params.id;
    // Найти группу
    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ error: 'Группа не найдена' });
    }

    // Найти подгруппы
    const subgroups = await Group.find({ parentId: groupId });

    let products = [];
    if (subgroups.length === 0) {
      products = await Product.find({ group: groupId });
    }

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

module.exports = router;
