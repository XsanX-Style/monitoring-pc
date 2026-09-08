const rateLimit = require('express-rate-limit');

// Ограничивает "опасные" действия (выключение ПК, запуск команд) отдельно
// от обычного чтения статистики — так что даже если токен утечёт, злоумышленник
// не сможет заспамить сервер бесконечными командами/перезагрузками.
const actionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много действий подряд. Подождите пару минут и попробуйте снова.' },
});

module.exports = { actionLimiter };
