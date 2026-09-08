const express = require('express');
const { getStats } = require('../services/systemStats');

const router = express.Router();

router.get('/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
