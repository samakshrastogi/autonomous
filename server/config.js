import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, '..');

// Video folders by status
export const ROOT_VIDEOS_DIR = process.env.DOWNLOAD_DIR || 'C:\\Users\\Samaksh Rastogi\\downloads\\videos';
export const DEFAULT_DOWNLOAD_DIR = ROOT_VIDEOS_DIR;

export const FOLDERS = {
  DOWNLOADS: path.join(ROOT_VIDEOS_DIR, '01_Downloads'),
  SHORTS_DRAFTS: path.join(ROOT_VIDEOS_DIR, '02_Shorts_Drafts'),
  SHORTS_READY: path.join(ROOT_VIDEOS_DIR, '03_Shorts_Ready'),
  METADATA: path.join(ROOT_VIDEOS_DIR, '04_Metadata')
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

// Resolve the primary metadata path for a video inside 04_Metadata
export function getMetadataPath(videoPathOrFilename) {
  const cleanName = path.basename(videoPathOrFilename);
  const baseName = path.basename(cleanName, path.extname(cleanName));
  return path.join(FOLDERS.METADATA, `${baseName}.json`);
}

// Read video metadata from 04_Metadata with backwards compatibility
export function readVideoMetadata(videoPathOrFilename) {
  if (!videoPathOrFilename) return {};
  const cleanName = path.basename(videoPathOrFilename);
  const baseName = path.basename(cleanName, path.extname(cleanName));

  const candidates = [
    path.join(FOLDERS.METADATA, `${baseName}.json`),
    path.join(FOLDERS.METADATA, `${cleanName}.json`),
    `${videoPathOrFilename}.json`,
    path.join(path.dirname(videoPathOrFilename), `${cleanName}.json`),
    path.join(path.dirname(videoPathOrFilename), `${baseName}.json`)
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf8'));
      } catch (e) {}
    }
  }
  return {};
}

// Save video metadata to 04_Metadata and purge any legacy adjacent .json
export function saveVideoMetadata(videoPathOrFilename, metaData) {
  if (!videoPathOrFilename || !metaData) return;
  if (!fs.existsSync(FOLDERS.METADATA)) {
    try { fs.mkdirSync(FOLDERS.METADATA, { recursive: true }); } catch (e) {}
  }

  const targetPath = getMetadataPath(videoPathOrFilename);
  try {
    fs.writeFileSync(targetPath, JSON.stringify(metaData, null, 2), 'utf8');
  } catch (err) {
    console.error(`Failed to save metadata to ${targetPath}:`, err.message);
  }

  // Clean up any legacy adjacent .json
  const cleanName = path.basename(videoPathOrFilename);
  const legacyCandidates = [
    `${videoPathOrFilename}.json`,
    path.join(path.dirname(videoPathOrFilename), `${cleanName}.json`),
    path.join(FOLDERS.METADATA, `${cleanName}.json`)
  ];
  legacyCandidates.forEach((legacy) => {
    if (legacy !== targetPath && fs.existsSync(legacy)) {
      try { fs.unlinkSync(legacy); } catch (e) {}
    }
  });
}

// Delete video metadata when a video is deleted or moved
export function deleteVideoMetadata(videoPathOrFilename) {
  if (!videoPathOrFilename) return;
  const cleanName = path.basename(videoPathOrFilename);
  const baseName = path.basename(cleanName, path.extname(cleanName));

  const candidates = [
    path.join(FOLDERS.METADATA, `${baseName}.json`),
    path.join(FOLDERS.METADATA, `${cleanName}.json`),
    `${videoPathOrFilename}.json`,
    path.join(path.dirname(videoPathOrFilename), `${cleanName}.json`)
  ];

  candidates.forEach((p) => {
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch (e) {}
    }
  });
}

// Automatically migrate all loose .json metadata files from video folders into 04_Metadata
export function autoMigrateMetadataFiles() {
  try {
    if (!fs.existsSync(FOLDERS.METADATA)) {
      fs.mkdirSync(FOLDERS.METADATA, { recursive: true });
    }
    const checkFolders = [
      FOLDERS.DOWNLOADS,
      FOLDERS.SHORTS_DRAFTS,
      FOLDERS.SHORTS_READY,
      ROOT_VIDEOS_DIR
    ];
    for (const dir of checkFolders) {
      if (!fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const srcPath = path.join(dir, entry.name);
          const cleanBase = entry.name.replace(/\.(mp4|mkv|webm)\.json$/i, '.json');
          const destPath = path.join(FOLDERS.METADATA, cleanBase);
          try {
            if (fs.existsSync(destPath)) {
              fs.unlinkSync(destPath);
            }
            fs.renameSync(srcPath, destPath);
            console.log(`[Auto-Organize Metadata] Moved ${entry.name} -> 04_Metadata/${cleanBase}`);
          } catch (e) {
            console.warn(`[Auto-Organize Metadata] Could not move ${entry.name}:`, e.message);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Auto-Organize Metadata Error]:', err);
  }
}

// Auto-migrate any unorganized root video files into subfolders
export function autoMigrateLegacyFiles() {
  try {
    autoMigrateMetadataFiles();

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

// Helper: Locate a video across all subfolders
export function findVideoFile(filename) {
  const cleanName = path.basename(filename);
  const searchDirs = [
    FOLDERS.SHORTS_READY,
    FOLDERS.SHORTS_DRAFTS,
    FOLDERS.DOWNLOADS,
    ROOT_VIDEOS_DIR
  ];
  for (const dir of searchDirs) {
    const p = path.join(dir, cleanName);
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

// Helper: Read and calculate all files, counts, and sizes
export function getAllVideoFiles() {
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

            const meta = readVideoMetadata(fullPath);
            let channel = meta.channel || meta.channelId;
            if (!channel) {
              const lowerName = entry.name.toLowerCase();
              const lowerHandle = (meta.channelHandle || '').toLowerCase();
              if (
                lowerHandle.includes('gaming') ||
                meta.channelMode === 'gaming' ||
                lowerName.includes('chess') ||
                lowerName.includes('gaming') ||
                lowerName.includes('puzzle')
              ) {
                channel = 'samaksh_gaming';
              } else {
                channel = 'haso_dil_khol_k';
              }
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
              suggestedHooks: Array.isArray(meta.suggestedHooks) ? meta.suggestedHooks : [],
              duration: meta.duration || null,
              channel
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

  return {
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
  };
}
