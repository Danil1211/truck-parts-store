const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

const router = express.Router();

const { Product } = require("../models/models");
const { authMiddleware } = require("./protected");
const withTenant = require("../middleware/withTenant");

router.use(withTenant);

/* ----------------------------- helpers ----------------------------- */
function ensureDir(p) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch {}
}

const uploadsDir = path.join(__dirname, "..", "uploads", "products");
ensureDir(uploadsDir);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = path
      .basename(file.originalname || "img", ext)
      .replace(/[^a-z0-9_-]+/gi, "-")
      .slice(0, 50);
    const name = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${base}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
});

const toArray = (v) =>
  v == null ? [] : Array.isArray(v) ? v : [v];

function parseQueries(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") {
    try {
      const j = JSON.parse(v);
      if (Array.isArray(j)) return j.filter(Boolean);
    } catch {}
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function toNumber(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function buildFilterFromQuery(qs) {
  const { q, search, group, groupId, availability, inStock } = qs;
  const filter = { deleted: { $ne: true } };

  const text = search || q;
  if (text) {
    filter.$or = [
      { name: { $regex: text, $options: "i" } },
      { sku: { $regex: text, $options: "i" } },
    ];
  }

  const grp = group || groupId;
  if (grp) filter.group = grp;

  if (availability) {
    filter.availability = availability;
  } else if (inStock === "true") {
    filter.availability = "published";
  } else if (inStock === "false") {
    filter.availability = { $ne: "published" };
  }

  return filter;
}

function mapFilesToPublicPaths(files) {
  return (files || []).map((f) => `/uploads/products/${f.filename}`);
}

/* ================================ PUBLIC ================================ */

// витрина
router.get("/public/showcase", async (req, res) => {
  try {
    const products = await Product.find({
      deleted: { $ne: true },
      showcase: true,
    })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(products);
  } catch (err) {
    console.error("showcase error:", err);
    res.status(500).json({ error: "Ошибка загрузки витрины" });
  }
});

// список публичный
router.get("/", async (req, res) => {
  try {
    const filter = buildFilterFromQuery(req.query);
    const items = await Product.find(filter).sort({ updatedAt: -1 });
    res.json(items);
  } catch (err) {
    console.error("public products list error:", err);
    res.status(500).json({ error: "Ошибка загрузки товаров" });
  }
});

// админ список
router.get("/admin", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = buildFilterFromQuery(req.query);

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      Product.countDocuments(filter),
    ]);

    const pages = Math.max(1, Math.ceil(total / parseInt(limit, 10)));
    res.json({ items, total, pages });
  } catch (err) {
    console.error("admin list error:", err);
    res.status(500).json({ error: "Ошибка загрузки товаров (admin)" });
  }
});

// карточка
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || product.deleted) {
      return res.status(404).json({ error: "Товар не найден" });
    }
    res.json(product);
  } catch (err) {
    console.error("load product error:", err);
    res.status(500).json({ error: "Ошибка загрузки товара" });
  }
});

/* ================================ PROTECTED ================================ */

router.post(
  "/",
  authMiddleware,
  upload.fields([{ name: "images", maxCount: 10 }]),
  async (req, res) => {
    try {
      console.log("REQ BODY:", req.body);
      console.log("REQ FILES:", req.files);

      const uploadedImages = mapFilesToPublicPaths(req.files?.images || []);

      let serverImages = [];
      if (req.body) {
        if (Array.isArray(req.body.serverImages)) {
          serverImages = req.body.serverImages;
        } else if (typeof req.body.serverImages === "string") {
          try {
            serverImages = JSON.parse(req.body.serverImages);
          } catch {
            serverImages = [req.body.serverImages];
          }
        } else if (req.body["serverImages[]"]) {
          serverImages = toArray(req.body["serverImages[]"]);
        }
      }

      const productData = {
        ...req.body,
        price: toNumber(req.body.price),
        stock: toNumber(req.body.stock),
        width: toNumber(req.body.width),
        height: toNumber(req.body.height),
        length: toNumber(req.body.length),
        weight: toNumber(req.body.weight),
        queries: parseQueries(req.body.queries),
        images: [...serverImages, ...uploadedImages],
      };

      const product = new Product(productData);
      await product.save();
      res.json(product);
    } catch (err) {
      console.error("create product error:", err);
      res.status(400).json({ error: "Ошибка при создании товара", details: err.message });
    }
  }
);

