const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Directory for persisting jobs
const JOBS_DIR = path.join(__dirname, '..', '.data', 'jobs');

// Ensure jobs directory exists
function ensureJobsDir() {
  if (!fs.existsSync(JOBS_DIR)) {
    fs.mkdirSync(JOBS_DIR, { recursive: true });
    logger.info('[JOB] Created jobs directory:', JOBS_DIR);
  }
}

// Get file path for a job
function getJobPath(jobId) {
  return path.join(JOBS_DIR, `${jobId}.json`);
}

// Create a new job
function create(jobId, init) {
  ensureJobsDir();

  const job = {
    jobId,
    status: init.status || 'queued',
    stage: init.stage || 'download',
    progress: init.progress || 0,
    createdAt: init.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    email: init.email || '',
    youtubeUrl: init.youtubeUrl || '',
    clips: init.clips || [],
    error: null,
    expiresAt: null,
    ...init
  };

  const jobPath = getJobPath(jobId);
  fs.writeFileSync(jobPath, JSON.stringify(job, null, 2));

  logger.info(`[JOB] create ${jobId} stage=${job.stage} progress=${job.progress}`);

  return job;
}

// Update an existing job (shallow merge)
function update(jobId, patch) {
  const job = get(jobId);

  if (!job) {
    logger.warn(`[JOB] update ${jobId} failed - job not found`);
    return null;
  }

  const updated = {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString()
  };

  const jobPath = getJobPath(jobId);
  fs.writeFileSync(jobPath, JSON.stringify(updated, null, 2));

  logger.info(`[JOB] update ${jobId} stage=${updated.stage} progress=${updated.progress}`);

  return updated;
}

// Get a job by ID
function get(jobId) {
  const jobPath = getJobPath(jobId);

  if (!fs.existsSync(jobPath)) {
    return null;
  }

  try {
    const data = fs.readFileSync(jobPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error(`[JOB] Error reading job ${jobId}:`, error.message);
    return null;
  }
}

// Mark job as complete
function complete(jobId, patch) {
  const job = get(jobId);

  if (!job) {
    logger.warn(`[JOB] complete ${jobId} failed - job not found`);
    return null;
  }

  const ttlMinutes = Number(process.env.JOB_TTL_MINUTES || 120);
  // Add 5-minute grace period to prevent polling race conditions
  const expiresAt = Date.now() + ((ttlMinutes + 5) * 60 * 1000);

  const updated = {
    ...job,
    ...patch,
    status: 'complete',
    stage: 'complete',
    progress: 100,
    updatedAt: new Date().toISOString(),
    expiresAt
  };

  const jobPath = getJobPath(jobId);
  fs.writeFileSync(jobPath, JSON.stringify(updated, null, 2));

  const clipCount = updated.clips ? updated.clips.length : 0;
  logger.info(`[JOB] complete ${jobId} clips=${clipCount}`);

  return updated;
}

// Mark job as failed (but don't delete)
function fail(jobId, errorMessage) {
  const job = get(jobId);

  if (!job) {
    logger.warn(`[JOB] fail ${jobId} failed - job not found`);
    return null;
  }

  const ttlMinutes = Number(process.env.JOB_TTL_MINUTES || 120);
  // Add 5-minute grace period to prevent polling race conditions
  const expiresAt = Date.now() + ((ttlMinutes + 5) * 60 * 1000);

  const updated = {
    ...job,
    status: 'error',
    stage: 'error',
    error: errorMessage,
    updatedAt: new Date().toISOString(),
    expiresAt
  };

  const jobPath = getJobPath(jobId);
  fs.writeFileSync(jobPath, JSON.stringify(updated, null, 2));

  logger.info(`[JOB] fail ${jobId} reason="${errorMessage}"`);

  return updated;
}

// Delete a job
function deleteJob(jobId) {
  const jobPath = getJobPath(jobId);

  if (fs.existsSync(jobPath)) {
    fs.unlinkSync(jobPath);
    logger.info(`[CLEANUP] removed ${jobId}`);
    return true;
  }

  return false;
}

// Load all jobs from disk on startup
function loadAll() {
  ensureJobsDir();

  const files = fs.readdirSync(JOBS_DIR);
  const jobs = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const jobPath = path.join(JOBS_DIR, file);
        const data = fs.readFileSync(jobPath, 'utf8');
        const job = JSON.parse(data);
        jobs.push(job);
      } catch (error) {
        logger.error(`[JOB] Error loading ${file}:`, error.message);
      }
    }
  }

  logger.info(`[JOB] Loaded ${jobs.length} jobs from disk`);
  return jobs;
}

// Cleanup expired jobs based on TTL
function cleanup(ttlMinutes) {
  ensureJobsDir();

  const minutes = ttlMinutes || Number(process.env.JOB_TTL_MINUTES || 120);
  const now = Date.now();

  const files = fs.readdirSync(JOBS_DIR);
  let removed = 0;

  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const jobPath = path.join(JOBS_DIR, file);
        const data = fs.readFileSync(jobPath, 'utf8');
        const job = JSON.parse(data);

        // Check if job has expiresAt and is expired
        if (job.expiresAt && now > job.expiresAt) {
          fs.unlinkSync(jobPath);
          logger.info(`[CLEANUP] removed ${job.jobId} (expired)`);
          removed++;
        }
        // Also check createdAt for old jobs without expiresAt
        else if (!job.expiresAt && job.createdAt) {
          const createdTime = new Date(job.createdAt).getTime();
          const ageMinutes = (now - createdTime) / (60 * 1000);

          if (ageMinutes > minutes) {
            fs.unlinkSync(jobPath);
            logger.info(`[CLEANUP] removed ${job.jobId} (old job, ${Math.round(ageMinutes)} minutes old)`);
            removed++;
          }
        }
      } catch (error) {
        logger.error(`[CLEANUP] Error processing ${file}:`, error.message);
      }
    }
  }

  if (removed > 0) {
    logger.info(`[CLEANUP] Removed ${removed} expired job(s)`);
  }
}

module.exports = {
  create,
  update,
  get,
  complete,
  fail,
  deleteJob,
  loadAll,
  cleanup
};
