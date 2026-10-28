# AI Shorts Studio

A high-performance Creator Studio web application that automatically downloads videos via `yt-dlp`, uses Google Gemini AI to detect genuinely viral micro-moments (< 40s), and renders 9:16 vertical video clips in parallel with customizable 5-second retention hooks and channel watermarks.

---

## ⚡ Features

- **Liquid Glass Dark Mode UI**: Modern dark glassmorphism design with responsive 3-way toggle (`Downloads`, `Pre Ready Shorts`, `Shorts`).
- **Instant Auto-Download on Paste**: Paste any video link (`Ctrl+V` or click Paste) and downloading begins automatically.
- **Genuine AI Viral Shorts Detection**: Analyzes audio and detects self-contained micro-story scenes (Setup $\to$ Escalation $\to$ Climax/Punchline) strictly under 40 seconds.
- **Multi-Core Parallel Rendering**: Multi-worker FFmpeg encoding pool ($2.5\times - 3.5\times$ faster rendering).
- **5-Second Retention Hooks**: Hooks viewer attention during the critical first 5 seconds ($0 \le t \le 5\text{s}$) and automatically vanishes so the rest of the clip plays clean.
- **5 Gemini Hook Suggestions**: Automatically generates the 5 best conversational Hinglish hooks with emojis for every clip.
- **Real-Time Disk Sync (`chokidar`)**: Zero polling or manual refreshing needed; changes on disk instantly update the UI over persistent Server-Sent Events (SSE).
- **3-Tier Organized Directory**:
  - `01_Downloads`: Pristine full-length downloaded source videos.
  - `02_Shorts_Drafts`: Clean 9:16 vertical shorts (Pre-Ready) without burned text.
  - `03_Shorts_Ready`: Final branded shorts with 5s retention hooks and channel watermarks.

---

## 🚀 How to Run the Project

### Prerequisites
Make sure the following are installed and accessible in your system's `PATH`:
1. **Node.js** (v18 or higher) — [nodejs.org](https://nodejs.org/)
2. **FFmpeg** — [ffmpeg.org](https://ffmpeg.org/) (for video slicing, vertical conversion & text filters)
3. **yt-dlp** — [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) (for downloading videos)

---

### Step-by-Step Running Instructions

#### 1. Install Dependencies (First time only)
Open terminal in the project directory:
```powershell
npm install
```

#### 2. Run the Application

You can run the app in either **Production Mode** (recommended) or **Development Mode**:

##### Option A: Production Mode (Fastest & Single Command)
```powershell
npm start
```
- Starts the modular backend server and serves the optimized production build.
- Open your browser at: **[http://localhost:5001](http://localhost:5001)**

##### Option B: Development Mode (With Hot-Reload)
```powershell
npm run dev
```
- Concurrently runs the backend server (port 5001) and Vite live dev server (port 3000).
- Open your browser at: **[http://localhost:3000](http://localhost:3000)**

---

### 🔑 Setting Up Your Gemini API Key

You can configure your Gemini API Key in either of two ways:
1. **In the Web UI**: Click the **AI Key** / **AI Connected** pill in the top navbar and paste your key.
2. **In `.env` File**: Add the following line in `.env` in the root folder:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

---

### 📂 Directory Architecture

```
c:\src\autonomous\
├── server.js                        # Lean Express entry point (42 lines)
├── server/
│   ├── config.js                    # Storage folders & video scanner
│   ├── watcher.js                   # Chokidar real-time disk event watcher
│   ├── routes/
│   │   └── api.js                   # REST & SSE API endpoints
│   └── services/
│       ├── geminiService.js         # Gemini AI analysis & hook generation
│       ├── ffmpegService.js         # Parallel render pool & 5s retention hook filters
│       └── downloadService.js       # yt-dlp process manager & stream parser
├── src/                             # React frontend (Vite)
│   ├── App.jsx                      # Main dashboard & real-time SSE listener
│   ├── index.css                    # Dark glassmorphism styles
│   └── components/                  # UI components & lazy-loaded modals
└── dist/                            # Production web build
```
