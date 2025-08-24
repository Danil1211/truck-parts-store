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

/**
 * Витрина — положили ПЕРЕД "/:id", чтобы не перехватывалось параметром
 */
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

/**
 * Публичный список — возвращает МАССИВ (как ожидает фронт)
 * Фильтры: q|search, group|groupId, availability, inStock
 */
router.get("/", async (req, res) => {
  try {
    const filter = buildFilterFromQuery(req.query);
    const items = await Product.find(filter).sort({ updatedAt: -1 });
    res.json(items); // массив
  } catch (err) {
    console.error("public products list error:", err);
    res.status(500).json({ error: "Ошибка загрузки товаров" });
  }
});

/**
 * Админ-список с пагинацией — СТРОГО ДО "/:id", чтобы "/admin" не съедал ":id"
 * Возвращает { items, total, pages }
 */
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

/**
 * Карточка товара
 * ДЕРЖИМ ПОСЛЕ /admin и /public/showcase
 */
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

/* ================================ PROTECTED (mutations) ================================ */

router.post("/", authMiddleware, upload.array("images", 10), async (req, res) => {
  try {
    // Загруженные новые фото
    const uploadedImages = mapFilesToPublicPaths(req.files);
    // На создание обычно нет serverImages, но на всякий случай
    const serverImages = toArray(req.body["serverImages[]"] || req.body.serverImages);

    const productData = {
      ...req.body,
      // нормализуем поля
      price: req.body.price != null ? Number(req.body.price) : undefined,
      stock: req.body.stock != null ? Number(req.body.stock) : undefined,
      width: req.body.width != null ? Number(req.body.width) : undefined,
      height: req.body.height != null ? Number(req.body.height) : undefined,
      length: req.body.length != null ? Number(req.body.length) : undefined,
      weight: req.body.weight != null ? Number(req.body.weight) : undefined,
      queries: parseQueries(req.body.queries),
      images: [...serverImages, ...uploadedImages],
    };

    // Удаляем служебные поля, чтобы не попали в документ
    delete productData["serverImages[]"];
    delete productData.serverImages;

    const product = new Product(productData);
    await product.save();
    res.json(product);
  } catch (err) {
    console.error("create product error:", err);
    res.status(400).json({ error: "Ошибка при создании товара" });
  }
});

router.patch("/:id", authMiddleware, upload.array("images", 10), async (req, res) => {
  try {
    const uploadedImages = mapFilesToPublicPaths(req.files);
    const serverImages = toArray(req.body["serverImages[]"] || req.body.serverImages);

    const update = {
      ...req.body,
      price: req.body.price != null ? Number(req.body.price) : undefined,
      stock: req.body.stock != null ? Number(req.body.stock) : undefined,
      width: req.body.width != null ? Number(req.body.width) : undefined,
      height: req.body.height != null ? Number(req.body.height) : undefined,
      length: req.body.length != null ? Number(req.body.length) : undefined,
      weight: req.body.weight != null ? Number(req.body.weight) : undefined,
      queries: parseQueries(req.body.queries),
      images: [...serverImages, ...uploadedImages],
      updatedAt: new Date(),
    };

    delete update["serverImages[]"];
    delete update.serverImages;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    );

    if (!product) return res.status(404).json({ error: "Товар не найден" });
    res.json(product);
  } catch (err) {
    console.error("update product error:", err);
    res.status(400).json({ error: "Ошибка при обновлении товара" });
  }
});

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

/* ---------- совместимость со старыми путями /admin ---------- */

// обновление
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

// soft-delete (старый путь)
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

// восстановление
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

// импорт
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
