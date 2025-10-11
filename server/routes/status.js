const express = require('express');
const jobStore = require('../utils/jobStore');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/:jobId', (req, res) => {
  const { jobId } = req.params;

  const job = jobStore.get(jobId);

  // If job doesn't exist, it may have been cleaned up or never existed
  if (!job) {
    logger.warn(`[WARN] Status request for expired/missing job: ${jobId}`);
    // Return 200 with expired status (not 404)
    return res.status(200).json({
      status: 'expired',
      message: 'Job expired or not found. Please re-submit.'
    });
  }

  // Return full job data
  const response = {
    status: job.status || job.stage,
    stage: job.stage,
    progress: job.progress,
    message: job.message,
    clips: job.clips || [],
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };

  // If job is complete, ensure we return the complete status
  if (job.stage === 'complete' || job.status === 'complete') {
    response.status = 'complete';
    response.progress = 100;
    logger.debug(`[DEBUG] Returning completed job ${jobId} with ${job.clips ? job.clips.length : 0} clips`);
  }

  res.json(response);
});

module.exports = router;
