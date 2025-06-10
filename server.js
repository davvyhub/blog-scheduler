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

// 📥 Handle form-data from Make.com
app.post('/receive-blogs', upload.none(), (req, res) => {
  console.log('📨 Received POST to /receive-blogs');

  try {
    console.log("📥 Incoming form-data content:", req.body);

    const blog = {
      title: req.body.title || '',
      description: req.body.Description || '',
      summary: req.body.Summary || '',
      author: req.body.Author || '',
      url: req.body.url || req.body['rss link'] || '',
      date: req.body.date || req.body['Date created'] || req.body['rss pubdate'] || '',
      image: req.body['medicontent url'] || '',
      guid: req.body['rss guid'] || req.body.id || '',
      sent: false
    };

    console.log(`🧱 Parsed blog data: "${blog.title}"`);

    const queue = loadBlogQueue();

    // Check for duplicates
    const duplicate = queue.some(item => item.guid === blog.guid);
    if (duplicate) {
      console.log(`⚠️ Duplicate blog detected by GUID: "${blog.guid}" - Skipping.`);
      return res.status(200).json({ message: 'Duplicate blog. Skipped.' });
    }

    queue.unshift(blog);
    console.log(`📌 Adding blog to the top of the queue: "${blog.title}"`);

    saveBlogQueue(queue);

    console.log(`✅ Blog successfully saved: "${blog.title}"`);
    res.json({ message: 'Blog added successfully' });
  } catch (err) {
    console.error('❌ Error in /receive-blogs:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 🧪 JSON middleware for other routes
app.use(express.json());

// 📊 Status endpoint
app.get('/status', (req, res) => {
  console.log('🔍 GET request to /status');
  const queue = loadBlogQueue();
  const response = {
    total: queue.length,
    unsent: queue.filter(b => !b.sent).length,
    sent: queue.filter(b => b.sent).length,
  };
  console.log('📊 Status data:', response);
  res.json(response);
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
