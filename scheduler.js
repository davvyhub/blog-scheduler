require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

const BLOG_FILE = path.join(__dirname, 'blogQueue.json');
const SEND_ENDPOINT = process.env.SEND_ENDPOINT;

// Load blog queue from file
function loadBlogQueue() {
  console.log('📂 Loading blogQueue.json...');

  if (!fs.existsSync(BLOG_FILE)) {
    console.log('📁 blogQueue.json not found, creating empty list...');
    fs.writeFileSync(BLOG_FILE, '[]');
    return [];
  }

  try {
    const raw = fs.readFileSync(BLOG_FILE, 'utf-8');
    if (!raw.trim()) {
      console.log('📄 File is empty, returning empty list.');
      return [];
    }

    const parsed = JSON.parse(raw);
    console.log(`📄 Loaded ${parsed.length} blog(s) from blogQueue.json`);
    return parsed;
  } catch (error) {
    console.error("⚠️ Failed to parse blogQueue.json:", error.message);
    return [];
  }
}

// Save updated blog queue to file
function saveBlogQueue(queue) {
  console.log(`💾 Saving ${queue.length} blog(s) to blogQueue.json...`);
  fs.writeFileSync(BLOG_FILE, JSON.stringify(queue, null, 2));
  console.log('✅ blogQueue.json saved successfully.');
}

// Send the next unsent blog
async function sendNextBlog() {
  console.log('🚀 Attempting to send next blog...');

  const queue = loadBlogQueue();
  const nextIndex = queue.findIndex(b => !b.sent);

  if (nextIndex === -1) {
    console.log('📭 No unsent blogs available. Skipping this round.');
    return { status: 'empty', message: 'No unsent blogs available' };
  }

  const blog = queue[nextIndex];
  console.log(`📤 Preparing to send blog: "${blog.title}" (Index ${nextIndex})`);

  try {
    const response = await axios.post(SEND_ENDPOINT, blog);
    console.log(`✅ Successfully sent blog: "${blog.title}" | HTTP ${response.status}`);

    // Mark as sent
    queue[nextIndex].sent = true;
    saveBlogQueue(queue);
    console.log(`📌 Marked blog as sent: "${blog.title}"`);

    return { status: 'success', blog };
  } catch (error) {
    console.error(`❌ Failed to send blog: "${blog.title}"`);
    console.error('   ', error.response?.data || error.message);
    return { status: 'error', error: error.response?.data || error.message };
  }
}

// 🕘 Schedule: Every Monday, Wednesday, Friday at 9:00 AM
cron.schedule('0 9 * * 1,3,5', () => {
  console.log(`⏰ ${new Date().toISOString()} | Triggering scheduled blog send...`);
  sendNextBlog();
});

// 🧪 Test endpoint to manually trigger send
app.get('/test-send', async (req, res) => {
  const result = await sendNextBlog();
  res.json(result);
});

// 🌐 Start server for manual testing
app.listen(PORT, () => {
  console.log(`🚀 Scheduler test server listening at http://localhost:${PORT}`);
});
