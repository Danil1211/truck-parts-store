const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authMiddleware } = require('../protected');
const bcrypt = require('bcryptjs');

// GET /api/users/me — получить свой профиль
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ user });
  } catch (err) {
    console.error('Ошибка получения профиля:', err);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

// PUT /api/users/me — изменить свой профиль
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, surname, phone, email } = req.body;

    // Проверка на заполненность всех полей
    if (!name || !surname || !phone || !email)
      return res.status(400).json({ error: 'Заполните все поля' });

    // Проверка формата телефона (UA +380)
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
    user.updatedAt = new Date();

    await user.save();

    res.json({ message: 'Профиль обновлён', user: user.toObject({ versionKey: false }) });
  } catch (err) {
    console.error('Ошибка обновления профиля:', err);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

// ====== СМЕНА ПАРОЛЯ ======
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ error: 'Заполните все поля' });

    if (newPassword.length < 6)
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch)
      return res.status(400).json({ error: 'Старый пароль неверный' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка смены пароля:', err);
    res.status(500).json({ error: 'Ошибка смены пароля' });
  }
});

module.exports = router;
