// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/truckparts';

/* ===================== ЛОГИ ORIGIN ===================== */
app.use((req, res, next) => {
  console.log("👉 Request:", req.method, req.url);
  console.log("👉 Origin:", req.headers.origin);
  next();
});

/* ========================= Общие настройки ========================= */
app.set('trust proxy', true);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ============================= CORS ============================= */
// ВРЕМЕННО максимально открыто (чтобы исключить баг с проверкой)
app.use(cors({
  origin: (origin, cb) => {
    console.log("✅ CORS check origin:", origin);
    if (!origin) return cb(null, true);

    // Разрешаем любой поддомен storo-shop.com и сам домен
    if (origin.endsWith(".storo-shop.com") || origin === "https://storo-shop.com") {
      return cb(null, true);
    }

    // Дополнительно можно whitelist'ить Render
    if (origin.includes("onrender.com")) {
      return cb(null, true);
    }

    return cb(null, false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Super-Key'],
}));

// Preflight лог
app.options("*", (req, res) => {
  console.log("🟨 Preflight for:", req.headers.origin);
  res.sendStatus(204);
});

/* ===================== Маршруты (импорты) ===================== */
// глобальные
const publicRoutes       = require('./routes/public');
const superAdminRoutes   = require('./routes/superAdmin');
const paymentsRoutes     = require('./routes/payments');

// мультиарендное обнаружение
const withTenant         = require('./middleware/withTenant');

// админ-авторизация арендатора
const authRoutes         = require('./auth');

// остальной функционал магазина
const categoryRoutes     = require('./categories');
const productRoutes      = require('./routes/products');
const orderRoutes        = require('./routes/orders');
const uploadRoutes       = require('./upload');
const chatRoutes         = require('./chat');
const groupsRoutes       = require('./routes/groups');
const novaposhtaProxy    = require('./routes/novaposhtaProxy');
const userRoutes         = require('./routes/users');
const blogRoutes         = require('./routes/blog');
const promosRoutes       = require('./routes/promos');
const siteSettingsRoutes = require('./routes/siteSettings');

/* ============================ Статика / health ============================ */
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/healthz', (_req, res) => res.json({ ok: true }));

/* ===================== Глобальные роуты (без tenant) ===================== */
app.use('/api/public', publicRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/webhooks', paymentsRoutes);

/* ==================== Ниже всё в контексте арендатора ==================== */
app.use(withTenant);

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/novaposhta', novaposhtaProxy);
app.use('/api/users', userRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/promos', promosRoutes);
app.use('/api/site-settings', siteSettingsRoutes);

/* ============================== 404 / 500 ============================== */
app.use((req, res) => res.status(404).json({ error: 'Ресурс не найден' }));

app.use((err, req, res, _next) => {
  console.error('🔥 Ошибка сервера:', err);
  res.status(500).json({ error: 'Ошибка сервера' });
});

/* ============================== Старт ============================== */
mongoose
  .connect(MONGO_URL)
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ DB connection error:', err);
    process.exit(1);
  });
