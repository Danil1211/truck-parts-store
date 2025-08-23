const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const axios = require('axios');
const getRealIp = require('../utils/getIp');
const { Message, User } = require('../models/models');
const { authMiddleware } = require('./protected');
const withTenant = require('../middleware/withTenant');

router.use(withTenant);

let typingStatus = {}; // { tenantId: { userId: {...} } }

// --- Multer storage ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads', String(req.tenantId || 'common'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
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

/* ======================
   CLIENT/ADMIN ROUTES
====================== */

/** POST /api/chat/typing */
router.post('/typing', authMiddleware, async (req, res) => {
  const tenantId = String(req.tenantId);
  const { userId, isTyping, name, fromAdmin } = req.body;
  let realName = name;
  if (!fromAdmin) {
    try {
      const user = await User.findOne({ _id: userId, tenantId }).lean();
      if (user?.name) realName = user.name;
    } catch (e) {
      console.error('Ошибка получения имени:', e);
    }
  }
  if (!typingStatus[tenantId]) typingStatus[tenantId] = {};
  typingStatus[tenantId][userId] = {
    isTyping: !!isTyping,
    name: fromAdmin ? 'Менеджер' : realName,
    fromAdmin: !!fromAdmin
  };
  res.json({ ok: true });
});

router.get('/typing/statuses', authMiddleware, (req, res) => {
  res.json(typingStatus[String(req.tenantId)] || {});
});

/** ADMIN: список чатов */
router.get('/admin', authMiddleware, async (req, res) => {
  // всегда отдаём массив и отключаем кэш (избавляемся от 304 без тела)
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');

  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json([]); // ← массив
  }
  try {
    await updateMissedChats(String(req.tenantId));
    const chats = await Message.aggregate([
      { $match: { tenantId: String(req.tenantId) } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$user', lastMessage: { $first: '$$ROOT' } } },
      {
        $lookup: {
          from: 'users',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$userId'] },
                    { $eq: ['$tenantId', String(req.tenantId)] }
                  ]
                }
              }
            }
          ],
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

    res.json(Array.isArray(chats) ? chats : []);
  } catch (err) {
    console.error('Ошибка /admin:', err);
    res.json([]); // ← не валим фронт
  }
});

/** ADMIN: сообщения юзера */
router.get('/admin/:userId', authMiddleware, async (req, res) => {
  if (!req.user || !req.user.isAdmin) return res.status(403).json([]);
  if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(400).json([]);
  try {
    const tenantId = String(req.tenantId);
    const messages = await Message.find({ user: req.params.userId, tenantId }).sort({ createdAt: 1 });
    const user = await User.findOne({ _id: req.params.userId, tenantId });
    if (user) {
      const last = messages[messages.length - 1];
      if (last && !last.fromAdmin) {
        user.adminLastReadAt = new Date();
        user.status = 'waiting';
        await user.save();
      }
    }
    res.json(Array.isArray(messages) ? messages : []);
  } catch (err) {
    res.json([]);
  }
});

