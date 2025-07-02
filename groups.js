const express = require('express');
const router = express.Router();
const Group = require('../models').Group;

// Получить все группы
router.get('/', async (req, res) => {
  try {
    const groups = await Group.find().populate('children');
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при получении групп' });
  }
});

// Создать новую группу
router.post('/', async (req, res) => {
  const { name, img, parentId } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Название группы обязательно' });
  }

  const newGroup = new Group({
    name,
    img: img || null,
    count: 0,
    published: 0,
    hidden: 0,
    deleted: 0,
    children: [],
    parentId: parentId || null
  });

  try {
    const group = await newGroup.save();
    if (parentId) {
      const parentGroup = await Group.findById(parentId);
      parentGroup.children.push(group._id);
      await parentGroup.save();
    }
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Ошибка при создании группы' });
  }
});

// Обновить группу
router.put('/:id', async (req, res) => {
  const { name, img } = req.body;
  try {
    const group = await Group.findByIdAndUpdate(req.params.id, { name, img }, { new: true });
    if (!group) return res.status(404).json({ message: 'Группа не найдена' });
    res.status(200).json(group);
  } catch (error) {
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
    res.status(500).json({ message: 'Ошибка при удалении группы' });
  }
});

module.exports = router;
