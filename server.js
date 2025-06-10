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
  if (!fs.existsSync(BLOG_FILE)) {
    fs.writeFileSync(BLOG_FILE, '[]');
    return [];
  }

  try {
    const raw = fs.readFileSync(BLOG_FILE, 'utf-8');
    if (!raw.trim()) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error("⚠️ Error parsing blogQueue.json:", error.message);
    return [];
  }
}

// Utility: Save blog queue
function saveBlogQueue(blogs) {
  fs.writeFileSync(BLOG_FILE, JSON.stringify(blogs, null, 2));
}

// 📥 Handle form-data from Make.com
app.post('/receive-blogs', upload.none(), (req, res) => {
  try {
    console.log("📥 Incoming form-data:", req.body);

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

    // Check for duplicates (by guid)
    const duplicate = queue.some(item => item.guid === blog.guid);
    if (duplicate) {
      console.log(`⚠️ Duplicate blog ignored: "${blog.title}"`);
      return res.status(200).json({ message: 'Duplicate blog. Skipped.' });
    }

    // Add to beginning of queue
    queue.unshift(blog);
    saveBlogQueue(queue);

    console.log(`✅ Blog saved: "${blog.title}"`);
    res.json({ message: 'Blog added successfully' });
  } catch (err) {
    console.error('❌ Error in /receive-blogs:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 🧪 JSON middleware for other routes
app.use(express.json());

// 📊 Optional status check
app.get('/status', (req, res) => {
  const queue = loadBlogQueue();
  res.json({
    total: queue.length,
    unsent: queue.filter(b => !b.sent).length,
    sent: queue.filter(b => b.sent).length,
  });
});

// 🚀 Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
