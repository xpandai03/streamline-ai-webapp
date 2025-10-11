const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const fileStore = require('../utils/fileStore');
const logger = require('../utils/logger');

const execAsync = promisify(exec);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractAudio(videoPath) {
  const audioPath = videoPath.replace('.mp4', '.wav');

  try {
    logger.info('Extracting audio...');

    const command = `ffmpeg -i "${videoPath}" -vn -ar 16000 -ac 1 -y "${audioPath}"`;
    await execAsync(command);

    logger.info(`Audio extracted: ${audioPath}`);
    return audioPath;
  } catch (error) {
    logger.error('Audio extraction failed:', error);
    throw new Error('Audio extraction failed');
  }
}

async function transcribe(audioPath) {
  const maxRetries = 3;
  const timeoutMs = 600000; // 10 minutes
  const startTime = Date.now();

  logger.info(`[INFO] 🎧 Starting transcription for: ${audioPath}`);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`[INFO] Transcription attempt ${attempt + 1}/${maxRetries + 1}`);
      logger.info(`[INFO] 🔑 OpenAI key present: ${!!process.env.OPENAI_API_KEY}`);

      // Verify file exists and get size
      const stats = fs.statSync(audioPath);
      const fileSizeMB = stats.size / 1024 / 1024;
      logger.info(`[INFO] 📏 File size: ${fileSizeMB.toFixed(2)} MB`);

      // Check file size limit (OpenAI has 25MB limit)
      if (fileSizeMB > 25) {
        logger.error(`[ERROR] Audio file too large (${fileSizeMB.toFixed(2)}MB). OpenAI Whisper API has a 25MB limit.`);
        throw new Error(`Audio file too large (${fileSizeMB.toFixed(2)}MB). OpenAI Whisper API has a 25MB limit.`);
      }

      const audioStream = fs.createReadStream(audioPath);

      logger.info('[INFO] 📡 Sending request to OpenAI Whisper API...');

      // Wrap Whisper call in Promise.race with timeout
      const response = await Promise.race([
        openai.audio.transcriptions.create({
          file: audioStream,
          model: 'whisper-1',
          response_format: 'verbose_json',
          timestamp_granularities: ['word']
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Transcription timeout after 10 minutes')), timeoutMs)
        )
      ]);

      const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.info(`[INFO] ✅ Stage: transcribe ✅ (duration: ${elapsedSeconds}s)`);

      if (!response.words || response.words.length === 0) {
        throw new Error('Transcription returned no words');
      }

      logger.info(`[INFO] ✅ Transcription complete: ${response.words.length} words`);

      // Convert to our format
      const transcript = {
        text: response.text,
        words: response.words.map(w => ({
          start: w.start,
          end: w.end,
          text: w.word.trim()
        }))
      };

      return transcript;
    } catch (error) {
      logger.error(`[ERROR] ❌ Transcription attempt ${attempt + 1} failed:`);
      logger.error(`[ERROR] Error type: ${error.constructor.name}`);
      logger.error(`[ERROR] Error message: ${error.message}`);

      if (error.code) {
        logger.error(`[ERROR] Error code: ${error.code}`);
      }

      // Log OpenAI-specific error details if available
      if (error.response) {
        logger.error(`[ERROR] API Response Status: ${error.response.status}`);
        logger.error(`[ERROR] API Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }

      if (error.status) {
        logger.error(`[ERROR] OpenAI Error Status: ${error.status}`);
      }

      // If this isn't the last attempt, wait with exponential backoff
      if (attempt < maxRetries) {
        const waitSeconds = 2 * (attempt + 1);
        logger.info(`[WARN] ⏳ Retrying transcription in ${waitSeconds} seconds (attempt ${attempt + 2}/${maxRetries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
        continue;
      }

      // All retries exhausted - create fallback transcript
      logger.error('[ERROR] All transcription attempts failed. Falling back to dummy transcript.');
      logger.warn('[WARN] Transcription failed --- using fallback.');

      const fallbackTranscript = createFallbackTranscript(audioPath);
      return fallbackTranscript;
    }
  }
}

function createFallbackTranscript(audioPath) {
  logger.info('[INFO] Creating fallback transcript placeholder');

  // Create minimal placeholder transcript
  const fallback = {
    text: "Fallback transcript placeholder due to Whisper API failure.",
    words: [
      { start: 0, end: 10, text: "Fallback" },
      { start: 10, end: 20, text: "transcript" },
      { start: 20, end: 30, text: "placeholder" },
      { start: 30, end: 40, text: "due" },
      { start: 40, end: 50, text: "to" },
      { start: 50, end: 60, text: "Whisper" },
      { start: 60, end: 70, text: "API" },
      { start: 70, end: 80, text: "failure" }
    ]
  };

  // Optionally save to disk for debugging
  try {
    const fallbackPath = audioPath.replace('.wav', '_transcript_fallback.json');
    fs.writeFileSync(fallbackPath, JSON.stringify(fallback, null, 2));
    logger.info(`[INFO] Fallback transcript saved to: ${fallbackPath}`);
  } catch (err) {
    logger.warn(`[WARN] Could not save fallback transcript to disk: ${err.message}`);
  }

  return fallback;
}

module.exports = {
  extractAudio,
  transcribe
};
