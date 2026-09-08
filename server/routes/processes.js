const express = require('express');
const { listProcesses, killProcess } = require('../services/processManager');
const { actionLimiter } = require('../middleware/rateLimit');

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
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
