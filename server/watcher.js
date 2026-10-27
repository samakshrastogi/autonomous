import chokidar from 'chokidar';
import path from 'path';
import { FOLDERS, getAllVideoFiles } from './config.js';

// Set of connected SSE clients
const sseClients = new Set();
let watcher = null;
let debounceTimer = null;

// Register a new client for persistent real-time server events
export function registerEventsClient(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial state immediately upon connection
  const initialData = getAllVideoFiles();
  res.write(`event: files_updated\ndata: ${JSON.stringify(initialData)}\n\n`);

  sseClients.add(res);
  console.log(`[Real-time Events] Client connected. Total active clients: ${sseClients.size}`);

  req.on('close', () => {
    sseClients.delete(res);
    console.log(`[Real-time Events] Client disconnected. Active clients: ${sseClients.size}`);
  });
}

// Broadcast an event to all connected UI clients
export function broadcastEvent(event, data) {
  if (sseClients.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (err) {
      sseClients.delete(client);
    }
  }
}

// Broadcast updated files state with 300ms debounce
export function broadcastFilesUpdate() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const data = getAllVideoFiles();
    broadcastEvent('files_updated', data);
    console.log(`[Real-time Watcher] Pushed real-time update: ${data.counts.all} total videos`);
  }, 300);
}

// Initialize disk watcher
export function initFileWatcher() {
  const watchPaths = [
    FOLDERS.DOWNLOADS,
    FOLDERS.SHORTS_DRAFTS,
    FOLDERS.SHORTS_READY
  ];

  watcher = chokidar.watch(watchPaths, {
    ignored: [
      /(^|[\/\\])\../,            // ignore dotfiles
      /temp_/,                    // ignore temporary render/audio files
      /\.txt$/,                   // ignore temporary drawtext files
      /\.part$/,                  // ignore in-progress download parts
      /\.ytdl$/
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 1200,   // wait until file stops changing for 1.2s
      pollInterval: 250
    }
  });

  const handleFsChange = (eventType, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    // Only react to video files and json metadata
    if (ext === '.mp4' || ext === '.mkv' || ext === '.webm' || ext === '.json') {
      const baseName = path.basename(filePath);
      if (!baseName.startsWith('temp_')) {
        console.log(`[Disk Watcher] ${eventType}: ${baseName}`);
        broadcastFilesUpdate();
      }
    }
  };

  watcher.on('add', (p) => handleFsChange('ADD', p));
  watcher.on('change', (p) => handleFsChange('CHANGE', p));
  watcher.on('unlink', (p) => handleFsChange('REMOVE', p));
  watcher.on('error', (err) => console.error('[Disk Watcher Error]:', err));

  // Heartbeat ping every 25 seconds to keep connections alive
  setInterval(() => {
    broadcastEvent('ping', { time: Date.now() });
  }, 25000);

  console.log('[Disk Watcher] Active on video directories with real-time UI broadcasting.');
}
