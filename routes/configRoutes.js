const express = require('express');
const configController = require('../controllers/configController');

const router = express.Router();

// Return the current array of source configs
router.get('/config', configController.getConfig);

// Update the array of source configs (expects JSON body)
router.post(
  '/config',
  express.json(),
  configController.updateConfig
);

module.exports = router;
