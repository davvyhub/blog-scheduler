const fs = require('fs');
const path = require('path');

const QUEUES_DIR = path.join(__dirname, '../data/queues');

// Ensure the queues directory exists
if (!fs.existsSync(QUEUES_DIR)) {
  fs.mkdirSync(QUEUES_DIR, { recursive: true });
}

/**
 * Get the file path for a given source ID's queue.
 */
function getQueueFilePath(sourceId) {
  return path.join(QUEUES_DIR, `queue-${sourceId}.json`);
}

/**
 * Load a queue (array of blog objects) for the given source ID.
 * If the file doesn’t exist, creates it with an empty array.
 */
function loadQueue(sourceId) {
  const filePath = getQueueFilePath(sourceId);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]', 'utf-8');
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    console.error(`⚠️ Error loading queue for "${sourceId}":`, err.message);
    return [];
  }
}

/**
 * Save the provided queue array for the given source ID.
 */
function saveQueue(sourceId, queue) {
  const filePath = getQueueFilePath(sourceId);
  fs.writeFileSync(filePath, JSON.stringify(queue, null, 2), 'utf-8');
}

/**
 * Get status counts for the queue of a given source ID.
 */
function getStatus(sourceId) {
  const queue = loadQueue(sourceId);
  const total  = queue.length;
  const sent   = queue.filter(b => b.sent).length;
  const unsent = total - sent;
  return { total, sent, unsent };
}

module.exports = {
  loadQueue,
  saveQueue,
  getStatus,
};
