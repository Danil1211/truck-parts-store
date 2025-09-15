// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const axios = require('axios');

const withTenant = require('../middleware/withTenant');
const getRealIp = require('../utils/getIp');
const { Message, User } = require('../models/models');

const SECRET = process.env.JWT_SECRET || 'truck_secret';

router.use(withTenant);

/* =========================================================
   Multer storage (по тенанту)
========================================================= */
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

/* =========================================================
   Helpers
========================================================= */
function signChatToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      tenantId: user.tenantId.toString(),
      name: user.name,
      phone: user.phone,
      isAdmin: false,
      role: user.role || 'customer',
    },
    SECRET,
    { expiresIn: '30d' }
  );
}

function getPayload(req) {
  const auth = (req.headers.authorization || '').trim();
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7).trim();
  try {
    const payload = jwt.verify(token, SECRET);
    if (String(payload.tenantId) !== String(req.tenantId)) return null;
    return payload;
  } catch {
    return null;
  }
}

function authAny(req, res, next) {
  const payload = getPayload(req);
  if (!payload) return res.status(401).json({ error: 'Auth required' });
  req.user = payload;
  next();
}

function requireAdmin(req, res, next) {
  const payload = getPayload(req);
  if (!payload) return res.status(401).json({ error: 'Auth required' });
  if (!payload.isAdmin && payload.role !== 'owner' && payload.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  req.user = payload;
  next();
}

/* ======================= typing statuses ======================= */
let typingStatus = {}; // { tenantId: { userId: { isTyping, name, fromAdmin } } }

/* =========================================================
   КЛИЕНТСКАЯ РЕГИСТРАЦИЯ В ЧАТЕ (если не залогинен на сайте)
   POST /api/chat/register
   body: { name, phone }
   OK -> { token }
   Уже есть -> 409 + { error, code:'ALREADY_REGISTERED' }
========================================================= */
router.post('/register', async (req, res) => {
  try {
    const tenantId = String(req.tenantId);
    const { name, phone } = req.body || {};
    const sName = String(name || '').trim();
    const sPhone = String(phone || '').trim();

    if (!sName || !sPhone) {
      return res.status(400).json({ error: 'Имя и телефон обязательны' });
    }

    let user = await User.findOne({ tenantId, phone: sPhone });
    if (user) {
      return res.status(409).json({
        error: 'Этот телефон уже зарегистрирован. Войдите в кабинет.',
        code: 'ALREADY_REGISTERED'
      });
    }

    // гео по IP (best effort)
    let ip = getRealIp(req);
    let city = '';
    try {
      const geo = await axios.get(`http://ip-api.com/json/${ip}`);
      city = geo.data?.city || '';
    } catch { city = ''; }

    user = await User.create({
      tenantId,
      email: `${sPhone}@example.com`,
      passwordHash: 'chat',
      name: sName,
      phone: sPhone,
      role: 'customer',
      isAdmin: false,
      isOnline: true,
      lastOnlineAt: new Date(),
      ip,
      city
    });

    const token = signChatToken(user);
    return res.json({ token });
  } catch (e) {
    console.error('chat.register error:', e);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/* =========================================================
   МОИ СООБЩЕНИЯ
   GET /api/chat/my   (принимает и сайт-токен, и chatToken)
========================================================= */
router.get('/my', authAny, async (req, res) => {
  try {
    const tenantId = String(req.tenantId);
    const userId = req.user.id;

    const user = await User.findOne({ _id: userId, tenantId });
    if (user) {
      user.isOnline = true;
      user.lastOnlineAt = new Date();
      await user.save();
    }

    const messages = await Message.find({ user: userId, tenantId }).sort({ createdAt: 1 });
    return res.json(Array.isArray(messages) ? messages : []);
  } catch (e) {
    console.error('chat.my error:', e);
    return res.json([]);
  }
});

/* =========================================================
   ОТПРАВИТЬ СООБЩЕНИЕ ОТ КЛИЕНТА
   POST /api/chat
   headers: Authorization: Bearer <siteToken | chatToken>
   form-data: text?, images[]?, audio?
========================================================= */
router.post(
  '/',
  authAny,
  upload.fields([{ name: 'images', maxCount: 3 }, { name: 'audio', maxCount: 1 }]),
  async (req, res) => {
    try {
      const tenantId = String(req.tenantId);
      const userId = req.user.id;

      const user = await User.findOne({ _id: userId, tenantId });
      if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
      if (user.isBlocked) return res.status(403).json({ error: 'Вы заблокированы' });

      const imageUrls = req.files?.images?.map(f => `/uploads/${tenantId}/${f.filename}`) || [];
      const audioUrl = req.files?.audio?.[0] ? `/uploads/${tenantId}/${req.files.audio[0].filename}` : '';

      const message = await Message.create({
        tenantId,
        user: user._id,
        text: req.body.text || '',
        imageUrls,
        audioUrl,
        fromAdmin: !!req.user.isAdmin,
        read: false,
        createdAt: new Date(),
      });

      // сброс "печатает"
      if (typingStatus[tenantId]?.[String(user._id)]) {
        typingStatus[tenantId][String(user._id)] = {
          isTyping: false,
          name: user.name,
          fromAdmin: !!req.user.isAdmin
        };
      }

      // обновляем статус клиента (если пишет клиент)
      if (!req.user.isAdmin) {
        user.status = 'new';
        user.lastMessageAt = new Date();
        user.isOnline = true;
        user.lastOnlineAt = new Date();
        await user.save();
      }

      return res.status(201).json(message);
    } catch (e) {
      console.error('chat.send error:', e);
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

/* =========================================================
   ТАЙПИНГ
========================================================= */
router.post('/typing', authAny, async (req, res) => {
  try {
    const tenantId = String(req.tenantId);
    const { userId, isTyping, name, fromAdmin } = req.body || {};
    if (!userId) return res.json({ ok: true });

    if (!typingStatus[tenantId]) typingStatus[tenantId] = {};
    typingStatus[tenantId][String(userId)] = {
      isTyping: !!isTyping,
      name: fromAdmin ? 'Менеджер' : (name || 'Пользователь'),
      fromAdmin: !!fromAdmin,
    };
    return res.json({ ok: true });
  } catch (e) {
    return res.json({ ok: true });
  }
});

router.get('/typing/statuses', authAny, (req, res) => {
  res.json(typingStatus[String(req.tenantId)] || {});
});

/* =========================================================
   PING / OFFLINE (онлайн-статус)
========================================================= */
router.post('/ping', authAny, async (req, res) => {
  try {
    const tenantId = String(req.tenantId);
    const user = await User.findOne({ _id: req.user.id, tenantId });
    if (user) {
      user.isOnline = true;
      user.lastOnlineAt = new Date();
      await user.save();
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

router.post('/offline', authAny, async (req, res) => {
  try {
    const tenantId = String(req.tenantId);
    const user = await User.findOne({ _id: req.user.id, tenantId });
    if (user) {
      user.isOnline = false;
      await user.save();
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

/* =========================================================
   АДМИН: список чатов, сообщения, отправка
========================================================= */
const TWO_MIN = 2 * 60 * 1000;
async function updateMissedChats(tenantIdStr) {
  const now = Date.now();
  const users = await User.find({ tenantId: tenantIdStr, status: { $in: ['new', 'waiting', 'active'] } });
  for (let user of users) {
    if (user.lastMessageAt && (!user.adminLastReadAt || user.lastMessageAt > user.adminLastReadAt)) {
      if (now - new Date(user.lastMessageAt).getTime() > TWO_MIN) {
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

router.get('/admin', requireAdmin, async (req, res) => {
  try {
    // anti-cache (оставляем как было)
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');

    // 👇 важное: приводим к ObjectId
    const tId = new mongoose.Types.ObjectId(String(req.tenantId));

    await updateMissedChats(tId);

    const chats = await Message.aggregate([
      { $match: { tenantId: tId } },                // <-- ObjectId, не строка
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
                    { $eq: ['$tenantId', tId] }   // <-- тоже ObjectId
                  ]
                }
              }
            },
            // опционально: берём только нужные поля
            { $project: {
                name: 1, phone: 1, email: 1, status: 1,
                isBlocked: 1, ip: 1, city: 1, isOnline: 1, lastOnlineAt: 1
            }}
          ],
          as: 'userInfo'
        }
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: false } },
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
  } catch (e) {
    console.error('chat.admin list error:', e);
    res.json([]); // не валим фронт
  }
});

router.get('/admin/:userId', requireAdmin, async (req, res) => {
  try {
    const tenantId = String(req.tenantId);
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json([]);

    const messages = await Message.find({ user: userId, tenantId }).sort({ createdAt: 1 });
    const user = await User.findOne({ _id: userId, tenantId });
    if (user) {
      const last = messages[messages.length - 1];
      if (last && !last.fromAdmin) {
        user.adminLastReadAt = new Date();
        user.status = 'waiting';
        await user.save();
      }
    }
    res.json(Array.isArray(messages) ? messages : []);
  } catch {
    res.json([]);
  }
});

router.post(
  '/admin/:userId',
  requireAdmin,
  upload.fields([{ name: 'images', maxCount: 3 }, { name: 'audio', maxCount: 1 }]),
  async (req, res) => {
    try {
      const tenantId = String(req.tenantId);
      const { userId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'Некорректный userId' });

      const user = await User.findOne({ _id: userId, tenantId });
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

      if (typingStatus[tenantId]?.[String(user._id)]) {
        typingStatus[tenantId][String(user._id)] = { isTyping: false, name: 'Менеджер', fromAdmin: true };
      }

      user.status = 'waiting';
      user.adminLastReadAt = new Date();
      await user.save();

      res.status(201).json(message);
    } catch (e) {
      console.error('chat.admin send error:', e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

/* ------- удалить чат (все сообщения пользователя для этого тенанта) ------- */
router.delete('/admin/:userId', requireAdmin, async (req, res) => {
  try {
    const tenantId = String(req.tenantId);
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.json({ ok: true });
    await Message.deleteMany({ tenantId, user: userId });
    // Не удаляем пользователя. Можно сбросить статус, если надо:
    // await User.updateOne({ _id: userId, tenantId }, { $set: { status: 'done' } });
    res.json({ ok: true });
  } catch (e) {
    console.error('chat.admin delete error:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/* ------- инфо по пользователю для правой панели ------- */
router.get('/admin/user/:userId', requireAdmin, async (req, res) => {
  try {
    const tenantId = String(req.tenantId);
    const user = await User.findOne({ _id: req.params.userId, tenantId }).lean();
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json(user);
  } catch {
    res.status(404).json({ error: 'not found' });
  }
});

/* ------- блокировка/разблокировка ------- */
router.post('/admin/user/:userId/block', requireAdmin, async (req, res) => {
  try {
    const tenantId = String(req.tenantId);
    const { block } = req.body || {};
    const user = await User.findOne({ _id: req.params.userId, tenantId });
    if (!user) return res.status(404).json({ error: 'not found' });
    user.isBlocked = !!block;
    await user.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'server error' });
  }
});

/* ------- пометить прочитанным ------- */
router.post('/read/:userId', requireAdmin, async (req, res) => {
  try {
    const tenantId = String(req.tenantId);
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.json({ ok: true });
    await Message.updateMany(
      { tenantId, user: userId, fromAdmin: false, read: false },
      { $set: { read: true } }
    );
    const user = await User.findOne({ _id: userId, tenantId });
    if (user) {
      user.adminLastReadAt = new Date();
      user.status = 'waiting';
      await user.save();
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

module.exports = router;
