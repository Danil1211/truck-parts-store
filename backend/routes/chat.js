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

/* ======================== Multer ======================== */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads', String(req.tenantId || 'common'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '');
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

/* ======================== helpers ======================== */
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
  if (!payload.isAdmin && payload.role !== 'owner' && payload.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  req.user = payload;
  next();
}

/* — где брать адрес страницы — */
function pickPageMeta(req) {
  const b = req.body || {};
  const meta = {
    pageUrl:   b.pageUrl   || b.pageHref || req.get('x-page-url') || req.get('referer') || '',
    pageHref:  b.pageHref  || '',
    referrer:  b.referrer  || '',
    title:     b.title     || '',
  };
  return meta;
}
function safeUnlink(rel) {
  try {
    if (!rel) return;
    const cleaned = String(rel).replace(/^\/+/, '');
    const abs = path.resolve(__dirname, '..', cleaned);
    if (abs.startsWith(path.resolve(__dirname, '..')) && fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {}
}

/* ======================= typing cache ======================= */
let typingStatus = {}; // { tenantId: { userId: { isTyping, name, fromAdmin } } }

/* ======================== register ======================== */
router.post('/register', async (req, res) => {
  try {
    const tenantId = String(req.tenantId);
    const { name, phone } = req.body || {};
    const sName = String(name || '').trim();
    const sPhone = String(phone || '').trim();
    if (!sName || !sPhone) return res.status(400).json({ error: 'Имя и телефон обязательны' });

    let user = await User.findOne({
      $expr: { $and: [
        { $eq: [{ $toString: '$tenantId' }, tenantId] },
        { $eq: ['$phone', sPhone] }
      ] }
    });
    if (user) {
      return res.status(409).json({ error: 'Этот телефон уже зарегистрирован. Войдите в кабинет.', code: 'ALREADY_REGISTERED' });
    }

    let ip = getRealIp(req); let city = '';
    try { const geo = await axios.get(`http://ip-api.com/json/${ip}`); city = geo.data?.city || ''; } catch {}

    const meta = pickPageMeta(req);

    user = await User.create({
      tenantId: req.tenantId,
      email: `${sPhone}@example.com`,
      passwordHash: 'chat',
      name: sName,
      phone: sPhone,
      role: 'customer',
      isAdmin: false,
      isOnline: true,
      lastOnlineAt: new Date(),
      ip, city,
      lastPageUrl: meta.pageUrl || '',
      lastPageHref: meta.pageHref || '',
      lastReferrer: meta.referrer || '',
      lastPageTitle: meta.title || '',
    });

    res.json({ token: signChatToken(user) });
  } catch (e) {
    console.error('chat.register error:', e);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/* ======================== my messages ======================== */
router.get('/my', authAny, async (req, res) => {
  try {
    const tStr = String(req.tenantId);
    const userId = req.user.id;

    const user = await User.findOne({
      _id: userId,
      $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
    });
    if (user) {
      user.isOnline = true;
      user.lastOnlineAt = new Date();
      await user.save();
    }

    const messages = await Message.find({ user: userId }).sort({ createdAt: 1 });
    res.json(Array.isArray(messages) ? messages : []);
  } catch (e) {
    console.error('chat.my error:', e);
    res.json([]);
  }
});

/* ======================== send message ======================== */
router.post(
  '/',
  authAny,
  upload.fields([{ name: 'images', maxCount: 3 }, { name: 'audio', maxCount: 1 }]),
  async (req, res) => {
    try {
      const tStr = String(req.tenantId);
      const userId = req.user.id;

      const user = await User.findOne({
        _id: userId,
        $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
      });
      if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
      if (user.isBlocked) return res.status(403).json({ error: 'Вы заблокированы' });

      /* страница */
      const meta = pickPageMeta(req);
      if (meta.pageUrl) {
        user.lastPageUrl = meta.pageUrl;
        user.lastPageHref = meta.pageHref || user.lastPageHref;
        user.lastReferrer = meta.referrer || user.lastReferrer;
        user.lastPageTitle = meta.title || user.lastPageTitle;
        await user.save();
      }

      const imageUrls = req.files?.images?.map(f => `/uploads/${tStr}/${f.filename}`) || [];
      const audioUrl = req.files?.audio?.[0] ? `/uploads/${tStr}/${req.files.audio[0].filename}` : '';

      const message = await Message.create({
        tenantId: req.tenantId,
        user: user._id,
        text: req.body.text || '',
        imageUrls,
        audioUrl,
        fromAdmin: !!req.user.isAdmin,
        read: false,
        createdAt: new Date(),
      });

      if (typingStatus[tStr]?.[String(user._id)]) {
        typingStatus[tStr][String(user._id)] = { isTyping: false, name: user.name, fromAdmin: !!req.user.isAdmin };
      }

      if (!req.user.isAdmin) {
        user.status = 'new';
        user.lastMessageAt = new Date();
        user.isOnline = true;
        user.lastOnlineAt = new Date();
        await user.save();
      }

      res.status(201).json(message);
    } catch (e) {
      console.error('chat.send error:', e);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

/* ======================== typing ======================== */
router.post('/typing', authAny, async (req, res) => {
  try {
    const tStr = String(req.tenantId);
    const { userId, isTyping, name, fromAdmin } = req.body || {};
    if (!userId) return res.json({ ok: true });

    if (!typingStatus[tStr]) typingStatus[tStr] = {};
    typingStatus[tStr][String(userId)] = {
      isTyping: !!isTyping,
      name: fromAdmin ? 'Менеджер' : (name || 'Пользователь'),
      fromAdmin: !!fromAdmin,
    };
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});
router.get('/typing/statuses', authAny, (req, res) => {
  res.json(typingStatus[String(req.tenantId)] || {});
});

/* ======================== presence (ping/offline) ======================== */
router.post('/ping', authAny, async (req, res) => {
  try {
    const tStr = String(req.tenantId);
    const user = await User.findOne({
      _id: req.user.id,
      $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
    });
    if (user) {
      const meta = pickPageMeta(req);
      user.isOnline = true;
      user.lastOnlineAt = new Date();
      if (meta.pageUrl) {
        user.lastPageUrl = meta.pageUrl;
        user.lastPageHref = meta.pageHref || user.lastPageHref;
        user.lastReferrer = meta.referrer || user.lastReferrer;
        user.lastPageTitle = meta.title || user.lastPageTitle;
      }
      await user.save();
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

router.post('/offline', authAny, async (req, res) => {
  try {
    const tStr = String(req.tenantId);
    const user = await User.findOne({
      _id: req.user.id,
      $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
    });
    if (user) {
      const meta = pickPageMeta(req);
      user.isOnline = false;
      if (meta.pageUrl) user.lastPageUrl = meta.pageUrl;
      await user.save();
    }
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

/* ======================== admin list / read / send ======================== */
async function updateMissedChats(tenantIdStr) {
  const tStr = String(tenantIdStr);
  const now = Date.now();

  const users = await User.find({
    $expr: { $and: [
      { $eq: [{ $toString: '$tenantId' }, tStr] },
      { $in: ['$status', ['new','waiting','active']] }
    ] }
  });

  for (let user of users) {
    if (user.lastMessageAt && (!user.adminLastReadAt || user.lastMessageAt > user.adminLastReadAt)) {
      if (now - new Date(user.lastMessageAt).getTime() > 2 * 60 * 1000) {
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
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache'); res.set('Expires', '0'); res.set('Surrogate-Control', 'no-store');

    const tStr = String(req.tenantId);
    await updateMissedChats(tStr);

    const chats = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: "$user", lastMessage: { $first: "$$ROOT" } } },
      {
        $lookup: {
          from: "users",
          let: { uid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $and: [
                  { $eq: ["$_id", "$$uid"] },
                  { $eq: [{ $toString: "$tenantId" }, tStr] }
                ] }
              }
            },
            { $project: {
              name: 1, phone: 1, email: 1, status: 1, isBlocked: 1,
              ip: 1, city: 1, isOnline: 1, lastOnlineAt: 1, lastPageUrl: 1
            } }
          ],
          as: "userInfo"
        }
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: false } },
      {
        $project: {
          userId: "$_id",
          name: "$userInfo.name",
          phone: "$userInfo.phone",
          email: "$userInfo.email",
          status: "$userInfo.status",
          isBlocked: "$userInfo.isBlocked",
          ip: "$userInfo.ip",
          city: "$userInfo.city",
          isOnline: "$userInfo.isOnline",
          lastOnlineAt: "$userInfo.lastOnlineAt",
          lastPageUrl: "$userInfo.lastPageUrl",
          lastMessage: 1
        }
      },
      { $sort: { "lastMessage.createdAt": -1 } }
    ]);

    res.json(Array.isArray(chats) ? chats : []);
  } catch (e) {
    console.error('chat.admin list error:', e);
    res.json([]);
  }
});

router.get('/admin/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json([]);

    const tStr = String(req.tenantId);
    const uId = new mongoose.Types.ObjectId(userId);

    const user = await User.findOne({
      _id: uId,
      $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
    });
    if (!user) return res.status(404).json([]);

    const messages = await Message.find({ user: uId }).sort({ createdAt: 1 });

    if (messages.length) {
      const last = messages[messages.length - 1];
      if (last && !last.fromAdmin) {
        user.adminLastReadAt = new Date();
        user.status = 'waiting';
        await user.save();
      }
    }

    res.json(Array.isArray(messages) ? messages : []);
  } catch (e) {
    console.error('chat.admin user messages error:', e);
    res.json([]);
  }
});

router.post(
  '/admin/:userId',
  requireAdmin,
  upload.fields([{ name: 'images', maxCount: 3 }, { name: 'audio', maxCount: 1 }]),
  async (req, res) => {
    try {
      const tStr = String(req.tenantId);
      const { userId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'Некорректный userId' });

      const uId = new mongoose.Types.ObjectId(userId);
      const user = await User.findOne({
        _id: uId,
        $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
      });
      if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
      if (user.isBlocked) return res.status(403).json({ error: 'Пользователь заблокирован' });

      const imageUrls = req.files?.images?.map(f => `/uploads/${tStr}/${f.filename}`) || [];
      const audioUrl = req.files?.audio?.[0] ? `/uploads/${tStr}/${req.files.audio[0].filename}` : '';

      const message = await Message.create({
        tenantId: req.tenantId,
        user: user._id,
        text: req.body.text || '',
        fromAdmin: true,
        read: false,
        createdAt: new Date(),
        imageUrls,
        audioUrl
      });

      if (typingStatus[tStr]?.[String(user._id)]) {
        typingStatus[tStr][String(user._id)] = { isTyping: false, name: 'Менеджер', fromAdmin: true };
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

/* ------- user for right panel ------- */
router.get('/admin/user/:userId', requireAdmin, async (req, res) => {
  try {
    const tStr = String(req.tenantId);
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(404).json({ error: 'not found' });

    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
    }).lean();

    if (!user) return res.status(404).json({ error: 'not found' });
    res.json(user);
  } catch {
    res.status(404).json({ error: 'not found' });
  }
});

/* ------- block/unblock ------- */
router.post('/admin/user/:userId/block', requireAdmin, async (req, res) => {
  try {
    const tStr = String(req.tenantId);
    const { userId } = req.params;
    const { block } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(404).json({ error: 'not found' });

    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
    });
    if (!user) return res.status(404).json({ error: 'not found' });

    user.isBlocked = !!block;
    await user.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'server error' });
  }
});

/* ------- mark read/unread ------- */
router.post('/read/:userId', requireAdmin, async (req, res) => {
  try {
    const tStr = String(req.tenantId);
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.json({ ok: true });

    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
    });
    if (!user) return res.json({ ok: true });

    await Message.updateMany(
      { user: user._id, fromAdmin: false, read: false },
      { $set: { read: true } }
    );

    user.adminLastReadAt = new Date();
    user.status = 'waiting';
    await user.save();

    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

router.post('/unread/:userId', requireAdmin, async (req, res) => {
  try {
    const tStr = String(req.tenantId);
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.json({ ok: true });

    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
    });
    if (!user) return res.json({ ok: true });

    await Message.updateMany(
      { user: user._id, fromAdmin: false, read: true },
      { $set: { read: false } }
    );

    user.status = 'new';
    await user.save();

    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

/* ------- delete chat ------- */
router.delete('/admin/:userId', requireAdmin, async (req, res) => {
  try {
    const tStr = String(req.tenantId);
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'bad userId' });

    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(userId),
      $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
    });
    if (!user) return res.status(404).json({ error: 'not found' });

    const msgs = await Message.find({ user: user._id });
    for (const m of msgs) {
      const files = [];
      if (Array.isArray(m.imageUrls)) files.push(...m.imageUrls);
      if (m.audioUrl) files.push(m.audioUrl);
      for (const rel of files) safeUnlink(rel);
    }
    await Message.deleteMany({ user: user._id });

    user.status = 'waiting';
    user.adminLastReadAt = new Date();
    await user.save();

    res.json({ ok: true });
  } catch (e) {
    console.error('chat.admin delete error:', e);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
