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

// Check dependencies on startup
logger.info('[STARTUP] Checking system dependencies...');
const { execSync } = require('child_process');

try {
  const ytdlpVersion = execSync('yt-dlp --version', { encoding: 'utf8' }).trim();
  logger.info(`[STARTUP] ✅ yt-dlp found: ${ytdlpVersion}`);
} catch (error) {
  logger.error('[STARTUP] ❌ yt-dlp NOT FOUND - video downloads will fail!');
  logger.error('[STARTUP] Error:', error.message);
}

try {
  const ffmpegVersion = execSync('ffmpeg -version', { encoding: 'utf8' }).split('\n')[0];
  logger.info(`[STARTUP] ✅ ffmpeg found: ${ffmpegVersion}`);
} catch (error) {
  logger.error('[STARTUP] ❌ ffmpeg NOT FOUND - video processing will fail!');
  logger.error('[STARTUP] Error:', error.message);
}

try {
  const ffprobeVersion = execSync('ffprobe -version', { encoding: 'utf8' }).split('\n')[0];
  logger.info(`[STARTUP] ✅ ffprobe found: ${ffprobeVersion}`);
} catch (error) {
  logger.error('[STARTUP] ❌ ffprobe NOT FOUND - metadata extraction will fail!');
  logger.error('[STARTUP] Error:', error.message);
}

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

// Middleware - CORS must be first
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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

// Diagnostic endpoint to check system dependencies
app.get('/api/check-tools', (req, res) => {
  const checks = {
    node: process.version,
    ytdlp: null,
    ffmpeg: null,
    ffprobe: null,
    platform: process.platform,
    arch: process.arch
  };

  try {
    const ytdlpVersion = execSync('yt-dlp --version', { encoding: 'utf8' }).trim();
    checks.ytdlp = ytdlpVersion;
  } catch (error) {
    checks.ytdlp = 'NOT FOUND';
  }

  try {
    const ffmpegVersion = execSync('ffmpeg -version', { encoding: 'utf8' }).split('\n')[0];
    checks.ffmpeg = ffmpegVersion;
  } catch (error) {
    checks.ffmpeg = 'NOT FOUND';
  }

  try {
    const ffprobeVersion = execSync('ffprobe -version', { encoding: 'utf8' }).split('\n')[0];
    checks.ffprobe = ffprobeVersion;
  } catch (error) {
    checks.ffprobe = 'NOT FOUND';
  }

  res.json(checks);
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// Global error handler - MUST return JSON, never HTML
app.use((err, req, res, next) => {
  logger.error('[GLOBAL ERROR HANDLER] Caught error:', err);
  logger.error('[GLOBAL ERROR HANDLER] Stack:', err.stack);
  logger.error('[GLOBAL ERROR HANDLER] Request:', {
    method: req.method,
    path: req.path,
    body: req.body
  });

  // Ensure we always return JSON
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Overlap API running on port ${PORT}`);
});

module.exports = app;
