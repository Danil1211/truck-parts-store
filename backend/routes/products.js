// backend/routes/products.js
const express = require("express");
const router = express.Router();
const { Product, Group } = require("../models/models");
const { authMiddleware } = require("../protected");
const withTenant = require("../middleware/withTenant");

router.use(withTenant);

/* ===================================================
   PUBLIC ROUTES
=================================================== */

// Список товаров (с фильтрами: группа, наличие, поиск)
router.get("/", async (req, res) => {
  try {
    const { q, groupId, inStock, page = 1, limit = 20 } = req.query;

    const filter = { deleted: { $ne: true } };

    if (q) {
      filter.name = { $regex: q, $options: "i" };
    }

    if (groupId) {
      filter.group = groupId;
    }

    if (inStock === "true") {
      filter.availability = "published";
    } else if (inStock === "false") {
      filter.availability = { $ne: "published" };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(filter),
    ]);

    res.json({ items, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("Error loading products:", err);
    res.status(500).json({ error: "Ошибка загрузки товаров" });
  }
});

// Карточка товара
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || product.deleted) {
      return res.status(404).json({ error: "Товар не найден" });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Ошибка загрузки товара" });
  }
});

// Витрина (подборка товаров)
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
    res.status(500).json({ error: "Ошибка загрузки витрины" });
  }
});

/* ===================================================
   ADMIN ROUTES
=================================================== */
router.use(authMiddleware);

// Список товаров (для админки, с расширенными фильтрами)
router.get("/admin", async (req, res) => {
  try {
    const { q, groupId, inStock, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
      ];
    }

    if (groupId) filter.group = groupId;

    if (inStock === "true") {
      filter.availability = "published";
    } else if (inStock === "false") {
      filter.availability = { $ne: "published" };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(filter),
    ]);

    res.json({ items, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: "Ошибка загрузки товаров (admin)" });
  }
});

// Создание товара
router.post("/admin", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: "Ошибка при создании товара" });
  }
});

// Обновление товара
router.put("/admin/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: "Ошибка при обновлении товара" });
  }
});

// Удаление (soft-delete)
router.delete("/admin/:id", async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { deleted: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Ошибка при удалении товара" });
  }
});

// Восстановление товара
router.put("/admin/:id/restore", async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { deleted: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Ошибка при восстановлении товара" });
  }
});

// Импорт (bulk insert/update)
router.post("/admin/import", async (req, res) => {
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
    console.error("Ошибка импорта:", err);
    res.status(500).json({ error: "Ошибка при импорте товаров" });
  }
});

module.exports = router;
