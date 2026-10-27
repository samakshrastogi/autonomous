import express from 'express';
import cors from 'cors';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Video folders by status
const ROOT_VIDEOS_DIR = process.env.DOWNLOAD_DIR || 'C:\\Users\\Samaksh Rastogi\\downloads\\videos';
const DEFAULT_DOWNLOAD_DIR = ROOT_VIDEOS_DIR;
const FOLDERS = {
  DOWNLOADS: path.join(ROOT_VIDEOS_DIR, '01_Downloads'),
  SHORTS_DRAFTS: path.join(ROOT_VIDEOS_DIR, '02_Shorts_Drafts'),
  SHORTS_READY: path.join(ROOT_VIDEOS_DIR, '03_Shorts_Ready')
};

// Ensure all directories exist
Object.values(FOLDERS).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.error(`Could not create folder ${dir}: ${err.message}`);
    }
  }
});

// Auto-migrate any unorganized root video files into subfolders
function autoMigrateLegacyFiles() {
  try {
    if (!fs.existsSync(ROOT_VIDEOS_DIR)) return;
    const entries = fs.readdirSync(ROOT_VIDEOS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.mp4') || entry.name.endsWith('.mkv') || entry.name.endsWith('.webm'))) {
        const srcPath = path.join(ROOT_VIDEOS_DIR, entry.name);
        let destDir = FOLDERS.DOWNLOADS;
        if (entry.name.startsWith('Short -')) {
          if (entry.name.includes('Golgappa')) {
            destDir = FOLDERS.SHORTS_READY;
          } else {
            destDir = FOLDERS.SHORTS_DRAFTS;
          }
        }
        const destPath = path.join(destDir, entry.name);
        try {
          fs.renameSync(srcPath, destPath);
          console.log(`[Auto-Organize] Moved ${entry.name} -> ${path.basename(destDir)}`);
        } catch (e) {}
      }
    }
  } catch (err) {
    console.error('[Auto-Organize Error]:', err);
  }
}
autoMigrateLegacyFiles();

// Helper: Locate a video across all subfolders
function findVideoFile(filename) {
  const searchDirs = [
    FOLDERS.SHORTS_READY,
    FOLDERS.SHORTS_DRAFTS,
    FOLDERS.DOWNLOADS,
    ROOT_VIDEOS_DIR
  ];
  for (const dir of searchDirs) {
    const p = path.join(dir, filename);
    if (fs.existsSync(p)) {
      let category = 'downloads';
      let subfolder = '01_Downloads';
      if (dir === FOLDERS.SHORTS_READY) {
        category = 'ready';
        subfolder = '03_Shorts_Ready';
      } else if (dir === FOLDERS.SHORTS_DRAFTS) {
        category = 'drafts';
        subfolder = '02_Shorts_Drafts';
      }
      return { foundPath: p, dir, category, subfolder };
    }
  }
  return null;
}

app.use(cors());
app.use(express.json());

// API: Health / Status check
app.get('/api/status', (req, res) => {
  exec('yt-dlp --version', (err, stdout) => {
    if (err) {
      return res.json({
        ok: false,
        ytdlpInstalled: false,
        error: 'yt-dlp not found in PATH',
        defaultDir: ROOT_VIDEOS_DIR,
        folders: FOLDERS
      });
    }
    res.json({
      ok: true,
      ytdlpInstalled: true,
      version: stdout.trim(),
      defaultDir: ROOT_VIDEOS_DIR,
      folders: FOLDERS
    });
  });
});

// API: Open download folder in Windows Explorer
app.post('/api/open-folder', (req, res) => {
  let targetDir = req.body.dir;
  if (!targetDir) {
    if (req.body.category === 'downloads') targetDir = FOLDERS.DOWNLOADS;
    else if (req.body.category === 'drafts') targetDir = FOLDERS.SHORTS_DRAFTS;
    else if (req.body.category === 'ready') targetDir = FOLDERS.SHORTS_READY;
    else targetDir = ROOT_VIDEOS_DIR;
  }
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }

  // Windows explorer command
  exec(`explorer.exe "${targetDir}"`, (err) => {
    if (err) {
      console.error('Failed to open explorer:', err);
      return res.status(500).json({ error: 'Failed to open directory' });
    }
    res.json({ success: true, path: targetDir });
  });
});

