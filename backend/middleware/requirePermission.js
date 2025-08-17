const allow = require('../config/permissions');
module.exports = (perm) => (req, res, next) => {
  const role = req.user?.role;
  if (!role) return res.status(401).json({ error: 'Auth required' });
  if (!allow[perm]?.includes(role)) {
    return res.status(403).json({ error: 'Forbidden: ' + perm });
  }
  next();
};
