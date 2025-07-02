const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Group = require('../models').Group;

const uploadDir = path.join(__dirname, '..', 'uploads', 'groups');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage });

// Получить все группы
router.get('/', async (req, res) => {
  try {
    // Только корневые группы с подгруппами вложенно
    const groups = await Group.find({ parentId: null }).populate({
      path: 'children',
      populate: { path: 'children' } // если нужны вложенные подгруппы
    });
    res.status(200).json(groups);
  } catch (error) {
    console.error('Ошибка при получении групп:', error);
    res.status(500).json({ message: 'Ошибка при получении групп' });
  }
});

// Создать новую группу
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, parentId, description } = req.body;
    let img = null;
    if (!name) return res.status(400).json({ message: 'Название группы обязательно' });
    if (req.file) img = '/uploads/groups/' + req.file.filename;

    const newGroup = new Group({
      name,
      img,
      description: description || '',
      count: 0,
      published: 0,
      hidden: 0,
      deleted: 0,
      children: [],
      parentId: parentId || null
    });

    const group = await newGroup.save();
    // Добавить себя в children родителя
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
    res.status(500).json({ message: 'Ошибка при создании группы' });
  }
});

// Обновить группу
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description } = req.body;
    let update = { name, description };
    if (req.file) update.img = '/uploads/groups/' + req.file.filename;
    const group = await Group.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!group) return res.status(404).json({ message: 'Группа не найдена' });
    res.status(200).json(group);
  } catch (error) {
    console.error('Ошибка при обновлении группы:', error);
    res.status(500).json({ message: 'Ошибка при обновлении группы' });
  }
});

// Удалить группу
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

module.exports = router;
