const axios = require('axios');
const queueService = require('./queueService');
const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join(__dirname, '../config/sources.json');

/**
 * Load all source configs and find one by id.
 */
function getSourceConfig(sourceId) {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const sources = JSON.parse(raw || '[]');
  const src = sources.find(s => s.id === sourceId);
  if (!src) throw new Error(`Source "${sourceId}" not found in config`);
  return src;
}

/**
 * Pop & send the next unsent blog for the given source.
 * Marks it sent on success.
 *
 * @param {string} sourceId
 * @returns {object} result status
 */
async function sendService(sourceId) {
  console.log(`🔔 [${sourceId}] sendService invoked`);
  const { endpoint } = getSourceConfig(sourceId);
  const queue = queueService.loadQueue(sourceId);
  const idx = queue.findIndex(b => !b.sent);

  if (idx === -1) {
    console.log(`📭 [${sourceId}] No unsent blogs.`);
    return { status: 'empty' };
  }

  const blog = queue[idx];
  console.log(`📤 [${sourceId}] Sending "${blog.title}" to ${endpoint}`);
  console.log('   Payload:', blog);

  try {
    const resp = await axios.post(endpoint, blog);
    console.log(`✅ [${sourceId}] Sent "${blog.title}" | HTTP ${resp.status}`);
    queue[idx].sent = true;
    queueService.saveQueue(sourceId, queue);
    return { status: 'sent', title: blog.title, code: resp.status };
  } catch (err) {
    console.error(`❌ [${sourceId}] Failed to send "${blog.title}":`, err.message);
    return { status: 'error', error: err.message };
  }
}

module.exports = sendService;
