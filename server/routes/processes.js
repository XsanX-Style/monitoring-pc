const express = require('express');
const { listProcesses, killProcess } = require('../services/processManager');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const list = await listProcesses();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:pid/kill', async (req, res) => {
  try {
    const result = await killProcess(req.params.pid);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
