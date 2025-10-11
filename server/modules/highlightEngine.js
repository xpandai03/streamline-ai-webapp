const OpenAI = require('openai');
const logger = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const NUM_CLIPS = parseInt(process.env.NUM_CLIPS || '3');
const CLIP_MIN = parseInt(process.env.CLIP_LENGTH_MIN || '30');
const CLIP_MAX = parseInt(process.env.CLIP_LENGTH_MAX || '60');
const USE_GPT_HIGHLIGHTS = process.env.USE_GPT_HIGHLIGHTS === 'true';

const SEMANTIC_HIGHLIGHT_PROMPT = `You are an expert video editor specializing in creating engaging short-form content.

Your task: Identify self-contained idea segments from a long-form video transcript where the speaker completes a full argument, insight, or emotional expression.

Requirements:
1. Each clip must be between 30 and 60 seconds
2. Each clip should capture a complete thought or narrative arc
3. Clips must start and end at natural sentence boundaries (no mid-sentence cuts)
4. Identify 2-4 segments per 10 minutes of video
5. Prioritize segments with:
   - Emotional intensity or energy shifts
   - Clear hooks or opening statements
   - Complete stories or arguments
   - Impactful conclusions or takeaways
6. Avoid segments with excessive filler words or long pauses
7. Each segment should stand alone and make sense without prior context

Return ONLY valid JSON in this exact format:
{
  "clips": [
    {
      "start": 12.5,
      "end": 58.3,
      "caption": "Brief description of the key idea (10-15 words)",
      "energy_score": 8.5
    }
  ]
}

Rules:
- start/end must be precise timestamps (seconds with 1 decimal)
- caption should summarize the main point, not transcribe
- energy_score: 0-10 rating of emotional intensity/engagement
- Return 2-4 clips maximum
- No overlapping timestamps
- Minimum 10 seconds between clips`;

async function detectHighlights(transcript, metadata) {
  const startTime = Date.now();

  // Guard clause: Check for empty or invalid transcript
  if (!transcript || !transcript.words || transcript.words.length === 0) {
    logger.warn('[WARN] Empty transcript --- generating 0-60s fallback highlight');
    return [{
      start: 0,
      end: 60,
      caption: 'Fallback highlight due to empty transcript',
      energy_score: 5.0
    }];
  }

  logger.info(`[INFO] Transcript contains ${transcript.words.length} words`);
  logger.info(`[HIGHLIGHTS] Mode: ${USE_GPT_HIGHLIGHTS ? 'GPT' : 'Deterministic'}`);

  // If GPT mode is disabled, use deterministic heuristics immediately
  if (!USE_GPT_HIGHLIGHTS) {
    logger.info('[INFO] Using deterministic heuristic detection (GPT disabled)');
    return fallbackHighlightDetection(transcript, metadata);
  }

  try {
    logger.info('[INFO] Detecting semantic highlights with GPT...');

    // Group words into sentence-like segments (15-20 second chunks for better context)
    const segments = groupWordsIntoSemanticSegments(transcript.words, 15);
    logger.info(`[INFO] Grouped transcript into ${segments.length} semantic segments`);

    // Wrap GPT call with timeout (2 minutes)
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SEMANTIC_HIGHLIGHT_PROMPT },
          {
            role: 'user',
            content: JSON.stringify({
              transcript_segments: segments,
              total_duration: metadata.duration,
              video_title: metadata.title
            })
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('GPT highlight detection timeout after 2 minutes')), 120000)
      )
    ]);

    logger.info('[INFO] GPT response received');

    // Safe JSON parsing
    let result;
    try {
      const rawContent = completion.choices[0].message.content;
      logger.info(`[INFO] Raw GPT response length: ${rawContent.length} characters`);
      result = JSON.parse(rawContent);
    } catch (parseError) {
      logger.error(`[ERROR] Failed to parse GPT response: ${parseError.message}`);
      logger.warn('[WARN] Using fallback due to JSON parse error');
      return fallbackHighlightDetection(transcript, metadata);
    }

    if (!result.clips || result.clips.length === 0) {
      logger.warn('[WARN] GPT returned no clips, using fallback');
      return fallbackHighlightDetection(transcript, metadata);
    }

    logger.info(`[INFO] GPT returned ${result.clips.length} candidate clips`);

    // Post-process clips
    let processedClips = result.clips
      .filter(clip => {
        const duration = clip.end - clip.start;
        return duration >= CLIP_MIN && duration <= CLIP_MAX;
      })
      .map(clip => ({
        start: Math.round(clip.start * 10) / 10,
        end: Math.round(clip.end * 10) / 10,
        caption: clip.caption || 'Highlight',
        energy_score: clip.energy_score || 7.0
      }))
      .sort((a, b) => b.energy_score - a.energy_score) // Sort by energy score
      .slice(0, NUM_CLIPS);

    // Merge or extend short clips
    processedClips = ensureMinimumDuration(processedClips, transcript.words, metadata.duration);

    // Split overly long clips
    processedClips = splitLongClips(processedClips, transcript.words);

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.info(`[INFO] ✅ Stage: highlights ✅ (${processedClips.length} segments) (duration: ${elapsedSeconds}s)`);

    processedClips.forEach((clip, i) => {
      logger.debug(`[DEBUG] Clip ${i + 1}: ${clip.start}s - ${clip.end}s (${(clip.end - clip.start).toFixed(1)}s) - Energy: ${clip.energy_score}`);
    });

    return processedClips;
  } catch (error) {
    logger.error(`[ERROR] Highlight detection failed: ${error.message}`);
    logger.error(`[ERROR] Error stack: ${error.stack}`);
    logger.warn('[WARN] Highlight extraction failed --- using fallback.');
    return fallbackHighlightDetection(transcript, metadata);
  }
}

