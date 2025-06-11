const queueService = require('./queueService');

// Helper to detect a new batch (more than 3 days since last received)
function isNewBatch(lastReceivedAt, now) {
  const diffMs   = new Date(now) - new Date(lastReceivedAt);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 3;
}

/**
 * Receive a new blog for sourceId, apply freshness logic,
 * and push it onto the front of that source's queue.
 *
 * @param {string} sourceId
 * @param {object} formData  - Fields from multer.none(): title, Description, Summary, etc.
 */
async function receiveService(sourceId, formData) {
  const queue = queueService.loadQueue(sourceId);
  const now   = new Date().toISOString();

  // Build standardized blog object
  const blog = {
    title:       formData.title || '',
    description: formData.Description || '',
    summary:     formData.Summary || '',
    author:      formData.Author || '',
    url:         formData.url || formData['rss link'] || '',
    date:        formData.date || formData['Date created'] || formData['rss pubdate'] || '',
    image:       formData['medicontent url'] || '',
    guid:        formData['rss guid'] || formData.id || '',
    sent:        false,
    receivedAt:  now
  };

  // Freshness reset: if the last blog was more than 3 days ago, clear queue
  if (queue.length > 0 && isNewBatch(queue[0].receivedAt, now)) {
    console.log(`🔄 [${sourceId}] New batch detected (>3 days). Resetting queue.`);
    queue.length = 0;
  }

  // Push new blog onto the queue
  queue.unshift(blog);
  queueService.saveQueue(sourceId, queue);
}

module.exports = receiveService;