router.patch(
  "/:id",
  authMiddleware,
  upload.fields([{ name: "images", maxCount: 10 }]),
  async (req, res) => {
    try {
      console.log("REQ BODY:", req.body);
      console.log("REQ FILES:", req.files);

      const uploadedImages = mapFilesToPublicPaths(req.files?.images || []);

      let serverImages = [];
      if (req.body) {
        if (Array.isArray(req.body.serverImages)) {
          serverImages = req.body.serverImages;
        } else if (typeof req.body.serverImages === "string") {
          try {
            serverImages = JSON.parse(req.body.serverImages);
          } catch {
            serverImages = [req.body.serverImages];
          }
        } else if (req.body["serverImages[]"]) {
          serverImages = toArray(req.body["serverImages[]"]);
        }
      }

      const update = {
        ...req.body,
        price: toNumber(req.body.price),
        stock: toNumber(req.body.stock),
        width: toNumber(req.body.width),
        height: toNumber(req.body.height),
        length: toNumber(req.body.length),
        weight: toNumber(req.body.weight),
        queries: parseQueries(req.body.queries),
        images: [...serverImages, ...uploadedImages],
        updatedAt: new Date(),
      };

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true }
      );

      if (!product) return res.status(404).json({ error: "Товар не найден" });
      res.json(product);
    } catch (err) {
      console.error("update product error:", err);
      res.status(400).json({ error: "Ошибка при обновлении товара", details: err.message });
    }
  }
);

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, { deleted: true }, { new: true });
    if (!p) return res.status(404).json({ error: "Товар не найден" });
    res.json({ success: true });
  } catch (err) {
    console.error("delete product error:", err);
    res.status(500).json({ error: "Ошибка при удалении товара" });
  }
});

/* ---------- legacy admin paths ---------- */
router.put("/admin/:id", authMiddleware, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: "Товар не найден" });
    res.json(product);
  } catch (err) {
    console.error("admin PUT product error:", err);
    res.status(400).json({ error: "Ошибка при обновлении товара" });
  }
});

router.delete("/admin/:id", authMiddleware, async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, { deleted: true }, { new: true });
    if (!p) return res.status(404).json({ error: "Товар не найден" });
    res.json({ success: true });
  } catch (err) {
    console.error("admin DELETE product error:", err);
    res.status(500).json({ error: "Ошибка при удалении товара" });
  }
});

router.put("/:id/restore", authMiddleware, async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, { deleted: false }, { new: true });
    if (!p) return res.status(404).json({ error: "Товар не найден" });
    res.json({ success: true });
  } catch (err) {
    console.error("restore product error:", err);
    res.status(500).json({ error: "Ошибка при восстановлении товара" });
  }
});

router.put("/admin/:id/restore", authMiddleware, async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, { deleted: false }, { new: true });
    if (!p) return res.status(404).json({ error: "Товар не найден" });
    res.json({ success: true });
  } catch (err) {
    console.error("admin restore product error:", err);
    res.status(500).json({ error: "Ошибка при восстановлении товара" });
  }
});

router.post("/admin/import", authMiddleware, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Неверные данные для импорта" });
    }
    const ops = items.map((it) => ({
      updateOne: {
        filter: { sku: it.sku },
        update: { $set: it },
        upsert: true,
      },
    }));
    await Product.bulkWrite(ops);
    res.json({ success: true });
  } catch (err) {
    console.error("import error:", err);
    res.status(500).json({ error: "Ошибка при импорте товаров" });
  }
});

module.exports = router;
