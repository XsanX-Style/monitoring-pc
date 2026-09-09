const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');

const config = require('./config');
const { requireAuth, ipAllowed } = require('./middleware/auth');
const { attachWebSocket } = require('./ws');

const authRoutes = require('./routes/auth');
const systemRoutes = require('./routes/system');
const processesRoutes = require('./routes/processes');
const powerRoutes = require('./routes/power');
const runRoutes = require('./routes/run');
const historyRoutes = require('./routes/history');

const app = express();

app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", 'ws:', 'wss:'],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })
);
app.use(compression());
app.use(express.json({ limit: '256kb' }));
app.use(ipAllowed);

app.use('/api/auth', authRoutes);
app.use('/api/system', requireAuth, systemRoutes);
app.use('/api/processes', requireAuth, processesRoutes);
app.use('/api/power', requireAuth, powerRoutes);
app.use('/api/run', requireAuth, runRoutes);
app.use('/api/history', requireAuth, historyRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Не найдено' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server] Необработанная ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

let server;
if (config.httpsKeyPath && config.httpsCertPath) {
  const options = {
    key: fs.readFileSync(config.httpsKeyPath),
    cert: fs.readFileSync(config.httpsCertPath),
  };
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}

attachWebSocket(server);

server.listen(config.port, () => {
  const protocol = config.httpsKeyPath ? 'https' : 'http';
  console.log(`Сервер мониторинга ПК запущен: ${protocol}://localhost:${config.port}`);
  if (!config.httpsKeyPath) {
    console.log(
      'HTTPS не настроен. Для безопасного доступа из интернета используйте Tailscale Funnel / Cloudflare Tunnel / Caddy (см. README.md).'
    );
  }
});
