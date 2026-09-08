const jwt = require('jsonwebtoken');
const config = require('../config');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '';
}

function ipAllowed(req, res, next) {
  if (!config.allowedIps.length) return next();

  const ip = getClientIp(req).replace('::ffff:', '');
  if (config.allowedIps.includes(ip)) return next();

  return res.status(403).json({ error: 'Доступ с этого IP запрещён' });
}

function requireAuth(req, res, next) {
  if (config.disableAuth) return next();

  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  const tokenFromQuery = req.query.token;
  const finalToken = scheme === 'Bearer' ? token : tokenFromQuery;

  if (!finalToken) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  try {
    req.user = jwt.verify(finalToken, config.jwtSecret);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Недействительный или истёкший токен' });
  }
}

function verifyTokenString(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { requireAuth, ipAllowed, verifyTokenString, getClientIp };
