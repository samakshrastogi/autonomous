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
export function autoMigrateLegacyFiles() {
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
              suggestedHooks: Array.isArray(meta.suggestedHooks) ? meta.suggestedHooks : [],
              duration: meta.duration || null
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
