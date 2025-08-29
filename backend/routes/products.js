// backend/routes/products.js
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
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function parseJSON(v, fallback) {
  if (!v) return fallback;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
}

function toNumber(v, def = 0) {
  if (v === undefined || v === null || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
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

function ensureObjectIdParam(req, res, next) {
  const { id } = req.params || {};
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Товар не найден" });
  }
  next();
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

// карточка
router.get("/:id", ensureObjectIdParam, async (req, res) => {
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

    if (!body.group || !mongoose.Types.ObjectId.isValid(body.group)) {
      return res.status(400).json({ error: "Выберите корректную группу (group)" });
    }

    const uploadedImages = (req.files || []).map((f) => f.path);

    let serverImages = [];
    if (body.serverImages) {
      serverImages = parseJSON(body.serverImages, []);
    }

    const productData = {
      tenantId: req.tenantId,
      name: body.name || "",
      sku: body.sku || "",
      description: body.description || "",
      group: new mongoose.Types.ObjectId(body.group),

      // --- новые поля ---
      images: [...serverImages, ...uploadedImages],
      videoUrl: body.videoUrl || "",

      priceMode: body.priceMode || "retail",
      retailPrice: toNumber(body.retailPrice),
      retailCurrency: body.retailCurrency || "UAH",
      priceFromFlag: body.priceFromFlag === "1" || body.priceFromFlag === true,

      wholesaleTiers: parseJSON(body.wholesaleTiers, []),

      unit: body.unit || "шт",
      stockState: body.stockState || "in_stock",
      stock: toNumber(body.stock),

      regions: parseJSONMaybeArray(body.regions),

      availability: body.availability || "published",

      attrs: parseJSON(body.attrs, []),

      queries: parseJSONMaybeArray(body.queries),
      googleCategory: body.googleCategory || "",

      width: toNumber(body.width),
      height: toNumber(body.height),
      length: toNumber(body.length),
      weight: toNumber(body.weight),

      seoTitle: body.seoTitle || "",
      seoDesc: body.seoDesc || "",
      seoKeys: body.seoKeys || "",
      seoSlug: body.seoSlug || "",
      seoNoindex: body.seoNoindex === "1" || body.seoNoindex === true,

      deleted: false,
    };

    const product = new Product(productData);
    await product.save();
    res.json(product);
  } catch (err) {
    console.error("create product error:", err);
    res.status(400).json({ error: "Ошибка при создании товара", details: err.message });
  }
});

router.patch("/:id", authMiddleware, ensureObjectIdParam, upload.array("images", 10), async (req, res) => {
  try {
    const body = req.body || {};
    const uploadedImages = (req.files || []).map((f) => f.path);

    let serverImages = [];
    if (body.serverImages) {
      serverImages = parseJSON(body.serverImages, []);
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

    if ("videoUrl" in body) update.videoUrl = body.videoUrl;

    if ("priceMode" in body) update.priceMode = body.priceMode;
    if ("retailPrice" in body) update.retailPrice = toNumber(body.retailPrice);
    if ("retailCurrency" in body) update.retailCurrency = body.retailCurrency;
    if ("priceFromFlag" in body) update.priceFromFlag = body.priceFromFlag === "1" || body.priceFromFlag === true;

    if ("wholesaleTiers" in body) update.wholesaleTiers = parseJSON(body.wholesaleTiers, []);

    if ("unit" in body) update.unit = body.unit;
    if ("stockState" in body) update.stockState = body.stockState;
    if ("stock" in body) update.stock = toNumber(body.stock);

    if ("regions" in body) update.regions = parseJSONMaybeArray(body.regions);

    if ("availability" in body) update.availability = body.availability;

    if ("attrs" in body) update.attrs = parseJSON(body.attrs, []);

    if ("queries" in body) update.queries = parseJSONMaybeArray(body.queries);
    if ("googleCategory" in body) update.googleCategory = body.googleCategory;

    if ("width" in body) update.width = toNumber(body.width);
    if ("height" in body) update.height = toNumber(body.height);
    if ("length" in body) update.length = toNumber(body.length);
    if ("weight" in body) update.weight = toNumber(body.weight);

    if ("seoTitle" in body) update.seoTitle = body.seoTitle;
    if ("seoDesc" in body) update.seoDesc = body.seoDesc;
    if ("seoKeys" in body) update.seoKeys = body.seoKeys;
    if ("seoSlug" in body) update.seoSlug = body.seoSlug;
    if ("seoNoindex" in body) update.seoNoindex = body.seoNoindex === "1" || body.seoNoindex === true;

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
    res.status(400).json({ error: "Ошибка при обновлении товара", details: err.message });
  }
});

router.delete("/:id", authMiddleware, ensureObjectIdParam, async (req, res) => {
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
