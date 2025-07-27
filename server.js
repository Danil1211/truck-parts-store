const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// === CORS ===
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://truck-parts-frontend.onrender.com',
];
const isDev = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: isDev ? '*' : allowedOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==== Прокси для Новая Почта ====
const novaposhtaProxy = require('./routes/novaposhtaProxy');
app.use('/api/novaposhta', novaposhtaProxy);

// ======= 404 =======
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ресурс не найден' });
});

// ======= Ошибка сервера =======
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err);
  res.status(500).json({ error: 'Ошибка сервера' });
});

// ======= Запуск =======
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});
