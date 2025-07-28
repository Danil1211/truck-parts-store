const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cron = require('node-cron');

const authRoutes = require('./auth');
const categoryRoutes = require('./categories');
const productRoutes = require('./routes/products');
const orderRoutes = require('./orders');
const uploadRoutes = require('./upload');
const chatRoutes = require('./chat');
const groupsRoutes = require('./routes/groups');
const novaposhtaProxy = require('./routes/novaposhtaProxy');  // <-- новый импорт

const { Message, User } = require('./models'); // Group импортируется только в router

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/truckparts';

// ====== CORS ======
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://truck-parts-frontend.onrender.com',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======= Статика =======
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ======= Основные роуты =======
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/novaposhta', novaposhtaProxy);  // <-- подключаем прокси для Новой Почты

// ======= 404 =======
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ресурс не найден' });
});

// ======= Ошибка сервера =======
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  res.status(500).json({ error: 'Ошибка сервера' });
});

// ======= CRON и запуск базы =======
mongoose.connect(MONGO_URL)
  .then(async () => {
    // Автоматически создать "Родительская группа", если её нет
    const { Group } = require('./models');
    let parent = await Group.findOne({ parentId: null, name: "Родительская группа" });
    if (!parent) {
      parent = new Group({ name: "Родительская группа", parentId: null });
      await parent.save();
      console.log("✅ Родительская группа создана!");
    }
    app.listen(PORT, () => {
      console.log(`🚀 Server started on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ DB connection error:', err);
    process.exit(1);
  });
