import express from 'express';
import cors from 'cors';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Default video download directory as requested
const DEFAULT_DOWNLOAD_DIR = 'C:\\Users\\Samaksh Rastogi\\downloads\\videos';

// Ensure the directory exists
if (!fs.existsSync(DEFAULT_DOWNLOAD_DIR)) {
  try {
    fs.mkdirSync(DEFAULT_DOWNLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error(`Could not create default download dir: ${err.message}`);
  }
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
        defaultDir: DEFAULT_DOWNLOAD_DIR
      });
    }
    res.json({
      ok: true,
      ytdlpInstalled: true,
      version: stdout.trim(),
      defaultDir: DEFAULT_DOWNLOAD_DIR
    });
  });
});

// API: Open download folder in Windows Explorer
app.post('/api/open-folder', (req, res) => {
  const targetDir = req.body.dir || DEFAULT_DOWNLOAD_DIR;
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

// API: List recent files in download directory
app.get('/api/files', (req, res) => {
  const targetDir = req.query.dir || DEFAULT_DOWNLOAD_DIR;
  if (!fs.existsSync(targetDir)) {
    return res.json({ files: [] });
  }

  try {
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile() && (e.name.endsWith('.mp4') || e.name.endsWith('.mkv') || e.name.endsWith('.webm')))
      .map((e) => {
        const fullPath = path.join(targetDir, e.name);
        const stats = fs.statSync(fullPath);
        return {
          name: e.name,
          size: stats.size,
          mtime: stats.mtimeMs,
          ext: path.extname(e.name).toLowerCase(),
          url: `/api/video/${encodeURIComponent(e.name)}`
        };
      })
      // Sort newest first
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 30);

    res.json({ files, directory: targetDir });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Stream video file directly to browser for in-frame playback
app.get('/api/video/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(DEFAULT_DOWNLOAD_DIR, filename);

    // Prevent directory traversal
    if (!path.resolve(filePath).startsWith(path.resolve(DEFAULT_DOWNLOAD_DIR))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // res.sendFile handles byte ranges (HTTP 206) automatically for smooth seeking
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Download video with Server-Sent Events (SSE) for live streaming progress
app.post('/api/download', (req, res) => {
  const { url, outputDir } = req.body;
  const targetDir = outputDir || DEFAULT_DOWNLOAD_DIR;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Please provide a valid YouTube URL.' });
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
