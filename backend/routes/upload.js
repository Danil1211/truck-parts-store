// backend/routes/upload.js
const router = require('express').Router();
const { authMiddleware } = require('./protected');          // ✅ правильный путь
const upload = require('../upload/tenantMulter');
const planGuard = require('../middleware/planGuard');

/**
 * 📌 Загрузка одного файла (админ/по тарифу)
 */
router.post(
  '/file',
  authMiddleware,
  planGuard('uploadMedia'),
  upload.single('file'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    res.json({ url: `/uploads/${req.tenantId}/${req.file.filename}` }); // ✅ req.tenantId
  }
);

/**
 * 📌 Загрузка нескольких файлов (админ/по тарифу)
 */
router.post(
  '/multi',
  authMiddleware,
  planGuard('uploadMedia'),
  upload.array('files', 10),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Файлы не загружены' });
    }
    const urls = req.files.map((f) => `/uploads/${req.tenantId}/${f.filename}`); // ✅ req.tenantId
    res.json({ urls });
  }
);

module.exports = router;
