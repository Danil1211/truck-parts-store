// backend/routes/groups.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { Group, Product } = require('../models/models');
const withTenant = require('../middleware/withTenant');

router.use(withTenant);

/* -------------------------- helpers -------------------------- */
function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }); } catch {}
}
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'groups');
ensureDir(UPLOADS_DIR);

function extByMime(mime) {
  if (!mime) return '.png';
  const t = mime.toLowerCase();
  if (t.includes('jpeg')) return '.jpg';
  if (t.includes('jpg'))  return '.jpg';
  if (t.includes('png'))  return '.png';
  if (t.includes('gif'))  return '.gif';
  if (t.includes('webp')) return '.webp';
  return '.png';
}

function saveDataUrlToFile(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) return null;
  const m = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/i);
  if (!m) return null;
  const mime = m[1];
  const b64 = m[2];
  const buf = Buffer.from(b64, 'base64');
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${extByMime(mime)}`;
  const abs = path.join(UPLOADS_DIR, name);
  fs.writeFileSync(abs, buf);
  return `/uploads/groups/${name}`;
}

function isLocalGroupsFile(p) {
  return typeof p === 'string' && p.startsWith('/uploads/groups/');
}

function deleteLocalFileIfExists(publicPath) {
  try {
    if (!isLocalGroupsFile(publicPath)) return;
    const abs = path.join(__dirname, '..', publicPath.replace(/^\/+/, ''));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {}
}

function buildTree(groups, parentId = null) {
  return groups
    .filter(g => String(g.parentId || '') === String(parentId || ''))
    .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name))
    .map(g => ({
      ...g,
      children: buildTree(groups, g._id),
    }));
}

/* ---------------------------- routes ---------------------------- */

/** GET /api/groups  */
router.get('/', async (req, res, next) => {
  try {
    // авто-создаём "Родительскую группу", если её нет
    let root = await Group.findOne({ tenantId: req.tenantId, name: "Родительская группа", parentId: null });
    if (!root) {
      root = await new Group({
        tenantId: req.tenantId,
        name: "Родительская группа",
        description: "Корневая группа",
        parentId: null,
        order: 0,
      }).save();
    }

    const { q, parentId } = req.query;
    const filter = { tenantId: req.tenantId };

    if (parentId === 'null' || parentId === null) {
      filter.parentId = null;
    } else if (parentId) {
      filter.parentId = parentId;
    }

    if (q) filter.name = { $regex: q, $options: 'i' };

    const list = await Group.find(filter).sort({ order: 1, name: 1 }).lean();
    res.json(list);
  } catch (e) { next(e); }
});

/** GET /api/groups/tree */
router.get('/tree', async (req, res, next) => {
  try {
    const list = await Group.find({ tenantId: req.tenantId })
      .sort({ order: 1, name: 1 })
      .lean();
    res.json(buildTree(list));
  } catch (e) { next(e); }
});

/** GET /api/groups/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Group.findOne({ _id: id, tenantId: req.tenantId }).lean();
    if (!doc) return res.status(404).json({ error: 'Группа не найдена' });
    res.json(doc);
  } catch (e) { next(e); }
});

/** POST /api/groups */
router.post('/', async (req, res, next) => {
  try {
    // автосоздание root-группы
    let root = await Group.findOne({ tenantId: req.tenantId, name: "Родительская группа", parentId: null });
    if (!root) {
      root = await new Group({
        tenantId: req.tenantId,
        name: "Родительская группа",
        description: "Корневая группа",
        parentId: null,
        order: 0,
      }).save();
    }

    let imgPath = null;
    if (typeof req.body.img === 'string') {
      if (req.body.img.startsWith('data:')) {
        imgPath = saveDataUrlToFile(req.body.img);
      } else if (req.body.img.startsWith('/uploads/')) {
        imgPath = req.body.img;
      } else if (req.body.img.startsWith('http')) {
        imgPath = req.body.img;
      }
    }

    const payload = {
      name: req.body.name,
      img: imgPath,
      description: req.body.description || '',
      parentId: req.body.parentId || root._id,   // если не указано — вешаем на root
      order: Number(req.body.order) || 0,
      tenantId: req.tenantId,
    };

    const doc = new Group(payload);
    await doc.save();
    res.json(doc);
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: 'Группа с таким именем уже существует в этом уровне' });
    }
    next(e);
  }
});

/** PUT /api/groups/:id */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const current = await Group.findOne({ _id: id, tenantId: req.tenantId }).lean();
    if (!current) return res.status(404).json({ error: 'Группа не найдена' });

    let newImg = current.img ?? null;

    if (req.body.hasOwnProperty('img')) {
      const incoming = req.body.img;
      if (!incoming) {
        if (isLocalGroupsFile(current.img)) deleteLocalFileIfExists(current.img);
        newImg = null;
      } else if (typeof incoming === 'string') {
        if (incoming.startsWith('data:')) {
          const saved = saveDataUrlToFile(incoming);
          if (saved) {
            if (isLocalGroupsFile(current.img)) deleteLocalFileIfExists(current.img);
            newImg = saved;
          }
        } else if (incoming.startsWith('/uploads/') || incoming.startsWith('http')) {
          if (incoming !== current.img && isLocalGroupsFile(current.img)) {
            deleteLocalFileIfExists(current.img);
          }
          newImg = incoming;
        }
      }
    }

    const fields = {
      name: req.body.name ?? current.name,
      img: newImg,
      description: req.body.description ?? current.description ?? '',
      parentId: req.body.parentId ?? current.parentId ?? null,
      order: Number(req.body.order ?? current.order ?? 0) || 0,
      updatedAt: new Date(),
    };

    const updated = await Group.findOneAndUpdate(
      { _id: id, tenantId: req.tenantId },
      fields,
      { new: true }
    ).lean();

    res.json(updated);
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(409).json({ error: 'Группа с таким именем уже существует в этом уровне' });
    }
    next(e);
  }
});

/** DELETE /api/groups/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const doc = await Group.findOne({ _id: id, tenantId: req.tenantId }).lean();
    if (!doc) return res.status(404).json({ error: 'Группа не найдена' });

    if (doc.name === "Родительская группа" && !doc.parentId) {
      return res.status(400).json({ error: 'Нельзя удалить корневую группу' });
    }

    const child = await Group.findOne({ tenantId: req.tenantId, parentId: id }).lean();
    if (child) return res.status(400).json({ error: 'Нельзя удалить группу с подгруппами' });

    const product = await Product.findOne({ tenantId: req.tenantId, group: id }).lean();
    if (product) return res.status(400).json({ error: 'Нельзя удалить: есть товары в группе' });

    await Group.deleteOne({ _id: id, tenantId: req.tenantId });

    if (isLocalGroupsFile(doc.img)) deleteLocalFileIfExists(doc.img);

    res.json({ ok: true });
  } catch (e) { next(e); }
});

/** PATCH /api/groups/reorder */
router.patch('/reorder', async (req, res, next) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [];
    const bulk = items.map(it => ({
      updateOne: {
        filter: { _id: it._id, tenantId: req.tenantId },
        update: { $set: { order: Number(it.order) || 0, updatedAt: new Date() } },
      },
    }));
    if (bulk.length) await Group.bulkWrite(bulk);
    res.json({ ok: true, updated: bulk.length });
  } catch (e) { next(e); }
});

module.exports = router;
