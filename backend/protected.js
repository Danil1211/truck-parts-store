// protected.js
const jwt = require('jsonwebtoken');
const { User } = require('./models');

const SECRET = process.env.JWT_SECRET || 'truck_secret';

// 🔐 Middleware: проверка токена и загрузка пользователя
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);

    // ⚡ ищем по id и tenantId
    const user = await User.findOne({ _id: decoded.id, tenantId: decoded.tenantId });
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });

    req.user = user;
    req.tenantId = decoded.tenantId; // 👈 теперь tenantId доступен в каждом роуте
    next();
  } catch (err) {
    console.error('authMiddleware error:', err);
    return res.status(403).json({ error: 'Недействительный токен' });
  }
}

// 👑 Middleware: доступ только для админа
function adminMiddleware(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Доступ запрещён (только админ)' });
  }
  next();
}

module.exports = {
  authMiddleware,
  adminMiddleware
};
