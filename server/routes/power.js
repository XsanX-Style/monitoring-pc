const express = require('express');
const powerControl = require('../services/powerControl');
const { actionLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/actions', (req, res) => {
  res.json({ actions: powerControl.availableActions });
});

router.post('/:action', actionLimiter, async (req, res) => {
  try {
    const result = await powerControl.execute(req.params.action);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
