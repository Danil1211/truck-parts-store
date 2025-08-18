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

/* ===================== ЛОГИ ===================== */
app.use((req, res, next) => {
  console.log("👉 Request:", req.method, req.url, "Origin:", req.headers.origin);
  next();
});

/* ========================= Общие настройки ========================= */
app.set('trust proxy', true);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ============================= CORS ============================= */
// Разрешённые из .env
const allowedFromEnv = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Вспомогательная проверка для поддоменов *.storo-shop.com
function isStoroSubdomain(origin = '') {
  try {
    const { hostname, protocol } = new URL(origin);
    return /^https?:$/.test(protocol) && /\.storo-shop\.com$/i.test(hostname);
  } catch {
    return false;
  }
}

app.use(cors({
  origin: (origin, cb) => {
    console.log("✅ CORS check origin:", origin);

    if (!origin) return cb(null, true);

    // Разрешаем все поддомены storo-shop.com
    if (isStoroSubdomain(origin) || origin === "https://storo-shop.com") {
      return cb(null, true);
    }

    // Доп. whitelist из .env
    if (allowedFromEnv.includes(origin)) {
      return cb(null, true);
    }

    // Render демо
    if (origin.includes("onrender.com")) {
      return cb(null, true);
    }

    return cb(null, false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Super-Key'],
}));

// Preflight обработка
app.options("*", (req, res) => {
  console.log("🟨 Preflight for:", req.headers.origin);
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-Id, X-Super-Key");
  return res.sendStatus(204);
});

/* ===================== Маршруты (импорты) ===================== */
const publicRoutes       = require('./routes/public');
const superAdminRoutes   = require('./routes/superAdmin');
const paymentsRoutes     = require('./routes/payments');
const withTenant         = require('./middleware/withTenant');
const authRoutes         = require('./auth');
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
