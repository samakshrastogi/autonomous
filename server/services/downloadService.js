import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { FOLDERS } from '../config.js';

export function startVideoDownload({ url, outputDir, sendEvent, onFinish }) {
  const targetDir = outputDir || FOLDERS.DOWNLOADS;

  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new Error('Please provide a valid video link.');
  }

  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {
      throw new Error(`Cannot create folder ${targetDir}: ${e.message}`);
    }
  }

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

  console.log(`[Download] Starting download in ${targetDir}: ${url.trim()}`);

  const child = spawn('yt-dlp', args, {
    cwd: targetDir,
    windowsHide: true
  });

  let downloadedFileName = '';

  const handleOutput = (chunk, isStderr = false) => {
    const lines = chunk.toString().split(/\r?\n/).filter(line => line.trim().length > 0);

    for (const line of lines) {
      console.log(`[yt-dlp] ${line}`);
      sendEvent('log', { text: line, isError: isStderr });

      const destMatch = line.match(/(?:Destination:\s+|Merging formats into\s+["']?)([^"'\n\r]+)/i) ||
                        line.match(/\[download\]\s+([^"'\n\r]+\.mp4)\s+has already been downloaded/i);
      if (destMatch && destMatch[1]) {
        downloadedFileName = path.basename(destMatch[1].replace(/["']/g, '').trim());
        sendEvent('title', { filename: downloadedFileName });
      }

      const progressMatch = line.match(/\[download\]\s+([\d\.]+)%\s+of\s+([^\s]+)(?:\s+at\s+([^\s]+))?(?:\s+ETA\s+([^\s]+))?/i);
      if (progressMatch) {
        sendEvent('progress', {
          percent: parseFloat(progressMatch[1]),
          size: progressMatch[2] || '',
          speed: progressMatch[3] || '',
          eta: progressMatch[4] || ''
        });
      }

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
    if (onFinish) onFinish(err);
  });

  child.on('close', (code) => {
    if (code === 0) {
      sendEvent('complete', {
        message: 'Download completed successfully!',
        filename: downloadedFileName,
        directory: targetDir,
        success: true
      });
      if (onFinish) onFinish(null, downloadedFileName);
    } else {
      sendEvent('error', {
        message: `yt-dlp process exited with error code ${code}`,
        success: false
      });
      if (onFinish) onFinish(new Error(`Exit code ${code}`));
    }
  });

  return child;
}
