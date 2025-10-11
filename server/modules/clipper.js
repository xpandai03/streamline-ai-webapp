const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fileStore = require('../utils/fileStore');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

const USE_BLUR_BACKGROUND = process.env.USE_BLUR_BACKGROUND === 'true';
const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;

async function createClips(videoPath, highlights) {
  const clips = [];

  // Get source video aspect ratio once
  const aspectRatio = await getVideoAspectRatio(videoPath);
  logger.debug(`Source video aspect ratio: ${aspectRatio}`);

  for (let i = 0; i < highlights.length; i++) {
    const highlight = highlights[i];
    const clipId = uuidv4();
    const clipPath = await fileStore.getTempPath(`clip-${clipId}.mp4`);

    try {
      logger.info(`Creating clip ${i + 1}/${highlights.length}: ${highlight.start}s - ${highlight.end}s`);

      // Build filter chain based on aspect ratio
      const filterChain = buildFilterChain(aspectRatio);

      // Trim and crop to 9:16 vertical format
      const command = `ffmpeg -ss ${highlight.start} -to ${highlight.end} -i "${videoPath}" \
        -vf "${filterChain}" \
        -c:v libx264 -preset fast -crf 23 \
        -c:a aac -b:a 128k \
        -y "${clipPath}"`;

      logger.debug(`FFmpeg filter chain: ${filterChain}`);
      await execAsync(command, { maxBuffer: 50 * 1024 * 1024 });

      // Get clip duration
      const probeCommand = `ffprobe -v quiet -print_format json -show_format "${clipPath}"`;
      const { stdout } = await execAsync(probeCommand);
      const metadata = JSON.parse(stdout);
      const duration = parseFloat(metadata.format.duration || 0);

      clips.push({
        id: clipId,
        path: clipPath,
        start: highlight.start,
        end: highlight.end,
        caption: highlight.caption,
        duration
      });

      logger.info(`Clip created: ${clipPath} (${duration.toFixed(1)}s)`);
    } catch (error) {
      logger.error(`Failed to create clip ${i + 1}:`, error);
      // Continue with other clips
    }
  }

  if (clips.length === 0) {
    throw new Error('No clips were created');
  }

  return clips;
}

async function getVideoAspectRatio(videoPath) {
  try {
    const command = `ffprobe -v quiet -print_format json -show_streams -select_streams v:0 "${videoPath}"`;
    const { stdout } = await execAsync(command);
    const metadata = JSON.parse(stdout);

    const stream = metadata.streams[0];
    const width = stream.width;
    const height = stream.height;

    return width / height;
  } catch (error) {
    logger.error('Failed to get aspect ratio:', error);
    return 16 / 9; // Default to widescreen
  }
}

function buildFilterChain(aspectRatio) {
  const targetRatio = TARGET_WIDTH / TARGET_HEIGHT; // 1080/1920 = 0.5625 (9:16)

  // Check if input is already 9:16 (within 1% tolerance)
  if (Math.abs(aspectRatio - targetRatio) < 0.01) {
    logger.info('[INFO] Input is already 9:16, using passthrough scaling');
    return `scale=${TARGET_WIDTH}:${TARGET_HEIGHT},setsar=1`;
  }

  if (aspectRatio <= 1.0) {
    // Portrait or square video - scale to fill height, crop width if needed
    logger.debug('Portrait/Square mode: scaling to fill frame');

    if (aspectRatio >= targetRatio) {
      // Video is wider than target - scale by height and crop sides
      return `scale=-1:${TARGET_HEIGHT},crop=${TARGET_WIDTH}:${TARGET_HEIGHT},setsar=1`;
    } else {
      // Video is narrower than target - scale by width and crop top/bottom
      return `scale=${TARGET_WIDTH}:-1,crop=${TARGET_WIDTH}:${TARGET_HEIGHT},setsar=1`;
    }
  } else {
    // Landscape video - needs smart cropping
    logger.debug('Landscape mode: zoom-crop with face centering');

    if (USE_BLUR_BACKGROUND) {
      // Blur background fill mode (like CapCut/Opus)
      return buildBlurBackgroundFilter();
    } else {
      // Zoom-crop mode - fills frame by cropping horizontally
      // Scale to fill height, then crop width from center with slight upward bias for faces
      return `scale=-1:${TARGET_HEIGHT},crop=${TARGET_WIDTH}:${TARGET_HEIGHT}:(in_w-${TARGET_WIDTH})/2:0,setsar=1`;
    }
  }
}

function buildBlurBackgroundFilter() {
  // Advanced filter: blurred background with centered subject
  // 1. Split input into two streams
  // 2. First stream: blur and scale to fill frame
  // 3. Second stream: scale subject proportionally and overlay center

  return `split[bg][fg]; \
[bg]scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=increase,crop=${TARGET_WIDTH}:${TARGET_HEIGHT},boxblur=20:5[blurred]; \
[fg]scale=${TARGET_WIDTH}:-1:force_original_aspect_ratio=decrease[scaled]; \
[blurred][scaled]overlay=(W-w)/2:(H-h)/2,setsar=1`;
}

module.exports = { createClips };
