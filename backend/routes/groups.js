const express = require('express');
const router = express.Router();
const { Group, Product } = require('../models/models');
const withTenant = require('../middleware/withTenant');

router.use(withTenant);

function buildTree(groups, parentId = null) {
  return groups
    .filter(g => String(g.parentId || '') === String(parentId || ''))
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name))
    .map(g => ({
      ...g,
      children: buildTree(groups, g._id),
    }));
}

// GET /api/groups
router.get('/', async (req, res, next) => {
  try {
    const { q, parentId } = req.query;
    const filter = { tenantId: String(req.tenant.id) };

    if (parentId === 'null' || parentId === null) {
      filter.parentId = null;
    } else if (parentId) {
      filter.parentId = parentId;
    }

    if (q) filter.name = { $regex: q, $options: 'i' };

    const list = await Group.find(filter)
      .sort({ order: 1, name: 1 })
      .lean();

    res.json(list);
  } catch (e) { next(e); }
});

// GET /api/groups/tree
router.get('/tree', async (req, res, next) => {
  try {
    const list = await Group.find({ tenantId: String(req.tenant.id) })
      .sort({ order: 1, name: 1 })
      .lean();

    res.json(buildTree(list));
  } catch (e) { next(e); }
});

// POST /api/groups
router.post('/', async (req, res, next) => {
  try {
    const payload = {
      name: req.body.name,
      img: req.body.img || null,
      description: req.body.description || '',
      parentId: req.body.parentId || null,
      order: Number(req.body.order) || 0,
      tenantId: String(req.tenant.id),   // ✅ фикс
    };

    const doc = new Group(payload);
    await doc.save();

    res.json(doc);
  } catch (e) {
    if (e && e.code === 11000) {
      return res
        .status(409)
        .json({ error: 'Группа с таким именем уже существует в этом уровне' });
    }
    next(e);
  }
});

// PUT /api/groups/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = {
      name: req.body.name,
      img: req.body.img ?? null,
      description: req.body.description ?? '',
      parentId: req.body.parentId ?? null,
      order: Number(req.body.order) || 0,
      updatedAt: new Date(),
    };

    const updated = await Group.findOneAndUpdate(
      { _id: id, tenantId: String(req.tenant.id) },
      fields,
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: 'Группа не найдена' });
    res.json(updated);
  } catch (e) {
    if (e && e.code === 11000) {
      return res
        .status(409)
        .json({ error: 'Группа с таким именем уже существует в этом уровне' });
    }
    next(e);
  }
});

// DELETE /api/groups/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const child = await Group.findOne({ tenantId: String(req.tenant.id), parentId: id }).lean();
    if (child) return res.status(400).json({ error: 'Нельзя удалить группу с подгруппами' });

    const product = await Product.findOne({ tenantId: String(req.tenant.id), group: id }).lean();
    if (product) return res.status(400).json({ error: 'Нельзя удалить: есть товары в группе' });

    await Group.deleteOne({ _id: id, tenantId: String(req.tenant.id) });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// PATCH /api/groups/reorder
router.patch('/reorder', async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [];
    const bulk = items.map(it => ({
      updateOne: {
        filter: { _id: it._id, tenantId: String(req.tenant.id) },
        update: { $set: { order: Number(it.order) || 0, updatedAt: new Date() } },
      },
    }));
    if (bulk.length) await Group.bulkWrite(bulk);
    res.json({ ok: true, updated: bulk.length });
  } catch (e) { next(e); }
});

module.exports = router;
