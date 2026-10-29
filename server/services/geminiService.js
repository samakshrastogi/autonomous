import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ROOT_VIDEOS_DIR, findVideoFile, readVideoMetadata, saveVideoMetadata } from '../config.js';
import { parseTimestampToSeconds, formatSecondsToTimestamp } from './ffmpegService.js';

// Dynamically discover the best working Gemini model for the user's API key
export async function resolveGeminiModel(key) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();

    if (data.models && Array.isArray(data.models)) {
      const preferred = [
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.6-flash',
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-flash-latest',
        'gemini-pro-latest',
        'gemini-2.5-flash',
        'gemini-2.0-flash'
      ];

      for (const pref of preferred) {
        const found = data.models.find(m =>
          (m.name === `models/${pref}` || m.name === pref) &&
          m.supportedGenerationMethods?.includes('generateContent')
        );
        if (found) {
          const cleanName = found.name.replace(/^models\//, '');
          console.log(`[Gemini] Selected model: ${cleanName}`);
          return cleanName;
        }
      }

      const anyGen = data.models.find(m =>
        m.name?.includes('gemini') &&
        m.supportedGenerationMethods?.includes('generateContent')
      );
      if (anyGen) return anyGen.name.replace(/^models\//, '');
    }
  } catch (err) {
    console.warn('[Gemini] Model listing error:', err.message);
  }
  return 'gemini-1.5-flash-latest';
}

