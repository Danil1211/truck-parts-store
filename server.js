const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://truck-parts-frontend.onrender.com',
];
const isDev = process.env.NODE_ENV !== 'production';

// --- CORS ---
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (isDev) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Новая Почта ---
app.use('/api/novaposhta', require('./routes/novaposhtaProxy'));

// --- Подключаем роуты из /routes ---
app.use('/api/groups', require('./routes/groups'));
app.use('/api/products', require('./routes/products'));

// --- Подключаем роуты из корня (внимание на пути!) ---
app.use('/api/auth', require('./auth'));
app.use('/api/categories', require('./categories'));
app.use('/api/chat', require('./chat'));
app.use('/api/orders', require('./orders'));
app.use('/api/email', require('./email'));
app.use('/api/upload', require('./upload'));
// ...если есть еще — добавь тут!

// --- Статика (картинки и т.п.) ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Если нужен фронт в проде, раскомментируй:
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, 'client', 'dist')));
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
//   });
// }

app.use((req, res, next) => {
  res.status(404).json({ error: 'Ресурс не найден' });
});

app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  res.status(500).json({ error: 'Ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
