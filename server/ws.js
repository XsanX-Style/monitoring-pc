const { WebSocketServer } = require('ws');
const { verifyTokenString } = require('./middleware/auth');
const { getStats } = require('./services/systemStats');

const STATS_INTERVAL_MS = 2000;

function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Set();

  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      verifyTokenString(token);
    } catch (err) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });

  setInterval(async () => {
    if (!clients.size) return;
    try {
      const stats = await getStats();
      const payload = JSON.stringify({ type: 'stats', data: stats });
      for (const client of clients) {
        if (client.readyState === client.OPEN) client.send(payload);
      }
    } catch (err) {
      // Не роняем сервер из-за единичной ошибки сбора статистики
      console.error('[ws] Ошибка получения статистики:', err.message);
    }
  }, STATS_INTERVAL_MS);

  return wss;
}

module.exports = { attachWebSocket };
