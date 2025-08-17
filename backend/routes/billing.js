const router = require('express').Router();
const plans = require('../config/plans');
const { getTenantUsage } = require('../services/usage');
const { Tenant } = require('../models');

router.get('/plans', (_req, res) => res.json(plans));

router.get('/me', async (req, res) => {
  const usage = await getTenantUsage(req.tenant.id);
  res.json({ plan: req.tenant.plan, usage, currentPeriodEnd: req.tenant.doc.currentPeriodEnd });
});

router.post('/change', async (req, res) => {
  const { plan } = req.body;                    // 'basic' | 'pro'
  if (!plans[plan]) return res.status(400).json({ error: 'Unknown plan' });
  await Tenant.updateOne({ _id: req.tenant.id }, { plan });
  res.json({ ok: true, plan });
});

module.exports = router;