// Analyze audio of a video to identify genuine viral micro-stories (< 40s)
export async function analyzeVideoAudioForShorts({ videoPath, filename, apiKey, sendEvent }) {
  const key = apiKey.trim();
  const fileManager = new GoogleAIFileManager(key);
  const genAI = new GoogleGenerativeAI(key);

  const tempAudioPath = path.join(ROOT_VIDEOS_DIR, `temp_audio_${Date.now()}.mp3`);
  let uploadedFile = null;

  try {
    sendEvent('status', { phase: 'extracting', message: 'Extracting audio for rapid analysis...' });

    // 1. Ultra-fast audio extraction (1-2s)
    await new Promise((resolve, reject) => {
      exec(`ffmpeg -i "${videoPath}" -vn -ar 16000 -ac 1 -b:a 48k "${tempAudioPath}" -y`, (err) => {
        if (err) return reject(new Error('Audio extraction failed: ' + err.message));
        resolve();
      });
    });

    sendEvent('status', { phase: 'uploading', message: 'Uploading audio to Gemini...' });

    // 2. Upload lightweight audio file to Gemini
    uploadedFile = await fileManager.uploadFile(tempAudioPath, {
      mimeType: 'audio/mp3',
      displayName: `audio_${filename}`
    });

    sendEvent('status', { phase: 'analyzing', message: 'Finding viral moments in Hinglish...' });

    const detectedModel = await resolveGeminiModel(key);

    const prompt = `Analyze this video audio carefully.
Find ALL genuinely viral, funny, punchy, dramatic, or climax moments suitable for vertical video clips.
DO NOT limit to a fixed number: detect as many moments as genuinely exist in the video that have strong viral potential. If there are 2, return 2; if there are 4, return 4; if there are 6, return 6.

CRITICAL REQUIREMENTS FOR GENUINE & MEANINGFUL SHORTS:
1. MEANING & STORY ARC: Every clip MUST have clear meaning and a self-contained story arc (Setup -> Escalation -> Climax/Punchline/Payoff). When a viewer watches it, they must immediately understand the scene and find it genuine, hilarious, shocking, dramatic, or relatable. NEVER select arbitrary pauses, background music loops, or random fragments without a point.
2. NO ABRUPT CUTS: Do NOT start or end mid-sentence or mid-word. The start timestamp must begin right before the dialogue/action starts, and the end timestamp must conclude right after the punchline, laughter, or reaction has completed.
3. DURATION LIMIT (< 40 SECONDS): Every clip MUST BE strictly LESS THAN 40 SECONDS (ideal range: 18 to 35 seconds, ABSOLUTE MAXIMUM 38 SECONDS). NEVER return a clip that is 40 seconds or longer. Discard any scene that cannot conclude within 38 seconds.
4. RETENTION HOOK (FIRST 5 SECONDS): For each moment, craft a killer viral retention hook in conversational Hinglish with emojis tailored specifically to what happens in the scene. This hook will be displayed on screen during the FIRST 5 SECONDS of the short to excite viewers and hook their attention so they watch the whole video.
5. Provide "suggestedHooks": an array of EXACTLY 5 best, distinct, high-retention viral hook suggestions in conversational Hinglish with emojis (curiosity, shock, funny reaction, twist). Keep each under 40 characters.
6. "hook" must be the single best primary retention hook chosen from the 5 suggestions.
7. Every "title" MUST be in conversational Hinglish (Hindi in English letters, under 50 characters). DO NOT include the word "Short" or "Shorts" in any title.
8. Timestamps MUST be in format "HH:MM:SS" or "MM:SS" (e.g. "00:01:23").

Return ONLY a valid JSON array of objects with the exact schema:
[
  {
    "title": "Hinglish title without the word Short (under 50 chars)",
    "hook": "Primary viral retention hook for first 5 seconds (under 40 chars)",
    "suggestedHooks": [
      "Hook option 1...",
      "Hook option 2...",
      "Hook option 3...",
      "Hook option 4...",
      "Hook option 5..."
    ],
    "start": "00:01:23",
    "end": "00:01:55"
  }
]`;

    const candidateModels = [
      detectedModel,
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-3.7-flash',
      'gemini-flash-latest',
      'gemini-pro-latest'
    ];
    const uniqueModels = [...new Set(candidateModels)];

    let responseText = '';
    let lastError = null;

    for (const modelName of uniqueModels) {
      try {
        console.log(`[Gemini] Attempting model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          {
            fileData: {
              mimeType: uploadedFile.file.mimeType,
              fileUri: uploadedFile.file.uri
            }
          },
          { text: prompt }
        ]);
        responseText = result.response.text();
        if (responseText) {
          console.log(`[Gemini] Succeeded with model: ${modelName}`);
          break;
        }
      } catch (err) {
        console.warn(`[Gemini] Model ${modelName} returned: ${err.message}`);
        lastError = err;
        // If quota or rate limit is hit (429 / ResourceExhausted), stop hammering subsequent models
        if (err.message && (err.message.includes('429') || err.message.toLowerCase().includes('quota') || err.message.toLowerCase().includes('resourceexhausted'))) {
          console.warn('[Gemini] Free tier quota/rate limit reached. Stopping model fallback attempts.');
          break;
        }
      }
    }

    if (!responseText && lastError) {
      if (lastError.message && (lastError.message.includes('429') || lastError.message.toLowerCase().includes('quota') || lastError.message.toLowerCase().includes('resourceexhausted'))) {
        const retryMatch = lastError.message.match(/retry in ([\d\.]+)s/i);
        const retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
        throw new Error(`QUOTA_LIMIT: Gemini Free Tier quota reached (15 req/min). Resets in ~${retrySec}s. Please wait 1 minute or switch API key.`);
      }
      throw lastError;
    }

    let rawMoments = [];
    try {
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : responseText;
      rawMoments = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', responseText);
      throw new Error('Gemini returned an invalid response format.');
    }

    if (!Array.isArray(rawMoments) || rawMoments.length === 0) {
      throw new Error('No suitable moments found for Shorts in this video.');
    }

    // Sanitize, clamp duration (< 40s), and filter out incomplete moments (< 10s)
    const validMoments = [];
    for (const moment of rawMoments) {
      if (!moment.start || !moment.end) continue;
      const startSec = parseTimestampToSeconds(moment.start);
      let endSec = parseTimestampToSeconds(moment.end);
      let duration = endSec - startSec;

      if (duration >= 40) {
        endSec = startSec + 38;
        duration = 38;
        moment.end = formatSecondsToTimestamp(endSec);
      }

      if (duration < 10) {
        console.log(`[Moments] Skipping moment "${moment.title}" due to short duration (${duration}s)`);
        continue;
      }

      moment.duration = duration;
      validMoments.push(moment);
    }

    if (validMoments.length === 0) {
      throw new Error('No genuine moments meeting quality and duration (< 40s) requirements were found.');
    }

    return validMoments;

  } finally {
    if (fs.existsSync(tempAudioPath)) {
      try { fs.unlinkSync(tempAudioPath); } catch (e) {}
    }
    if (uploadedFile?.file?.name) {
      try { await fileManager.deleteFile(uploadedFile.file.name); } catch (e) {}
    }
  }
}

// Generate 5 best viral hooks for a Short
export async function generateSuggestedHooks({ filename, title, apiKey }) {
  const defaultHooks = [
    "Wait for the end twist! 😱",
    "Reaction dekh ke hasi nahi rukegi 😂",
    "Bhai ne yeh kya bol diya?! 🤯",
    "Dhyan se dekho end me kya hua 👀",
    "Don't miss the climax! 🔥"
  ];

  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return defaultHooks;

  try {
    const genAI = new GoogleGenerativeAI(key.trim());
    const detectedModel = await resolveGeminiModel(key.trim());
    const model = genAI.getGenerativeModel({ model: detectedModel || 'gemini-1.5-flash-latest' });

    const cleanName = (title || filename || 'Viral Scene')
      .replace(/^Short\s*[-–—:]\s*/i, '')
      .replace(/\.mp4$/i, '')
      .trim();

    const prompt = `You are a viral YouTube Shorts / Reels expert for Indian audiences.
Given this video scene title/topic: "${cleanName}", generate EXACTLY 5 best, punchy, high-retention viral hook text suggestions in conversational Hinglish (Hindi written in English alphabets with emojis).
Make them diverse: one suspense/curiosity, one funny reaction, one unexpected twist, one relatable callout, one cliffhanger.
Keep each hook under 40 characters.
Return ONLY a valid JSON array of 5 strings, e.g.:
[
  "Wait for Papa's reaction... 😂",
  "Ye kya bol diya bhai ne! 😱",
  "Dhyan se dekho kya hua... 👀",
  "Reaction dekh ke hasi nahi rukegi 🤣",
  "Last tak dekho twist aayega 🔥"
]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\[\s*[\s\S]*\s*\]/);
    if (match) {
      const hooks = JSON.parse(match[0]);
      if (Array.isArray(hooks) && hooks.length > 0) {
        if (filename) {
          const fileInfo = findVideoFile(filename);
          if (fileInfo?.foundPath) {
            const meta = readVideoMetadata(fileInfo.foundPath);
            meta.suggestedHooks = hooks.slice(0, 5);
            saveVideoMetadata(fileInfo.foundPath, meta);
          }
        }
        return hooks.slice(0, 5);
      }
    }
  } catch (err) {
    console.warn('[Gemini] Hook suggestions error:', err.message);
  }
  return defaultHooks;
}

// Analyze a silent or gaming video (Chess, puzzles, gaming clips, tricks) without relying on audio
export async function analyzeGamingVideoWithoutAudio({ videoPath, filename, apiKey, sendEvent }) {
  const key = (apiKey || process.env.GEMINI_API_KEY || '').trim();
  if (!key) {
    throw new Error('Gemini API key is required for video analysis.');
  }

  const fileManager = new GoogleAIFileManager(key);
  const genAI = new GoogleGenerativeAI(key);

  let uploadedFile = null;

  try {
    if (sendEvent) {
      sendEvent('status', { phase: 'uploading', message: 'Uploading gaming video to Gemini Vision...' });
    }

    // 1. Upload video file directly to Gemini File API
    uploadedFile = await fileManager.uploadFile(videoPath, {
      mimeType: 'video/mp4',
      displayName: `gaming_${path.basename(filename)}`
    });

    if (sendEvent) {
      sendEvent('status', { phase: 'processing', message: 'Gemini Vision inspecting video frames...' });
    }

    // Wait for Gemini to process the video frames if necessary
    let fileInfo = await fileManager.getFile(uploadedFile.file.name);
    let attempts = 0;
    while (fileInfo.state === 'PROCESSING' && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      fileInfo = await fileManager.getFile(uploadedFile.file.name);
      attempts++;
    }

    if (fileInfo.state === 'FAILED') {
      throw new Error('Gemini Vision processing failed for this video file.');
    }

    if (sendEvent) {
      sendEvent('status', { phase: 'analyzing', message: 'Generating exciting moves & puzzle questions...' });
    }

    const detectedModel = await resolveGeminiModel(key);

    const prompt = `You are a viral YouTube Shorts & Reels expert for Gaming, Chess, Brain Teasers, and Strategy Puzzles (Channel: Samaksh Gaming).
Carefully watch and analyze the VISUAL gameplay in this video. NOTE: This video may have NO spoken dialogue, so analyze the visual moves, board setup, traps, tactics, actions, and puzzle challenges shown on screen.

YOUR GOAL:
1. Identify the puzzle, trick, or move shown in the video (e.g. Chess tactic, Mate in 2, Trap, Tricky puzzle, Winning move).
2. Create an ULTRA-EXCITING TOP HOOK / QUESTION that excites viewers to stop scrolling, think, and answer the puzzle.
   - Requirements:
     - Under 45 characters.
     - Conversational and thrilling with relevant emojis (♟️, 🧠, 🤯, 🔥, 👀).
     - Examples: "White to move: Win in 2 moves! ♟️🔥", "Can you solve this puzzle?! 🤯", "Grandmaster Trap! What's the move? 👀", "99% People Fail This Move! 😱"
3. Provide "suggestedHooks": An array of EXACTLY 5 best, distinct, high-curiosity questions/hooks tailored specifically to this video's moves.
4. Provide "solution": A brief 1-2 sentence solution / answer so the creator can easily copy and pin it in the YouTube comments!
5. Provide "bottomText": "Comment your move 👇"

Return ONLY a valid JSON object with the exact schema:
{
  "title": "Short descriptive title without the word Short (under 50 chars)",
  "hook": "Best exciting puzzle challenge question (under 45 chars with emojis)",
  "suggestedHooks": [
    "Hook option 1...",
    "Hook option 2...",
    "Hook option 3...",
    "Hook option 4...",
    "Hook option 5..."
  ],
  "solution": "Brief winning move or puzzle answer for pinned comment",
  "bottomText": "Comment your move 👇"
}`;

    const candidateModels = [
      detectedModel,
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro'
    ];
    const uniqueModels = [...new Set(candidateModels)];

    let responseText = '';
    let lastError = null;

    for (const modelName of uniqueModels) {
      try {
        console.log(`[Gemini Vision] Attempting model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          {
            fileData: {
              mimeType: uploadedFile.file.mimeType,
              fileUri: uploadedFile.file.uri
            }
          },
          { text: prompt }
        ]);
        responseText = result.response.text();
        if (responseText) {
          console.log(`[Gemini Vision] Succeeded with model: ${modelName}`);
          break;
        }
      } catch (err) {
        console.warn(`[Gemini Vision] Model ${modelName} returned: ${err.message}`);
        lastError = err;
        if (err.message && (err.message.includes('429') || err.message.toLowerCase().includes('quota') || err.message.includes('resourceexhausted'))) {
          break;
        }
      }
    }

    if (!responseText && lastError) {
      if (lastError.message && (lastError.message.includes('429') || lastError.message.toLowerCase().includes('quota') || lastError.message.includes('resourceexhausted'))) {
        const retryMatch = lastError.message.match(/retry in ([\d\.]+)s/i);
        const retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
        throw new Error(`QUOTA_LIMIT: Gemini Free Tier quota reached (15 req/min). Resets in ~${retrySec}s. Please wait or use another key.`);
      }
      throw lastError;
    }

    let parsedResult = null;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse Gemini Gaming JSON:', responseText);
    }

    if (!parsedResult) {
      parsedResult = {
        title: path.basename(filename, path.extname(filename)),
        hook: 'Can you solve this puzzle?! 🤯',
        suggestedHooks: [
          'Can you solve this puzzle?! 🤯',
          'Find the winning move! 🧠⏳',
          'White to move: Win in 2 moves! ♟️🔥',
          'Only 1% of players spot this! 👀',
          "Don't miss the secret move! ⚡"
        ],
        solution: 'Comment your answer and check back for the pinned solution!',
        bottomText: 'Comment your move 👇'
      };
    }

    // Save to metadata
    const meta = readVideoMetadata(videoPath);
    meta.title = parsedResult.title || meta.title || filename;
    meta.hook = parsedResult.hook;
    meta.suggestedHooks = Array.isArray(parsedResult.suggestedHooks) ? parsedResult.suggestedHooks.slice(0, 5) : [];
    meta.solution = parsedResult.solution || '';
    meta.bottomText = parsedResult.bottomText || 'Comment your move 👇';
    meta.channelMode = 'gaming';
    saveVideoMetadata(videoPath, meta);

    return parsedResult;
  } finally {
    if (uploadedFile?.file?.name) {
      try {
        await fileManager.deleteFile(uploadedFile.file.name);
      } catch (e) {}
    }
  }
}
