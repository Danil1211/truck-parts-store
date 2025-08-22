// backend/routes/payments.js
const router = require('express').Router();
const { Tenant } = require('../models/models'); // ✅ правильный путь

// POST /webhooks/payments  — сюда будет звать платёжка
router.post('/payments', async (req, res) => {
  try {
    // TODO: валидация подписи провайдера
    const { tenantId, plan, months } = req.body; // подстроим под реальный провайдер
    if (!tenantId || !plan) {
      return res.status(400).json({ error: 'bad payload' });
    }

    const end = new Date();
    end.setMonth(end.getMonth() + (Number(months) || 1));

    await Tenant.updateOne(
      { _id: tenantId },
      { plan, currentPeriodEnd: end, isBlocked: false }
    );

    res.sendStatus(200);
  } catch (err) {
    console.error('Ошибка webhook payments:', err);
    res.sendStatus(400);
  }
});

module.exports = router;
