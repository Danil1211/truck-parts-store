const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const router = express.Router();

const { Product } = require("../models/models");
const { authMiddleware } = require("./protected");
const withTenant = require("../middleware/withTenant");

router.use(withTenant);

/* ----------------------------- Cloudinary ----------------------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
});

/* ----------------------------- helpers ----------------------------- */
function parseJSONMaybeArray(v) {
  if (v === undefined || v === null || v === "") return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  if (typeof v === "string") {
    try {
      const j = JSON.parse(v);
      if (Array.isArray(j)) return j.filter(Boolean);
    } catch {}
    return v.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function toNumber(v) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
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
  if (grp && mongoose.Types.ObjectId.isValid(grp)) {
    filter.group = new mongoose.Types.ObjectId(grp);
  }

  if (availability) {
    filter.availability = availability;
  } else if (inStock === "true") {
    filter.availability = "published";
  } else if (inStock === "false") {
    filter.availability = { $ne: "published" };
  }

  return filter;
}

/* ================================ PUBLIC ================================ */

// витрина
router.get("/public/showcase", async (req, res) => {
  try {
    const products = await Product.find({
      tenantId: req.tenantId,
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

// публичный список
router.get("/", async (req, res) => {
  try {
    const filter = buildFilterFromQuery(req.query);
    filter.tenantId = req.tenantId;
    filter.deleted = { $ne: true };

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
    filter.tenantId = req.tenantId;
    filter.deleted = { $ne: true };

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const items = await Product.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.json(items);
  } catch (err) {
    console.error("admin list error:", err);
    res.status(500).json({ error: "Ошибка загрузки товаров (admin)" });
  }
});

// карточка (строгий маршрут по ObjectId, НЕ перехватывает /groups и т.п.)
router.get("/:id([0-9a-fA-F]{24})", async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    });
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

router.post("/", authMiddleware, upload.array("images", 10), async (req, res) => {
  try {
    const body = req.body || {};

    // ВАЖНО: требуем корректную группу
    if (!body.group || !mongoose.Types.ObjectId.isValid(body.group)) {
      return res.status(400).json({ error: "Выберите корректную группу (group)" });
    }

    const uploadedImages = (req.files || []).map((f) => f.path); // Cloudinary URL

    let serverImages = [];
    if (body.serverImages) {
      try {
        serverImages = JSON.parse(body.serverImages);
      } catch {
        serverImages = Array.isArray(body.serverImages)
          ? body.serverImages
          : [body.serverImages];
      }
      serverImages = serverImages.filter(Boolean);
    }

    const productData = {
      tenantId: req.tenantId,
      name: body.name || undefined,
      sku: body.sku || "",
      description: body.description || "",
      group: new mongoose.Types.ObjectId(body.group),

      // поддержка базовых числовых полей (не обязательно приходят)
      price: toNumber(body.price) ?? toNumber(body.retailPrice),
      unit: body.unit || "шт",
      availability: body.availability || "published",
      stock: toNumber(body.stock) ?? 0,

      // габариты
      width: toNumber(body.width) ?? 0,
      height: toNumber(body.height) ?? 0,
      length: toNumber(body.length) ?? 0,
      weight: toNumber(body.weight) ?? 0,

      // поисковые запросы
      queries: parseJSONMaybeArray(body.queries),

      // картинки
      images: [...serverImages, ...uploadedImages],

      deleted: false,
    };

    const product = new Product(productData);
    await product.save();
    res.json(product);
  } catch (err) {
    console.error("create product error:", err);
    res
      .status(400)
      .json({ error: "Ошибка при создании товара", details: err.message });
  }
});

router.patch("/:id([0-9a-fA-F]{24})", authMiddleware, upload.array("images", 10), async (req, res) => {
  try {
    const body = req.body || {};
    const uploadedImages = (req.files || []).map((f) => f.path);

    let serverImages = [];
    if (body.serverImages) {
      try {
        serverImages = JSON.parse(body.serverImages);
      } catch {
        serverImages = Array.isArray(body.serverImages)
          ? body.serverImages
          : [body.serverImages];
      }
      serverImages = serverImages.filter(Boolean);
    }

    const update = { updatedAt: new Date() };

    if ("name" in body) update.name = body.name;
    if ("sku" in body) update.sku = body.sku;
    if ("description" in body) update.description = body.description;
    if ("group" in body) {
      if (!mongoose.Types.ObjectId.isValid(body.group)) {
        return res.status(400).json({ error: "Некорректная группа (group)" });
      }
      update.group = new mongoose.Types.ObjectId(body.group);
    }
    if ("price" in body || "retailPrice" in body) {
      const p = toNumber(body.price) ?? toNumber(body.retailPrice);
      if (p !== undefined) update.price = p;
    }
    if ("unit" in body) update.unit = body.unit;
    if ("availability" in body) update.availability = body.availability;
    if ("stock" in body) update.stock = toNumber(body.stock);

    if ("width" in body) update.width = toNumber(body.width);
    if ("height" in body) update.height = toNumber(body.height);
    if ("length" in body) update.length = toNumber(body.length);
    if ("weight" in body) update.weight = toNumber(body.weight);

    if ("queries" in body) update.queries = parseJSONMaybeArray(body.queries);

    if (serverImages.length || uploadedImages.length) {
      update.images = [...serverImages, ...uploadedImages];
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: update },
      { new: true }
    );

    if (!product) return res.status(404).json({ error: "Товар не найден" });
    res.json(product);
  } catch (err) {
    console.error("update product error:", err);
    res
      .status(400)
      .json({ error: "Ошибка при обновлении товара", details: err.message });
  }
});

router.delete("/:id([0-9a-fA-F]{24})", authMiddleware, async (req, res) => {
  try {
    const p = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { deleted: true },
      { new: true }
    );
    if (!p) return res.status(404).json({ error: "Товар не найден" });
    res.json({ success: true });
  } catch (err) {
    console.error("delete product error:", err);
    res.status(500).json({ error: "Ошибка при удалении товара" });
  }
});

module.exports = router;
