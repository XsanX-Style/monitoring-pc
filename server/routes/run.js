const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const commandRunner = require('../services/commandRunner');
const { actionLimiter } = require('../middleware/rateLimit');
const actionLog = require('../services/actionLog');

const router = express.Router();
const quickLaunchPath = path.join(__dirname, '..', 'config', 'quickLaunch.json');
const MAX_QUICK_LAUNCH_ITEMS = 30;

function readQuickLaunch() {
  try {
    const raw = fs.readFileSync(quickLaunchPath, 'utf-8');
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    return [];
  }
}

function writeQuickLaunch(list) {
  fs.writeFileSync(quickLaunchPath, `${JSON.stringify(list, null, 2)}\n`, 'utf-8');
}

router.get('/quick-launch', (req, res) => {
  res.json(readQuickLaunch());
});

router.post('/quick-launch', actionLimiter, (req, res) => {
  const { name, command, detached } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Укажите название ярлыка' });
  }
  if (!command || typeof command !== 'string' || !command.trim()) {
    return res.status(400).json({ error: 'Укажите команду' });
  }
  if (name.length > 60) {
    return res.status(400).json({ error: 'Название слишком длинное (макс. 60 символов)' });
  }
  if (command.length > 500) {
    return res.status(400).json({ error: 'Команда слишком длинная (макс. 500 символов)' });
  }

  const list = readQuickLaunch();
  if (list.length >= MAX_QUICK_LAUNCH_ITEMS) {
    return res.status(400).json({ error: `Максимум ${MAX_QUICK_LAUNCH_ITEMS} ярлыков` });
  }

  const item = {
    id: crypto.randomUUID(),
    name: name.trim(),
    command: command.trim(),
    detached: detached !== false,
  };
  list.push(item);

  try {
    writeQuickLaunch(list);
  } catch (err) {
    return res.status(500).json({ error: `Не удалось сохранить: ${err.message}` });
  }

  res.json(list);
});

router.delete('/quick-launch/:id', actionLimiter, (req, res) => {
  const list = readQuickLaunch();
  const filtered = list.filter((item) => item.id !== req.params.id);

  if (filtered.length === list.length) {
    return res.status(404).json({ error: 'Ярлык не найден' });
  }

  try {
    writeQuickLaunch(filtered);
  } catch (err) {
    return res.status(500).json({ error: `Не удалось сохранить: ${err.message}` });
  }

  res.json(filtered);
});

router.post('/', actionLimiter, async (req, res) => {
  const { command, detached } = req.body || {};

  try {
    const result = await commandRunner.run(command, Boolean(detached));
    actionLog.record({ type: 'run', detail: command, ok: true });
    res.json(result);
  } catch (err) {
    actionLog.record({ type: 'run', detail: command, ok: false, message: err.message });
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
