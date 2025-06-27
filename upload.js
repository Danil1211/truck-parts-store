const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { authMiddleware } = require('./protected');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});

const upload = multer({ storage });

// Для ручной загрузки
router.post('/', authMiddleware, upload.single('image'), (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Только для админа' });
  const filePath = `/uploads/${req.file.filename}`;
  res.status(201).json({ url: filePath });
});

module.exports = router; // <<< ИМЕННО router
