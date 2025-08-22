// backend/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models/models');            // ✅ правильный импорт
const { authMiddleware } = require('./protected'); // ✅ правильный путь
const withTenant = require('../middleware/withTenant');

router.use(withTenant);

/* ==============================
   ХЕЛПЕР: только админ арендатора
============================== */
function requireAdmin(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.isAdmin === true)) {
    return next();
  }
  return res.status(403).json({ error: 'Доступ запрещён' });
}

/* ==============================
   GET /api/users/me
   Профиль текущего юзера
============================== */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user.id,
      tenantId: req.tenantId,
    }).select('-passwordHash');

    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ user });
  } catch (err) {
    console.error('Ошибка получения профиля:', err);
    res.status(500).json({ error: 'Ошибка получения профиля' });
  }
});

/* ==============================
   PUT /api/users/me
   Обновить свой профиль
============================== */
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { name, surname, phone, email } = req.body;
    const userId = req.user.id;

    if (!name || !surname || !phone || !email) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }

    if (!/^\+380\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'Телефон должен быть в формате +380XXXXXXXXX' });
    }

    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return res.status(400).json({ error: 'Некорректный email' });
    }

    // проверка уникальности
    const existingPhone = await User.findOne({
      tenantId: req.tenantId,
      phone,
      _id: { $ne: userId },
    });
    if (existingPhone) return res.status(400).json({ error: 'Телефон уже используется' });

    const existingEmail = await User.findOne({
      tenantId: req.tenantId,
      email,
      _id: { $ne: userId },
    });
    if (existingEmail) return res.status(400).json({ error: 'Email уже используется' });

    const user = await User.findOne({ _id: userId, tenantId: req.tenantId });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    user.name = name;
    user.surname = surname;
    user.phone = phone;
    user.email = email;
    user.updatedAt = new Date();

    await user.save();

    const plain = user.toObject();
    delete plain.passwordHash;

    res.json({ message: 'Профиль обновлён', user: plain });
  } catch (err) {
    console.error('Ошибка обновления профиля:', err);
    res.status(500).json({ error: 'Ошибка обновления профиля' });
  }
});

/* ==============================
   PUT /api/users/password
   Смена пароля
============================== */
router.put('/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
    }

    const user = await User.findOne({ _id: req.user.id, tenantId: req.tenantId });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Старый пароль неверный' });

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
 * Список клиентов арендатора
 */
router.get('/admin', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { q = '', status = 'all', page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { tenantId: req.tenantId };
    if (status === 'active') filter.isBlocked = { $ne: true };
    if (status === 'blocked') filter.isBlocked = true;

    if (q.trim()) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [{ name: rx }, { surname: rx }, { email: rx }, { phone: rx }];
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
    console.error('Ошибка получения клиентов (admin):', err);
    res.status(500).json({ error: 'Ошибка получения списка клиентов' });
  }
});

/**
 * GET /api/users/admin/:id
 * Карточка клиента
 */
router.get('/admin/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const client = await User.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    }).select('-passwordHash');

    if (!client) return res.status(404).json({ error: 'Клиент не найден' });

    res.json({ client });
  } catch (err) {
    console.error('Ошибка получения клиента (admin):', err);
    res.status(500).json({ error: 'Ошибка получения клиента' });
  }
});

module.exports = router;
