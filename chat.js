const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const axios = require('axios');
const getRealIp = require('./utils/getIp');
const { Message, User } = require('./models');
const { authMiddleware } = require('./protected');

let typingStatus = {}; // userId: { isTyping, name, fromAdmin }

// --- Multer storage ---
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
const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/gif',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'
  ];
  cb(null, allowed.includes(file.mimetype));
};
const upload = multer({ storage, fileFilter, limits: { files: 4 } });

// --- Статус "печатает"
router.post('/typing', authMiddleware, async (req, res) => {
  const { userId, isTyping, name, fromAdmin } = req.body;
  let realName = name;
  if (!fromAdmin) {
    try {
      const user = await User.findById(userId).lean();
      if (user && user.name) realName = user.name;
    } catch (e) {
      console.error("Ошибка при получении имени из БД:", e);
    }
  }
  typingStatus[userId] = {
    isTyping,
    name: fromAdmin ? 'Менеджер' : realName,
    fromAdmin: !!fromAdmin
  };
  res.json({ ok: true });
});

// Получить все статусы "печатает"
router.get('/typing/statuses', authMiddleware, (req, res) => {
  res.json(typingStatus);
});

// === Получить все чаты (для админки)
router.get('/admin', authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Нет доступа' });
  try {
    await updateMissedChats();
    const chats = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$user', lastMessage: { $first: '$$ROOT' } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          userId: '$_id',
          name: '$userInfo.name',
          phone: '$userInfo.phone',
          email: '$userInfo.email',
          status: '$userInfo.status',
          isBlocked: '$userInfo.isBlocked',
          ip: '$userInfo.ip',
          city: '$userInfo.city',
          isOnline: '$userInfo.isOnline',
          lastOnlineAt: '$userInfo.lastOnlineAt',
          lastMessage: 1
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } }
    ]);
    res.json(chats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка при получении чатов' });
  }
});

// === Получить сообщения пользователя (админ)
router.get('/admin/:userId', authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Нет доступа' });
  if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
    return res.status(400).json({ error: 'Некорректный userId' });
  }
  try {
    const messages = await Message.find({ user: req.params.userId }).sort({ createdAt: 1 });

    // если последнее сообщение от пользователя — фиксируем, что админ прочитал
    const user = await User.findById(req.params.userId);
    if (user) {
      const last = messages[messages.length - 1];
      if (last && !last.fromAdmin) {
        user.adminLastReadAt = new Date();
        user.status = "waiting";
        await user.save();
      }
    }

    res.json(messages);
  } catch (err) {
    console.error("Ошибка в /admin/:userId:", err);
    res.status(500).json({ error: 'Ошибка при загрузке сообщений' });
  }
});

// === Получить инфу о пользователе (админка)
router.get('/admin/user/:userId', authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Нет доступа' });
  if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
    return res.status(400).json({ error: 'Некорректный userId' });
  }
  try {
    const user = await User.findById(req.params.userId).lean();
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({
      userId: user._id,
      name: user.name,
      phone: user.phone,
      ip: user.ip || '',
      city: user.city || '',
      isBlocked: !!user.isBlocked,
      email: user.email || '',
      status: user.status || '',
      isOnline: !!user.isOnline,
      lastOnlineAt: user.lastOnlineAt || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка получения инфы' });
  }
});

// === Блокировать/разблокировать пользователя (админка)
router.post('/admin/user/:userId/block', authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Нет доступа' });
  if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
    return res.status(400).json({ error: 'Некорректный userId' });
  }
  const { block } = req.body;
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    user.isBlocked = !!block;
    await user.save();
    res.json({ success: true, isBlocked: user.isBlocked });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка блокировки' });
  }
});

// === Сбросить статус чата при прочтении (и отметить сообщения как прочитанные!)
router.post('/read/:userId', authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Нет доступа' });

  if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
    return res.status(400).json({ error: 'Некорректный userId' });
  }

  try {
    // ВАЖНО: пометить все входящие сообщения как прочитанные!
    await Message.updateMany(
      { user: req.params.userId, fromAdmin: false, read: false },
      { $set: { read: true } }
    );
    const user = await User.findById(req.params.userId);
    if (user) {
      user.status = 'waiting';
      user.adminLastReadAt = new Date();
      await user.save();
      return res.json({ success: true });
    }
    res.status(404).json({ error: 'Пользователь не найден' });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сброса статуса чата' });
  }
});

