// backend/routes/upload.js
const router = require("express").Router();
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { authMiddleware } = require("./protected");
const planGuard = require("../middleware/planGuard");

// ⚙️ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ⚙️ multer — хранение в памяти (буфер)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
});

// helper — загрузка одного файла в Cloudinary
function uploadBufferToCloudinary(buffer, filename, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        use_filename: true,
        filename_override: filename,
        unique_filename: true,
        overwrite: false,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result.secure_url || result.url);
      }
    );
    stream.end(buffer);
  });
}

/**
 * 📌 Загрузка одного файла
 */
router.post(
  "/file",
  authMiddleware,
  planGuard("uploadMedia"),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Файл не загружен" });
      }
      const tenantSlug = req.tenant?.subdomain || req.tenant?.name || "default";
      const folder = process.env.CLOUDINARY_FOLDER || `storo/${tenantSlug}/uploads`;

      const url = await uploadBufferToCloudinary(req.file.buffer, req.file.originalname, folder);
      res.json({ url });
    } catch (e) {
      console.error("upload /file error:", e);
      res.status(500).json({ error: "Ошибка загрузки файла" });
    }
  }
);

/**
 * 📌 Загрузка нескольких файлов
 */
router.post(
  ["/multi", "/", "/images"], // совместимость
  authMiddleware,
  planGuard("uploadMedia"),
  upload.array("files", 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "Файлы не загружены" });
      }
      const tenantSlug = req.tenant?.subdomain || req.tenant?.name || "default";
      const folder = process.env.CLOUDINARY_FOLDER || `storo/${tenantSlug}/uploads`;

      const urls = await Promise.all(
        req.files.map((f) => uploadBufferToCloudinary(f.buffer, f.originalname, folder))
      );

      res.json(urls); // массив строк
    } catch (e) {
      console.error("upload /multi error:", e);
      res.status(500).json({ error: "Ошибка загрузки файлов" });
    }
  }
);

module.exports = router;
