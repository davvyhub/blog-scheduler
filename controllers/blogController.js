const receiveService = require('../services/receiveService');
const queueService   = require('../services/queueService');
const sendService    = require('../services/sendService');

/**
 * POST /api/:id/receive
 * Handles incoming form-data for source `id`
 */
async function receiveBlog(req, res) {
  const { id } = req.params;
  try {
    // req.body comes from multer.none() in your route
    await receiveService(id, req.body);
    res.json({ message: 'Blog received', source: id });
  } catch (err) {
    console.error(`❌ receiveBlog(${id}) error:`, err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/:id/status
 * Returns queue stats for source `id`
 */
function status(req, res) {
  const { id } = req.params;
  try {
    const { total, sent, unsent } = queueService.getStatus(id);
    res.json({ source: id, total, sent, unsent });
  } catch (err) {
    console.error(`❌ status(${id}) error:`, err);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/:id/test-send
 * Manually triggers sendNextBlog for source `id`
 */
async function testSend(req, res) {
  const { id } = req.params;
  try {
    const result = await sendService(id);
    res.json({ source: id, result });
  } catch (err) {
    console.error(`❌ testSend(${id}) error:`, err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  receiveBlog,
  status,
  testSend,
};
