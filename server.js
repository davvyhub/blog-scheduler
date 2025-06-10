require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const upload = multer();
const PORT = process.env.PORT || 3000;
const BLOG_FILE = path.join(__dirname, 'blogQueue.json');

// Utility: Load blog queue
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

// Utility: Save blog queue
function saveBlogQueue(blogs) {
  console.log(`💾 Saving ${blogs.length} blog(s) to blogQueue.json...`);
  fs.writeFileSync(BLOG_FILE, JSON.stringify(blogs, null, 2));
  console.log('✅ blogQueue.json updated.');
}

// Utility: Check freshness
function isNewBatch(latestReceived, currentReceived) {
  const diffInMs = new Date(currentReceived) - new Date(latestReceived);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  console.log(`📅 Time since last blog: ${diffInDays.toFixed(2)} day(s)`);
  return diffInDays > 3;
}

// 📥 Handle form-data from Make.com
app.post('/receive-blogs', upload.none(), (req, res) => {
  try {
    console.log('📨 Received POST to /receive-blogs');
    console.log('📥 Incoming form-data content:', req.body);

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

    if (queue.length > 0) {
      const lastReceived = queue[0].receivedAt;

      if (isNewBatch(lastReceived, blog.receivedAt)) {
        console.log('🔄 New batch detected (older than 3 days). Resetting queue...');
        queue = [];
      }
    }

    queue.unshift(blog);
    saveBlogQueue(queue);

    console.log(`✅ Blog saved: "${blog.title}"`);
    console.log(`📦 Queue size is now ${queue.length}`);
    res.json({ message: 'Blog added successfully' });
  } catch (err) {
    console.error('❌ Error handling /receive-blogs:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 🧪 JSON middleware for other routes
app.use(express.json());

// 📊 Status endpoint
app.get('/status', (req, res) => {
  console.log('🔍 GET request to /status');
  const queue = loadBlogQueue();
  const result = {
    total: queue.length,
    unsent: queue.filter(b => !b.sent).length,
    sent: queue.filter(b => b.sent).length
  };
  console.log('📊 Status:', result);
  res.json(result);
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
