require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer();
const PORT = process.env.PORT || 3000;
const BLOG_FILE = path.join(__dirname, 'blogQueue.json');
const SEND_ENDPOINT = process.env.SEND_ENDPOINT;

// ----------- UTILITIES ------------ //

function loadBlogQueue() {
  if (!fs.existsSync(BLOG_FILE)) {
    console.log('📁 blogQueue.json not found, creating new one...');
    fs.writeFileSync(BLOG_FILE, '[]');
    return [];
  }
  try {
    const raw = fs.readFileSync(BLOG_FILE, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('⚠️ Error parsing blogQueue.json:', err.message);
    return [];
  }
}

function saveBlogQueue(queue) {
  fs.writeFileSync(BLOG_FILE, JSON.stringify(queue, null, 2));
}

// Detect new batch (> 3 days)
function isNewBatch(lastReceived, currentReceived) {
  const diffMs = new Date(currentReceived) - new Date(lastReceived);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 3;
}

async function sendNextBlog() {
    console.log('🚀 Attempting to send next blog...');
    const queue = loadBlogQueue();
    const idx = queue.findIndex(b => !b.sent);
    if (idx === -1) {
      console.log('📭 No unsent blogs.');
      return { status: 'empty' };
    }
  
    const blog = queue[idx];
    console.log(`📤 Sending blog "${blog.title}" to Make.com endpoint...`);
    console.log('📦 Payload:', blog);  // <--- ADD THIS LINE TO SEE THE DATA
  
    try {
      const resp = await axios.post(SEND_ENDPOINT, blog);
      console.log(`✅ Sent "${blog.title}" | HTTP ${resp.status}`);
      queue[idx].sent = true;
      saveBlogQueue(queue);
      return { status: 'sent', title: blog.title, payload: blog };  // optional: include in response
    } catch (err) {
      console.error(`❌ Failed to send "${blog.title}":`, err.message);
      return { status: 'error', error: err.message };
    }
  }  

// ----------- ROUTES ------------ //

// Receive RSS blogs via multipart/form-data
app.post('/receive-blogs', upload.none(), (req, res) => {
  try {
    console.log('📨 /receive-blogs called:', req.body);
    const blog = {
      title: req.body.title || '',
      description: req.body.Description || '',
      summary: req.body.Summary || '',
      author: req.body.Author || '',
      url: req.body.url || req.body['rss link'] || '',
      date: req.body.date || req.body['Date created'] || req.body['rss pubdate'] || '',
      image: req.body['medicontent url'] || '',
      guid: req.body['rss guid'] || req.body.id || '',
      sent: false,
      receivedAt: new Date().toISOString()
    };

    let queue = loadBlogQueue();
    if (queue.length > 0 && isNewBatch(queue[0].receivedAt, blog.receivedAt)) {
      console.log('🔄 Detected new batch (>3 days). Resetting queue.');
      queue = [];
    }

    queue.unshift(blog);
    saveBlogQueue(queue);
    console.log(`✅ Blog saved: "${blog.title}" | Queue size: ${queue.length}`);
    res.json({ message: 'Blog saved', title: blog.title });
  } catch (err) {
    console.error('❌ Error in /receive-blogs:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  const queue = loadBlogQueue();
  res.json({
    total: queue.length,
    sent: queue.filter(b => b.sent).length,
    unsent: queue.filter(b => !b.sent).length
  });
});

// Test-send endpoint (manual trigger)
app.get('/test-send', async (req, res) => {
  console.log('🧪 /test-send called');
  const result = await sendNextBlog();
  res.json(result);
});

// ----------- SCHEDULER ------------ //

cron.schedule('0 9 * * 1,3,5', () => {
  console.log(`⏰ Scheduled send at ${new Date().toISOString()}`);
  sendNextBlog();
});

// ----------- START SERVER ------------ //

app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
