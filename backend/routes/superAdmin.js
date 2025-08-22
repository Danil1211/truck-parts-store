// backend/routes/superAdmin.js
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Tenant, User } = require('../models/models'); // ✅ правильный путь

const SUPER_JWT_SECRET = process.env.SUPER_JWT_SECRET || 'super_jwt_secret';

/**
 * Мидлварка для проверки токена суперадмина
 */
function superAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Нет токена' });

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SUPER_JWT_SECRET);
    if (!decoded || decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    req.superAdmin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Неверный токен' });
  }
}

/**
 * POST /api/superadmin/login
 * Логин суперадмина (логин/пароль)
 * ⚠️ Пользователя "superadmin" создаём вручную через Mongo
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Введите логин и пароль' });

  // ищем супер админа в базе
  const superAdmin = await User.findOne({ role: 'superadmin', email });
  if (!superAdmin) return res.status(401).json({ error: 'Неверный логин или пароль' });

  const ok = await bcrypt.compare(password, superAdmin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Неверный логин или пароль' });

  const token = jwt.sign(
    { id: superAdmin._id, role: 'superadmin' },
    SUPER_JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token });
});

/**
 * GET /api/superadmin/tenants
 * Список арендаторов
 */
router.get('/tenants', superAuth, async (_req, res) => {
  const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();
  res.json(tenants);
});

/**
 * POST /api/superadmin/tenants/:id/plan
 * Смена плана арендатора
 */
router.post('/tenants/:id/plan', superAuth, async (req, res) => {
  const { plan } = req.body;
  await Tenant.findByIdAndUpdate(req.params.id, { plan });
  res.json({ ok: true });
});

/**
 * POST /api/superadmin/tenants/:id/block
 * Блокировка арендатора
 */
router.post('/tenants/:id/block', superAuth, async (req, res) => {
  await Tenant.findByIdAndUpdate(req.params.id, { isBlocked: true });
  res.json({ ok: true });
});

/**
 * POST /api/superadmin/tenants/:id/unblock
 * Разблокировка арендатора
 */
router.post('/tenants/:id/unblock', superAuth, async (req, res) => {
  await Tenant.findByIdAndUpdate(req.params.id, { isBlocked: false });
  res.json({ ok: true });
});

module.exports = router;
