// backend/routes/auth.js
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { User, generateToken } = require("../models/models");
const { authMiddleware } = require("./protected");

/* ======================
   Админы / менеджеры
====================== */

/**
 * POST /api/auth/register
 * Регистрация админа (или менеджера)
 */
router.post("/register", async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "No tenant" });

    const { email, password, name = "", role = "admin" } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email & password required" });
    }

    const exists = await User.findOne({ tenantId, email }).lean();
    if (exists) {
      return res.status(409).json({ error: "email already in use" });
    }

    const user = await User.create({
      tenantId,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name,
      role,
      isAdmin: true,
    });

    const token = generateToken(user);
    const plain = user.toObject();
    delete plain.passwordHash;

    res.json({ token, user: plain });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Логин админа/менеджера
 */
router.post("/login", async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "No tenant" });

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email & password required" });
    }

    const user = await User.findOne({ tenantId, email });
    if (!user) return res.status(401).json({ error: "Invalid login or password" });
    if (!user.isAdmin) return res.status(403).json({ error: "Используйте вход покупателя" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid login or password" });

    const token = generateToken(user);
    const plain = user.toObject();
    delete plain.passwordHash;

    res.json({ token, user: plain });
  } catch (err) {
    next(err);
  }
});

/* ======================
   Покупатели (customers)
====================== */

/**
 * POST /api/auth/customer/register
 */
router.post("/customer/register", async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "No tenant" });

    const { email, password, name = "" } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email & password required" });
    }

    const exists = await User.findOne({ tenantId, email }).lean();
    if (exists) return res.status(409).json({ error: "email already in use" });

    const user = await User.create({
      tenantId,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name,
      role: "customer",
      isAdmin: false,
    });

    const token = generateToken(user);
    const plain = user.toObject();
    delete plain.passwordHash;

    res.json({ token, user: plain });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/customer/login
 */
router.post("/customer/login", async (req, res, next) => {
  try {
    const tenantId = req.tenantId || req?.tenant?.id;
    if (!tenantId) return res.status(400).json({ error: "No tenant" });

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email & password required" });
    }

    const user = await User.findOne({ tenantId, email });
    if (!user) return res.status(401).json({ error: "Invalid login or password" });
    if (user.role !== "customer") return res.status(403).json({ error: "Используйте вход админа" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid login or password" });

    const token = generateToken(user);
    const plain = user.toObject();
    delete plain.passwordHash;

    res.json({ token, user: plain });
  } catch (err) {
    next(err);
  }
});

/* ======================
   Универсальное "кто я"
====================== */

/**
 * GET /api/auth/me
 */
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const u = req.user.toObject ? req.user.toObject() : req.user;
    delete u.passwordHash;
    res.json({ user: u });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
