const fs = require('fs');
const path = require('path');
const scheduleService = require('../services/scheduleService');
const CONFIG_PATH = path.join(__dirname, '../config/sources.json');

/**
 * GET /config
 * Returns the array of source configurations.
 */
function getConfig(req, res) {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const sources = JSON.parse(raw || '[]');
    res.json(sources);
  } catch (err) {
    console.error('❌ getConfig error:', err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /config
 * Accepts a JSON array of source configs, writes to sources.json,
 * and reloads the scheduler.
 */
function updateConfig(req, res) {
  try {
    const sources = req.body;
    if (!Array.isArray(sources)) {
      return res.status(400).json({ error: 'Expected an array of source configs' });
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(sources, null, 2));
    console.log('🔄 sources.json updated, reloading schedules');
    scheduleService.reload(); // implement this to clear & re-register cron jobs

    res.json({ message: 'Config updated', count: sources.length });
  } catch (err) {
    console.error('❌ updateConfig error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getConfig,
  updateConfig,
};
