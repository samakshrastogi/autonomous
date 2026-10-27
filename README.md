# YouTube Quick Downloader

A clean, minimalist React web app with a zero-database local server that automatically downloads YouTube videos and Shorts using `yt-dlp` directly into your Windows folder.

---

## ⚡ Features

- **Instant Auto-Download on Paste**: Simply paste any YouTube link (`Ctrl+V` or click Paste), and the download starts automatically.
- **Exact Command Configuration**:
  ```powershell
  yt-dlp -f "bv*+ba/b" --merge-output-format mp4 -o "%(title)s.%(ext)s" "<url>"
  ```
- **Target Folder**:
  Downloads are automatically placed in:
  ```powershell
  C:\Users\Samaksh Rastogi\downloads\videos
  ```
- **Live Real-Time Progress**:
  - Live progress percentage bar
  - Download speed & ETA stats
  - Merging indicator
  - Collapsible terminal viewer showing live `yt-dlp` stdout logs
- **One-Click Folder Access**:
  - "Open Folder" button instantly launches Windows File Explorer right in `C:\Users\Samaksh Rastogi\downloads\videos`
- **Recent Downloads History**:
  - Displays all videos in your target folder with file sizes and timestamps.
- **Zero Database Required**:
  - Lightweight and fast without any SQL/MongoDB overhead.

---

## 🚀 Quick Start

### 1. Start the App

You have two easy ways to run the project:

#### Option A: Single Command (Production Server)
```powershell
npm start
```
Open **[http://localhost:5001](http://localhost:5001)** in your browser.

#### Option B: Development Mode (Vite Hot-Reload)
```powershell
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📂 Project Structure

```
c:\src\autonomous\
├── server.js            # Lightweight Express backend (executes yt-dlp, streams SSE progress)
├── vite.config.js       # Vite configuration with proxy to local server
├── index.html           # HTML entry point
├── package.json         # Scripts & dependencies
├── src/
│   ├── main.jsx         # React root
│   ├── App.jsx          # UI component (Auto-download, progress bar, folder opener)
│   └── index.css        # Clean dark-mode styles & animations
└── dist/                # Pre-built production frontend
```
