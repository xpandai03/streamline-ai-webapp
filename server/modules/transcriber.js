const { exec, spawn, execSync } = require('child_process');
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

async function compressAudio(inputPath, outputPath = null) {
  try {
    // Generate output path if not provided
    if (!outputPath) {
      const dir = path.dirname(inputPath);
      const ext = path.extname(inputPath);
      const basename = path.basename(inputPath, ext);
      outputPath = path.join(dir, `${basename}_compressed.ogg`);
    }

    logger.info(`[INFO] 🔧 Compressing audio: ${inputPath}`);
    logger.info(`[INFO] 📁 Output path: ${outputPath}`);

    // Get original file size
    const originalStats = fs.statSync(inputPath);
    const originalSizeMB = originalStats.size / 1024 / 1024;
    logger.info(`[INFO] 📏 Original file size: ${originalSizeMB.toFixed(2)} MB`);

    // Run ffmpeg compression
    const command = `ffmpeg -i "${inputPath}" -vn -map_metadata -1 -ac 1 -c:a libopus -b:a 12k -application voip "${outputPath}"`;
    
    logger.info('[INFO] 🎵 Running ffmpeg compression...');
    const { stdout, stderr } = execSync(command);

    // Log ffmpeg output if needed
    if (stderr) {
      logger.debug(`[DEBUG] ffmpeg output: ${stderr}`);
    }

    // Get compressed file size
    const compressedStats = fs.statSync(outputPath);
    const compressedSizeMB = compressedStats.size / 1024 / 1024;
    const compressionRatio = ((1 - compressedSizeMB / originalSizeMB) * 100).toFixed(1);
    
    logger.info(`[INFO] ✅ Compression complete`);
    logger.info(`[INFO] 📏 Compressed file size: ${compressedSizeMB.toFixed(2)} MB`);
    logger.info(`[INFO] 📊 Compression ratio: ${compressionRatio}% reduction`);

    return outputPath;
  } catch (error) {
    logger.error(`[ERROR] ❌ Audio compression failed: ${error.message}`);
    throw new Error(`Failed to compress audio: ${error.message}`);
  }
}

async function transcribe(audioPath) {
  const maxRetries = 3;
  const timeoutMs = 600000; // 10 minutes
  const startTime = Date.now();

  logger.info(`[INFO] 🎧 Starting transcription for: ${audioPath}`);

  // Check file size and compress if needed
  let processedAudioPath = audioPath;
  let shouldCleanup = false;

  try {
    const stats = fs.statSync(audioPath);
    const fileSizeMB = stats.size / 1024 / 1024;
    logger.info(`[INFO] 📏 File size: ${fileSizeMB.toFixed(2)} MB`);

    if (fileSizeMB > 25) {
      logger.info('[INFO] 🗜️ File exceeds 25MB limit, compressing...');
      processedAudioPath = await compressAudio(audioPath);
      shouldCleanup = true;

      // Verify compressed file is under limit
      const compressedStats = fs.statSync(processedAudioPath);
      const compressedSizeMB = compressedStats.size / 1024 / 1024;
      
      if (compressedSizeMB > 25) {
        throw new Error(`Compressed file still too large (${compressedSizeMB.toFixed(2)}MB)`);
      }
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[INFO] Transcription attempt ${attempt + 1}/${maxRetries + 1}`);
  logger.info(`[INFO] 🔑 OpenAI key present: ${!!process.env.OPENAI_API_KEY}`);

  const audioStream = fs.createReadStream(processedAudioPath);
  
  // Handle stream errors
  audioStream.on('error', (err) => {
    logger.error(`[ERROR] Audio stream error: ${err.message}`);
    throw err;
  });

  logger.info('[INFO] 📡 Sending request to OpenAI Whisper API...');

  const response = await Promise.race([
    openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word']
    }).finally(() => {
      // Ensure stream is closed
      if (!audioStream.destroyed) {
        audioStream.destroy();
      }
    }),
    new Promise((_, reject) =>
      setTimeout(() => {
        // Close stream on timeout
        if (!audioStream.destroyed) {
          audioStream.destroy();
        }
        reject(new Error(
          `Transcription timeout after ${timeoutMs / 1000 / 60} minutes (attempt ${attempt + 1})`
        ));
      }, timeoutMs)
    )
  ]);

  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info(`[INFO] ✅ Stage: transcribe ✅ (duration: ${elapsedSeconds}s)`);

  if (!response.words || response.words.length === 0) {
    throw new Error('Transcription returned no words');
  }

  logger.info(`[INFO] ✅ Transcription complete: ${response.words.length} words`);

  const transcript = {
    text: response.text,
    words: response.words.map(w => ({
      start: w.start,
      end: w.end,
      text: w.word.trim()
    })),
    duration: response.duration, // Include audio duration if available
    language: response.language  // Include detected language if available
  };

  return transcript;

      } catch (error) {
        console.log(error);
        logger.error(`[ERROR] ❌ Transcription attempt ${attempt + 1} failed:`);
        logger.error(`[ERROR] Error type: ${error.constructor.name}`);
        logger.error(`[ERROR] Error message: ${error.message}`);

        if (error.code) {
          logger.error(`[ERROR] Error code: ${error.code}`);
        }

        if (error.response) {
          logger.error(`[ERROR] API Response Status: ${error.response.status}`);
          logger.error(`[ERROR] API Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }

        if (error.status) {
          logger.error(`[ERROR] OpenAI Error Status: ${error.status}`);
        }

        if (attempt < maxRetries) {
          const waitSeconds = 2 * (attempt + 1);
          logger.info(`[WARN] ⏳ Retrying transcription in ${waitSeconds} seconds (attempt ${attempt + 2}/${maxRetries + 1})...`);
          await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
          continue;
        }

        logger.error('[ERROR] All transcription attempts failed. Falling back to dummy transcript.');
        logger.warn('[WARN] Transcription failed --- using fallback.');

        const fallbackTranscript = createFallbackTranscript(audioPath);
        return fallbackTranscript;
      }
    }
  } finally {
    // Clean up compressed file if it was created
    if (shouldCleanup && processedAudioPath !== audioPath) {
      try {
        fs.unlinkSync(processedAudioPath);
        logger.info('[INFO] 🗑️ Cleaned up compressed audio file');
      } catch (err) {
        logger.warn(`[WARN] Failed to clean up compressed file: ${err.message}`);
      }
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
