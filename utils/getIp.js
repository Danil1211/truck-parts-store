function getRealIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0];
  return req.ip || req.connection.remoteAddress;
}
module.exports = getRealIp;
