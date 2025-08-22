// backend/routes/products.recommend.js
const express = require('express');
const router = express.Router();
const withTenant = require('../middleware/withTenant');

// у каждого арендатора будут свои рекомендации
router.use(withTenant);

/**
 * GET /api/products/recommend
 * пока заглушка — всегда пустой массив
 */
router.get('/', (_req, res) => {
  res.json([]);
});

module.exports = router;
