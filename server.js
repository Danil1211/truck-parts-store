const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cron = require('node-cron');
const jwt = require('jsonwebtoken');

const authRoutes = require('./auth');
const categoryRoutes = require('./categories');
const productRoutes = require('./products');
const orderRoutes = require('./orders');
const uploadRoutes = require('./upload');
const chatRoutes = require('./chat');
const { Message, User } = require('./models');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/truckparts';

// ========== CORS (универсальный) ==========
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://truck-parts-frontend.onrender.com',
];

app.use(cors({
  origin: function (origin, callback) {
    // CLI/postman или прямые запросы — разрешить всегда
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}));

// Для preflight запросов (OPTIONS)
app.options('*', cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статика
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Новый маршрут для админки: список клиентов
app.get('/api/clients/admin', async (req, res) => {
  try {
    // Авторизация (JWT из заголовка)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Нет авторизации' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
      if (!decoded.isAdmin) return res.status(403).json({ error: 'Нет доступа' });
    } catch {
      return res.status(401).json({ error: 'Неверный токен' });
    }

    // --- Фильтры и поиск
    const { q = '', status = '', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ];
    }
    if (status && status !== 'all') filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [clients, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-password'), // не отдаём пароль!
      User.countDocuments(filter),
    ]);

    res.json({ clients, total });
  } catch (err) {
    console.error('Ошибка получения клиентов:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// --- Другие API маршруты
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);

// 404
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ресурс не найден' });
});

// Ошибка сервера
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  res.status(500).json({ error: 'Ошибка сервера' });
});

// ⏰ Удаление сообщений старше 24 часов
cron.schedule('*/10 * * * *', async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 часа назад
  try {
    const result = await Message.deleteMany({ createdAt: { $lt: cutoff } });
    if (result.deletedCount > 0) {
      console.log(`🗑️ Удалено ${result.deletedCount} старых сообщений`);
    }
  } catch (err) {
    console.error('Ошибка при удалении сообщений:', err);
  }
});

// ⏰ Статус missed, если клиент написал, а админ не ответил 2+ минуты
cron.schedule('*/1 * * * *', async () => {
  try {
    const users = await User.find({ status: 'waiting' });

    for (const user of users) {
      const lastMsg = await Message.findOne({ user: user._id }).sort({ createdAt: -1 });
      if (!lastMsg || lastMsg.fromAdmin) continue;

      const diffMs = Date.now() - new Date(lastMsg.createdAt).getTime();
      if (diffMs > 2 * 60 * 1000) {
        user.status = 'missed';
        await user.save();
        console.log(`⚠️ Чат с пользователем ${user.phone} помечен как missed`);
      }
    }
  } catch (err) {
    console.error('Ошибка при проверке missed:', err);
  }
});

// Подключение к MongoDB
mongoose.connect(MONGO_URL)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server started on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ DB connection error:', err);
    process.exit(1);
  });
