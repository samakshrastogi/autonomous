import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import {
  ROOT_VIDEOS_DIR,
  FOLDERS,
  getAllVideoFiles,
  findVideoFile,
  PROJECT_ROOT,
  deleteVideoMetadata
} from '../config.js';
import { registerEventsClient, broadcastFilesUpdate } from '../watcher.js';
import { analyzeVideoAudioForShorts, generateSuggestedHooks } from '../services/geminiService.js';
import { renderShortsInParallel, burnTextToShort, sanitizeShortsFilename } from '../services/ffmpegService.js';
import { startVideoDownload } from '../services/downloadService.js';

const router = express.Router();

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

// Open download folder in Windows Explorer
router.post('/open-folder', (req, res) => {
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

  exec(`explorer.exe "${targetDir}"`, (err) => {
    if (err) {
      console.error('Failed to open explorer:', err);
      return res.status(500).json({ error: 'Failed to open directory' });
    }
    res.json({ success: true, path: targetDir });
  });
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
    sendEvent('error', { message: err.message });
    res.end();
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

// Burn custom top hook text (for 5s) & channel handle
router.post('/burn-text', async (req, res) => {
  const { filename, topText, channelHandle, hookDuration = 0 } = req.body;
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
      channelHandle,
      tempOutputPath,
      finalReadyPath,
      hookDuration: Number(hookDuration) || 0
    });

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
