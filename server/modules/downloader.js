const { exec, execSync } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const fileStore = require('../utils/fileStore');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

// Find absolute paths to yt-dlp and ffprobe
// Try multiple common locations
const POSSIBLE_YTDLP_PATHS = [
  '/usr/local/bin/yt-dlp',
  '/usr/bin/yt-dlp',
  'yt-dlp'
];

const POSSIBLE_FFPROBE_PATHS = [
  '/usr/bin/ffprobe',
  '/usr/local/bin/ffprobe',
  'ffprobe'
];

let YTDLP_PATH = 'yt-dlp';
let FFPROBE_PATH = 'ffprobe';

// Find yt-dlp
for (const path of POSSIBLE_YTDLP_PATHS) {
  try {
    execSync(`${path} --version`, { encoding: 'utf8', stdio: 'pipe' });
    YTDLP_PATH = path;
    logger.info(`[DOWNLOADER] Found yt-dlp at: ${YTDLP_PATH}`);
    break;
  } catch (e) {
    // Try next path
  }
}

// Find ffprobe
for (const path of POSSIBLE_FFPROBE_PATHS) {
  try {
    execSync(`${path} -version`, { encoding: 'utf8', stdio: 'pipe' });
    FFPROBE_PATH = path;
    logger.info(`[DOWNLOADER] Found ffprobe at: ${FFPROBE_PATH}`);
    break;
  } catch (e) {
    // Try next path
  }
}

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

    // DIAGNOSTIC: Log subprocess environment
    try {
      const { stdout: pathCheck } = await execAsync('echo $PATH', {
        env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/usr/bin` }
      });
      logger.info(`[DIAGNOSTIC] Subprocess PATH: ${pathCheck.trim()}`);

      const { stdout: pythonCheck } = await execAsync('python3 -c "import yt_dlp; print(yt_dlp.__version__)"', {
        env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/usr/bin` }
      });
      logger.info(`[DIAGNOSTIC] Python3 can import yt_dlp: ${pythonCheck.trim()}`);
    } catch (diagError) {
      logger.error(`[DIAGNOSTIC] Pre-flight check failed: ${diagError.message}`);
    }

    // Triple fallback strategy: try 3 methods in sequence
    const ytdlpCommands = [
      {
        name: 'Direct yt-dlp binary',
        command: `yt-dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" --merge-output-format mp4 --no-playlist -o "${outputTemplate}" "${youtubeUrl}"`
      },
      {
        name: 'Python3 module invocation',
        command: `python3 -m yt_dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" --merge-output-format mp4 --no-playlist -o "${outputTemplate}" "${youtubeUrl}"`
      },
      {
        name: 'Absolute path via symlink',
        command: `/usr/bin/yt-dlp -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]" --merge-output-format mp4 --no-playlist -o "${outputTemplate}" "${youtubeUrl}"`
      }
    ];

    let lastError = null;
    let stdout = null;
    let stderr = null;

    for (const { name, command } of ytdlpCommands) {
      try {
        logger.info(`[DOWNLOADER] Trying method: ${name}`);
        logger.info(`[DOWNLOADER] Command: ${command}`);

        const result = await execAsync(command, {
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin' }
        });

        stdout = result.stdout;
        stderr = result.stderr;

        logger.info(`[DOWNLOADER] ✅ SUCCESS with method: ${name}`);
        logger.debug('[DOWNLOADER] stdout:', stdout);
        if (stderr) {
          logger.debug('[DOWNLOADER] stderr:', stderr);
        }

        // Success! Break out of loop
        lastError = null;
        break;
      } catch (error) {
        logger.warn(`[DOWNLOADER] ❌ Method "${name}" failed: ${error.message}`);
        logger.debug(`[DOWNLOADER] Error details:`, error);
        lastError = error;
        // Continue to next method
      }
    }

    // If all methods failed, throw the last error
    if (lastError) {
      throw lastError;
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
    const metadataCommand = `${FFPROBE_PATH} -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
    const { stdout: metadataJson } = await execAsync(metadataCommand, {
      env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/usr/bin` }
    });
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
    if (error.stderr) {
      logger.error('[DOWNLOADER] Error stderr:', error.stderr);
    }
    if (error.stdout) {
      logger.error('[DOWNLOADER] Error stdout:', error.stdout);
    }

    // Pass through the actual error message instead of masking it
    throw new Error(`Download failed: ${error.message}`);
  }
}

module.exports = { downloadVideo };
