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
app.post('/receive-blogs', (req, res) => {
  const blogs = req.body;

  if (!Array.isArray(blogs)) {
    return res.status(400).json({ error: 'Expected an array of blog posts' });
  }

  // Sort blogs from newest to oldest if date is available, else as-is
  const sortedBlogs = blogs
    .map(blog => ({ ...blog, sent: false }))
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  saveBlogQueue(sortedBlogs);

  console.log(`Received and saved ${sortedBlogs.length} blog posts.`);
  res.json({ message: 'Blog queue updated successfully' });
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
