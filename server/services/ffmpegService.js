import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { DEFAULT_DOWNLOAD_DIR, FOLDERS, findVideoFile, readVideoMetadata, saveVideoMetadata, deleteVideoMetadata } from '../config.js';

// Helper: Parse timestamp (HH:MM:SS or MM:SS or S) to total seconds
export function parseTimestampToSeconds(ts) {
  if (!ts) return 0;
  const parts = ts.toString().trim().split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0] || 0;
  return 0;
}

// Helper: Format total seconds to HH:MM:SS or MM:SS
export function formatSecondsToTimestamp(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `00:${pad(minutes)}:${pad(seconds)}`;
}

// Sanitize chosen hook or title into a clean, valid video filename for Shorts Ready
export function sanitizeShortsFilename(rawTitle, fallbackName = 'Short') {
  if (!rawTitle || typeof rawTitle !== 'string') return `${fallbackName}.mp4`;
  let clean = rawTitle
    .replace(/^Short\s*[-–—:]\s*/i, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/#shorts/gi, '')
    .replace(/\bshorts\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');

  if (clean.length > 90) {
    clean = clean.substring(0, 90).trim().replace(/[. ]+$/, '');
  }
  if (!clean) clean = fallbackName;
  if (!clean.toLowerCase().endsWith('.mp4')) {
    clean += '.mp4';
  }
  return clean;
}

// Smart text wrapper for 9:16 Shorts title hook to match preview wrap format
export function wrapTextForShorts(text, maxCharsPerLine = 28) {
  if (!text || typeof text !== 'string') return '';
  const lines = text.trim().split(/\r?\n/);
  const wrappedLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else {
        const testLine = `${currentLine} ${word}`;
        if (testLine.length <= maxCharsPerLine) {
          currentLine = testLine;
        } else {
          wrappedLines.push(currentLine);
          currentLine = word;
        }
      }
    }
    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  }

  return wrappedLines.join('\n');
}

// Helper: Build FFmpeg drawtext filter graph using UTF-8 text files
// hookDuration: Number of seconds the retention hook is active at the start. 0 = visible across the whole video (default: 0)
export function buildDrawTextFilters(topText, bottomText, tempFilesTracker, hookDuration = 0, topOffset = 6, bottomOffset = 4) {
  const filters = [];
  // Use Windows Segoe UI Emoji font to render full emojis without missing box glyphs
  const fontPath = fs.existsSync('C:/Windows/Fonts/seguiemj.ttf')
    ? '/Windows/Fonts/seguiemj.ttf'
    : '/Windows/Fonts/arialbd.ttf';

  const topPx = Math.round((Number(topOffset || 6) / 100) * 1920);
  const botPx = Math.round((Number(bottomOffset || 4) / 100) * 1920);

  if (topText && typeof topText === 'string' && topText.trim()) {
    // Wrap text into clean multi-line format matching the live editing preview (2-3 lines max, centered)
    const wrappedTop = wrapTextForShorts(topText, 28);
    const topFile = path.join(DEFAULT_DOWNLOAD_DIR, `temp_txt_top_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`);
    fs.writeFileSync(topFile, wrappedTop, 'utf8');
    tempFilesTracker.push(topFile);
    const normalizedPath = topFile.replace(/\\/g, '/').replace(/^([A-Za-z]):/, '');
    const durationFilter = (hookDuration && hookDuration > 0) ? `:enable='between(t,0,${hookDuration})'` : '';
    filters.push(`drawtext=fontfile='${fontPath}':textfile='${normalizedPath}':expansion=none:fontsize=48:line_spacing=16:text_align=C:fontcolor=yellow:borderw=2:bordercolor=black@0.8:box=1:boxcolor=black@0.75:boxborderw=20:x=(w-text_w)/2:y=${topPx}${durationFilter}`);
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
    filters.push(`drawtext=fontfile='${fontPath}':textfile='${normalizedPath}':expansion=none:fontsize=38:line_spacing=10:text_align=C:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=14:x=(w-text_w)/2:y=h-${botPx + 100}`);
  }

  return filters.join(',');
}

