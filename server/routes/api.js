import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import {
  ROOT_VIDEOS_DIR,
  FOLDERS,
  getAllVideoFiles,
  findVideoFile,
  PROJECT_ROOT,
  deleteVideoMetadata,
  readVideoMetadata,
  saveVideoMetadata
} from '../config.js';
import { registerEventsClient, broadcastFilesUpdate } from '../watcher.js';
import {
  analyzeVideoAudioForShorts,
  generateSuggestedHooks,
  analyzeGamingVideoWithoutAudio
} from '../services/geminiService.js';
import { renderShortsInParallel, burnTextToShort, sanitizeShortsFilename } from '../services/ffmpegService.js';
import { startVideoDownload } from '../services/downloadService.js';

const router = express.Router();

// Multer storage for direct video clip uploads into 02_Shorts_Drafts
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(FOLDERS.SHORTS_DRAFTS)) {
      try { fs.mkdirSync(FOLDERS.SHORTS_DRAFTS, { recursive: true }); } catch (e) {}
    }
    cb(null, FOLDERS.SHORTS_DRAFTS);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'Uploaded_Short';
    cb(null, `${base}_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB
});

// Real-Time Events SSE endpoint
router.get('/events', (req, res) => {
  registerEventsClient(req, res);
});

// Health / Status check
router.get('/status', (req, res) => {
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

// List recent files organized by folder & status
router.get('/files', (req, res) => {
  const data = getAllVideoFiles();
  res.json(data);
});

// Helper function to recursively calculate directory size in bytes
function getDirSizeBytes(dirPath) {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const full = path.join(dirPath, file);
      try {
        const stat = fs.statSync(full);
        if (stat.isFile()) size += stat.size;
        else if (stat.isDirectory()) size += getDirSizeBytes(full);
      } catch (e) {}
    }
  } catch (e) {}
  return size;
}

// Open download folder in Windows Explorer
router.post('/open-folder', (req, res) => {
  let targetDir = req.body.dir;
  if (!targetDir) {
    if (req.body.category === 'downloads') targetDir = FOLDERS.DOWNLOADS;
    else if (req.body.category === 'drafts') targetDir = FOLDERS.SHORTS_DRAFTS;
    else if (req.body.category === 'ready') targetDir = FOLDERS.SHORTS_READY;
    else if (req.body.category === 'metadata') targetDir = FOLDERS.METADATA;
    else targetDir = ROOT_VIDEOS_DIR;
  }
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  }

  exec(`explorer.exe "${targetDir}"`, (err) => {
    if (err) {
      console.error('Failed to open explorer:', err);
      return res.status(500).json({ error: 'Failed to open directory' });
    }
    res.json({ success: true, path: targetDir });
  });
});

// Storage and directory size diagnostics
router.get('/storage-info', (req, res) => {
  try {
    const info = {
      downloads: getDirSizeBytes(FOLDERS.DOWNLOADS),
      drafts: getDirSizeBytes(FOLDERS.SHORTS_DRAFTS),
      ready: getDirSizeBytes(FOLDERS.SHORTS_READY),
      metadata: getDirSizeBytes(FOLDERS.METADATA),
      total: getDirSizeBytes(ROOT_VIDEOS_DIR),
      paths: {
        root: ROOT_VIDEOS_DIR,
        downloads: FOLDERS.DOWNLOADS,
        drafts: FOLDERS.SHORTS_DRAFTS,
        ready: FOLDERS.SHORTS_READY,
        metadata: FOLDERS.METADATA
      }
    };
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clean render caches & leftover temporary processing files
router.post('/clean-cache', (req, res) => {
  let freedBytes = 0;
  let freedCount = 0;

  try {
    const scanAndClean = (dir) => {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const full = path.join(dir, entry);
        try {
          const stat = fs.statSync(full);
          if (stat.isFile()) {
            const isTemp = entry.startsWith('temp_') ||
                           entry.endsWith('.tmp') ||
                           entry.startsWith('crop_temp_') ||
                           entry.startsWith('overlay_temp_');
            if (isTemp) {
              freedBytes += stat.size;
              freedCount += 1;
              fs.unlinkSync(full);
            }
          } else if (stat.isDirectory()) {
            scanAndClean(full);
          }
        } catch (e) {}
      }
    };

    scanAndClean(ROOT_VIDEOS_DIR);
    res.json({ success: true, freedBytes, freedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete video file
router.post('/delete', (req, res) => {
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
    deleteVideoMetadata(found.foundPath);
    console.log(`[Deleted] File ${cleanName} removed from ${found.subfolder}`);
    broadcastFilesUpdate();
    res.json({ success: true, message: `Removed ${cleanName}` });
  } catch (err) {
    console.error(`Error deleting ${cleanName}:`, err);
    res.status(500).json({ error: err.message || 'Failed to delete file' });
  }
});

// Stream video file directly to browser for in-frame playback
router.get(['/video/:subfolder/:filename', '/video/:filename'], (req, res) => {
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

// Download video with Server-Sent Events (SSE)
router.post('/download', (req, res) => {
  const { url, outputDir } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const child = startVideoDownload({
      url,
      outputDir,
      sendEvent,
      onFinish: (err) => {
        if (!err) broadcastFilesUpdate();
        res.end();
      }
    });

    res.on('close', () => {
      if (!res.writableEnded && child && !child.killed) {
        try { child.kill(); } catch (e) {}
      }
    });
  } catch (err) {
    sendEvent('error', { message: err.message });
    res.end();
  }
});

// Generate Shorts with Parallel Multi-Core Rendering & 5s Retention Hook
router.post('/generate-shorts', async (req, res) => {
  const { filename, apiKey, channelHandle } = req.body;
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!key || typeof key !== 'string' || !key.trim()) {
    return res.status(400).json({ error: 'Gemini API key is required.' });
  }

  // Persist key to process.env and .env if not set
  if (!process.env.GEMINI_API_KEY && key) {
    process.env.GEMINI_API_KEY = key.trim();
    try {
      fs.writeFileSync(path.join(PROJECT_ROOT, '.env'), `GEMINI_API_KEY=${key.trim()}\n`);
    } catch (e) {}
  }

  if (!filename) {
    return res.status(400).json({ error: 'Video filename is required.' });
  }

  const fileInfo = findVideoFile(filename);
  if (!fileInfo) {
    return res.status(404).json({ error: 'Video file not found on disk.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // 1. Analyze video audio for genuine viral micro-stories (< 40s)
    const moments = await analyzeVideoAudioForShorts({
      videoPath: fileInfo.foundPath,
      filename,
      apiKey: key,
      sendEvent
    });

    sendEvent('moments', { moments });

    // 2. High-speed Parallel Rendering (concurrency = 2 for maximum multi-core throughput)
    const generatedFiles = await renderShortsInParallel(
      moments,
      fileInfo.foundPath,
      channelHandle,
      sendEvent,
      2
    );

    sendEvent('complete', {
      success: true,
      message: `Successfully generated ${generatedFiles.length} Shorts (< 40s with 5s retention hook)! Saved in 02_Shorts_Drafts.`,
      shorts: generatedFiles
    });

    broadcastFilesUpdate();
    res.end();

  } catch (err) {
    console.error('[Shorts Generation Error]:', err);
    let userMsg = err.message || 'AI shorts generation failed.';
    if (userMsg.includes('QUOTA_LIMIT')) {
      // Clean quota message
    } else if (userMsg.includes('429') || userMsg.toLowerCase().includes('quota') || userMsg.includes('ResourceExhausted')) {
      const retryMatch = userMsg.match(/retry in ([\d\.]+)s/i);
      const retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
      userMsg = `QUOTA_LIMIT: Gemini Free Tier quota reached (15 req/min). Resets in ~${retrySec}s. Please wait a moment or switch your API key.`;
    }
    sendEvent('error', { message: userMsg, raw: err.message });
    res.end();
  }
});

// Upload video clip directly (for Samaksh Gaming or custom shorts)
router.post('/upload-video', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file provided.' });
  }

  const uploadedFilename = req.file.filename;
  const uploadedPath = req.file.path;

  // Retrieve duration via ffprobe / ffmpeg
  exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${uploadedPath}"`, (err, stdout) => {
    let duration = 30;
    if (!err && stdout && !isNaN(parseFloat(stdout))) {
      duration = Math.round(parseFloat(stdout));
    }

    const cleanTitle = path.basename(req.file.originalname, path.extname(req.file.originalname));
    saveVideoMetadata(uploadedPath, {
      title: cleanTitle,
      duration,
      uploadedAt: Date.now(),
      channelMode: req.body.channelMode || 'gaming'
    });

    broadcastFilesUpdate();

    res.json({
      success: true,
      message: 'Video uploaded successfully!',
      file: {
        name: uploadedFilename,
        title: cleanTitle,
        duration,
        category: 'drafts',
        categoryLabel: 'Pre Ready Shorts',
        subfolder: '02_Shorts_Drafts',
        url: `/api/video/02_Shorts_Drafts/${encodeURIComponent(uploadedFilename)}`
      }
    });
  });
});

