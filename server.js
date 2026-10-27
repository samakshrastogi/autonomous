import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './server/routes/api.js';
import { autoMigrateLegacyFiles, DEFAULT_DOWNLOAD_DIR } from './server/config.js';
import { initFileWatcher } from './server/watcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Auto-migrate any unorganized legacy video files
autoMigrateLegacyFiles();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Initialize real-time disk file watcher
initFileWatcher();

// Serve static frontend build if it exists
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start HTTP Server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Default download folder: ${DEFAULT_DOWNLOAD_DIR}`);
});
