import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { DEFAULT_DOWNLOAD_DIR, FOLDERS, findVideoFile } from '../config.js';

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

// Helper: Build FFmpeg drawtext filter graph using UTF-8 text files
// hookDuration: Number of seconds the retention hook is active at the start (default 5s)
export function buildDrawTextFilters(topText, bottomText, tempFilesTracker, hookDuration = 5) {
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

// Render a single 9:16 vertical Short with 5s retention hook
export async function renderSingleShort({
  videoPath,
  moment,
  cleanSafeTitle,
  outputShortPath,
  channelHandle
}) {
  const tempRenderFiles = [];
  const primaryHook = moment.hook || (Array.isArray(moment.suggestedHooks) && moment.suggestedHooks[0]) || '';
  const drawFilters = buildDrawTextFilters(primaryHook, channelHandle, tempRenderFiles, 5);

  let filterGraph = `split[a][b];[a]scale=180:320:force_original_aspect_ratio=increase,crop=180:320,boxblur=5:2,scale=1080:1920[bg];[b]scale=1080:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`;
  if (drawFilters) {
    filterGraph += `,${drawFilters}`;
  }

  const ffmpegCmd = `ffmpeg -ss ${moment.start} -to ${moment.end} -i "${videoPath}" -vf "${filterGraph}" -preset ultrafast -c:v libx264 -crf 23 -c:a aac -threads 0 -y "${outputShortPath}"`;

  return new Promise((resolve, reject) => {
    exec(ffmpegCmd, (err) => {
      // Cleanup temp text files
      for (const f of tempRenderFiles) {
        try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
      }

      if (err) {
        console.error(`[FFmpeg] Render failed for "${cleanSafeTitle}":`, err.message);
        return reject(err);
      }

      // Save clip metadata alongside video
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
        message: `Rendering clip ${idx + 1}/${total}: "${cleanSafeTitle}" (9:16, 5s hook, ${moment.duration}s)...`,
        current: idx + 1,
        total: total,
        title: cleanSafeTitle
      });

      try {
        const fileData = await renderSingleShort({
          videoPath,
          moment,
          cleanSafeTitle,
          outputShortPath,
          channelHandle
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

// Burn custom top hook text (for 5s) & channel handle to a Short
export async function burnTextToShort({
  videoPath,
  filename,
  topText,
  channelHandle,
  tempOutputPath,
  finalReadyPath
}) {
  const tempFilesTracker = [];
  try {
    const drawFilters = buildDrawTextFilters(topText, channelHandle, tempFilesTracker, 5);
    if (!drawFilters) {
      throw new Error('Please enter top hook text or a channel watermark to apply.');
    }

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

        return {
          filename: brandedName,
          category: 'ready',
          subfolder: '03_Shorts_Ready',
          url: `/api/video/03_Shorts_Ready/${encodeURIComponent(brandedName)}?t=${Date.now()}`
        };
      }
    }

    meta.hook = topText;
    if (channelHandle) meta.channelHandle = channelHandle;
    const readyMetaPath = `${finalReadyPath}.json`;
    try { fs.writeFileSync(readyMetaPath, JSON.stringify(meta, null, 2), 'utf8'); } catch (e) {}
    if (metaPath !== readyMetaPath && fs.existsSync(metaPath)) {
      try { fs.unlinkSync(metaPath); } catch (e) {}
    }

    return {
      filename: filename,
      category: 'ready',
      subfolder: '03_Shorts_Ready',
      url: `/api/video/03_Shorts_Ready/${encodeURIComponent(filename)}?t=${Date.now()}`
    };
  } finally {
    for (const f of tempFilesTracker) {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) {}
    }
    try { if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath); } catch (e) {}
  }
}
