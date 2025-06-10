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

// Send next blog post
async function sendNextBlog() {
  const queue = loadBlogQueue();
  const nextIndex = queue.findIndex(b => !b.sent);

  if (nextIndex === -1) {
    console.log('📭 No unsent blogs available. Skipping this round.');
    return;
  }

  const blog = queue[nextIndex];

  try {
    const response = await axios.post(SEND_ENDPOINT, blog);
    console.log(`✅ Sent blog: "${blog.title}" | Status: ${response.status}`);

    // Mark as sent and save
    queue[nextIndex].sent = true;
    saveBlogQueue(queue);
  } catch (error) {
    console.error(`❌ Failed to send blog: "${blog.title}"`);
    console.error('   ', error.response?.data || error.message);
  }
}

// Schedule task: Every Monday, Wednesday, Friday at 9:00 AM server time
cron.schedule('0 9 * * 1,3,5', () => {
  console.log(`⏰ ${new Date().toISOString()} | Triggering scheduled blog send...`);
  sendNextBlog();
});

// Optional: Uncomment to send one immediately on startup for testing
// sendNextBlog();
