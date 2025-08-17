module.exports = function demoReadOnly(req, res, next) {
  try {
    const isDemo = req.tenant?.doc?.subdomain === 'demo';
    const isWrite = !['GET','HEAD','OPTIONS'].includes(req.method);
    if (isDemo && isWrite) return res.status(403).json({ error: 'Demo tenant is read-only' });
    next();
  } catch (e) { next(e); }
};
