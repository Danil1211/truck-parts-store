const express = require("express");
const router = express.Router();

const { Group, Product } = require("../models/models");
const { authMiddleware } = require("./protected");

// ⚠️ Никаких multer/локальных upload'ов. Картинка приходит как готовый URL (Cloudinary).

/* ========================== helpers ========================== */
async function ensureRootGroup(tenantId) {
  // системная корневая группа
  let root = await Group.findOne({
    tenantId,
    name: "Родительская группа",
    parentId: null,
  }).lean();

  if (!root) {
    root = await new Group({
      tenantId,
      name: "Родительская группа",
      description: "Системная корневая группа",
      parentId: null,
      order: -9999,
      img: null,
    }).save();
    root = root.toObject();
  }

  return root;
}

function buildTree(groups, parentId = null) {
  return groups
    .filter((g) => String(g.parentId || "") === String(parentId || ""))
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((g) => ({
      ...g,
      children: buildTree(groups, g._id),
    }));
}

// Мини-валидатор URL (разрешим только Cloudinary и/или http/https)
function normalizeImageUrl(img) {
  const s = String(img || "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol)) return null;
    // если хочешь жёстко ограничить на Cloudinary — раскомментируй:
    // if (!u.hostname.includes("res.cloudinary.com")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/* ========================== list ========================== */
router.get("/", async (req, res) => {
  try {
    const root = await ensureRootGroup(req.tenantId);
    const groups = await Group.find({ tenantId: req.tenantId })
      .sort({ order: 1, name: 1 })
      .lean();

    // root первым
    const sorted = [
      root,
      ...groups.filter((g) => String(g._id) !== String(root._id)),
    ];
    res.json(sorted);
  } catch (err) {
    console.error("groups list error:", err);
    res.status(500).json({ error: "Ошибка загрузки групп" });
  }
});

router.get("/tree", async (req, res) => {
  try {
    await ensureRootGroup(req.tenantId);
    const groups = await Group.find({ tenantId: req.tenantId })
      .sort({ order: 1, name: 1 })
      .lean();
    res.json(buildTree(groups, null));
  } catch (err) {
    console.error("groups tree error:", err);
    res.status(500).json({ error: "Ошибка загрузки дерева групп" });
  }
});

/* ========================== create ========================== */
/** body: { name, description?, parentId?, order?, img? } */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const root = await ensureRootGroup(req.tenantId);

    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ error: "Введите название" });

    let parentId = req.body.parentId || null;
    // Под-группы у системного root делаем как верхний уровень (parentId=null)
    if (parentId && String(parentId) === String(root._id)) parentId = null;

    const group = await new Group({
      tenantId: req.tenantId,
      name,
      description: String(req.body.description || ""),
      img: normalizeImageUrl(req.body.img), // URL из Cloudinary
      parentId,
      order: Number(req.body.order || 0),
    }).save();

    res.status(201).json(group);
  } catch (err) {
    console.error("create group error:", err);
    res.status(500).json({ error: "Ошибка при создании группы" });
  }
});

/* ========================== update ========================== */
/** body: { name?, description?, parentId?, order?, img? } */
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const root = await ensureRootGroup(req.tenantId);
    const groupId = req.params.id;

    if (String(groupId) === String(root._id)) {
      return res
        .status(400)
        .json({ error: "Родительская группа не может быть изменена" });
    }

    const set = {};
    if (req.body.name !== undefined)
      set.name = String(req.body.name || "").trim();
    if (req.body.description !== undefined)
      set.description = String(req.body.description || "");
    if (req.body.order !== undefined) set.order = Number(req.body.order || 0);

    if (req.body.parentId !== undefined) {
      let parentId = req.body.parentId || null;
      if (parentId && String(parentId) === String(root._id)) parentId = null;
      set.parentId = parentId;
    }

    if (req.body.img !== undefined) {
      set.img = normalizeImageUrl(req.body.img); // можно очистить: '' -> null
    }

    const updated = await Group.findOneAndUpdate(
      { _id: groupId, tenantId: req.tenantId },
      { $set: set },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Группа не найдена" });
    res.json(updated);
  } catch (err) {
    console.error("update group error:", err);
    res.status(500).json({ error: "Ошибка при обновлении группы" });
  }
});

/* ========================== delete ========================== */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const root = await ensureRootGroup(req.tenantId);
    const groupId = req.params.id;

    if (String(groupId) === String(root._id)) {
      return res
        .status(400)
        .json({ error: "Родительская группа не может быть удалена" });
    }

    // запрет, если в группе есть товары
    const prodCount = await Product.countDocuments({
      tenantId: req.tenantId,
      group: groupId,
    });
    if (prodCount > 0) {
      return res
        .status(400)
        .json({ error: "Сначала переместите товары из этой группы" });
    }

    // детей поднимаем на верхний уровень
    await Group.updateMany(
      { tenantId: req.tenantId, parentId: groupId },
      { $set: { parentId: null } }
    );

    await Group.findOneAndDelete({ _id: groupId, tenantId: req.tenantId });
    res.json({ success: true });
  } catch (err) {
    console.error("delete group error:", err);
    res.status(500).json({ error: "Ошибка при удалении группы" });
  }
});

module.exports = router;
