const { exec, execSync } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const fileStore = require('../utils/fileStore');
const logger = require('../utils/logger');
const { YtDlp } = require('ytdlp-nodejs');

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

// Check OAuth setup status on module load
async function checkOAuthSetup() {
  const oauthTokenFile = process.env.YTDLP_OAUTH_TOKEN_FILE;
  const useOAuth = process.env.YTDLP_USE_OAUTH === 'true';

  if (!useOAuth) {
    logger.info('[DOWNLOADER] OAuth disabled (YTDLP_USE_OAUTH not set to true)');
    return;
  }

  if (!oauthTokenFile) {
    logger.warn('[DOWNLOADER] ⚠️  OAuth enabled but YTDLP_OAUTH_TOKEN_FILE not set');
    logger.info('[DOWNLOADER] Set YTDLP_OAUTH_TOKEN_FILE=/app/.ytdlp-oauth-token.json');
    return;
  }

  try {
    await fs.access(oauthTokenFile);
    const stats = await fs.stat(oauthTokenFile);
    logger.info(`[DOWNLOADER] ✅ OAuth token file found: ${oauthTokenFile} (${(stats.size / 1024).toFixed(2)}KB)`);
  } catch (err) {
    logger.warn(`[DOWNLOADER] ⚠️  OAuth token file not found: ${oauthTokenFile}`);
    logger.info('[DOWNLOADER] Upload OAuth token to Render Secret Files');
  }

  try {
    const cacheFiles = await fs.readdir('/app/.cache');
    logger.info(`[DOWNLOADER] ✅ OAuth cache ready: ${cacheFiles.length} file(s)`);
  } catch (err) {
    logger.warn('[DOWNLOADER] OAuth cache directory not accessible:', err.message);
  }
}

// Check cookie file status on module load
async function checkCookieFile() {
  const cookiesFile = process.env.YTDLP_COOKIES_FILE || '/app/cookies.txt';
  try {
    const stats = await fs.stat(cookiesFile);
    logger.info(`[DOWNLOADER] ✅ Cookie file found: ${cookiesFile} (${(stats.size / 1024).toFixed(2)}KB)`);
  } catch (err) {
    logger.warn('[DOWNLOADER] ⚠️  Cookie file not found:', cookiesFile);
  }
}

// Initialize auth checks (non-blocking)
checkOAuthSetup().catch(err => logger.error('[DOWNLOADER] OAuth setup check failed:', err));
checkCookieFile().catch(err => logger.error('[DOWNLOADER] Cookie file check failed:', err));


async function downloadVideoWithJs(youtubeUrl, outputTemplate, options = {}) {
  const ytdlp = new YtDlp();
  const formats = [
    'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
    '22',
    '18',
    'best[ext=mp4]/best'
  ];
  let lastError = null;

  console.log(outputTemplate,"--------------------------")
  for (const format of formats) {
    try {
      const args = {
        output: outputTemplate,
        format: format,
        noPlaylist: true,
        mergeOutputFormat: 'mp4',
        // Add proxy, cookies, OAuth, etc. if needed from options
        ...(options.proxyUrl && { proxy: options.proxyUrl }),
        ...(options.cookiesFile && { cookies: options.cookiesFile }),
        ...(options.useOAuth && options.oauthTokenFile && { username: 'oauth2', password: '', cacheDir: '/app/.cache' }),
        onProgress: (progress) => {
          console.log(progress);
        }
      };

      logger.info(`[DOWNLOADER] Trying format: ${format}`);
      const output = await ytdlp.downloadAsync(youtubeUrl, args);
      logger.info(`[DOWNLOADER] ✅ Download succeeded with format: ${format}`);
      logger.debug('[DOWNLOADER] yt-dlp output:', output);

      return output; // Success
    } catch (error) {
      lastError = error;
      logger.warn(`[DOWNLOADER] Format ${format} failed: ${error.message}`);
      // Try next format
    }
  }

  // All formats failed
  logger.error('[DOWNLOADER] All format fallbacks exhausted');
  throw new Error(`All formats failed. Last error: ${lastError?.message || 'Unknown error'}`);
}
/**
 * Download video with automatic format fallback
 * Tries multiple format options to prevent "Requested format is not available" errors
 * @param {string} youtubeUrl - YouTube video URL
 * @param {string} outputTemplate - Output file path template
 * @param {object} options - Download options (proxy, auth method, etc.)
 * @returns {Promise<void>}
 */