// Render a single 9:16 vertical Short (Clean render: NO burned hook or username)
// Hook and branding are customized in review step and burned on "Apply to Video"
export async function renderSingleShort({
  videoPath,
  moment,
  cleanSafeTitle,
  outputShortPath
}) {
  // Clean 9:16 vertical render with blurred background (zero burned text or watermark)
  const filterGraph = `split[a][b];[a]scale=180:320:force_original_aspect_ratio=increase,crop=180:320,boxblur=5:2,scale=1080:1920[bg];[b]scale=1080:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`;

  const ffmpegCmd = `ffmpeg -ss ${moment.start} -to ${moment.end} -i "${videoPath}" -vf "${filterGraph}" -preset ultrafast -c:v libx264 -crf 23 -c:a aac -threads 0 -y "${outputShortPath}"`;

  return new Promise((resolve, reject) => {
    exec(ffmpegCmd, (err) => {
      if (err) {
        console.error(`[FFmpeg] Render failed for "${cleanSafeTitle}":`, err.message);
        return reject(err);
      }

      // Save clip metadata to 04_Metadata
      const primaryHook = moment.hook || (Array.isArray(moment.suggestedHooks) && moment.suggestedHooks[0]) || '';
      const suggestedHooksList = (Array.isArray(moment.suggestedHooks) && moment.suggestedHooks.length > 0)
        ? moment.suggestedHooks.slice(0, 5)
        : (primaryHook ? [primaryHook] : []);

      saveVideoMetadata(outputShortPath, {
        title: cleanSafeTitle,
        hook: primaryHook,
        suggestedHooks: suggestedHooksList,
        start: moment.start,
        end: moment.end,
        duration: moment.duration,
        sourceVideo: path.basename(videoPath)
      });

      resolve({
        name: path.basename(outputShortPath),
        title: cleanSafeTitle,
        hook: primaryHook,
        suggestedHooks: suggestedHooksList,
        duration: moment.duration,
        category: 'drafts',
        categoryLabel: 'Pre Ready Shorts',
        subfolder: '02_Shorts_Drafts',
        url: `/api/video/02_Shorts_Drafts/${encodeURIComponent(path.basename(outputShortPath))}`
      });
    });
  });
}

// Parallel Render Pool: Renders moments concurrently with worker limit
export async function renderShortsInParallel(moments, videoPath, channelHandle, sendEvent, concurrency = 2) {
  const generatedFiles = [];
  let completedCount = 0;
  const total = moments.length;

  // Worker queue processor
  let queueIndex = 0;
  async function worker() {
    while (queueIndex < total) {
      const idx = queueIndex++;
      const moment = moments[idx];

      const cleanSafeTitle = (moment.title || `Clip_${idx + 1}`)
        .replace(/^Short\s*[-–—:]\s*/i, '')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/#shorts/gi, '')
        .replace(/\bshorts\b/gi, '')
        .trim();
      const shortFilename = `${cleanSafeTitle || `Clip_${idx + 1}`}.mp4`;
      const outputShortPath = path.join(FOLDERS.SHORTS_DRAFTS, shortFilename);

      sendEvent('status', {
        phase: 'rendering',
        message: `Rendering clip ${idx + 1}/${total}: "${cleanSafeTitle}" (9:16, ${moment.duration}s)...`,
        current: idx + 1,
        total: total,
        title: cleanSafeTitle
      });

      try {
        const fileData = await renderSingleShort({
          videoPath,
          moment,
          cleanSafeTitle,
          outputShortPath
        });
        generatedFiles.push(fileData);
        completedCount++;
        console.log(`[FFmpeg Parallel] Finished clip ${completedCount}/${total}: "${cleanSafeTitle}"`);
      } catch (err) {
        console.error(`[FFmpeg Parallel] Skipped failed clip ${idx + 1}: ${err.message}`);
      }
    }
  }

  // Launch concurrent workers
  const workerPool = [];
  const workerCount = Math.min(concurrency, total);
  for (let w = 0; w < workerCount; w++) {
    workerPool.push(worker());
  }

  await Promise.all(workerPool);
  return generatedFiles;
}

