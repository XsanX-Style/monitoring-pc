const express = require('express');
const powerControl = require('../services/powerControl');
const { actionLimiter } = require('../middleware/rateLimit');
const actionLog = require('../services/actionLog');

const router = express.Router();

router.get('/actions', (req, res) => {
  res.json({ actions: powerControl.availableActions });
});

router.post('/:action', actionLimiter, async (req, res) => {
  const { action } = req.params;
  let delaySeconds;

  if (req.body && req.body.delayMinutes !== undefined) {
    const minutes = Number(req.body.delayMinutes);
    const maxMinutes = powerControl.MAX_DELAY_SECONDS / 60;
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > maxMinutes) {
      return res
        .status(400)
        .json({ error: `Задержка должна быть целым числом от 0 до ${maxMinutes} минут` });
    }
    delaySeconds = minutes * 60;
  }

  try {
    const result = await powerControl.execute(action, { delaySeconds });
    actionLog.record({
      type: 'power',
      detail: delaySeconds !== undefined ? `${action} (через ${delaySeconds / 60} мин)` : action,
      ok: true,
    });
    res.json({ ok: true, result });
  } catch (err) {
    actionLog.record({ type: 'power', detail: action, ok: false, message: err.message });
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
