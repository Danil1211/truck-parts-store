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

/* ===================== Маршруты (импорты) ===================== */
// глобальные
const publicRoutes       = require('./routes/public');       // лендинг: signup/plans
const superAdminRoutes   = require('./routes/superAdmin');   // основатель
const paymentsRoutes     = require('./routes/payments');     // вебхуки оплат (если есть)

// мультиарендное обнаружение
const withTenant         = require('./middleware/withTenant');

// админ-авторизация арендатора
const authRoutes         = require('./auth');                // /api/auth

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

/* ========================= Общие настройки ========================= */
app.set('trust proxy', true);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ============================= CORS ============================= */
// Разрешённые источники из .env (через запятую)
const allowedFromEnv = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Статический список + из .env
const baseAllowed = [
  // DEV
  'http://localhost:5173',   // фронт (storefront + admin)
  'http://127.0.0.1:5173',
  'http://localhost:5174',   // лендинг
  // PROD (Render demo)
  'https://truck-parts-frontend.onrender.com',
  'https://truck-parts-backend.onrender.com',
];

const allowedOrigins = Array.from(new Set([...baseAllowed, ...allowedFromEnv]));

// Вспомогательная проверка для поддоменов *.storo-shop.com в проде
function isStoroSubdomain(origin = '') {
  try {
    const { hostname, protocol } = new URL(origin);
    return /^https?:$/.test(protocol) && /\.storo-shop\.com$/i.test(hostname);
  } catch {
    return false;
  }
}

// Ручной preflight (важно для Render)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const okOrigin =
    !origin ||
    allowedOrigins.includes(origin) ||
    isStoroSubdomain(origin);

  if (okOrigin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Tenant-Id, X-Super-Key'
    );
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

// Основной cors — не бросаем ошибку, если origin левый (просто без CORS заголовков)
app.use(
  cors({
    origin: (origin, cb) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        isStoroSubdomain(origin)
      ) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Super-Key'],
  })
);

/* ============================ Статика / health ============================ */
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/healthz', (_req, res) => res.json({ ok: true }));

/* ===================== Глобальные роуты (без tenant) ===================== */
app.use('/api/public', publicRoutes);         // регистрация арендатора, планы
app.use('/api/superadmin', superAdminRoutes); // панель основателя
app.use('/webhooks', paymentsRoutes);         // платёжные вебхуки

/* ==================== Ниже всё в контексте арендатора ==================== */
app.use(withTenant);

/* ===== Админ-логин (владельцы/менеджеры арендатора) ===== */
app.use('/api/auth', authRoutes);

/* ===== Остальные роуты магазина (все требуют tenant) ===== */
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
  console.error('Ошибка сервера:', err);
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
