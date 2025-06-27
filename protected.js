const jwt = require('jsonwebtoken');
const User = require('./models').User; // если экспортируется через { User }

const SECRET = process.env.JWT_SECRET || 'secret';

// 🔐 Middleware: проверка токена и загрузка пользователя из БД
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Нет токена' });

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });

    req.user = user; // теперь доступен req.user.isAdmin и другие поля
    next();
  } catch (err) {
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
  adminMiddleware,
};
