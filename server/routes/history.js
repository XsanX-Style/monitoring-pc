const express = require('express');
const actionLog = require('../services/actionLog');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(actionLog.getRecent(30));
});

module.exports = router;