// Analyze silent/gaming video for puzzles and exciting moves (Samaksh Gaming mode)
router.post('/analyze-gaming', async (req, res) => {
  const { filename, apiKey } = req.body;
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!key || typeof key !== 'string' || !key.trim()) {
    return res.status(400).json({ error: 'Gemini API key is required.' });
  }

  if (!filename) {
    return res.status(400).json({ error: 'Video filename is required.' });
  }

  const fileInfo = findVideoFile(filename);
  if (!fileInfo) {
    return res.status(404).json({ error: 'Video file not found on disk.' });
  }

  try {
    const analysis = await analyzeGamingVideoWithoutAudio({
      videoPath: fileInfo.foundPath,
      filename,
      apiKey: key
    });

    broadcastFilesUpdate();
    res.json({ success: true, ...analysis });
  } catch (err) {
    console.error('[Gaming Analysis Error]:', err);
    let userMsg = err.message || 'AI Gaming analysis failed.';
    if (userMsg.includes('429') || userMsg.toLowerCase().includes('quota') || userMsg.includes('resourceexhausted')) {
      const retryMatch = userMsg.match(/retry in ([\d\.]+)s/i);
      const retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
      userMsg = `QUOTA_LIMIT: Gemini Free Tier quota reached (15 req/min). Resets in ~${retrySec}s. Please wait a moment or switch your API key.`;
    }
    res.status(500).json({ error: userMsg, raw: err.message });
  }
});

