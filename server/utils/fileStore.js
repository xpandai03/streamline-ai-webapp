const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

const TEMP_DIR = path.join(__dirname, '../../public/temp');

// Ensure temp directory exists
async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (err) {
    logger.error('Failed to create temp directory:', err);
  }
}

ensureTempDir();

async function cleanupJob(jobId) {
  try {
    const files = await fs.readdir(TEMP_DIR);
    const jobFiles = files.filter(f => f.includes(jobId));

    for (const file of jobFiles) {
      await fs.unlink(path.join(TEMP_DIR, file));
      logger.debug(`Deleted file: ${file}`);
    }

    logger.info(`Cleaned up job ${jobId}`);
  } catch (err) {
    logger.error(`Cleanup failed for job ${jobId}:`, err);
  }
}

async function getTempPath(filename) {
  await ensureTempDir();
  return path.join(TEMP_DIR, filename);
}

module.exports = {
  cleanupJob,
  getTempPath,
  TEMP_DIR
};
