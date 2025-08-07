const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authMiddleware } = require('../protected');
const bcrypt = require('bcryptjs');

/**
 * ХЕЛПЕР: проверка, что юзер — админ.
 * Если у тебя роль хранится иначе — подправь условие.
 */
function requireAdmin(req, res, next) {
  // варианты: req.user.role === 'admin'  ИЛИ  req.user.isAdmin === true
  if (req.user && (req.user.role === 'admin' || req.user.isAdmin === true)) {
    return next();
  }
  return res.status(403).json({ error: 'Доступ запрещён' });
}

/* ====================
 *  GET /api/users/me — профиль текущего
 * ==================== */
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

/* ====================
 *  PUT /api/users/me — обновить свой профиль
 * ==================== */
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, surname, phone, email } = req.body;

    if (!name || !surname || !phone || !email)
      return res.status(400).json({ error: 'Заполните все поля' });

    if (!/^\+380\d{9}$/.test(phone))
      return res.status(400).json({ error: 'Телефон должен быть в формате +380XXXXXXXXX' });

    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email))
      return res.status(400).json({ error: 'Некорректный email' });

    const existingPhone = await User.findOne({ phone, _id: { $ne: userId } });
    if (existingPhone)
      return res.status(400).json({ error: 'Такой телефон уже зарегистрирован' });

    const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
    if (existingEmail)
      return res.status(400).json({ error: 'Такой email уже зарегистрирован' });

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

/* ====================
 *  PUT /api/users/password — смена пароля
 * ==================== */
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

/* =========================================================
 *                А Д М И Н С К И Е   Р О У Т Ы
 * ========================================================= */

/**
 * GET /api/users/admin
 * Список клиентов (поиск, статус, пагинация)
 * query: q, status=all|active|blocked, page=1, limit=20
 */
router.get('/admin', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const {
      q = '',
      status = 'all',
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // статус
    if (status === 'active') filter.isBlocked = { $ne: true };
    if (status === 'blocked') filter.isBlocked = true;

    // поиск по имени / фамилии / email / телефону
    if (q && String(q).trim().length > 0) {
      const rx = new RegExp(String(q).trim(), 'i');
      filter.$or = [
        { name: rx },
        { surname: rx },
        { email: rx },
        { phone: rx },
      ];
    }

    const [clients, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({ clients, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('Ошибка получения списка клиентов (admin):', err);
    res.status(500).json({ error: 'Ошибка получения списка клиентов' });
  }
});

/**
 * GET /api/users/admin/:id
 * Карточка клиента для админки
 */
router.get('/admin/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const client = await User.findById(req.params.id)
      .select('-passwordHash')
      .lean();

    if (!client) return res.status(404).json({ error: 'Клиент не найден' });

    res.json({ client });
  } catch (err) {
    console.error('Ошибка получения клиента (admin):', err);
    res.status(500).json({ error: 'Ошибка получения клиента' });
  }
});

module.exports = router;
