require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const upload = multer();
const PORT = process.env.PORT || 3000;
const BLOG_FILE = path.join(__dirname, 'blogQueue.json');

// Utility: Save blog queue to file
function saveBlogQueue(blogs) {
  fs.writeFileSync(BLOG_FILE, JSON.stringify(blogs, null, 2));
}

// Utility: Load blog queue from file
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

// 🚨 DO NOT use express.json() before multer for multipart/form-data
// Place JSON middleware AFTER form-data routes

// 📥 Form-based blog post endpoint (for Make.com multipart/form-data)
app.post('/receive-blogs', upload.none(), (req, res) => {
  try {
    console.log("📥 Received form-data:", req.body); // DEBUG LOG

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

    const queue = loadBlogQueue();
    queue.unshift(blog); // Add to beginning
    saveBlogQueue(queue);

    console.log(`✅ Blog saved: "${blog.title}"`);
    res.json({ message: 'Blog added successfully' });
  } catch (err) {
    console.error('❌ Error handling /receive-blogs:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ JSON middleware for other routes (after form handlers)
app.use(express.json());

// 🧪 Optional status check endpoint
app.get('/status', (req, res) => {
  const queue = loadBlogQueue();
  res.json({
    total: queue.length,
    unsent: queue.filter(b => !b.sent).length,
    sent: queue.filter(b => b.sent).length,
  });
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
