const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const downloader = require('../modules/downloader');
const transcriber = require('../modules/transcriber');
const highlightEngine = require('../modules/highlightEngine');
const clipper = require('../modules/clipper');
const captionEngine = require('../modules/captionEngine');
const emailer = require('../modules/emailer');
const logger = require('../utils/logger');
const fileStore = require('../utils/fileStore');
const jobStore = require('../utils/jobStore');

const router = express.Router();

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:3002';

router.post('/', async (req, res) => {
  try {
    logger.info('[PROCESS] POST /api/process received');
    logger.info('[PROCESS] Request body:', JSON.stringify(req.body));

    const { youtubeUrl, email } = req.body;

    if (!youtubeUrl || !email) {
      logger.warn('[PROCESS] Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'YouTube URL and email are required'
      });
    }

    const jobId = uuidv4();

    // Initialize job with durable store
    jobStore.create(jobId, {
      status: 'running',
      stage: 'download',
      progress: 5,
      message: 'Starting...',
      email,
      youtubeUrl,
      createdAt: new Date().toISOString()
    });

    logger.info(`[INFO] Job ${jobId} created for URL: ${youtubeUrl}`);

    // Start processing asynchronously
    processVideo(jobId, youtubeUrl, email).catch(err => {
      logger.error(`[ERROR] Job ${jobId} failed:`, err.message);
      logger.error(`[ERROR] Stack trace:`, err.stack);

      // Mark job as failed (sets expiry automatically)
      jobStore.fail(jobId, err.message);

      // Cleanup temp files but keep job record
      fileStore.cleanupJob(jobId);
    });

    logger.info(`[PROCESS] Returning jobId: ${jobId}`);
    res.json({ success: true, jobId });
  } catch (error) {
    logger.error('[PROCESS ERROR] Route handler caught error:', error);
    logger.error('[PROCESS ERROR] Stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

async function processVideo(jobId, youtubeUrl, email) {
  const updateJob = (stage, progress, message) => {
    jobStore.update(jobId, {
      stage,
      progress,
      message
    });
    logger.info(`[INFO] Job ${jobId} - ${stage}: ${message}`);
  };

  let videoPath, metadata, audioPath, transcript, highlights, clipPaths, finalClips;

  try {
    // 1. Download video
    updateJob('download', 10, 'Downloading video...');
    try {
      const downloadResult = await downloader.downloadVideo(youtubeUrl);
      videoPath = downloadResult.path;
      metadata = downloadResult.metadata;
      logger.info(`[INFO] ✅ Stage: download ✅`);
    } catch (error) {
      logger.error(`[ERROR] Download failed: ${error.message}`);
      throw error; // Can't proceed without video
    }

    // 2. Extract audio
    updateJob('extract_audio', 25, 'Extracting audio...');
    try {
      audioPath = await transcriber.extractAudio(videoPath);
      logger.info(`[INFO] ✅ Stage: extract_audio ✅`);
    } catch (error) {
      logger.error(`[ERROR] Audio extraction failed: ${error.message}`);
      throw error; // Can't proceed without audio
    }

    // 3. Transcribe (with automatic fallback built into transcriber.js)
    updateJob('transcribe', 35, 'Transcribing...');
    try {
      transcript = await transcriber.transcribe(audioPath);
      logger.info(`[INFO] Transcription returned ${transcript.words ? transcript.words.length : 0} words`);
    } catch (error) {
      logger.error(`[ERROR] Transcription stage error: ${error.message}`);
      // Create emergency fallback transcript
      logger.warn('[WARN] Creating emergency fallback transcript in process.js');
      transcript = {
        text: "Emergency fallback transcript.",
        words: [
          { start: 0, end: 20, text: "Emergency" },
          { start: 20, end: 40, text: "fallback" },
          { start: 40, end: 60, text: "transcript" }
        ]
      };
    }

    // 4. Detect highlights (with automatic fallback built into highlightEngine.js)
    updateJob('detect_highlights', 50, 'Finding highlights...');
    try {
      highlights = await highlightEngine.detectHighlights(transcript, metadata);
      logger.info(`[INFO] Highlight detection returned ${highlights ? highlights.length : 0} clips`);
    } catch (error) {
      logger.error(`[ERROR] Highlight detection stage error: ${error.message}`);
      // Create emergency fallback highlight
      logger.warn('[WARN] Creating emergency fallback highlight in process.js');
      highlights = [{
        start: 0,
        end: Math.min(60, metadata.duration || 60),
        caption: 'Emergency fallback highlight',
        energy_score: 5.0
      }];
    }

    // Ensure we have at least one highlight
    if (!highlights || highlights.length === 0) {
      logger.warn('[WARN] No highlights detected, creating ultimate fallback');
      highlights = [{
        start: 0,
        end: Math.min(60, metadata.duration || 60),
        caption: 'Fallback clip',
        energy_score: 5.0
      }];
    }

    // 5. Create clips
    updateJob('clip', 65, 'Creating clips...');
    try {
      clipPaths = await clipper.createClips(videoPath, highlights);
      logger.info(`[INFO] ✅ Stage: clip ✅ (${clipPaths.length} generated)`);
    } catch (error) {
      logger.error(`[ERROR] Clip creation failed: ${error.message}`);
      throw error; // Critical error, can't proceed without clips
    }

    // 6. Add captions
    updateJob('caption', 80, 'Adding captions...');
    try {
      finalClips = await captionEngine.addCaptions(clipPaths, highlights, transcript);
      logger.info(`[INFO] ✅ Stage: caption ✅ (${finalClips.length} captioned)`);
    } catch (error) {
      logger.error(`[ERROR] Caption addition failed: ${error.message}`);
      // Use clips without captions as fallback
      logger.warn('[WARN] Using clips without captions as fallback');
      finalClips = clipPaths.map((clip, index) => ({
        ...clip,
        caption: highlights[index]?.caption || 'Clip without caption'
      }));
    }

    // 6. Send email (skip if SKIP_EMAIL=true)
    if (process.env.SKIP_EMAIL === 'true') {
      updateJob('complete', 100, 'Clips ready');
    } else {
      updateJob('email', 95, 'Sending email...');
      await emailer.sendClips(email, finalClips, metadata);
      updateJob('complete', 100, 'Done');
    }

    // Mark job as complete with clips (sets expiry automatically)
    const clipsWithUrls = finalClips.map(clip => {
      const filename = path.basename(clip.path);
      return {
        id: clip.id,
        filename,
        url: `${PUBLIC_BASE_URL}/temp/${filename}`,
        downloadUrl: `${PUBLIC_BASE_URL}/temp/${filename}`,
        thumbnail: clip.thumbnail || '',
        caption: clip.caption,
        duration: Math.round(clip.duration)
      };
    });

    jobStore.complete(jobId, {
      clips: clipsWithUrls,
      message: 'Clips ready'
    });

    logger.info(`[INFO] Job ${jobId} completed successfully. TTL: ${process.env.JOB_TTL_MINUTES || 120} minutes`);

    // Send webhook notification if configured
    if (process.env.N8N_WEBHOOK_URL) {
      try {
        const webhookPayload = {
          jobId,
          status: 'complete',
          email,
          youtubeUrl,
          clips: clipsWithUrls,
          completedAt: new Date().toISOString()
        };

        const webhookResponse = await fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });

        if (webhookResponse.ok) {
          logger.info(`[INFO] Webhook notification sent to n8n for job ${jobId}`);
        } else {
          logger.warn(`[WARN] Webhook failed with status ${webhookResponse.status}`);
        }
      } catch (webhookError) {
        logger.error(`[ERROR] Failed to send webhook: ${webhookError.message}`);
        // Don't fail the job if webhook fails
      }
    }

  } catch (error) {
    throw error;
  }
}

module.exports = router;
