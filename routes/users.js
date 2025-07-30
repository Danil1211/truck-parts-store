const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authMiddleware } = require('../protected');

// GET /api/users/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ user });
  } catch (err) {
    console.error('Ошибка получения профиля:', err);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

// PUT /api/users/me
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, surname, phone, email } = req.body;

    // Валидация
    if (!name || !surname || !phone || !email)
      return res.status(400).json({ error: 'Заполните все поля' });

    // Проверка формата телефона (только UA, +380...)
    if (!/^\+380\d{9}$/.test(phone))
      return res.status(400).json({ error: 'Телефон должен быть в формате +380XXXXXXXXX' });

    // Проверка формата email
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email))
      return res.status(400).json({ error: 'Некорректный email' });

    // Проверка уникальности телефона
    const existingPhone = await User.findOne({ phone, _id: { $ne: userId } });
    if (existingPhone)
      return res.status(400).json({ error: 'Такой телефон уже зарегистрирован' });

    // Проверка уникальности email
    const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
    if (existingEmail)
      return res.status(400).json({ error: 'Такой email уже зарегистрирован' });

    // Обновление пользователя
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    user.name = name;
    user.surname = surname;
    user.phone = phone;
    user.email = email;

    await user.save();

    res.json({ message: 'Профиль обновлён', user });
  } catch (err) {
    console.error('Ошибка обновления профиля:', err);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

module.exports = router;