// Suggest 5 best viral hooks for a Short
router.post('/suggest-hooks', async (req, res) => {
  const { filename, title, apiKey } = req.body;
  try {
    const suggestedHooks = await generateSuggestedHooks({ filename, title, apiKey });
    res.json({ suggestedHooks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Burn custom top hook text, bottom comment text (for 5s) & channel handle
router.post('/burn-text', async (req, res) => {
  const { filename, topText, bottomText, channelHandle, hookDuration = 0, timerDuration = 0 } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  const fileInfo = findVideoFile(filename);
  if (!fileInfo) {
    return res.status(404).json({ error: 'Video file not found on disk' });
  }

  // Determine final ready filename based on chosen title/hook
  const baseFallback = path.basename(filename, path.extname(filename));
  const destinationFilename = (topText && typeof topText === 'string' && topText.trim())
    ? sanitizeShortsFilename(topText.trim(), baseFallback)
    : filename;

  const tempOutputPath = path.join(FOLDERS.SHORTS_READY, `temp_burn_${Date.now()}.mp4`);
  const finalReadyPath = path.join(FOLDERS.SHORTS_READY, destinationFilename);

  try {
    const result = await burnTextToShort({
      videoPath: fileInfo.foundPath,
      filename: destinationFilename,
      originalFilename: filename,
      topText,
      bottomText,
      channelHandle,
      tempOutputPath,
      finalReadyPath,
      hookDuration: Number(hookDuration) || 0,
      timerDuration: Number(timerDuration) || 0
    });

    // Update metadata
    const meta = readVideoMetadata(finalReadyPath);
    if (topText) meta.hook = topText;
    if (bottomText) meta.bottomText = bottomText;
    if (channelHandle) meta.channelHandle = channelHandle;
    meta.timerDuration = Number(timerDuration) || 0;
    saveVideoMetadata(finalReadyPath, meta);

    broadcastFilesUpdate();

    res.json({
      success: true,
      message: 'Short moved to 03_Shorts_Ready with branding!',
      ...result
    });
  } catch (err) {
    console.error('Error burning text to short:', err);
    res.status(500).json({ error: err.message || 'Failed to burn text to video' });
  }
});

export default router;
