// backend/routes/groups.js
const express = require("express");
const router = express.Router();
const { Group } = require("../models/models");
const { authMiddleware } = require("./protected");
const withTenant = require("../middleware/withTenant");

router.use(withTenant);

/* ========================== helpers ========================== */
async function ensureRootGroup(tenantId) {
  let root = await Group.findOne({ tenantId, name: "Родительская группа", parentId: null });
  if (!root) {
    root = await new Group({
      tenantId,
      name: "Родительская группа",
      description: "Системная корневая группа",
      parentId: null,
      order: -9999, // чтобы всегда шла первой
    }).save();
  }
  return root;
}

function buildTree(groups, parentId = null) {
  return groups
    .filter((g) => String(g.parentId || "") === String(parentId || ""))
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((g) => ({
      ...g.toObject(),
      children: buildTree(groups, g._id),
    }));
}

/* ========================== list ========================== */
router.get("/", async (req, res) => {
  try {
    const root = await ensureRootGroup(req.tenantId);
    const groups = await Group.find({ tenantId: req.tenantId }).sort({ order: 1, name: 1 });

    // root всегда вверху
    const sorted = [root, ...groups.filter((g) => String(g._id) !== String(root._id))];
    res.json(sorted);
  } catch (err) {
    console.error("groups list error:", err);
    res.status(500).json({ error: "Ошибка загрузки групп" });
  }
});

router.get("/tree", async (req, res) => {
  try {
    const root = await ensureRootGroup(req.tenantId);
    const groups = await Group.find({ tenantId: req.tenantId }).sort({ order: 1, name: 1 });

    // root всегда вверху
    const tree = buildTree(groups, null);
    const rootObj = tree.find((g) => String(g._id) === String(root._id));
    const others = tree.filter((g) => String(g._id) !== String(root._id));
    res.json([rootObj, ...others]);
  } catch (err) {
    console.error("groups tree error:", err);
    res.status(500).json({ error: "Ошибка загрузки дерева групп" });
  }
});

/* ========================== create ========================== */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const root = await ensureRootGroup(req.tenantId);

    let parentId = req.body.parentId || null;
    if (parentId && String(parentId) === String(root._id)) {
      parentId = null;
    }

    const group = new Group({
      tenantId: req.tenantId,
      name: req.body.name,
      description: req.body.description || "",
      img: req.body.img || null, // URL, пришедший с /api/upload
      parentId,
      order: req.body.order || 0,
    });

    await group.save();
    res.json(group);
  } catch (err) {
    console.error("create group error:", err);
    res.status(500).json({ error: "Ошибка при создании группы" });
  }
});

/* ========================== update ========================== */
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const root = await ensureRootGroup(req.tenantId);
    const groupId = req.params.id;

    // root нельзя менять
    if (String(groupId) === String(root._id)) {
      return res.status(400).json({ error: "Родительская группа не может быть изменена" });
    }

    let parentId = req.body.parentId || null;
    if (parentId && String(parentId) === String(root._id)) {
      parentId = null;
    }

    const updated = await Group.findOneAndUpdate(
      { _id: groupId, tenantId: req.tenantId },
      {
        $set: {
          name: req.body.name,
          description: req.body.description || "",
          img: req.body.img || null, // URL от upload
          parentId,
          order: req.body.order || 0,
        },
      },
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
      return res.status(400).json({ error: "Родительская группа не может быть удалена" });
    }

    await Group.findOneAndDelete({ _id: groupId, tenantId: req.tenantId });
    res.json({ success: true });
  } catch (err) {
    console.error("delete group error:", err);
    res.status(500).json({ error: "Ошибка при удалении группы" });
  }
});

module.exports = router;