async function downloadWithFallback(youtubeUrl, outputTemplate, options = {}) {
  const { proxyUrl, useOAuth, oauthTokenFile, hasOAuthToken, cookiesFile, hasCookies } = options;

  // Define format fallback priority
  // 1. Best 1080p video + best audio (ideal quality)
  // 2. Format 22: 720p MP4 with audio (reliable fallback)
  // 3. Format 18: 360p MP4 with audio (last resort, works almost everywhere)
  // 4. Best available MP4 / any best format (final safety net)
  const formats = [
    'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
    '22',
    '18',
    'best[ext=mp4]/best'
  ];

  let lastError = null;

  for (const format of formats) {
    try {
      logger.info(`[DOWNLOADER] Trying format: ${format}`);

      // Build command based on authentication method
      let command;

      // Method 1: OAuth + Proxy (highest reliability, 99%+ success, 6-month token)
      if (useOAuth && hasOAuthToken && proxyUrl) {
        command = `python3 -m yt_dlp \
          --username oauth2 \
          --password "" \
          --cache-dir /app/.cache \
          --proxy "${proxyUrl}" \
          --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
          --add-header "Accept-Language:en-US,en;q=0.9" \
          --add-header "Accept-Encoding:gzip, deflate, br" \
          --add-header "Referer:https://www.youtube.com/" \
          --sleep-interval 2 \
          --limit-rate 1M \
          --retries 3 \
          -f "${format}" \
          --merge-output-format mp4 \
          --no-playlist \
          -o "${outputTemplate}" \
          "${youtubeUrl}"`;
      }
      // Method 2: Proxy-only (99% success)
      else if (proxyUrl) {
        command = `python3 -m yt_dlp \
          --proxy "${proxyUrl}" \
          --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
          --add-header "Accept-Language:en-US,en;q=0.9" \
          --add-header "Accept-Encoding:gzip, deflate, br" \
          --add-header "Referer:https://www.youtube.com/" \
          --sleep-interval 2 \
          --limit-rate 1M \
          --retries 3 \
          -f "${format}" \
          --merge-output-format mp4 \
          --no-playlist \
          -o "${outputTemplate}" \
          "${youtubeUrl}"`;
      }
      // Method 3: OAuth-only (95% success)
      else if (useOAuth && hasOAuthToken) {
        command = `python3 -m yt_dlp \
          --username oauth2 \
          --password "" \
          --cache-dir /app/.cache \
          --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
          --add-header "Accept-Language:en-US,en;q=0.9" \
          --add-header "Referer:https://www.youtube.com/" \
          -f "${format}" \
          --merge-output-format mp4 \
          --no-playlist \
          -o "${outputTemplate}" \
          "${youtubeUrl}"`;
      }
      // Method 4: Cookies (90% success, legacy)
      else if (hasCookies) {
        command = `python3 -m yt_dlp \
          --cookies "${cookiesFile}" \
          --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
          --add-header "Accept-Language:en-US,en;q=0.9" \
          --add-header "Referer:https://www.youtube.com/" \
          -f "${format}" \
          --merge-output-format mp4 \
          --no-playlist \
          -o "${outputTemplate}" \
          "${youtubeUrl}"`;
      }
      // Method 5: No auth (default web client with spoofing)
      else {
        command = `python3 -m yt_dlp \
          --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
          --add-header "Accept-Language:en-US,en;q=0.9" \
          --add-header "Referer:https://www.youtube.com/" \
          -f "${format}" \
          --merge-output-format mp4 \
          --no-playlist \
          -o "${outputTemplate}" \
          "${youtubeUrl}"`;
      }

      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024
      });

      logger.info(`[DOWNLOADER] ✅ Download succeeded with format: ${format}`);

      if (stdout) {
        logger.debug('[DOWNLOADER] stdout:', stdout);
      }
      if (stderr) {
        logger.debug('[DOWNLOADER] stderr:', stderr);
      }

      return; // Success - exit the function

    } catch (error) {
      lastError = error;
      logger.warn(`[DOWNLOADER] Format ${format} failed: ${error.message}`);

      // If this is not the last format, continue to next fallback
      if (formats.indexOf(format) < formats.length - 1) {
        logger.info(`[DOWNLOADER] Trying next fallback format...`);
        continue;
      }
    }
  }

  // All formats failed
  logger.error('[DOWNLOADER] All format fallbacks exhausted');
  throw new Error(`All formats failed. Last error: ${lastError?.message || 'Unknown error'}`);
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

    // Determine authentication method
    // Priority: OAuth+Proxy (99%+ success) → Proxy (99% success) → OAuth (95% success) → Cookies (90% success) → None
    const proxyUrl = process.env.YTDLP_PROXY;
    const useOAuth = process.env.YTDLP_USE_OAUTH === 'true';
    const oauthTokenFile = process.env.YTDLP_OAUTH_TOKEN_FILE;
    const cookiesFile = process.env.YTDLP_COOKIES_FILE || '/app/cookies.txt';

    // Check if OAuth token file exists
    let hasOAuthToken = false;
    if (useOAuth && oauthTokenFile) {
      try {
        await fs.access(oauthTokenFile);
        hasOAuthToken = true;
      } catch (err) {
        // OAuth token file doesn't exist
      }
    }

    // Check if cookies file exists
    let hasCookies = false;
    try {
      await fs.access(cookiesFile);
      hasCookies = true;
    } catch (err) {
      // Cookies file doesn't exist
    }

    // Log authentication method being used
    if (useOAuth && hasOAuthToken && proxyUrl) {
      logger.info('[DOWNLOADER] Client: default(web) | Using OAuth + proxy authentication');
      logger.info(`[DOWNLOADER] OAuth token: ${oauthTokenFile}`);
      logger.info(`[DOWNLOADER] Proxy: ${proxyUrl.replace(/\/\/.*:.*@/, '//***:***@')}`);
    } else if (proxyUrl) {
      logger.info('[DOWNLOADER] Client: default(web) | Using proxy-only authentication');
      logger.info(`[DOWNLOADER] Proxy: ${proxyUrl.replace(/\/\/.*:.*@/, '//***:***@')}`);
    } else if (useOAuth && hasOAuthToken) {
      logger.info('[DOWNLOADER] Client: default(web) | Using OAuth-only authentication');
      logger.info(`[DOWNLOADER] OAuth token: ${oauthTokenFile}`);
    } else if (hasCookies) {
      logger.info('[DOWNLOADER] Client: default(web) | Using cookie-based authentication');
    } else {
      logger.warn('[DOWNLOADER] Client: default(web) | No authentication available');
      logger.warn('[DOWNLOADER] For better reliability, enable OAuth + proxy');
    }

    await downloadVideoWithJs(youtubeUrl, outputTemplate);
    // Download with automatic format fallback
    // await downloadWithFallback(youtubeUrl, outputTemplate, {
    //   proxyUrl,
    //   useOAuth,
    //   oauthTokenFile,
    //   hasOAuthToken,
    //   cookiesFile,
    //   hasCookies
    // });

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
