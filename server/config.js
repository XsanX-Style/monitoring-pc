require('dotenv').config();

const required = ['ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(
    `[config] Не заданы обязательные переменные окружения: ${missing.join(', ')}.\n` +
      `Скопируйте .env.example в .env и заполните значения (см. README.md, "npm run create-user").`
  );
  process.exit(1);
}

const allowedIps = (process.env.ALLOWED_IPS || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

const disableAuth = process.env.DISABLE_AUTH === 'true';

if (disableAuth) {
  console.warn(
    '\n[config] ВНИМАНИЕ: DISABLE_AUTH=true — вход по паролю ОТКЛЮЧЁН. ' +
      'Любой, кто откроет этот сайт, сможет управлять ПК без пароля. ' +
      'Верните DISABLE_AUTH=false в .env, как только закончите отладку.\n'
  );
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  adminUsername: process.env.ADMIN_USERNAME,
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  allowedIps,
  disableAuth,
  httpsKeyPath: process.env.HTTPS_KEY_PATH || null,
  httpsCertPath: process.env.HTTPS_CERT_PATH || null,
};
