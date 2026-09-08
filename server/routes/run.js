const express = require('express');
const fs = require('fs');
const path = require('path');
const commandRunner = require('../services/commandRunner');

const router = express.Router();
const quickLaunchPath = path.join(__dirname, '..', 'config', 'quickLaunch.json');

router.get('/quick-launch', (req, res) => {
  try {
    const raw = fs.readFileSync(quickLaunchPath, 'utf-8');
    res.json(JSON.parse(raw));
  } catch (err) {
    res.json([]);
  }
});

router.post('/', async (req, res) => {
  const { command, detached } = req.body || {};

  try {
    const result = await commandRunner.run(command, Boolean(detached));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
