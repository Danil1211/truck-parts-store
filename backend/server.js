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

/* ===================== Импорты маршрутов ===================== */
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

/* ========================= Общие настройки ========================= */
app.set('trust proxy', true);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ============================= CORS ============================= */
// Домены из .env
const allowedFromEnv = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Разрешаем storo-shop.com, www, и любые поддомены *.storo-shop.com
function isAllowedOrigin(origin = '') {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const h = url.hostname.toLowerCase();
    if (h === 'storo-shop.com' || h === 'www.storo-shop.com' || h.endsWith('.storo-shop.com')) {
      return true;
    }
    if (allowedFromEnv.includes(origin)) return true;          // доп. белый список (Render и т.п.)
    if (h.endsWith('onrender.com')) return true;               // при необходимости
    return false;
  } catch {
    return false;
  }
}

// 1) Ручной «универсальный» слой — заголовки ставим ПЕРЕД всеми роутами
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-Id, X-Super-Key');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

// 2) Плагин cors — для совместимости с библиотеками
app.use(cors({
  origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Super-Key'],
}));

/* ============================ Статика / health ============================ */
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Тестовый эндпоинт для проверки CORS
app.get('/api/cors-check', (req, res) => {
  res.json({
    ok: true,
    originSeen: req.headers.origin || null,
  });
});

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