// API: List recent files organized by folder & status
app.get('/api/files', (req, res) => {
  const allFiles = [];

  const subfoldersConfig = [
    { dir: FOLDERS.SHORTS_READY, category: 'ready', label: 'Shorts', subfolder: '03_Shorts_Ready' },
    { dir: FOLDERS.SHORTS_DRAFTS, category: 'drafts', label: 'Pre Ready Shorts', subfolder: '02_Shorts_Drafts' },
    { dir: FOLDERS.DOWNLOADS, category: 'downloads', label: 'Downloads', subfolder: '01_Downloads' }
  ];

  for (const config of subfoldersConfig) {
    if (fs.existsSync(config.dir)) {
      try {
        const entries = fs.readdirSync(config.dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && !entry.name.startsWith('temp_') && (entry.name.endsWith('.mp4') || entry.name.endsWith('.mkv') || entry.name.endsWith('.webm'))) {
            const fullPath = path.join(config.dir, entry.name);
            const stats = fs.statSync(fullPath);

            let meta = {};
            const metaPath = `${fullPath}.json`;
            if (fs.existsSync(metaPath)) {
              try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {}
            }

            allFiles.push({
              name: entry.name,
              size: stats.size,
              mtime: stats.mtimeMs,
              ext: path.extname(entry.name).toLowerCase(),
              category: config.category,
              categoryLabel: config.label,
              subfolder: config.subfolder,
              url: `/api/video/${encodeURIComponent(config.subfolder)}/${encodeURIComponent(entry.name)}`,
              title: meta.title || '',
              hook: meta.hook || '',
              suggestedHooks: Array.isArray(meta.suggestedHooks) ? meta.suggestedHooks : []
            });
          }
        }
      } catch (e) {
        console.error(`Error reading ${config.dir}:`, e);
      }
    }
  }

  // Sort overall newest first
  allFiles.sort((a, b) => b.mtime - a.mtime);

  const allCount = allFiles.length;
  const downloadsCount = allFiles.filter((f) => f.category === 'downloads').length;
  const draftsCount = allFiles.filter((f) => f.category === 'drafts').length;
  const readyCount = allFiles.filter((f) => f.category === 'ready').length;

  const totalSizeAll = allFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const totalSizeDownloads = allFiles.filter((f) => f.category === 'downloads').reduce((acc, f) => acc + (f.size || 0), 0);
  const totalSizeDrafts = allFiles.filter((f) => f.category === 'drafts').reduce((acc, f) => acc + (f.size || 0), 0);
  const totalSizeReady = allFiles.filter((f) => f.category === 'ready').reduce((acc, f) => acc + (f.size || 0), 0);

  res.json({
    files: allFiles,
    counts: {
      all: allCount,
      downloads: downloadsCount,
      drafts: draftsCount,
      ready: readyCount
    },
    sizes: {
      all: totalSizeAll,
      downloads: totalSizeDownloads,
      drafts: totalSizeDrafts,
      ready: totalSizeReady
    },
    directories: FOLDERS
  });
});

// API: Delete video file
app.post('/api/delete', (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }
  const cleanName = path.basename(filename);
  const found = findVideoFile(cleanName);
  if (!found || !fs.existsSync(found.foundPath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }
  try {
    fs.unlinkSync(found.foundPath);
    console.log(`[Deleted] File ${cleanName} removed from ${found.subfolder}`);
    res.json({ success: true, message: `Removed ${cleanName}` });
  } catch (err) {
    console.error(`Error deleting ${cleanName}:`, err);
    res.status(500).json({ error: err.message || 'Failed to delete file' });
  }
});

