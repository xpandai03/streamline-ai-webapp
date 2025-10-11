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
    logger.info(`Downloading video: ${youtubeUrl}`);

    // Download with yt-dlp
    const command = `yt-dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" \
      --merge-output-format mp4 \
      --no-playlist \
      -o "${outputTemplate}" \
      "${youtubeUrl}"`;

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024
    });

    logger.debug('yt-dlp output:', stdout);

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
    const metadataCommand = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
    const { stdout: metadataJson } = await execAsync(metadataCommand);
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
    logger.error('Download failed:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
}

module.exports = { downloadVideo };
