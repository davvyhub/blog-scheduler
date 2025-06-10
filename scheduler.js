require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const BLOG_FILE = path.join(__dirname, 'blogQueue.json');
const SEND_ENDPOINT = process.env.SEND_ENDPOINT;

// Load blog queue
function loadBlogQueue() {
  console.log('📂 Loading blogQueue.json...');
  if (!fs.existsSync(BLOG_FILE)) {
    console.log('📁 blogQueue.json not found, creating a new one...');
    fs.writeFileSync(BLOG_FILE, '[]');
    return [];
  }

  try {
    const raw = fs.readFileSync(BLOG_FILE, 'utf-8');
    if (!raw.trim()) {
      console.log('📄 blogQueue.json is empty, returning empty array.');
      return [];
    }
    const parsed = JSON.parse(raw);
    console.log(`📄 Loaded ${parsed.length} blog(s) from blogQueue.json`);
    return parsed;
  } catch (error) {
    console.error("⚠️ Error parsing blogQueue.json:", error.message);
    return [];
  }
}

// Save blog queue
function saveBlogQueue(blogs) {
  console.log(`💾 Saving ${blogs.length} blog(s) to blogQueue.json...`);
  fs.writeFileSync(BLOG_FILE, JSON.stringify(blogs, null, 2));
  console.log('✅ blogQueue.json updated.');
}

// Send the next unsent blog to Make.com
async function sendNextBlog() {
  console.log('🚀 Attempting to send next blog...');

  const queue = loadBlogQueue();
  const nextIndex = queue.findIndex(b => !b.sent);

  if (nextIndex === -1) {
    console.log('📭 No unsent blogs available. Skipping this round.');
    return { status: 'empty' };
  }

  const blog = queue[nextIndex];
  console.log(`📤 Preparing to send blog: "${blog.title}" (Index ${nextIndex})`);

  try {
    const response = await axios.post(SEND_ENDPOINT, blog);
    console.log(`✅ Successfully sent blog: "${blog.title}" | HTTP ${response.status}`);

    // Mark as sent
    queue[nextIndex].sent = true;
    saveBlogQueue(queue);
    return { status: 'sent', blog };
  } catch (error) {
    console.error(`❌ Failed to send blog: "${blog.title}"`);
    console.error('   ', error.response?.data || error.message);
    return { status: 'error', error: error.message };
  }
}

// Cron job: Mon/Wed/Fri at 9:00AM
cron.schedule('0 9 * * 1,3,5', () => {
  console.log(`⏰ ${new Date().toISOString()} | Triggering scheduled blog send...`);
  sendNextBlog();
});

// Manual test route
app.get('/test-send', async (req, res) => {
  console.log('🧪 /test-send triggered');
  const result = await sendNextBlog();
  res.json(result);
});

// Start Express server
app.listen(PORT, () => {
  console.log(`🚀 Scheduler server running on port ${PORT}`);
});
