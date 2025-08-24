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

const authRoutes         = require('./routes/auth');
const categoryRoutes     = require('./routes/categories');
const productRoutes      = require('./routes/products');
const orderRoutes        = require('./routes/orders');
const uploadRoutes       = require('./routes/upload');
const chatRoutes         = require('./routes/chat');
const groupsRoutes       = require('./routes/groups');
const novaposhtaProxy    = require('./routes/novaposhtaProxy');
const userRoutes         = require('./routes/users');
const blogRoutes         = require('./routes/blog');
const promosRoutes       = require('./routes/promos');
const siteSettingsRoutes = require('./routes/siteSettings');

/* ========================= Общие настройки ========================= */
app.set('trust proxy', true);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ============================= CORS ============================= */
const allowlist = [
  /^https?:\/\/storo-shop\.com$/i,
  /^https?:\/\/(?:.+\.)?storo-shop\.com$/i,
  /^https?:\/\/api\.storo-shop\.com$/i,
  /^https?:\/\/localhost(?::\d+)?$/i,
  /onrender\.com$/i,
];

const extra = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const extraRE = extra.map(s =>
  new RegExp('^' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
);

function originAllowed(origin) {
  if (!origin) return true;
  return allowlist.some(re => re.test(origin)) || extraRE.some(re => re.test(origin));
}

const corsOptionsDelegate = (req, cb) => {
  const origin = req.header('Origin') || '';
  const allowed = originAllowed(origin);
  cb(null, {
    origin: allowed ? origin : false,
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Tenant-Id','X-Tenant','X-Super-Key'],
    optionsSuccessStatus: 204,
  });
};

app.use(cors(corsOptionsDelegate));
app.options(/.*/, cors(corsOptionsDelegate));

/* ============== Лог запросов ============== */
app.use((req, _res, next) => {
  console.log(`➡️ ${req.method} ${req.path} | origin=${req.headers.origin || '-'} | host=${req.headers.host}`);
  next();
});

/* ============================ Статика / health ============================ */
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ВАЖНО: Render делает HEAD / — отвечаем 204 до withTenant
app.head('/', (_req, res) => res.status(204).end());
app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.get('/api/cors-check', (req, res) => {
  res.json({ ok: true, originSeen: req.headers.origin || null });
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
mongoose.connect(MONGO_URL)
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ DB connection error:', err);
    process.exit(1);
  });
