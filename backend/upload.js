// upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { authMiddleware } = require('./protected');

// --- Multer storage ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // берём tenantId из токена
    const tenantId = req.user?.tenantId || 'default';
    const dir = path.join(__dirname, 'uploads', tenantId);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  },
});

const upload = multer({ storage });

/**
 * 📌 Загрузка одного изображения (админ)
 */
router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Только для админа' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }

  const tenantId = req.user?.tenantId || 'default';
  const filePath = `/uploads/${tenantId}/${req.file.filename}`;

  res.status(201).json({ url: filePath });
});

/**
 * 📌 Загрузка нескольких изображений (админ)
 */
router.post('/multi', authMiddleware, upload.array('images', 10), (req, res) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Только для админа' });
  }
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Файлы не загружены' });
  }

  const tenantId = req.user?.tenantId || 'default';
  const filePaths = req.files.map((f) => `/uploads/${tenantId}/${f.filename}`);

  res.status(201).json({ urls: filePaths });
});

module.exports = router; // <<< именно router
