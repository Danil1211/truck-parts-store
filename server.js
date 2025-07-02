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

// ========== CORS (универсальный для Render и локали) ==========
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://truck-parts-frontend.onrender.com',
];

app.use(cors({
  origin: function (origin, callback) {
    // Разрешаем postman/cli (без origin) и нужные домены
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

// ======= Модели и маршруты для групп =======
const groupSchema = new mongoose.Schema({
  name: String,
  img: String,
  count: Number,
  published: Number,
  hidden: Number,
  deleted: Number,
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }]
});

const Group = mongoose.model('Group', groupSchema);

// Получение всех групп
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await Group.find().populate('children');
    res.status(200).json(groups);
  } catch (error) {
    console.error('Ошибка при получении групп:', error);
    res.status(500).json({ message: 'Ошибка при получении групп' });
  }
});

// Создание новой группы
app.post('/api/groups', async (req, res) => {
  const { name, img, parentId } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Название группы обязательно' });
  }

  const newGroup = new Group({
    name,
    img: img || null,
    count: 0,
    published: 0,
    hidden: 0,
    deleted: 0,
    children: [],
    parentId: parentId || null
  });

  try {
    const group = await newGroup.save();
    if (parentId) {
      const parentGroup = await Group.findById(parentId);
      parentGroup.children.push(group._id);
      await parentGroup.save();
    }
    res.status(201).json(group);
  } catch (error) {
    console.error('Ошибка при создании группы:', error);
    res.status(500).json({ message: 'Ошибка при создании группы' });
  }
});

// ======= Другие API маршруты =======
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);

// ======= 404 =======
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ресурс не найден' });
});

// ======= Ошибка сервера =======
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  res.status(500).json({ error: 'Ошибка сервера' });
});

// ⏰ Удаление сообщений старше 24 часов
cron.schedule('*/10 * * * *', async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
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

// ======= Подключение к MongoDB =======
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
