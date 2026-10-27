import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { ROOT_VIDEOS_DIR, findVideoFile } from '../config.js';
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
      }
    }

    if (!responseText && lastError) {
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
            const metaPath = `${fileInfo.foundPath}.json`;
            let meta = {};
            if (fs.existsSync(metaPath)) {
              try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {}
            }
            meta.suggestedHooks = hooks.slice(0, 5);
            try { fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8'); } catch (e) {}
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
