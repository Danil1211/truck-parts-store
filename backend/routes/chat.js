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

const cloudinary = require('../utils/cloudinary'); // v2 configured via env
const SECRET = process.env.JWT_SECRET || 'truck_secret';

router.use(withTenant);

/* =============== Multer (tmp only) =============== */
const TMP_DIR = path.join(__dirname, '../tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const allowedMimes = new Set([
  'image/jpeg','image/png','image/gif','image/webp',
  'audio/mpeg','audio/wav','audio/ogg','audio/webm','audio/mp3'
]);

const upload = multer({
  dest: TMP_DIR,
  limits: { files: 4, fileSize: 25 * 1024 * 1024 }, // 25MB на файл
  fileFilter: (req, file, cb) => cb(null, allowedMimes.has(file.mimetype))
});

/* =============== helpers auth =============== */
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
  } catch { return null; }
}
function authAny(req, res, next) {
  const payload = getPayload(req);
  if (!payload) return res.status(401).json({ error: 'Auth required' });
  req.user = payload; next();
}
function requireAdmin(req, res, next) {
  const payload = getPayload(req);
  if (!payload) return res.status(401).json({ error: 'Auth required' });
  if (!payload.isAdmin && payload.role !== 'owner' && payload.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  req.user = payload; next();
}

/* =============== helpers page meta & files =============== */
function pickPageFields(req) {
  const b = req.body || {};
  const headersHref = req.get('x-page-href') || req.get('referer') || null;
  const pageUrl  = b.pageUrl  || null;
  const pageHref = b.pageHref || headersHref || null;
  const referrer = b.referrer || null;
  const title    = b.title    || null;
  return { pageUrl, pageHref, referrer, title };
}
async function updateUserPageFields(user, req) {
  const { pageUrl, pageHref, referrer, title } = pickPageFields(req);
  let changed = false;
  if (pageUrl  && user.lastPageUrl !== pageUrl)     { user.lastPageUrl = pageUrl; changed = true; }
  if (pageHref && user.lastPageHref !== pageHref)   { user.lastPageHref = pageHref; changed = true; }
  if (referrer && user.lastReferrer !== referrer)   { user.lastReferrer = referrer; changed = true; }
  if (title    && user.lastPageTitle !== title)     { user.lastPageTitle = title; changed = true; }
  if (changed) await user.save();
}
function safeUnlinkTmp(p) {
  try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch {}
}

/* Cloudinary helpers */
async function uploadToCloudinary(localPath, folder) {
  try {
    const res = await cloudinary.uploader.upload(localPath, {
      folder,
      resource_type: 'auto' // auto = image/video/audio
    });
    return { url: res.secure_url, public_id: res.public_id };
  } finally {
    safeUnlinkTmp(localPath); // чистим tmp всегда
  }
}
async function destroyFromCloudinary(publicId) {
  if (!publicId) return;
  try { await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' }); }
  catch (e) { console.error('cloudinary delete error:', e?.message || e); }
}

/* typing map per tenant */
let typingStatus = {}; // { [tenantId]: { [userId]: { isTyping, name, fromAdmin } } }

/* =============== CLIENT: register =============== */
router.post('/register', async (req, res) => {
  try {
    const tenantId = String(req.tenantId);
    const { name, phone } = req.body || {};
    const sName = String(name || '').trim();
    const sPhone = String(phone || '').trim();
    if (!sName || !sPhone) {
      return res.status(400).json({ error: 'Имя и телефон обязательны' });
    }

    let user = await User.findOne({
      $expr: { $and: [
        { $eq: [{ $toString: '$tenantId' }, tenantId] },
        { $eq: ['$phone', sPhone] }
      ] }
    });
    if (user) {
      return res.status(409).json({
        error: 'Этот телефон уже зарегистрирован. Войдите в кабинет.',
        code: 'ALREADY_REGISTERED'
      });
    }

    // Geo by IP
    let ip = getRealIp(req);
    let city = '';
    try {
      const geo = await axios.get(`http://ip-api.com/json/${ip}`);
      city = geo.data?.city || '';
    } catch { city = ''; }

    const { pageUrl, pageHref, referrer, title } = pickPageFields(req);

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
      ...(pageUrl  ? { lastPageUrl: pageUrl } : {}),
      ...(pageHref ? { lastPageHref: pageHref } : {}),
      ...(referrer ? { lastReferrer: referrer } : {}),
      ...(title    ? { lastPageTitle: title } : {}),
    });

    const token = signChatToken(user);
    return res.json({ token });
  } catch (e) {
    console.error('chat.register error:', e);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/* =============== CLIENT: my messages =============== */
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
    return res.json(Array.isArray(messages) ? messages : []);
  } catch (e) {
    console.error('chat.my error:', e);
    return res.json([]);
  }
});

