// server.js
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BLOG_FILE = path.join(__dirname, 'blogQueue.json');

app.use(express.json());

// Utility: Save blog queue to file
function saveBlogQueue(blogs) {
  fs.writeFileSync(BLOG_FILE, JSON.stringify(blogs, null, 2));
}

// Utility: Load blog queue from file
function loadBlogQueue() {
  if (!fs.existsSync(BLOG_FILE)) return [];
  const raw = fs.readFileSync(BLOG_FILE);
  return JSON.parse(raw);
}

// Endpoint to receive blogs from Make.com
// Add at the top
const multer = require('multer');
const upload = multer();

app.post('/receive-blogs', upload.none(), (req, res) => {
  try {
    const blog = {
      title: req.body.title || '',
      description: req.body.Description || '',
      summary: req.body.Summary || '',
      author: req.body.Author || '',
      url: req.body.url || req.body['rss link'] || '',
      date: req.body.date || req.body['Date created'] || req.body['rss pubdate'] || '',
      image: req.body['medicontent url'] || '',
      guid: req.body['rss guid'] || '',
      sent: false
    };

    // Load existing queue
    const queue = loadBlogQueue();

    // Add new blog at the beginning (most recent first)
    queue.unshift(blog);

    // Save updated queue
    saveBlogQueue(queue);

    console.log('✅ Blog received via form data:', blog.title);
    res.json({ message: 'Blog added successfully' });

  } catch (err) {
    console.error('❌ Error processing form-data blog:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Optional: Status endpoint to view queue
app.get('/status', (req, res) => {
  const queue = loadBlogQueue();
  res.json({
    total: queue.length,
    unsent: queue.filter(b => !b.sent).length,
    sent: queue.filter(b => b.sent).length,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
