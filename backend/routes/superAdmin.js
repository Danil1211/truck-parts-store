// backend/routes/superAdmin.js
const router = require('express').Router();
const { Tenant } = require('../models');

// --- простая авторизация Основателя ---
const SUPER_KEY = process.env.SUPER_KEY || 'super_secret';
function superAuth(req, res, next) {
  if (req.headers['x-super-key'] !== SUPER_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

router.use(superAuth);

// список арендаторов
router.get('/tenants', async (_req, res) => {
  const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();
  res.json(tenants);
});

// смена плана
router.post('/tenants/:id/plan', async (req, res) => {
  const { plan } = req.body;
  await Tenant.findByIdAndUpdate(req.params.id, { plan });
  res.json({ ok: true });
});

// блокировка
router.post('/tenants/:id/block', async (req, res) => {
  await Tenant.findByIdAndUpdate(req.params.id, { isBlocked: true });
  res.json({ ok: true });
});

// разблокировка
router.post('/tenants/:id/unblock', async (req, res) => {
  await Tenant.findByIdAndUpdate(req.params.id, { isBlocked: false });
  res.json({ ok: true });
});

module.exports = router;
