const express = require('express');
const multer = require('multer');
const blogController = require('../controllers/blogController');

const router = express.Router();
const upload = multer();

// Receive a new blog post for source `:id`
router.post(
  '/api/:id/receive',
  upload.none(),
  blogController.receiveBlog
);

// Check queue status for source `:id`
router.get(
  '/api/:id/status',
  blogController.status
);

// Manually trigger send for source `:id`
router.get(
  '/api/:id/test-send',
  blogController.testSend
);

module.exports = router;
