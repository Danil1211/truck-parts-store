// backend/routes/groups.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const { Group, Product } = require("../models/models");
const { authMiddleware } = require("./protected");
// ВАЖНО: withTenant уже стоит глобально в server.js. Тут доп. вызов НЕ НУЖЕН.
// const withTenant = require("../middleware/withTenant");

// --- uploads/groups ---
const UP_DIR = path.join(__dirname, "..", "uploads", "groups");
fs.mkdirSync(UP_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = path
      .basename(file.originalname || "group", ext)
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 60);
    cb(null, `${Date.now()}_${base}${ext || ".jpg"}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
const publicPath = (abs) =>
  abs.replace(path.join(__dirname, ".."), "").replace(/\\/g, "/");

// Применяем multer ТОЛЬКО если пришёл multipart/form-data
const maybeUpload = (req, res, next) => {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (ct.includes("multipart/form-data")) {
    return upload.single("image")(req, res, next);
  }
  return next();
};

/* ================= helpers ================= */
async function ensureRootGroup(tenantId) {
  let root = await Group.findOne({
    tenantId,
    name: "Родительская группа",
    parentId: null,
  });
  if (!root) {
    root = await new Group({
      tenantId,
      name: "Родительская группа",
      description: "Системная корневая группа",
      parentId: null,
      order: -9999,
    }).save();
  }
  return root;
}

function buildTree(groups, parentId = null) {
  return groups
    .filter((g) => String(g.parentId || "") === String(parentId || ""))
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((g) => ({ ...g.toObject(), children: buildTree(groups, g._id) }));
}

/* ================= list ================= */
router.get("/", async (req, res) => {
  try {
    const root = await ensureRootGroup(req.tenantId);
    const groups = await Group.find({ tenantId: req.tenantId }).sort({
      order: 1,
      name: 1,
    });
    const sorted = [root, ...groups.filter((g) => String(g._id) !== String(root._id))];
    res.json(sorted);
  } catch (err) {
    console.error("groups list error:", err);
    res.status(500).json({ error: "Ошибка загрузки групп" });
  }
});

router.get("/tree", async (req, res) => {
  try {
    await ensureRootGroup(req.tenantId);
    const groups = await Group.find({ tenantId: req.tenantId }).sort({
      order: 1,
      name: 1,
    });
    res.json(buildTree(groups, null));
  } catch (err) {
    console.error("groups tree error:", err);
    res.status(500).json({ error: "Ошибка загрузки дерева групп" });
  }
});

/* ================= create ================= */
// Принимает: JSON { name, description, parentId?, order?, img? }
// или multipart/form-data с полем "image" (+ те же текстовые поля)
router.post("/", authMiddleware, maybeUpload, async (req, res) => {
  try {
    const root = await ensureRootGroup(req.tenantId);

    let parentId = req.body.parentId || null;
    if (parentId && String(parentId) === String(root._id)) parentId = null;

    let img = req.body.img || null;
    if (req.file) img = publicPath(req.file.path);

    const group = new Group({
      tenantId: req.tenantId,
      name: (req.body.name || "").trim(),
      description: req.body.description || "",
      img,
      parentId,
      order: Number(req.body.order || 0),
    });

    await group.save();
    res.status(201).json(group);
  } catch (err) {
    console.error("create group error:", err);
    res.status(500).json({ error: "Ошибка при создании группы" });
  }
});

/* ================= update ================= */
router.patch("/:id", authMiddleware, maybeUpload, async (req, res) => {
  try {
    const root = await ensureRootGroup(req.tenantId);
    const groupId = req.params.id;

    if (String(groupId) === String(root._id)) {
      return res
        .status(400)
        .json({ error: "Родительская группа не может быть изменена" });
    }

    let parentId = req.body.parentId || null;
    if (parentId && String(parentId) === String(root._id)) parentId = null;

    const set = {
      name: (req.body.name || "").trim(),
      description: req.body.description || "",
      parentId,
      order: Number(req.body.order || 0),
    };

    if (req.file) set.img = publicPath(req.file.path);
    else if (typeof req.body.img === "string") set.img = req.body.img || null;

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

/* ================= delete ================= */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const root = await ensureRootGroup(req.tenantId);
    const groupId = req.params.id;

    if (String(groupId) === String(root._id)) {
      return res
        .status(400)
        .json({ error: "Родительская группа не может быть удалена" });
    }

    // запретим удаление, если в группе есть товары
    const prodCount = await Product.countDocuments({
      tenantId: req.tenantId,
      group: groupId,
    });
    if (prodCount > 0) {
      return res
        .status(400)
        .json({ error: "Сначала переместите товары из этой группы" });
    }

    // детей поднимаем на верхний уровень (можно убрать — по вкусу)
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
