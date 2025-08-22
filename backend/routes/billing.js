// backend/routes/payments.js
const router = require('express').Router();
const plans = require('../config/plans');
const { getTenantUsage } = require('../services/usage');
const { Tenant } = require('../models/models');

/**
 * GET /api/payments/plans
 * Список тарифов
 */
router.get('/plans', (_req, res) => {
  res.json(plans);
});

/**
 * GET /api/payments/me
 * Текущий план + usage для арендатора
 */
router.get('/me', async (req, res, next) => {
  try {
    if (!req.tenant?.id || !req.tenant?.doc) {
      return res.status(400).json({ error: 'No tenant context' });
    }
    const usage = await getTenantUsage(req.tenant.id);
    res.json({
      plan: req.tenant.plan,
      usage,
      currentPeriodEnd: req.tenant.doc.currentPeriodEnd
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/change
 * Смена тарифа
 */
router.post('/change', async (req, res, next) => {
  try {
    if (!req.tenant?.id) {
      return res.status(400).json({ error: 'No tenant context' });
    }
    const { plan } = req.body; // 'basic' | 'pro'
    if (!plans[plan]) {
      return res.status(400).json({ error: 'Unknown plan' });
    }

    await Tenant.updateOne({ _id: req.tenant.id }, { plan });
    res.json({ ok: true, plan });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
