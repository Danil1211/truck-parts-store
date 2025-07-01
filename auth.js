const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { User, generateToken } = require('./models');

// Проверка уникальности email и телефона
router.post('/check', async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email || !phone) {
      return res.status(400).json({ error: 'Email и телефон обязательны для проверки' });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) return res.status(400).json({ error: 'Email уже зарегистрирован' });

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) return res.status(400).json({ error: 'Номер телефона уже зарегистрирован' });

    res.json({ ok: true });
  } catch (err) {
    console.error('Ошибка в /check:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Регистрация пользователя (теперь с фамилией и firstName!)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, firstName, lastName } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ error: 'Email уже зарегистрирован' });

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) return res.status(400).json({ error: 'Номер телефона уже зарегистрирован' });

    const hash = await bcrypt.hash(password, 10);

    // Сохраняем имя и фамилию — поддерживаем старый и новый фронт
    const user = await User.create({
      email,
      passwordHash: hash,
      name: firstName || name,
      firstName: firstName || name,
      lastName: lastName || '',
      phone
    });

    const token = generateToken(user);
    res.json({ token });
  } catch (err) {
    console.error('Ошибка в /register:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Пользователь не найден' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Неверный пароль' });

    const token = generateToken(user);
    res.json({ token });
  } catch (err) {
    console.error('Ошибка в /login:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
