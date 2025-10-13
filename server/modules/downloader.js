const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const fileStore = require('../utils/fileStore');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

async function downloadVideo(youtubeUrl) {
  // Validate YouTube URL
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  if (!youtubeRegex.test(youtubeUrl)) {
    throw new Error('Invalid YouTube URL');
  }

  const outputTemplate = await fileStore.getTempPath('video-%(id)s.%(ext)s');
  const outputDir = path.dirname(outputTemplate);

  try {
    logger.info(`[DOWNLOADER] Starting download for: ${youtubeUrl}`);
    logger.info(`[DOWNLOADER] Output template: ${outputTemplate}`);

    // Download with yt-dlp
    const command = `yt-dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" \
      --merge-output-format mp4 \
      --no-playlist \
      -o "${outputTemplate}" \
      "${youtubeUrl}"`;

    logger.info(`[DOWNLOADER] Executing command: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024
    });

    logger.info('[DOWNLOADER] yt-dlp command completed successfully');
    logger.debug('[DOWNLOADER] yt-dlp stdout:', stdout);
    if (stderr) {
      logger.debug('[DOWNLOADER] yt-dlp stderr:', stderr);
    }

    // Find downloaded file
    const files = await fs.readdir(outputDir);
    const videoFile = files.find(f => f.startsWith('video-') && f.endsWith('.mp4'));

    if (!videoFile) {
      throw new Error('Video download failed - file not found');
    }

    const videoPath = path.join(outputDir, videoFile);

    // Check file size
    const stats = await fs.stat(videoPath);
    if (stats.size > MAX_FILE_SIZE) {
      await fs.unlink(videoPath);
      throw new Error('Video too large (max 500MB)');
    }

    // Get metadata
    logger.info('[DOWNLOADER] Extracting metadata with ffprobe...');
    const metadataCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
    const { stdout: metadataJson } = await execAsync(metadataCommand);
    logger.info('[DOWNLOADER] ffprobe command completed successfully');
    const metadata = JSON.parse(metadataJson);

    const duration = parseFloat(metadata.format.duration || 0);
    const title = metadata.format.tags?.title || 'Untitled';

    logger.info(`Video downloaded: ${videoPath} (${(stats.size / 1024 / 1024).toFixed(2)}MB, ${duration.toFixed(1)}s)`);

    return {
      path: videoPath,
      metadata: {
        duration,
        title,
        size: stats.size
      }
    };
  } catch (error) {
    logger.error('[DOWNLOADER] Download failed:', error.message);
    logger.error('[DOWNLOADER] Error stack:', error.stack);
    logger.error('[DOWNLOADER] Error code:', error.code);

    // Provide more specific error messages
    if (error.message.includes('yt-dlp') || error.code === 'ENOENT') {
      throw new Error('yt-dlp is not installed or not in PATH. Video download failed.');
    }
    if (error.message.includes('ffprobe')) {
      throw new Error('ffprobe is not installed or not in PATH. Metadata extraction failed.');
    }

    throw new Error(`Download failed: ${error.message}`);
  }
}

module.exports = { downloadVideo };
