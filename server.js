require('dotenv').config();
const express = require('express');
const path = require('path');

const blogRoutes   = require('./routes/blogRoutes');
const configRoutes = require('./routes/configRoutes');
const scheduleService = require('./services/scheduleService');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve config UI
app.use(express.static(path.join(__dirname, 'public')));

// JSON body parser for config POST
app.use(express.json());

// Mount API routes
app.use(blogRoutes);
app.use(configRoutes);

// Initialize all cron schedules
scheduleService.scheduleAll();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening at http://localhost:${PORT}`);
});