// API: Stream video file directly to browser for in-frame playback
app.get(['/api/video/:subfolder/:filename', '/api/video/:filename'], (req, res) => {
  try {
    const { subfolder, filename } = req.params;
    const nameToFind = decodeURIComponent(filename || subfolder);

    let targetPath = null;
    if (subfolder && filename) {
      const decodedSub = decodeURIComponent(subfolder);
      const direct = path.join(ROOT_VIDEOS_DIR, decodedSub, nameToFind);
      if (fs.existsSync(direct)) {
        targetPath = direct;
      }
    }

    if (!targetPath) {
      const found = findVideoFile(nameToFind);
      if (found) targetPath = found.foundPath;
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.sendFile(targetPath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Download video with Server-Sent Events (SSE) for live streaming progress
app.post('/api/download', (req, res) => {
  const { url, outputDir } = req.body;
  const targetDir = outputDir || FOLDERS.DOWNLOADS;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Please provide a valid video link.' });
  }

  // Ensure download folder exists
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {
      return res.status(500).json({ error: `Cannot create folder ${targetDir}: ${e.message}` });
    }
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Command requested:
  // yt-dlp -f "bv*+ba/b" --merge-output-format mp4 -o "%(title)s.%(ext)s" "<url>"
  const args = [
    '-f', 'bv*+ba/b',
    '--merge-output-format', 'mp4',
    '-o', '%(title)s.%(ext)s',
    '--newline',
    url.trim()
  ];

  sendEvent('start', {
    url: url.trim(),
    command: `yt-dlp -f "bv*+ba/b" --merge-output-format mp4 -o "%(title)s.%(ext)s" "${url.trim()}"`,
    targetDir
  });

  console.log(`[DOWNLOAD] Starting download in ${targetDir}: ${url.trim()}`);

  const child = spawn('yt-dlp', args, {
    cwd: targetDir,
    windowsHide: true
  });

  let downloadedFileName = '';
  let lastProgress = 0;

  const handleOutput = (chunk, isStderr = false) => {
    const lines = chunk.toString().split(/\r?\n/).filter(line => line.trim().length > 0);

    for (const line of lines) {
      console.log(`[yt-dlp] ${line}`);
      sendEvent('log', { text: line, isError: isStderr });

      // Match destination filename if present
      // [download] Destination: ... or [Merger] Merging formats into "..." or [download] ... has already been downloaded
      const destMatch = line.match(/(?:Destination:\s+|Merging formats into\s+["']?)([^"'\n\r]+)/i) ||
                        line.match(/\[download\]\s+([^"'\n\r]+\.mp4)\s+has already been downloaded/i);
      if (destMatch && destMatch[1]) {
        downloadedFileName = path.basename(destMatch[1].replace(/["']/g, '').trim());
        sendEvent('title', { filename: downloadedFileName });
      }

      // Parse yt-dlp progress line:
      // [download]  45.2% of ~12.50MiB at 4.20MiB/s ETA 00:02
      // or [download] 100% of 15.20MiB in 00:03
      const progressMatch = line.match(/\[download\]\s+([\d\.]+)%\s+of\s+([^\s]+)(?:\s+at\s+([^\s]+))?(?:\s+ETA\s+([^\s]+))?/i);
      if (progressMatch) {
        const percent = parseFloat(progressMatch[1]);
        const size = progressMatch[2] || '';
        const speed = progressMatch[3] || '';
        const eta = progressMatch[4] || '';

        lastProgress = percent;
        sendEvent('progress', {
          percent,
          size,
          speed,
          eta
        });
      }

      // Check if ffmpeg post-processing or merging is happening
      if (line.includes('[Merger]') || line.includes('[ffmpeg]')) {
        sendEvent('status', { phase: 'processing', message: 'Merging audio and video...' });
      }
    }
  };

  child.stdout.on('data', (data) => handleOutput(data, false));
  child.stderr.on('data', (data) => handleOutput(data, true));

  child.on('error', (err) => {
    console.error('[yt-dlp error]', err);
    sendEvent('error', { message: err.message });
    res.end();
  });

  child.on('close', (code) => {
    if (code === 0) {
      sendEvent('complete', {
        message: 'Download completed successfully!',
        filename: downloadedFileName,
        directory: targetDir,
        success: true
      });
    } else {
      sendEvent('error', {
        message: `yt-dlp process exited with error code ${code}`,
        success: false
      });
    }
    res.end();
  });

  // If client forcibly closes the connection before response finishes, kill the process
  res.on('close', () => {
    if (!res.writableEnded && child && !child.killed) {
      console.log('[DOWNLOAD] Client aborted connection before completion.');
      try {
        child.kill();
      } catch (e) {
        // ignore
      }
    }
  });
});

// Helper: dynamically find the best available Gemini model for the user's API key
async function resolveGeminiModel(key) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();

    if (data.models && Array.isArray(data.models)) {
      console.log('[Gemini] Found available models for this key:', data.models.map(m => m.name));
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
          console.log(`[Gemini] Auto-selected best model: ${cleanName}`);
          return cleanName;
        }
      }

      // Any gemini model that supports generateContent
      const anyGen = data.models.find(m =>
        m.name?.includes('gemini') &&
        m.supportedGenerationMethods?.includes('generateContent')
      );
      if (anyGen) return anyGen.name.replace(/^models\//, '');
    } else if (data.error) {
      console.error('[Gemini] ListModels returned error:', data.error.message);
    }
  } catch (err) {
    console.warn('[Gemini] Model listing error:', err.message);
  }
  return 'gemini-1.5-flash-latest';
}

// Helper: Parse timestamp (HH:MM:SS or MM:SS or S) to total seconds
function parseTimestampToSeconds(ts) {
  if (!ts) return 0;
  const parts = ts.toString().trim().split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0] || 0;
  return 0;
}

// Helper: Format total seconds to HH:MM:SS or MM:SS
function formatSecondsToTimestamp(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `00:${pad(minutes)}:${pad(seconds)}`;
}

// Helper: Build FFmpeg drawtext filter graph using UTF-8 text files
// hookDuration: Number of seconds the retention hook is active at the start (default 5s)
function buildDrawTextFilters(topText, bottomText, tempFilesTracker, hookDuration = 5) {
  const filters = [];
  const fontPath = '/Windows/Fonts/arialbd.ttf';

  if (topText && typeof topText === 'string' && topText.trim()) {
    const safeTop = topText.trim();
    const topFile = path.join(DEFAULT_DOWNLOAD_DIR, `temp_txt_top_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`);
    fs.writeFileSync(topFile, safeTop, 'utf8');
    tempFilesTracker.push(topFile);
    const normalizedPath = topFile.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '');
    const durationFilter = (hookDuration && hookDuration > 0) ? `:enable='between(t,0,${hookDuration})'` : '';
    filters.push(`drawtext=fontfile='${fontPath}':textfile='${normalizedPath}':expansion=none:fontsize=46:line_spacing=12:fontcolor=yellow:box=1:boxcolor=black@0.70:boxborderw=18:x=(w-text_w)/2:y=280${durationFilter}`);
  }

  if (bottomText && typeof bottomText === 'string' && bottomText.trim()) {
    let cleanHandle = bottomText.trim();
    if (!cleanHandle.startsWith('@') && !cleanHandle.startsWith('▶')) {
      cleanHandle = `@${cleanHandle}`;
    }
    const botFile = path.join(DEFAULT_DOWNLOAD_DIR, `temp_txt_bot_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`);
    fs.writeFileSync(botFile, cleanHandle, 'utf8');
    tempFilesTracker.push(botFile);
    const normalizedPath = botFile.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '');
    filters.push(`drawtext=fontfile='${fontPath}':textfile='${normalizedPath}':expansion=none:fontsize=38:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=14:x=(w-text_w)/2:y=1460`);
  }

  return filters.join(',');
}

// API: Generate Shorts using Gemini Flash & FFmpeg
app.post('/api/generate-shorts', async (req, res) => {
  const { filename, apiKey, channelHandle } = req.body;
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!key || typeof key !== 'string' || !key.trim()) {
    return res.status(400).json({ error: 'Gemini API key is required. Please provide your API key.' });
  }

  // Persist key to process.env and .env if not set
  if (!process.env.GEMINI_API_KEY && key) {
    process.env.GEMINI_API_KEY = key.trim();
    try {
      fs.writeFileSync(path.join(__dirname, '.env'), `GEMINI_API_KEY=${key.trim()}\n`);
    } catch (e) {}
  }

  if (!filename) {
    return res.status(400).json({ error: 'Video filename is required.' });
  }

  const fileInfo = findVideoFile(filename);
  if (!fileInfo) {
    return res.status(404).json({ error: 'Video file not found on disk.' });
  }
  const videoPath = fileInfo.foundPath;

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const tempAudioPath = path.join(ROOT_VIDEOS_DIR, `temp_audio_${Date.now()}.mp3`);
  let uploadedFile = null;
  const fileManager = new GoogleAIFileManager(key.trim());
  const genAI = new GoogleGenerativeAI(key.trim());

  try {
    sendEvent('status', { phase: 'extracting', message: 'Extracting audio for rapid analysis...' });

    // 1. Ultra-fast audio extraction (takes 1-2s)
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

    // 3. Resolve best working model for this API key
    const detectedModel = await resolveGeminiModel(key.trim());

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

    // Try detected model, with automatic fallback list
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

    // Parse JSON cleanly, handling markdown code fences if present
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

    // Rigorous filtering & duration clamping (< 40 seconds guaranteed)
    const moments = [];
    for (const moment of rawMoments) {
      if (!moment.start || !moment.end) continue;
      const startSec = parseTimestampToSeconds(moment.start);
      let endSec = parseTimestampToSeconds(moment.end);
      let duration = endSec - startSec;

      // Hard clamp: Every short MUST strictly be less than 40s
      if (duration >= 40) {
        endSec = startSec + 38; // Enforce maximum 38s
        duration = 38;
        moment.end = formatSecondsToTimestamp(endSec);
      }

      // Filter out moments that are too short to have real meaning (< 10 seconds)
      if (duration < 10) {
        console.log(`[Moments] Skipping moment "${moment.title}" due to short duration (${duration}s)`);
        continue;
      }

      moment.duration = duration;
      moments.push(moment);
    }

    if (moments.length === 0) {
      throw new Error('No genuine moments meeting quality and duration (< 40s) requirements were found.');
    }

    sendEvent('moments', { moments });

    // 4. Render 9:16 Shorts with FFmpeg (fast) + 5-second Retention Hook
    const generatedFiles = [];
    for (let i = 0; i < moments.length; i++) {
      const moment = moments[i];
      const cleanSafeTitle = (moment.title || `Clip_${i + 1}`)
        .replace(/^Short\s*[-–—:]\s*/i, '')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/#shorts/gi, '')
        .replace(/\bshorts\b/gi, '')
        .trim();
      const shortFilename = `${cleanSafeTitle || `Clip_${i + 1}`}.mp4`;
      const outputShortPath = path.join(FOLDERS.SHORTS_DRAFTS, shortFilename);

      sendEvent('status', {
        phase: 'rendering',
        message: `Rendering clip ${i + 1}/${moments.length}: "${cleanSafeTitle}" (9:16, 5s hook, ${moment.duration}s)...`,
        current: i + 1,
        total: moments.length,
        title: cleanSafeTitle
      });

      // Build 5-second retention hook filter + optional channel watermark
      const tempRenderFiles = [];
      const primaryHook = moment.hook || (Array.isArray(moment.suggestedHooks) && moment.suggestedHooks[0]) || '';
      const drawFilters = buildDrawTextFilters(primaryHook, channelHandle, tempRenderFiles, 5);

      let filterGraph = `split[a][b];[a]scale=180:320:force_original_aspect_ratio=increase,crop=180:320,boxblur=5:2,scale=1080:1920[bg];[b]scale=1080:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`;
      if (drawFilters) {
        filterGraph += `,${drawFilters}`;
      }

      const ffmpegCmd = `ffmpeg -ss ${moment.start} -to ${moment.end} -i "${videoPath}" -vf "${filterGraph}" -preset ultrafast -c:v libx264 -crf 23 -c:a aac -threads 0 -y "${outputShortPath}"`;

      await new Promise((resolve) => {
        exec(ffmpegCmd, (err) => {
          // Cleanup render text temp files
          for (const f of tempRenderFiles) {
            try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
          }

          if (err) {
            console.error(`Error rendering clip ${i + 1}:`, err);
            return resolve();
          }

          // Save clip metadata alongside video for suggestions & future re-burn
          const suggestedHooksList = (Array.isArray(moment.suggestedHooks) && moment.suggestedHooks.length > 0)
            ? moment.suggestedHooks.slice(0, 5)
            : (primaryHook ? [primaryHook] : []);

          try {
            fs.writeFileSync(`${outputShortPath}.json`, JSON.stringify({
              title: cleanSafeTitle,
              hook: primaryHook,
              suggestedHooks: suggestedHooksList,
              start: moment.start,
              end: moment.end,
              duration: moment.duration,
              sourceVideo: path.basename(videoPath)
            }, null, 2), 'utf8');
          } catch (e) {
            console.warn('Failed to save metadata:', e.message);
          }

          generatedFiles.push({
            name: shortFilename,
            title: cleanSafeTitle,
            hook: primaryHook,
            suggestedHooks: suggestedHooksList,
            duration: moment.duration,
            category: 'drafts',
            categoryLabel: 'Pre Ready Shorts',
            subfolder: '02_Shorts_Drafts',
            url: `/api/video/02_Shorts_Drafts/${encodeURIComponent(shortFilename)}`
          });
          resolve();
        });
      });
    }

    sendEvent('complete', {
      success: true,
      message: `Successfully generated ${generatedFiles.length} Shorts (< 40s with 5s retention hook)! Saved in 02_Shorts_Drafts.`,
      shorts: generatedFiles
    });
    res.end();

  } catch (err) {
    console.error('Shorts generation error:', err);
    sendEvent('error', { message: err.message });
    res.end();
  } finally {
    // Cleanup temporary files
    if (fs.existsSync(tempAudioPath)) {
      try { fs.unlinkSync(tempAudioPath); } catch (e) {}
    }
    if (uploadedFile && uploadedFile.file && uploadedFile.file.name) {
      try { await fileManager.deleteFile(uploadedFile.file.name); } catch (e) {}
    }
  }
});

// API: Generate 5 best viral hooks for a Short using Gemini
app.post('/api/suggest-hooks', async (req, res) => {
  const { filename, title, apiKey } = req.body;
  const key = apiKey || process.env.GEMINI_API_KEY;

  const defaultHooks = [
    "Wait for the end twist! 😱",
    "Reaction dekh ke hasi nahi rukegi 😂",
    "Bhai ne yeh kya bol diya?! 🤯",
    "Dhyan se dekho end me kya hua 👀",
    "Don't miss the climax! 🔥"
  ];

  if (!key) {
    return res.json({ suggestedHooks: defaultHooks });
  }

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
          if (fileInfo && fileInfo.foundPath) {
            const metaPath = `${fileInfo.foundPath}.json`;
            let meta = {};
            if (fs.existsSync(metaPath)) {
              try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {}
            }
            meta.suggestedHooks = hooks.slice(0, 5);
            try { fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8'); } catch (e) {}
          }
        }
        return res.json({ suggestedHooks: hooks.slice(0, 5) });
      }
    }
    res.json({ suggestedHooks: defaultHooks });
  } catch (err) {
    console.warn('suggest-hooks error:', err.message);
    res.json({ suggestedHooks: defaultHooks });
  }
});

// API: Burn custom top hook text & channel handle to an existing Short
app.post('/api/burn-text', async (req, res) => {
  const { filename, topText, channelHandle } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  const fileInfo = findVideoFile(filename);
  if (!fileInfo) {
    return res.status(404).json({ error: 'Video file not found on disk' });
  }
  const videoPath = fileInfo.foundPath;

  const tempFilesTracker = [];
  const tempOutputPath = path.join(FOLDERS.SHORTS_READY, `temp_burn_${Date.now()}.mp4`);
  const finalReadyPath = path.join(FOLDERS.SHORTS_READY, filename);

  try {
    const drawFilters = buildDrawTextFilters(topText, channelHandle, tempFilesTracker, 5);
    if (!drawFilters) {
      return res.status(400).json({ error: 'Please enter top hook text or a channel handle to apply.' });
    }

    // Check if metadata exists with sourceVideo, start, end
    const metaPath = `${videoPath}.json`;
    let meta = {};
    if (fs.existsSync(metaPath)) {
      try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {}
    }

    let ffmpegCmd = '';
    const sourceFound = meta.sourceVideo ? findVideoFile(meta.sourceVideo) : null;

    if (sourceFound && sourceFound.foundPath && fs.existsSync(sourceFound.foundPath) && meta.start && meta.end) {
      // Clean re-render from pristine source video with 5s retention hook
      let filterGraph = `split[a][b];[a]scale=180:320:force_original_aspect_ratio=increase,crop=180:320,boxblur=5:2,scale=1080:1920[bg];[b]scale=1080:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`;
      if (drawFilters) {
        filterGraph += `,${drawFilters}`;
      }
      ffmpegCmd = `ffmpeg -ss ${meta.start} -to ${meta.end} -i "${sourceFound.foundPath}" -vf "${filterGraph}" -preset ultrafast -c:v libx264 -crf 23 -c:a aac -threads 0 -y "${tempOutputPath}"`;
    } else {
      // Apply 5s retention hook directly onto current video
      ffmpegCmd = `ffmpeg -i "${videoPath}" -vf "${drawFilters}" -preset ultrafast -c:v libx264 -crf 23 -c:a copy -threads 0 -y "${tempOutputPath}"`;
    }

    await new Promise((resolve, reject) => {
      exec(ffmpegCmd, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve();
      });
    });

    // Move to 03_Shorts_Ready and remove from 02_Shorts_Drafts if it was in drafts
    try {
      if (fs.existsSync(finalReadyPath)) {
        fs.unlinkSync(finalReadyPath);
      }
      fs.renameSync(tempOutputPath, finalReadyPath);
      if (videoPath !== finalReadyPath && fs.existsSync(videoPath)) {
        try { fs.unlinkSync(videoPath); } catch (e) {}
      }
    } catch (replaceErr) {
      try {
        fs.copyFileSync(tempOutputPath, finalReadyPath);
        fs.unlinkSync(tempOutputPath);
        if (videoPath !== finalReadyPath && fs.existsSync(videoPath)) {
          try { fs.unlinkSync(videoPath); } catch (e) {}
        }
      } catch (copyErr) {
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        const brandedName = `${base} (branded)${ext}`;
        const brandedPath = path.join(FOLDERS.SHORTS_READY, brandedName);
        fs.renameSync(tempOutputPath, brandedPath);

        meta.hook = topText;
        if (channelHandle) meta.channelHandle = channelHandle;
        try { fs.writeFileSync(`${brandedPath}.json`, JSON.stringify(meta, null, 2), 'utf8'); } catch (e) {}
        if (fs.existsSync(metaPath)) { try { fs.unlinkSync(metaPath); } catch (e) {} }

        return res.json({
          success: true,
          message: 'Branded Short saved to 03_Shorts_Ready!',
          filename: brandedName,
          category: 'ready',
          subfolder: '03_Shorts_Ready',
          url: `/api/video/03_Shorts_Ready/${encodeURIComponent(brandedName)}?t=${Date.now()}`
        });
      }
    }

    // Update metadata and save next to finalReadyPath
    meta.hook = topText;
    if (channelHandle) meta.channelHandle = channelHandle;
    const readyMetaPath = `${finalReadyPath}.json`;
    try { fs.writeFileSync(readyMetaPath, JSON.stringify(meta, null, 2), 'utf8'); } catch (e) {}
    if (metaPath !== readyMetaPath && fs.existsSync(metaPath)) {
      try { fs.unlinkSync(metaPath); } catch (e) {}
    }

    res.json({
      success: true,
      message: 'Short moved to 03_Shorts_Ready with branding!',
      filename: filename,
      category: 'ready',
      subfolder: '03_Shorts_Ready',
      url: `/api/video/03_Shorts_Ready/${encodeURIComponent(filename)}?t=${Date.now()}`
    });
  } catch (err) {
    console.error('Error burning text to short:', err);
    res.status(500).json({ error: err.message || 'Failed to burn text to video' });
  } finally {
    for (const f of tempFilesTracker) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
    }
    try { if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath); } catch (e) {}
  }
});

// Serve static frontend build if it exists
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Default download folder: ${DEFAULT_DOWNLOAD_DIR}`);
});
