const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const sendService = require('./sendService');

const CONFIG_PATH = path.join(__dirname, '../config/sources.json');

// Map day names to cron numbers
const DAY_MAP = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
};

let tasks = [];

/**
 * Read sources.json and schedule jobs for each source.
 */
function scheduleAll() {
  // clear existing tasks
  tasks.forEach(t => t.stop());
  tasks = [];

  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const sources = JSON.parse(raw || '[]');

  sources.forEach(src => {
    const { id, days, time } = src;
    const [hour, minute] = time.split(':');

    // translate days to numbers
    const dayNums = days.map(d => {
      if (!(d in DAY_MAP)) throw new Error(`Invalid day "${d}" for source "${id}"`);
      return DAY_MAP[d];
    }).join(',');

    // build cron expression
    const expr = `${minute} ${hour} * * ${dayNums}`;

    console.log(`⏱ [${id}] scheduling cron "${expr}"`);
    const task = cron.schedule(expr, () => {
      console.log(`⏰ [${id}] Cron triggered at ${new Date().toISOString()}`);
      sendService(id).catch(err => console.error(`[${id}] sendService error:`, err));
    });

    tasks.push(task);
  });
}

/**
 * Reload schedules (e.g. after config change).
 */
function reload() {
  console.log('🔄 Reloading all schedules');
  scheduleAll();
}

module.exports = {
  scheduleAll,
  reload
};
