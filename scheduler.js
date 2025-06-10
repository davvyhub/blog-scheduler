// scheduler.js
require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BLOG_FILE = path.join(__dirname, 'blogQueue.json');
const SEND_ENDPOINT = process.env.SEND_ENDPOINT;

// Load blog queue
function loadBlogQueue() {
  if (!fs.existsSync(BLOG_FILE)) return [];
  try {
    const raw = fs.readFileSync(BLOG_FILE, 'utf-8');
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error("⚠️ Failed to parse blogQueue.json:", error.message);
    return [];
  }
}

// Save blog queue
function saveBlogQueue(queue) {
  fs.writeFileSync(BLOG_FILE, JSON.stringify(queue, null, 2));
}

// Send next blog
async function sendNextBlog() {
  let queue = loadBlogQueue();
  const next = queue.find(b => !b.sent);

  if (!next) {
    console.log('No unsent blogs in the queue.');
    return;
  }

  try {
    const response = await axios.post(SEND_ENDPOINT, next);
    console.log(`✅ Sent blog: "${next.title}" | Response: ${response.status}`);

    // Mark as sent and save
    next.sent = true;
    saveBlogQueue(queue);
  } catch (error) {
    console.error(`❌ Failed to send blog: "${next.title}"`, error.message);
  }
}

// Schedule: Mon, Wed, Fri at 9:00 AM
cron.schedule('0 9 * * 1,3,5', () => {
  console.log('📤 Triggering scheduled blog send...');
  sendNextBlog();
});

// Run once on startup (optional)
// sendNextBlog();