/* =============== CLIENT/ADMIN: send message (Cloudinary) =============== */
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

      await updateUserPageFields(user, req);

      // Upload images
      const images = [];
      for (const f of (req.files?.images || [])) {
        const u = await uploadToCloudinary(f.path, `chat/${tStr}/images`);
        images.push(u);
      }

      // Upload audio
      let audio = null;
      if (req.files?.audio?.[0]) {
        audio = await uploadToCloudinary(req.files.audio[0].path, `chat/${tStr}/audio`);
      }

      const message = await Message.create({
        tenantId: req.tenantId,
        user: user._id,
        text: req.body.text || '',
        imageUrls: images.map(x => x.url),
        imageIds: images.map(x => x.public_id),
        audioUrl: audio?.url || '',
        audioId: audio?.public_id || null,
        fromAdmin: !!req.user.isAdmin,
        read: false,
        createdAt: new Date(),
      });

      if (typingStatus[tStr]?.[String(user._id)]) {
        typingStatus[tStr][String(user._id)] = {
          isTyping: false,
          name: user.name,
          fromAdmin: !!req.user.isAdmin
        };
      }

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

/* =============== typing =============== */
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
    return res.json({ ok: true });
  } catch (e) { return res.json({ ok: true }); }
});
router.get('/typing/statuses', authAny, (req, res) => {
  res.json(typingStatus[String(req.tenantId)] || {});
});

/* =============== presence (ping/offline) =============== */
router.post('/ping', authAny, async (req, res) => {
  try {
    const tStr = String(req.tenantId);
    const user = await User.findOne({
      _id: req.user.id,
      $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
    });
    if (user) {
      user.isOnline = true;
      user.lastOnlineAt = new Date();
      await updateUserPageFields(user, req);
      await user.save();
    }
    res.json({ ok: true });
  } catch { res.json({ ok: true }); }
});

router.post('/offline', authAny, async (req, res) => {
  try {
    const tStr = String(req.tenantId);
    const user = await User.findOne({
      _id: req.user.id,
      $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
    });
    if (user) {
      user.isOnline = false;
      await updateUserPageFields(user, req);
      await user.save();
    }
    res.json({ ok: true });
  } catch { res.json({ ok: true }); }
});

/* =============== ADMIN: list / messages / send =============== */
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
            { $match: { $expr: { $and: [
              { $eq: ["$_id", "$$uid"] },
              { $eq: [{ $toString: "$tenantId" }, tStr] }
            ] } } },
            { $project: {
              name:1, phone:1, email:1, status:1, isBlocked:1,
              ip:1, city:1, isOnline:1, lastOnlineAt:1,
              lastPageUrl:1, lastPageHref:1
            } }
          ],
          as: "userInfo"
        }
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: false } },
      { $project: {
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
        lastPageHref:"$userInfo.lastPageHref",
        lastMessage: 1
      } },
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
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: 'Некорректный userId' });
      }

      const uId = new mongoose.Types.ObjectId(userId);
      const user = await User.findOne({
        _id: uId,
        $expr: { $eq: [{ $toString: '$tenantId' }, tStr] }
      });
      if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
      if (user.isBlocked) return res.status(403).json({ error: 'Пользователь заблокирован' });

      const images = [];
      for (const f of (req.files?.images || [])) {
        const u = await uploadToCloudinary(f.path, `chat/${tStr}/images`);
        images.push(u);
      }

      let audio = null;
      if (req.files?.audio?.[0]) {
        audio = await uploadToCloudinary(req.files.audio[0].path, `chat/${tStr}/audio`);
      }

      const message = await Message.create({
        tenantId: req.tenantId,
        user: user._id,
        text: req.body.text || '',
        fromAdmin: true,
        read: false,
        createdAt: new Date(),
        imageUrls: images.map(x => x.url),
        imageIds: images.map(x => x.public_id),
        audioUrl: audio?.url || '',
        audioId: audio?.public_id || null,
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

/* =============== ADMIN: right panel info =============== */
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
  } catch (e) {
    res.status(404).json({ error: 'not found' });
  }
});

/* =============== ADMIN: block/unblock =============== */
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
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
});

/* =============== ADMIN: read/unread =============== */
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
  } catch (e) { res.json({ ok: true }); }
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
  } catch (e) { res.json({ ok: true }); }
});

/* =============== ADMIN: delete chat (Cloudinary cleanup) =============== */
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

    // удаляем из Cloudinary по public_id (если есть)
    for (const m of msgs) {
      if (Array.isArray(m.imageIds)) {
        for (const id of m.imageIds) await destroyFromCloudinary(id);
      }
      if (m.audioId) await destroyFromCloudinary(m.audioId);
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