/** ADMIN: отправить сообщение */
router.post(
  '/admin/:userId',
  authMiddleware,
  upload.fields([{ name: 'images', maxCount: 3 }, { name: 'audio', maxCount: 1 }]),
  async (req, res) => {
    if (!req.user || !req.user.isAdmin) return res.status(403).json({ error: 'Нет доступа' });
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(400).json({ error: 'Некорректный userId' });

    try {
      const tenantId = String(req.tenantId);
      const user = await User.findOne({ _id: req.params.userId, tenantId });
      if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
      if (user.isBlocked) return res.status(403).json({ error: 'Пользователь заблокирован' });

      const imageUrls = req.files?.images?.map(f => `/uploads/${tenantId}/${f.filename}`) || [];
      const audioUrl = req.files?.audio?.[0] ? `/uploads/${tenantId}/${req.files.audio[0].filename}` : '';

      const message = await Message.create({
        tenantId,
        user: user._id,
        text: req.body.text || '',
        fromAdmin: true,
        read: false,
        createdAt: new Date(),
        imageUrls,
        audioUrl
      });

      if (typingStatus[tenantId]?.[user._id]) {
        typingStatus[tenantId][user._id] = { isTyping: false, name: 'Менеджер', fromAdmin: true };
      }

      user.status = 'waiting';
      user.adminLastReadAt = new Date();
      await user.save();

      res.status(201).json(message);
    } catch (err) {
      console.error('Ошибка при отправке админом:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

/** CLIENT: мои сообщения */
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const tenantId = String(req.tenantId);
    const user = await User.findOne({ _id: req.user.id, tenantId });
    if (user) {
      user.isOnline = true;
      user.lastOnlineAt = new Date();
      await user.save();
    }
    const messages = await Message.find({ user: req.user.id, tenantId }).sort({ createdAt: 1 });
    res.json(Array.isArray(messages) ? messages : []);
  } catch (err) {
    res.json([]);
  }
});

/** CLIENT: отправить сообщение/регистрация */
router.post(
  '/',
  upload.fields([{ name: 'images', maxCount: 3 }, { name: 'audio', maxCount: 1 }]),
  async (req, res) => {
    const tenantId = String(req.tenantId);
    const imageUrls = req.files?.images?.map(f => `/uploads/${tenantId}/${f.filename}`) || [];
    const audioUrl = req.files?.audio?.[0] ? `/uploads/${tenantId}/${req.files.audio[0].filename}` : null;
    const auth = req.headers.authorization;

    // с токеном
    if (auth?.startsWith('Bearer ')) {
      try {
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (String(decoded.tenantId) !== String(tenantId)) {
          return res.status(403).json({ error: 'Cross-tenant forbidden' });
        }
        const user = await User.findOne({ _id: decoded.id, tenantId });
        if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
        if (user.isBlocked) return res.status(403).json({ error: 'Вы заблокированы' });

        user.isOnline = true;
        user.lastOnlineAt = new Date();
        await user.save();

        const savedMessage = await Message.create({
          tenantId,
          user: user._id,
          text: req.body.text || '',
          imageUrls,
          audioUrl,
          fromAdmin: decoded.isAdmin || false,
          read: false
        });

        if (typingStatus[tenantId]?.[user._id]) {
          typingStatus[tenantId][user._id] = { isTyping: false, name: user.name, fromAdmin: false };
        }

        if (!decoded.isAdmin) {
          user.status = 'new';
          user.lastMessageAt = new Date();
          await user.save();
        }

        return res.status(201).json(savedMessage);
      } catch {
        return res.status(401).json({ error: 'Недействительный токен' });
      }
    }

    // регистрация нового
    if (!req.body.name || !req.body.phone) {
      return res.status(400).json({ error: 'Имя и телефон обязательны' });
    }

    try {
      let user = await User.findOne({ phone: req.body.phone, tenantId });
      if (!user) {
        let ip = getRealIp(req);
        let city = '';
        try {
          const geo = await axios.get(`http://ip-api.com/json/${ip}`);
          city = geo.data?.city || '';
        } catch { city = ''; }

        user = await User.create({
          tenantId,
          name: req.body.name,
          phone: req.body.phone,
          email: `${req.body.phone}@example.com`,
          passwordHash: 'chat',
          ip,
          city,
          isBlocked: false,
          isOnline: true,
          lastOnlineAt: new Date()
        });
      } else {
        user.isOnline = true;
        user.lastOnlineAt = new Date();
        await user.save();
      }

      const token = jwt.sign(
        { id: user._id, name: user.name, phone: user.phone, isAdmin: false, tenantId },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.json({ token });
    } catch (err) {
      console.error('Ошибка регистрации клиента:', err);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

// --- Авто-перевод чатов в missed
const TWO_MIN = 2 * 60 * 1000;
async function updateMissedChats(tenantId) {
  if (!tenantId) return;
  const now = Date.now();
  const users = await User.find({ tenantId, status: { $in: ['new', 'waiting', 'active'] } });
  for (let user of users) {
    if (user.lastMessageAt && (!user.adminLastReadAt || user.lastMessageAt > user.adminLastReadAt)) {
      if (now - user.lastMessageAt.getTime() > TWO_MIN) {
        user.status = 'missed';
        await user.save();
      }
    }
    if (user.isOnline && user.lastOnlineAt && (now - new Date(user.lastOnlineAt).getTime() > 70000)) {
      user.isOnline = false;
      await user.save();
    }
  }
}

module.exports = router;
