const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const config = require('../config');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Попробуйте позже.' },
});

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль' });
  }

  const validUsername = username === config.adminUsername;
  const validPassword = await bcrypt.compare(password, config.adminPasswordHash).catch(() => false);

  if (!validUsername || !validPassword) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const token = jwt.sign({ sub: username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

  res.json({ token, expiresIn: config.jwtExpiresIn });
});

module.exports = router;
