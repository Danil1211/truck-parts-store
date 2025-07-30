const express = require('express');
const router = express.Router();
const { User } = require('../models'); // твоя модель

const { authMiddleware } = require('../protected');

// PUT/PATCH /api/user/me
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const { name, surname, phone, email } = req.body;
    if (name) user.name = name;
    if (surname) user.surname = surname;
    if (phone) user.phone = phone;
    if (email) user.email = email;

    await user.save();
    res.json({ message: 'Профиль обновлён', user });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

module.exports = router;