// Locate Chrome or Edge browser on the machine for pixel-perfect title overlay rendering
export function getBrowserExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// Generate an ultra-high resolution transparent overlay PNG via headless Chrome/Edge
// This renders true full-color Unicode emojis (🤣, ♟️, 🤯, etc.), rounded corners, glowing borders,
// and exact human-designed aesthetics matching the live React preview.
export async function generateShortsOverlayPng({
  topText,
  bottomText,
  channelHandle,
  topOffset = 6,
  bottomOffset = 4,
  isGaming = false,
  outputPath
}) {
  const browserPath = getBrowserExecutable();
  if (!browserPath) {
    throw new Error('No Chromium browser found for rendering overlay');
  }

  const topPx = Math.round((Number(topOffset !== undefined ? topOffset : (isGaming ? 6 : 9)) / 100) * 1920);
  const bottomPx = Math.round((Number(bottomOffset !== undefined ? bottomOffset : (isGaming ? 4 : 12)) / 100) * 1920);

  const wrappedText = wrapTextForShorts(topText, 28);
  const safeHandle = channelHandle && channelHandle.trim()
    ? (channelHandle.trim().startsWith('@') ? channelHandle.trim() : `@${channelHandle.trim()}`)
    : '';

  const escapeHtml = (str) => (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const safeTopHtml = escapeHtml(wrappedText);
  const safeBottomHtml = escapeHtml(bottomText && bottomText.trim() ? bottomText.trim() : '');
  const safeHandleHtml = escapeHtml(safeHandle);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1080px;
    height: 1920px;
    background: transparent;
    position: relative;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  .hook-title-card {
    position: absolute;
    top: ${topPx}px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.88);
    border: 3.5px solid ${isGaming ? 'rgba(56, 189, 248, 0.75)' : 'rgba(250, 204, 21, 0.65)'};
    border-radius: 24px;
    padding: 16px 36px;
    box-shadow: 0 12px 38px rgba(0, 0, 0, 0.94);
    max-width: 960px;
    text-align: center;
    width: max-content;
  }
  .hook-title-text {
    color: ${isGaming ? '#38bdf8' : '#facc15'};
    font-weight: 800;
    font-size: 46px;
    line-height: 1.35;
    letter-spacing: -0.01em;
    word-break: break-word;
    white-space: pre-line;
  }
  .bottom-branding-group {
    position: absolute;
    bottom: ${bottomPx}px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: max-content;
    max-width: 960px;
  }
  .cta-comment-pill {
    background: rgba(15, 23, 42, 0.92);
    border: 3px solid rgba(56, 189, 248, 0.7);
    border-radius: 9999px;
    padding: 16px 36px;
    color: #38bdf8;
    font-size: 38px;
    font-weight: 800;
    letter-spacing: 0.02em;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.85), 0 0 24px rgba(56, 189, 248, 0.4);
    text-align: center;
    white-space: nowrap;
  }
  .watermark-pill {
    background: rgba(0, 0, 0, 0.82);
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 9999px;
    padding: 10px 28px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.75);
    color: #ffffff;
    font-size: 32px;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-align: center;
    width: max-content;
  }
</style>
    width: max-content;
  }
</style>
</head>
<body>
  ${safeTopHtml ? `
  <div class="hook-title-card">
    <div class="hook-title-text">${safeTopHtml}</div>
  </div>` : ''}

  <div class="bottom-branding-group">
    ${safeBottomHtml ? `
    <div class="cta-comment-pill">
      ${safeBottomHtml}
    </div>` : ''}

    ${safeHandleHtml ? `
    <div class="watermark-pill">
      ${safeHandleHtml}
    </div>` : ''}
  </div>
