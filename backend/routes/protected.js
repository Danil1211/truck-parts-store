// backend/routes/protected.js
const jwt = require('jsonwebtoken');
const { User } = require('../models/models'); // ✅ правильный путь

const SECRET = process.env.JWT_SECRET || 'tenant_secret';
const SUPER_JWT_SECRET = process.env.SUPER_JWT_SECRET || 'super_jwt_secret';

/**
 * Middleware: проверка токена пользователя/админа арендатора
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);

    const user = await User.findOne({
      _id: decoded.id,
      tenantId: decoded.tenantId
    });

    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });

    req.user = user;
    req.tenantId = decoded.tenantId;
    next();
  } catch (err) {
    console.error('authMiddleware error:', err);
    return res.status(403).json({ error: 'Недействительный токен' });
  }
}

/**
 * Middleware: проверка токена суперадмина
 */
function superAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SUPER_JWT_SECRET);

    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Доступ запрещён (только супер админ)' });
    }

    req.superAdmin = decoded;
    next();
  } catch (err) {
    console.error('superAuthMiddleware error:', err);
    return res.status(403).json({ error: 'Недействительный токен' });
  }
}

/**
 * Middleware: доступ только для админа арендатора
 */
function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'owner')) {
    return res.status(403).json({ error: 'Доступ запрещён (только админ)' });
  }
  next();
}

module.exports = {
  authMiddleware,
  superAuthMiddleware,
  requireAdmin
};
