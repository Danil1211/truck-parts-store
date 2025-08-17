// backend/routes/customers.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User, generateToken } = require('./models');
const { authMiddleware } = require('./protected');

// POST /api/customers/register — регистрация покупателя
router.post('/register', async (req, res, next) => {
  try {
    const tenantId = String(req.tenantId || req?.tenant?.id || '');
    if (!tenantId) return res.status(400).json({ error: 'No tenant' });

    const { email, password, name = '' } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    const exists = await User.findOne({ tenantId, email }).lean();
    if (exists) return res.status(409).json({ error: 'email already in use' });

    const user = await User.create({
      tenantId,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name,
      phone: '',
      isAdmin: false,
      role: 'customer'
    });

    const token = generateToken(user);
    const plain = user.toObject();
    delete plain.passwordHash;

    res.json({ token, user: plain });
  } catch (e) {
    next(e);
  }
});

// POST /api/customers/login — вход покупателя
router.post('/login', async (req, res, next) => {
  try {
    const tenantId = String(req.tenantId || req?.tenant?.id || '');
    if (!tenantId) return res.status(400).json({ error: 'No tenant' });

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email & password required' });

    const user = await User.findOne({ tenantId, email }).lean();
    if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });
    if (user.role !== 'customer') return res.status(403).json({ error: 'Используйте вход в админку' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Неверный логин или пароль' });

    const token = generateToken(user);
    delete user.passwordHash;
    res.json({ token, user });
  } catch (e) {
    next(e);
  }
});

// GET /api/customers/me
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    if (req.user.role !== 'customer') return res.status(403).json({ error: 'Forbidden' });
    const u = req.user.toObject ? req.user.toObject() : req.user;
    delete u.passwordHash;
    res.json({ user: u });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