function groupWordsIntoSemanticSegments(words, segmentDuration = 15) {
  const segments = [];
  let currentSegment = { start: 0, end: 0, text: '' };

  for (const word of words) {
    if (word.start - currentSegment.start >= segmentDuration) {
      if (currentSegment.text) {
        segments.push({ ...currentSegment });
      }
      currentSegment = { start: word.start, end: word.end, text: word.text };
    } else {
      currentSegment.end = word.end;
      currentSegment.text += ' ' + word.text;
    }
  }

  if (currentSegment.text) {
    segments.push(currentSegment);
  }

  return segments;
}

function ensureMinimumDuration(clips, words, maxDuration) {
  return clips.map(clip => {
    const duration = clip.end - clip.start;

    if (duration < CLIP_MIN) {
      // Extend to minimum duration by finding natural sentence boundary
      const extension = CLIP_MIN - duration;
      const newEnd = Math.min(clip.end + extension, maxDuration);

      logger.debug(`Extending short clip from ${duration.toFixed(1)}s to ${(newEnd - clip.start).toFixed(1)}s`);

      return { ...clip, end: newEnd };
    }

    return clip;
  });
}

function splitLongClips(clips, words) {
  const result = [];

  for (const clip of clips) {
    const duration = clip.end - clip.start;

    if (duration > CLIP_MAX) {
      // Split at natural pause point (around 45s mark)
      const splitPoint = clip.start + 45;

      // Find nearest sentence boundary
      const nearestBoundary = findNearestSentenceBoundary(words, splitPoint);

      if (nearestBoundary && nearestBoundary > clip.start + 30 && nearestBoundary < clip.end - 30) {
        logger.debug(`Splitting long clip (${duration.toFixed(1)}s) at ${nearestBoundary}s`);

        result.push({
          ...clip,
          end: nearestBoundary,
          caption: clip.caption + ' (Part 1)'
        });

        result.push({
          ...clip,
          start: nearestBoundary,
          caption: clip.caption + ' (Part 2)',
          energy_score: clip.energy_score - 0.5 // Slightly lower score for part 2
        });
      } else {
        // Can't split cleanly, just trim to max duration
        result.push({ ...clip, end: clip.start + CLIP_MAX });
      }
    } else {
      result.push(clip);
    }
  }

  return result;
}

function findNearestSentenceBoundary(words, targetTime) {
  // Find words around target time and look for sentence-ending punctuation
  const nearbyWords = words.filter(w =>
    Math.abs(w.start - targetTime) < 5
  );

  for (const word of nearbyWords) {
    if (word.text.match(/[.!?]$/)) {
      return word.end;
    }
  }

  // Fallback: find pause (gap between words)
  for (let i = 0; i < words.length - 1; i++) {
    const gap = words[i + 1].start - words[i].end;
    if (gap > 0.5 && Math.abs(words[i].end - targetTime) < 3) {
      return words[i].end;
    }
  }

  return null;
}

function fallbackHighlightDetection(transcript, metadata) {
  logger.info('[INFO] Using semantic fallback detection');

  // Additional guard: if transcript is still empty/invalid, return basic fallback
  if (!transcript || !transcript.words || transcript.words.length === 0) {
    logger.warn('[WARN] Transcript empty in fallback, returning basic 0-60s clip');
    return [{
      start: 0,
      end: Math.min(60, metadata.duration || 60),
      caption: 'Fallback highlight',
      energy_score: 5.0
    }];
  }

  const segments = groupWordsIntoSemanticSegments(transcript.words, 30);

  // Score segments by keyword density and length
  const scoredSegments = segments.map(seg => {
    let score = 5.0; // Base score
    const lowerText = seg.text.toLowerCase();
    const duration = seg.end - seg.start;

    // Prefer longer segments
    if (duration >= 30 && duration <= 60) {
      score += 2.0;
    }

    // Boost for emotional keywords
    const emotionalWords = ['insane', 'amazing', 'crazy', 'unbelievable', 'incredible', 'never', 'always', 'everything', 'nothing'];
    for (const word of emotionalWords) {
      if (lowerText.includes(word)) {
        score += 0.5;
      }
    }

    // Boost for question words (engagement)
    if (lowerText.match(/\b(what|why|how|when|who)\b/g)) {
      score += 0.3;
    }

    // Penalize filler-heavy segments
    const fillerCount = (lowerText.match(/\b(um|uh|like|you know|basically|actually)\b/g) || []).length;
    score -= fillerCount * 0.2;

    return { ...seg, score };
  });

  // Take top segments and extend to 30-60s
  const topSegments = scoredSegments
    .sort((a, b) => b.score - a.score)
    .slice(0, NUM_CLIPS)
    .map(seg => {
      const currentDuration = seg.end - seg.start;
      let end = seg.end;

      // Extend if too short
      if (currentDuration < CLIP_MIN) {
        end = Math.min(seg.start + CLIP_MIN, metadata.duration);
      }

      // Trim if too long
      if (end - seg.start > CLIP_MAX) {
        end = seg.start + CLIP_MAX;
      }

      return {
        start: Math.round(seg.start * 10) / 10,
        end: Math.round(end * 10) / 10,
        caption: seg.text.substring(0, 80) + '...',
        energy_score: seg.score
      };
    });

  logger.info(`[INFO] Fallback detected ${topSegments.length} clips`);

  return topSegments;
}

module.exports = { detectHighlights };
