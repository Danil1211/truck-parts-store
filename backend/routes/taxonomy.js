const express = require('express');
const router = express.Router();
const { loadTaxonomy } = require('../utils/googleTaxonomyLoader');

// Все категории (с пагинацией и поиском)
router.get('/google', async (req, res) => {
  try {
    const lang = (req.query.lang || 'en-US').trim();
    const q = (req.query.q || '').trim().toLowerCase();
    const limit = Math.min(parseInt(req.query.limit || '1000', 10), 5000);
    const offset = Math.max(parseInt(req.query.offset || '0', 10), 0);

    const data = await loadTaxonomy(lang); // { lang, updatedAt, items:[{id,full,name,path[]}] }
    let items = data.items;

    if (q) {
      items = items.filter(x =>
        x.full.toLowerCase().includes(q) ||
        x.id.includes(q)
      );
    }

    const slice = items.slice(offset, offset + limit);
    res.json({
      lang: data.lang,
      updatedAt: data.updatedAt,
      total: items.length,
      limit, offset,
      items: slice
    });
  } catch (err) {
    console.error('Taxonomy error:', err);
    res.status(500).json({ error: 'Failed to load taxonomy' });
  }
});

module.exports = router;
