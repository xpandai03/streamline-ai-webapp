const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const processRoute = require('./routes/process');
const statusRoute = require('./routes/status');
const downloadRoute = require('./routes/download');
const logger = require('./utils/logger');
const jobStore = require('./utils/jobStore');

const app = express();
const PORT = process.env.PORT || 3001;

// Load persisted jobs on startup
logger.info('[STARTUP] Loading persisted jobs from disk...');
jobStore.loadAll();

// Run initial cleanup
logger.info('[STARTUP] Running initial job cleanup...');
jobStore.cleanup();

// Schedule periodic cleanup every 10 minutes
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
setInterval(() => {
  logger.info('[PERIODIC] Running scheduled job cleanup...');
  jobStore.cleanup();
}, CLEANUP_INTERVAL);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve temp files for video playback with CORS
const tempPath = path.join(process.cwd(), 'public', 'temp');
app.use('/temp', cors(), express.static(tempPath));
logger.info(`[STARTUP] Static mount: /temp -> ${tempPath}`);

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/process', processRoute);
app.use('/api/status', statusRoute);
app.use('/api/download', downloadRoute);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Overlap API running on port ${PORT}`);
});

module.exports = app;