</body>
</html>`;

  const tempHtmlPath = outputPath.replace(/\.png$/i, '.html');
  fs.writeFileSync(tempHtmlPath, html, 'utf8');

  try {
    const cmd = `"${browserPath}" --headless=new --disable-gpu --default-background-color=00000000 --screenshot="${outputPath}" --window-size=1080,1920 "file:///${tempHtmlPath.replace(/\\/g, '/')}"`;
    await new Promise((resolve, reject) => {
      exec(cmd, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      try { fs.unlinkSync(tempHtmlPath); } catch (e) {}
    }
  }
}

// Burn custom top hook text & channel handle to a Short (hookDuration = 0 for whole video)
export async function burnTextToShort({
  videoPath,
  filename,
  originalFilename,
  topText,
  bottomText,
  channelHandle,
  tempOutputPath,
  finalReadyPath,
  hookDuration = 0,
  timerDuration = 0,
  timerDelay = 0,
  topOffset,
  bottomOffset,
  channel
}) {
  const tempFilesTracker = [];
  try {
    const hasTop = topText && typeof topText === 'string' && topText.trim();
    const hasBottom = bottomText && typeof bottomText === 'string' && bottomText.trim();
    const hasHandle = channelHandle && typeof channelHandle === 'string' && channelHandle.trim();
    if (!hasTop && !hasBottom && !hasHandle) {
      throw new Error('Please enter top hook text, bottom comment text, or a channel watermark to apply.');
    }

    let meta = readVideoMetadata(videoPath);
    const isGamingChannel = channel === 'samaksh_gaming' || (channelHandle && channelHandle.toLowerCase().includes('gaming'));

    const effectiveTopOffset = topOffset !== undefined && !isNaN(Number(topOffset))
      ? Number(topOffset)
      : (isGamingChannel ? 6 : 9);
    const effectiveBottomOffset = bottomOffset !== undefined && !isNaN(Number(bottomOffset))
      ? Number(bottomOffset)
      : (isGamingChannel ? 4 : 12);

    // Generate high-resolution transparent overlay PNG via headless Chrome/Edge for genuine human design & full-color emojis
    const overlayPngPath = path.join(DEFAULT_DOWNLOAD_DIR, `overlay_${Date.now()}_${Math.random().toString(36).substring(7)}.png`);
    tempFilesTracker.push(overlayPngPath);

    let overlaySuccess = false;
    try {
      await generateShortsOverlayPng({
        topText: hasTop ? topText : '',
        bottomText: hasBottom ? bottomText : '',
        channelHandle: hasHandle ? channelHandle : '',
        topOffset: effectiveTopOffset,
        bottomOffset: effectiveBottomOffset,
        isGaming: isGamingChannel,
        outputPath: overlayPngPath
      });
      if (fs.existsSync(overlayPngPath) && fs.statSync(overlayPngPath).size > 1000) {
        overlaySuccess = true;
      }
    } catch (overlayErr) {
      console.warn('[Overlay] Headless browser overlay failed, using drawtext fallback:', overlayErr.message);
    }

    let ffmpegCmd = '';
    const sourceFound = meta.sourceVideo ? findVideoFile(meta.sourceVideo) : null;
    const overlayEnable = (hookDuration && hookDuration > 0) ? `:enable='between(t,0,${hookDuration})'` : '';

    // Countdown timer filter with configurable start delay (default 2s for gaming) & safe letterbox coordinates
    const timerSec = Number(timerDuration) || 0;
    const delaySec = timerDelay !== undefined && timerDelay !== null && !isNaN(Number(timerDelay))
      ? Number(timerDelay)
      : (isGamingChannel ? 2 : 0);
    const hasTimer = timerSec > 0;
    const endSec = delaySec + timerSec;

    // Chessboard in 1080x1920 occupies y=420 to y=1500 (21.875% to 78.125%).
    // Top letterbox is y=0 to y=420.
    // Placing timer at y=295 ensures it stays comfortably in the top letterbox and ~125px ABOVE the chessboard!
    const topPx = Math.round((effectiveTopOffset / 100) * 1920);
    const timerY = Math.min(340, Math.max(220, topPx + 160));

    const timerDrawFilter = hasTimer
      ? `drawtext=fontfile='/Windows/Fonts/arialbd.ttf':text='⏳ 0%{eif\\:max(1\\, ${endSec}-t)\\:d}s':x=(w-tw)/2:y=${timerY}:fontsize=48:fontcolor=0xfacc15:box=1:boxcolor=0x000000D0:boxborderw=16:enable='between(t\\,${delaySec}\\,${endSec})',drawtext=fontfile='/Windows/Fonts/arialbd.ttf':text='TIME UP! 🔥':x=(w-tw)/2:y=${timerY}:fontsize=48:fontcolor=0xef4444:box=1:boxcolor=0x000000D0:boxborderw=16:enable='between(t\\,${endSec}\\,${endSec + 1.8})'`
      : '';

    if (sourceFound && sourceFound.foundPath && fs.existsSync(sourceFound.foundPath) && meta.start && meta.end) {
      // Clean re-render from pristine source video
      if (overlaySuccess) {
        const filterGraph = hasTimer
          ? `split[a][b];[a]scale=180:320:force_original_aspect_ratio=increase,crop=180:320,boxblur=5:2,scale=1080:1920[bg];[b]scale=1080:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[base];[base][1:v]overlay=0:0${overlayEnable}[ov];[ov]${timerDrawFilter}`
          : `split[a][b];[a]scale=180:320:force_original_aspect_ratio=increase,crop=180:320,boxblur=5:2,scale=1080:1920[bg];[b]scale=1080:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[base];[base][1:v]overlay=0:0${overlayEnable}`;
        ffmpegCmd = `ffmpeg -ss ${meta.start} -to ${meta.end} -i "${sourceFound.foundPath}" -i "${overlayPngPath}" -filter_complex "${filterGraph}" -preset ultrafast -c:v libx264 -crf 23 -c:a aac -threads 0 -y "${tempOutputPath}"`;
      } else {
        const drawFilters = buildDrawTextFilters(topText, channelHandle, tempFilesTracker, hookDuration, effectiveTopOffset, effectiveBottomOffset);
        const filterGraph = `split[a][b];[a]scale=180:320:force_original_aspect_ratio=increase,crop=180:320,boxblur=5:2,scale=1080:1920[bg];[b]scale=1080:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,${drawFilters}`;
        ffmpegCmd = `ffmpeg -ss ${meta.start} -to ${meta.end} -i "${sourceFound.foundPath}" -vf "${filterGraph}" -preset ultrafast -c:v libx264 -crf 23 -c:a aac -threads 0 -y "${tempOutputPath}"`;
      }
    } else {
      // Apply overlay directly onto current video
      if (overlaySuccess) {
        const filterGraph = hasTimer
          ? `[0:v][1:v]overlay=0:0${overlayEnable}[ov];[ov]${timerDrawFilter}`
          : `[0:v][1:v]overlay=0:0${overlayEnable}`;
        ffmpegCmd = `ffmpeg -i "${videoPath}" -i "${overlayPngPath}" -filter_complex "${filterGraph}" -preset ultrafast -c:v libx264 -crf 23 -c:a copy -threads 0 -y "${tempOutputPath}"`;
      } else {
        const drawFilters = buildDrawTextFilters(topText, channelHandle, tempFilesTracker, hookDuration, effectiveTopOffset, effectiveBottomOffset);
        ffmpegCmd = `ffmpeg -i "${videoPath}" -vf "${drawFilters}" -preset ultrafast -c:v libx264 -crf 23 -c:a copy -threads 0 -y "${tempOutputPath}"`;
      }
    }

    await new Promise((resolve, reject) => {
      exec(ffmpegCmd, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve();
      });
    });

    // Move to 03_Shorts_Ready and remove previous draft/ready file
    let targetPath = finalReadyPath;
    let targetFilename = filename;

    try {
      if (fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath);
        } catch (unlinkErr) {
          console.warn(`[burnTextToShort] Cannot unlink existing target ${targetPath}:`, unlinkErr.message);
          const ext = path.extname(filename);
          const base = path.basename(filename, ext);
          targetFilename = `${base}_${Date.now()}${ext}`;
          targetPath = path.join(FOLDERS.SHORTS_READY, targetFilename);
        }
      }
      fs.renameSync(tempOutputPath, targetPath);
    } catch (replaceErr) {
      try {
        fs.copyFileSync(tempOutputPath, targetPath);
        try { fs.unlinkSync(tempOutputPath); } catch (e) {}
      } catch (copyErr) {
        const ext = path.extname(filename);
        const base = path.basename(filename, ext);
        targetFilename = `${base} (branded)${ext}`;
        targetPath = path.join(FOLDERS.SHORTS_READY, targetFilename);
        fs.renameSync(tempOutputPath, targetPath);
      }
    }

    // Clean up original file and original draft if different or moved
    if (videoPath !== targetPath && fs.existsSync(videoPath)) {
      try { fs.unlinkSync(videoPath); } catch (e) {}
    }
    if (originalFilename && originalFilename !== targetFilename) {
      const oldDraftPath = path.join(FOLDERS.SHORTS_DRAFTS, originalFilename);
      const oldReadyPath = path.join(FOLDERS.SHORTS_READY, originalFilename);
      try { if (fs.existsSync(oldDraftPath)) fs.unlinkSync(oldDraftPath); } catch (e) {}
      try { if (fs.existsSync(oldReadyPath)) fs.unlinkSync(oldReadyPath); } catch (e) {}
      deleteVideoMetadata(originalFilename);
    }

    // Ensure draft copy in 02_Shorts_Drafts is cleaned up when graduating to 03_Shorts_Ready
    const origDraft = path.join(FOLDERS.SHORTS_DRAFTS, originalFilename || filename);
    if (fs.existsSync(origDraft) && origDraft !== targetPath) {
      try { fs.unlinkSync(origDraft); } catch (e) {}
    }
    if (originalFilename && originalFilename !== targetFilename) {
      deleteVideoMetadata(originalFilename);
    }

    // Save metadata in 04_Metadata with title matching chosen filename
    meta.title = path.basename(targetFilename, path.extname(targetFilename));
    meta.hook = topText;
    if (channelHandle) meta.channelHandle = channelHandle;
    saveVideoMetadata(targetPath, meta);

    return {
      filename: targetFilename,
      title: meta.title,
      category: 'ready',
      subfolder: '03_Shorts_Ready',
      url: `/api/video/03_Shorts_Ready/${encodeURIComponent(targetFilename)}?t=${Date.now()}`
    };
  } finally {
    for (const f of tempFilesTracker) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
    }
    try { if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath); } catch (e) {}
  }
}
