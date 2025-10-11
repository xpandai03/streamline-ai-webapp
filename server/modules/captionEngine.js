const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const os = require('os');
const fileStore = require('../utils/fileStore');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

const CAPTION_COLOR = process.env.CAPTION_COLOR || '#FFD600';
const CAPTION_FONT = process.env.CAPTION_FONT || 'Impact';

// Detect OS and set appropriate font path
function getDefaultFontPath() {
  const platform = os.platform();

  if (platform === 'darwin') {
    // macOS fonts (prioritize Impact for better readability)
    const macFonts = [
      '/System/Library/Fonts/Supplemental/Impact.ttf',
      '/Library/Fonts/Impact.ttf',
      '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
      '/System/Library/Fonts/Supplemental/Arial.ttf',
      '/Library/Fonts/Arial Bold.ttf',
      '/System/Library/Fonts/Helvetica.ttc'
    ];

    for (const fontPath of macFonts) {
      if (fs.existsSync(fontPath)) {
        logger.info(`[CAPTIONS] Font detected: ${fontPath}`);
        return fontPath;
      }
    }
    logger.warn('[CAPTIONS] No macOS fonts found in standard locations');
  } else if (platform === 'linux') {
    // Linux fonts
    const linuxFonts = [
      '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
      '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
      '/usr/share/fonts/TTF/Arial.ttf'
    ];

    for (const fontPath of linuxFonts) {
      if (fs.existsSync(fontPath)) {
        logger.info(`[CAPTIONS] Font detected: ${fontPath}`);
        return fontPath;
      }
    }
    logger.warn('[CAPTIONS] No Linux fonts found in standard locations');
  }

  // Fallback: use system default (no fontfile parameter)
  logger.warn('[CAPTIONS] No font file found, will use FFmpeg system default or skip captions');
  return null;
}

const DEFAULT_FONT_PATH = getDefaultFontPath();

async function addCaptions(clips, highlights, transcript) {
  const captionedClips = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const outputPath = await fileStore.getTempPath(`final-${clip.id}.mp4`);

    try {
      logger.info(`Adding captions to clip ${i + 1}/${clips.length}`);

      // Get words for this clip's time range
      const clipWords = getWordsInRange(transcript.words, clip.start, clip.end);

      if (clipWords.length === 0) {
        logger.warn(`No words found for clip ${i + 1}, using clip without captions`);
        captionedClips.push({ ...clip, path: clip.path });
        continue;
      }

      // Generate drawtext filters for kinetic captions
      const drawTextFilters = generateDrawTextFilters(clipWords, clip.start);

      // Apply captions with FFmpeg
      const filterComplex = drawTextFilters.join(',');
      const command = `ffmpeg -i "${clip.path}" \
        -vf "${filterComplex}" \
        -c:v libx264 -preset fast -crf 23 \
        -c:a copy \
        -y "${outputPath}"`;

      await execAsync(command, { maxBuffer: 50 * 1024 * 1024 });

      captionedClips.push({
        ...clip,
        path: outputPath,
        thumbnail: outputPath.replace('.mp4', '.jpg')
      });

      // Generate thumbnail
      await generateThumbnail(outputPath, outputPath.replace('.mp4', '.jpg'));

      logger.info(`Captions added: ${outputPath}`);
    } catch (error) {
      logger.error(`[CAPTIONS] Clip ${i + 1} failed: ${error.message}`);
      logger.warn(`[CAPTIONS] Using uncaptioned clip as fallback`);
      // ALWAYS push the original clip as fallback
      captionedClips.push({ ...clip, path: clip.path });
    }
  }

  return captionedClips;
}

function getWordsInRange(words, startTime, endTime) {
  return words
    .filter(w => w.start >= startTime && w.end <= endTime)
    .map(w => ({
      ...w,
      start: w.start - startTime, // Adjust to clip time
      end: w.end - startTime
    }));
}

function generateDrawTextFilters(words, clipStart) {
  // Group words into 2-4 word chunks for better readability
  const chunks = groupWordsIntoChunks(words, 3);

  const filters = [];

  for (const chunk of chunks) {
    const text = chunk.words.map(w => w.text).join(' ');
    const start = chunk.start;
    const end = chunk.end;

    // Escape special characters for FFmpeg
    const escapedText = text
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/:/g, '\\:')
      .replace(/,/g, '\\,');

    // Kinetic caption with fade in/out
    let filter = `drawtext=text='${escapedText}':`;

    // Add fontfile parameter only if a valid font path was found
    if (DEFAULT_FONT_PATH) {
      filter += `fontfile=${DEFAULT_FONT_PATH}:`;
    }

    filter += `fontsize=60:` +
      `fontcolor=${CAPTION_COLOR}:` +
      `borderw=3:bordercolor=black:` +
      `x=(w-text_w)/2:` +
      `y=h*0.75:` +
      `enable='between(t,${start.toFixed(3)},${end.toFixed(3)})':` +
      `alpha='if(lt(t,${(start + 0.15).toFixed(3)}),(t-${start.toFixed(3)})/0.15,if(gt(t,${(end - 0.1).toFixed(3)}),1-(t-${(end - 0.1).toFixed(3)})/0.1,1))'`;

    filters.push(filter);
  }

  return filters;
}

function groupWordsIntoChunks(words, maxWords = 3) {
  const chunks = [];
  let currentChunk = { words: [], start: 0, end: 0 };

  for (const word of words) {
    if (currentChunk.words.length === 0) {
      currentChunk = { words: [word], start: word.start, end: word.end };
    } else if (currentChunk.words.length < maxWords) {
      currentChunk.words.push(word);
      currentChunk.end = word.end;
    } else {
      chunks.push({ ...currentChunk });
      currentChunk = { words: [word], start: word.start, end: word.end };
    }
  }

  if (currentChunk.words.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

async function generateThumbnail(videoPath, thumbnailPath) {
  try {
    const command = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=1080:1920" -y "${thumbnailPath}"`;
    await execAsync(command);
    logger.debug(`Thumbnail generated: ${thumbnailPath}`);
  } catch (error) {
    logger.error('Thumbnail generation failed:', error);
  }
}

module.exports = { addCaptions };
