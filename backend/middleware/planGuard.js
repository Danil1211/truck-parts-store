const plans = require('../config/plans');
const { getTenantUsage } = require('../services/usage');

module.exports = (rule) => async (req, res, next) => {
  try {
    const limits = plans[req.tenant.plan];
    const usage = await getTenantUsage(req.tenant.id);

    if (rule === 'createProduct' && usage.products >= limits.products)
      return res.status(402).json({ error: 'Лимит плана: товары' });

    if (rule === 'uploadMedia' && usage.storageMb >= limits.storageMb)
      return res.status(402).json({ error: 'Лимит плана: хранилище' });

    if (rule === 'newChat' && usage.chats >= limits.chats)
      return res.status(402).json({ error: 'Лимит плана: чаты' });

    next();
  } catch (e) { next(e); }
};
