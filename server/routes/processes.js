const express = require('express');
const { listProcesses, killProcess } = require('../services/processManager');
const { actionLimiter } = require('../middleware/rateLimit');
const actionLog = require('../services/actionLog');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const list = await listProcesses();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:pid/kill', actionLimiter, async (req, res) => {
  try {
    const force = Boolean(req.body && req.body.force);
    const result = await killProcess(req.params.pid, { force });
    actionLog.record({
      type: 'kill',
      detail: `${result.name || 'PID'} (${req.params.pid})`,
      ok: true,
      message: result.method === 'forced' ? 'принудительно' : 'мягко',
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    actionLog.record({ type: 'kill', detail: `PID ${req.params.pid}`, ok: false, message: err.message });
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