// === Админ отправляет сообщение клиенту (с фото/аудио)
router.post(
  '/admin/:userId',
  authMiddleware,
  upload.fields([{ name: 'images', maxCount: 3 }, { name: 'audio', maxCount: 1 }]),
  async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Нет доступа' });

    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ error: 'Некорректный userId' });
    }

    try {
      const user = await User.findById(req.params.userId);
      if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

      // Не даём писать если заблокирован!
      if (user.isBlocked) return res.status(403).json({ error: "Пользователь заблокирован" });

      const imageUrls = req.files && req.files.images
        ? req.files.images.map((f) => "/uploads/" + f.filename)
        : [];
      const audioUrl = req.files && req.files.audio && req.files.audio[0]
        ? "/uploads/" + req.files.audio[0].filename
        : "";

      const message = await Message.create({
        user: user._id,
        text: req.body.text || '',
        fromAdmin: true,
        read: false,
        createdAt: new Date(),
        imageUrls,
        audioUrl
      });

      // После отправки сбрасываем печатает
      if (typingStatus[user._id]) {
        typingStatus[user._id] = { isTyping: false, name: 'Менеджер', fromAdmin: true };
      }

      // При ответе сбрасываем статус
      user.status = "waiting";
      user.adminLastReadAt = new Date();
      await user.save();

      res.status(201).json(message);
    } catch (err) {
      console.error('Ошибка при отправке сообщения админом:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

// === Удалить весь чат (сообщения и пользователя)
router.delete('/admin/:userId', authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Нет доступа' });
  const userId = req.params.userId;
  try {
    await Message.deleteMany({ user: userId });
    await User.findByIdAndDelete(userId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка удаления чата' });
  }
});

// === Получить свои сообщения (клиент)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.isOnline = true;
      user.lastOnlineAt = new Date();
      await user.save();
    }
    const messages = await Message.find({ user: req.user.id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при загрузке сообщений' });
  }
});

// === Отправка сообщения (или регистрация, клиент)
router.post(
  '/',
  upload.fields([{ name: 'images', maxCount: 3 }, { name: 'audio', maxCount: 1 }]),
  async (req, res) => {
    const imageUrls = req.files?.images?.map(f => `/uploads/${f.filename}`) || [];
    const audioUrl = req.files?.audio?.[0] ? `/uploads/${req.files.audio[0].filename}` : null;
    const auth = req.headers.authorization;

    // авторизация по токену
    if (auth?.startsWith('Bearer ')) {
      try {
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ error: 'Пользователь не найден' });

        // Проверяем на блокировку!
        if (user.isBlocked) return res.status(403).json({ error: 'Вы заблокированы' });

        // Отмечаем онлайн + обновляем lastOnlineAt!
        user.isOnline = true;
        user.lastOnlineAt = new Date();
        await user.save();

        const savedMessage = await Message.create({
          user: user._id,
          text: req.body.text || '',
          imageUrls,
          audioUrl,
          fromAdmin: decoded.isAdmin || false,
          read: false
        });

        // После отправки сбрасываем печатает
        if (typingStatus[user._id]) {
          typingStatus[user._id] = { isTyping: false, name: user.name, fromAdmin: false };
        }

        // Новое сообщение от клиента
        if (!decoded.isAdmin) {
          user.status = 'new';
          user.lastMessageAt = new Date();
          await user.save();
        }

        return res.status(201).json(savedMessage);
      } catch (err) {
        console.error('Ошибка авторизации:', err);
        return res.status(401).json({ error: 'Недействительный токен' });
      }
    }

    // регистрация нового пользователя
    if (!req.body.name || !req.body.phone) {
      return res.status(400).json({ error: 'Имя и телефон обязательны' });
    }

    try {
      let user = await User.findOne({ phone: req.body.phone });
      if (!user) {
        // IP с первого обращения
        let ip = getRealIp(req);
        let city = "";
        try {
          const geo = await axios.get(`http://ip-api.com/json/${ip}`);
          city = geo.data && geo.data.city ? geo.data.city : "";
        } catch (e) {
          city = "";
        }

        user = await User.create({
          name: req.body.name,
          phone: req.body.phone,
          email: `${req.body.phone}@example.com`,
          passwordHash: 'chat',
          ip,
          city,
          isBlocked: false,
          isOnline: true,
          lastOnlineAt: new Date(),
        });
      } else {
        user.isOnline = true;
        user.lastOnlineAt = new Date();
        await user.save();
      }

      const token = jwt.sign(
        { id: user._id, name: user.name, phone: user.phone, isAdmin: false },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.json({ token });
    } catch (err) {
      console.error('Ошибка при регистрации:', err);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

// === Сделать offline (frontend вызывает при выходе или закрытии)
router.post('/offline', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.isOnline = false;
      await user.save();
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Ошибка" });
  }
});

// === PING для онлайн-статуса (каждые 30 секунд фронт должен дергать)
router.post('/ping', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.isOnline = true;
      user.lastOnlineAt = new Date();
      await user.save();
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Ошибка" });
  }
});

// === Обновление статуса чата (только админ)
router.patch('/status/:userId', authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: 'Нет доступа' });

  if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
    return res.status(400).json({ error: 'Некорректный userId' });
  }

  const { status } = req.body;
  if (!['waiting', 'done', 'missed', 'new', 'active', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }

  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    user.status = status;
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка при обновлении статуса:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// --- Авто-переводим чаты в missed
const TWO_MIN = 2 * 60 * 1000;
async function updateMissedChats() {
  const now = Date.now();
  const users = await User.find({ status: { $in: ["new", "waiting", "active"] } });
  for (let user of users) {
    if (
      user.lastMessageAt &&
      (!user.adminLastReadAt || user.lastMessageAt > user.adminLastReadAt)
    ) {
      if (now - user.lastMessageAt.getTime() > TWO_MIN) {
        user.status = "missed";
        await user.save();
      }
    }
    // ONLINE check: если юзер был онлайн более 70 сек назад — делаем оффлайн
    if (user.isOnline && user.lastOnlineAt && (now - new Date(user.lastOnlineAt).getTime() > 70000)) {
      user.isOnline = false;
      await user.save();
    }
  }
}
setInterval(updateMissedChats, 60 * 1000);

module.exports = router;
