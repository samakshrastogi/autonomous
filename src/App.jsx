import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Download, Clock, CheckCircle2, Sparkles, HardDrive, Gamepad2 } from 'lucide-react';
import Header from './components/Header.jsx';
import DownloadForm from './components/DownloadForm.jsx';
import DownloadProgress from './components/DownloadProgress.jsx';
import VideoGallery from './components/VideoGallery.jsx';
import ShortsGeneratorSidebar from './components/ShortsGeneratorSidebar.jsx';
import ChannelSelector from './components/ChannelSelector.jsx';
import VideoUploader from './components/VideoUploader.jsx';
import SettingsDrawer from './components/SettingsDrawer.jsx';

// Dynamic code splitting: lazy-load modals on demand for faster initial page load
const ApiKeyModal = lazy(() => import('./components/ApiKeyModal.jsx'));
const ChannelHandleModal = lazy(() => import('./components/ChannelHandleModal.jsx'));
const ShortsReviewModal = lazy(() => import('./components/ShortsReviewModal.jsx'));

export default function App() {
  const [url, setUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadStats, setDownloadStats] = useState({ speed: '', eta: '', size: '' });
  const [statusText, setStatusText] = useState('Idle');
  const [statusType, setStatusType] = useState('idle'); // idle | running | success | error
  const [videoTitle, setVideoTitle] = useState('');
  const [recentFiles, setRecentFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [activeTab, setActiveTab] = useState('downloads'); // 'downloads' | 'drafts' | 'ready'

  // Active Channel Switcher: 'haso_dil_khol_k' or 'samaksh_gaming'
  const [activeChannel, setActiveChannel] = useState(() => {
    return localStorage.getItem('shorts_studio_active_channel') || 'haso_dil_khol_k';
  });

  // Settings Slide-Over Drawer state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('channels');
  const [autoPilotEnabled, setAutoPilotEnabled] = useState(() => localStorage.getItem('shorts_studio_autopilot') !== 'false');
  const [defaultTimerDuration, setDefaultTimerDuration] = useState(() => parseInt(localStorage.getItem('shorts_studio_default_timer') || '5', 10));
  const [defaultGamingCta, setDefaultGamingCta] = useState(() => localStorage.getItem('shorts_studio_gaming_cta') || '💬 Comment your move 👇');
  const [comedyHandle, setComedyHandle] = useState(() => localStorage.getItem('shorts_studio_comedy_handle') || '@HasoDilKholK');
  const [gamingHandle, setGamingHandle] = useState(() => localStorage.getItem('shorts_studio_gaming_handle') || '@SamakshGaming');
  const [preferredModel, setPreferredModel] = useState(() => localStorage.getItem('shorts_studio_ai_model') || 'auto');
  const [shortsCount, setShortsCount] = useState(() => parseInt(localStorage.getItem('shorts_studio_shorts_count') || '3', 10));

  // Gemini API Key state
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Channel Username Branding state (defaults to matching active channel)
  const [channelHandle, setChannelHandle] = useState(() => {
    const saved = localStorage.getItem('shorts_channel_handle');
    if (saved) return saved;
    const initialChan = localStorage.getItem('shorts_studio_active_channel') || 'haso_dil_khol_k';
    return initialChan === 'samaksh_gaming' ? '@SamakshGaming' : '@HasoDilKholK';
  });
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);

  // Shorts Review & Text Burn modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedShortForReview, setSelectedShortForReview] = useState(null);
  const [reviewInitialHook, setReviewInitialHook] = useState('');
  const [isBurningText, setIsBurningText] = useState(false);

  // Shorts Generation state
  const [selectedVideoForShorts, setSelectedVideoForShorts] = useState(null);
  const [shortsStatus, setShortsStatus] = useState('');
  const [discoveredMoments, setDiscoveredMoments] = useState([]);
  const [generatedShorts, setGeneratedShorts] = useState([]);
  const [isProcessingShorts, setIsProcessingShorts] = useState(false);
  const [shortsError, setShortsError] = useState('');

  const activeDownloadRef = useRef(false);

  // Initial load
  useEffect(() => {
    fetchRecentFiles();
  }, []);

  // Real-Time Disk Events: Listen to server-sent file change broadcasts
  useEffect(() => {
    let eventSource = null;
    let reconnectTimeout = null;

    const connectEvents = () => {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('files_updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data && Array.isArray(data.files)) {
            setRecentFiles(data.files);
            setLoadingFiles(false);
          }
        } catch (err) {
          console.warn('[SSE] Failed to parse files_updated event:', err);
        }
      });

      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
        reconnectTimeout = setTimeout(connectEvents, 3000);
      };
    };

    connectEvents();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Ensure only 1 video plays at a time across the entire application
  useEffect(() => {
    const handleVideoPlay = (e) => {
      const allVideos = document.querySelectorAll('video');
      allVideos.forEach((video) => {
        if (video !== e.target && !video.paused) {
          video.pause();
        }
      });
    };
    document.addEventListener('play', handleVideoPlay, true);
    return () => document.removeEventListener('play', handleVideoPlay, true);
  }, []);

  const handleSaveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const handleSaveChannelHandle = (handle) => {
    setChannelHandle(handle);
    localStorage.setItem('shorts_channel_handle', handle);
  };

  const handleToggleAutoPilot = (enabled) => {
    setAutoPilotEnabled(enabled);
    localStorage.setItem('shorts_studio_autopilot', String(enabled));
  };

  const handleSaveDefaultTimer = (sec) => {
    setDefaultTimerDuration(sec);
    localStorage.setItem('shorts_studio_default_timer', String(sec));
  };

  const handleSaveDefaultGamingCta = (cta) => {
    setDefaultGamingCta(cta);
    localStorage.setItem('shorts_studio_gaming_cta', cta);
  };

  const handleSaveComedyHandle = (h) => {
    setComedyHandle(h);
    localStorage.setItem('shorts_studio_comedy_handle', h);
  };

  const handleSaveGamingHandle = (h) => {
    setGamingHandle(h);
    localStorage.setItem('shorts_studio_gaming_handle', h);
  };

  const handleSavePreferredModel = (m) => {
    setPreferredModel(m);
    localStorage.setItem('shorts_studio_ai_model', m);
  };

  const handleSaveShortsCount = (c) => {
    setShortsCount(c);
    localStorage.setItem('shorts_studio_shorts_count', String(c));
  };

  const handleSelectChannel = (channelId) => {
    setActiveChannel(channelId);
    localStorage.setItem('shorts_studio_active_channel', channelId);
    const targetHandle = channelId === 'samaksh_gaming'
      ? (gamingHandle || '@SamakshGaming')
      : (comedyHandle || '@HasoDilKholK');
    setChannelHandle(targetHandle);
    localStorage.setItem('shorts_channel_handle', targetHandle);
  };

  const handleUploadSuccess = (uploadedFile) => {
    fetchRecentFiles();
    setActiveTab('drafts');
    handleOpenReviewModal(uploadedFile, 'Can you solve this puzzle?! 🤯');
  };

  const handleOpenReviewModal = (file, hook = '') => {
    setSelectedShortForReview(file);
    setReviewInitialHook(hook || '');
    setIsReviewModalOpen(true);
  };

  const handleReviewFromGenerator = (short) => {
    handleOpenReviewModal(short, short.hook);
  };

  const handleBurnText = async ({ filename, topText, bottomText, channelHandle: customHandle, timerDuration }) => {
    setIsBurningText(true);
    try {
      const res = await fetch('/api/burn-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          topText,
          bottomText,
          channelHandle: customHandle,
          timerDuration
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to burn text to Short');
      }

      if (customHandle) {
        handleSaveChannelHandle(customHandle);
      }

      await fetchRecentFiles();
      // Brief pause so user sees 100% completion in modal before switching to Shorts tab
      await new Promise((r) => setTimeout(r, 700));
      setIsReviewModalOpen(false);
      // Auto-switch to Shorts tab!
      setActiveTab('ready');
    } finally {
      setIsBurningText(false);
    }
  };

  const fetchRecentFiles = async (silent = false) => {
    if (!silent) setLoadingFiles(true);
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.files) {
        setRecentFiles(data.files);
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      if (!silent) setLoadingFiles(false);
    }
  };

  const cleanAndExtractUrl = (text) => {
    if (!text || typeof text !== 'string') return '';
    const match = text.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)[a-zA-Z0-9_\-]+[^\s]*)/i);
    if (match) {
      return match[1].trim();
    }
    return text.trim();
  };

  const isYouTubeUrl = (text) => {
    if (!text || typeof text !== 'string') return false;
    const clean = text.trim();
    return (
      clean.includes('youtube.com/watch') ||
      clean.includes('youtu.be/') ||
      clean.includes('youtube.com/shorts/') ||
      clean.includes('youtube.com/live/') ||
      clean.includes('music.youtube.com/watch')
    );
  };

  const handleStartDownload = async (targetUrl = url) => {
    const downloadTarget = cleanAndExtractUrl(targetUrl);
    if (!downloadTarget) return;

    if (activeDownloadRef.current) return;
    activeDownloadRef.current = true;
    setIsDownloading(true);
    setProgress(0);
    setDownloadStats({ speed: '', eta: '', size: '' });
    setStatusType('running');
    setStatusText('Preparing download...');
    setVideoTitle('');

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: downloadTarget })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const block of events) {
          if (!block.trim()) continue;

          let eventType = 'message';
          let eventData = null;

          const lines = block.split('\n');
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              try {
                eventData = JSON.parse(line.replace('data:', '').trim());
              } catch (e) {
                // ignore
              }
            }
          }

          if (!eventData) continue;

          if (eventType === 'start') {
            setStatusText('Connecting...');
          } else if (eventType === 'title') {
            setVideoTitle(eventData.filename);
          } else if (eventType === 'status') {
            setStatusText(eventData.message);
          } else if (eventType === 'progress') {
            setProgress(eventData.percent || 0);
            setDownloadStats({
              speed: eventData.speed || '',
              eta: eventData.eta || '',
              size: eventData.size || ''
            });
            setStatusText('');
          } else if (eventType === 'complete') {
            setStatusType('success');
            setStatusText('Downloaded');
            setProgress(100);
            if (eventData.filename) {
              setVideoTitle(eventData.filename);
            }
            setUrl('');
            fetchRecentFiles();
            setActiveTab('downloads');

            // Auto-create AI viral shorts immediately if autoPilot is enabled
            if (autoPilotEnabled && eventData.filename) {
              const dlFile = {
                name: eventData.filename,
                category: 'downloads',
                subfolder: '01_Downloads'
              };
              setTimeout(() => {
                handleGenerateShorts(dlFile);
              }, 500);
            }
          } else if (eventType === 'error') {
            setStatusType('error');
            setStatusText(eventData.message || 'Download failed');
          }
        }
      }
    } catch (err) {
      setStatusType('error');
      setStatusText(err.message || 'Download failed.');
    } finally {
      setIsDownloading(false);
      activeDownloadRef.current = false;
    }
  };

  // Auto-download on paste
  const handlePasteEvent = (e) => {
    const rawPasted = e.clipboardData?.getData('text');
    if (rawPasted && isYouTubeUrl(rawPasted)) {
      const cleanUrl = cleanAndExtractUrl(rawPasted);
      setUrl(cleanUrl);
      if (!isDownloading) {
        setTimeout(() => handleStartDownload(cleanUrl), 80);
      }
    }
  };

  // Trigger Gemini Shorts Generation pipeline
  const handleGenerateShorts = async (file) => {
    if (!apiKey) {
      setSelectedVideoForShorts(file);
      setIsApiKeyModalOpen(true);
      return;
    }

    setSelectedVideoForShorts(file);
    setIsProcessingShorts(true);
    setShortsStatus('Finding viral moments...');
    setDiscoveredMoments([]);
    setGeneratedShorts([]);
    setShortsError('');

    try {
      const response = await fetch('/api/generate-shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          apiKey: apiKey,
          channelHandle: channelHandle
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const block of events) {
          if (!block.trim()) continue;

          let eventType = 'message';
          let eventData = null;

          const lines = block.split('\n');
          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              try {
                eventData = JSON.parse(line.replace('data:', '').trim());
              } catch (e) {
                // ignore
              }
            }
          }

          if (!eventData) continue;

          if (eventType === 'status') {
            setShortsStatus(eventData.message);
          } else if (eventType === 'moments') {
            setDiscoveredMoments(eventData.moments || []);
          } else if (eventType === 'complete') {
            setShortsStatus(eventData.message);
            setGeneratedShorts(eventData.shorts || []);
            fetchRecentFiles();
            // Automatically switch active tab to Pre Ready Shorts!
            setActiveTab('drafts');
          } else if (eventType === 'error') {
            setShortsError(eventData.message);
          }
        }
      }
    } catch (err) {
      setShortsError(err.message || 'Failed to generate Shorts.');
    } finally {
      setIsProcessingShorts(false);
    }
  };

  const handleDeleteVideo = async (file) => {
    if (!window.confirm(`Delete "${file.name}"?`)) {
      return;
    }
    // Optimistic UI update: instantly remove from state
    setRecentFiles((prev) => prev.filter((f) => f.name !== file.name));
    try {
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, subfolder: file.subfolder })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete file');
    } catch (err) {
      alert(`Error deleting video: ${err.message}`);
      fetchRecentFiles(); // Rollback if server fails
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="container" onPaste={handlePasteEvent}>
      {/* Top Navbar */}
      <Header
        apiKey={apiKey}
        onOpenApiKeyModal={() => {
          setSettingsInitialTab('ai');
          setIsSettingsOpen(true);
        }}
        channelHandle={channelHandle}
        onOpenChannelModal={() => {
          setSettingsInitialTab('channels');
          setIsSettingsOpen(true);
        }}
        onOpenSettings={() => {
          setSettingsInitialTab('channels');
          setIsSettingsOpen(true);
        }}
      />

      <div className="dashboard-layout">
        {/* LEFT SIDE: All Input and Processing */}
        <aside className="dashboard-left">
          {/* Dual Channel Switcher: Haso Dil Khol K vs Samaksh Gaming */}
          <ChannelSelector
            activeChannel={activeChannel}
            onSelectChannel={handleSelectChannel}
          />

          {/* Mode 1: Samaksh Gaming Direct Clip Uploader */}
          {activeChannel === 'samaksh_gaming' ? (
            <VideoUploader
              onUploadSuccess={handleUploadSuccess}
              channelHandle={channelHandle}
            />
          ) : (
            /* Mode 2: Haso Dil Khol K YouTube Downloader */
            <div className="studio-card compact-card">
              <div className="studio-card-header compact-header">
                <div className="studio-icon-badge mini">
                  <Download size={15} />
                </div>
                <div className="compact-header-text">
                  <h2 className="studio-card-title compact-title">Download Video</h2>
                  <p className="studio-card-subtitle compact-subtitle">YouTube URL downloader</p>
                </div>
              </div>

              <DownloadForm
                url={url}
                setUrl={setUrl}
                isDownloading={isDownloading}
                onDownload={handleStartDownload}
                cleanAndExtractUrl={cleanAndExtractUrl}
                isYouTubeUrl={isYouTubeUrl}
              />
            </div>
          )}

          {/* Processing Area */}
          <div className="processing-section">
            <DownloadProgress
              statusType={statusType}
              statusText={statusText}
              progress={progress}
              isDownloading={isDownloading}
              videoTitle={videoTitle}
              downloadStats={downloadStats}
            />

            {/* Embedded Shorts Generator in Left Sidebar */}
            <ShortsGeneratorSidebar
              videoFile={selectedVideoForShorts}
              generationStatus={shortsStatus}
              discoveredMoments={discoveredMoments}
              generatedShorts={generatedShorts}
              isProcessing={isProcessingShorts}
              error={shortsError}
              onClose={() => {
                setSelectedVideoForShorts(null);
                setShortsStatus('');
                setDiscoveredMoments([]);
                setGeneratedShorts([]);
                setShortsError('');
              }}
              onReviewGeneratedShort={handleReviewFromGenerator}
              onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
            />
          </div>

          {/* Workspace Summary Card */}
          <div className="studio-card studio-stats-card compact-card">
            <div className="stats-header-row">
              <div className="stats-title-wrap">
                <HardDrive size={14} color="#38bdf8" />
                <span className="stats-card-title">Studio Library</span>
              </div>
              <span className="stats-total-pill">
                {recentFiles.length} Videos
              </span>
            </div>

            <div className="stats-pills-grid">
              <div
                className={`stat-box ${activeTab === 'downloads' ? 'stat-box-active' : ''}`}
                onClick={() => setActiveTab('downloads')}
                title="View Source Downloads"
              >
                <span className="stat-box-num text-cyan">
                  {recentFiles.filter((f) => f.category === 'downloads').length}
                </span>
                <span className="stat-box-label">Sources</span>
              </div>

              <div
                className={`stat-box ${activeTab === 'drafts' ? 'stat-box-active' : ''}`}
                onClick={() => setActiveTab('drafts')}
                title="View Pre-Ready Shorts"
              >
                <span className="stat-box-num text-amber">
                  {recentFiles.filter((f) => f.category === 'drafts').length}
                </span>
                <span className="stat-box-label">Pre-Ready</span>
              </div>

              <div
                className={`stat-box ${activeTab === 'ready' ? 'stat-box-active' : ''}`}
                onClick={() => setActiveTab('ready')}
                title="View Ready Shorts"
              >
                <span className="stat-box-num text-emerald">
                  {recentFiles.filter((f) => f.category === 'ready').length}
                </span>
                <span className="stat-box-label">Shorts</span>
              </div>
            </div>

            <div className="stats-storage-row">
              <span>Total Size</span>
              <strong>{formatFileSize(recentFiles.reduce((acc, f) => acc + (f.size || 0), 0))}</strong>
            </div>
          </div>
        </aside>

        {/* RIGHT SIDE: All Videos Data */}
        <main className="dashboard-right">
          <VideoGallery
            files={recentFiles}
            formatFileSize={formatFileSize}
            onGenerateShorts={handleGenerateShorts}
            onReviewShort={handleOpenReviewModal}
            onDeleteVideo={handleDeleteVideo}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </main>
      </div>

      {/* Modals & Slide-Over Drawer with Suspense for on-demand lazy loading */}
      <Suspense fallback={null}>
        {isSettingsOpen && (
          <SettingsDrawer
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            apiKey={apiKey}
            onSaveApiKey={handleSaveApiKey}
            channelHandle={channelHandle}
            onSaveChannelHandle={handleSaveChannelHandle}
            activeChannel={activeChannel}
            autoPilotEnabled={autoPilotEnabled}
            onToggleAutoPilot={handleToggleAutoPilot}
            defaultTimerDuration={defaultTimerDuration}
            onSaveDefaultTimer={handleSaveDefaultTimer}
            defaultGamingCta={defaultGamingCta}
            onSaveDefaultGamingCta={handleSaveDefaultGamingCta}
            comedyHandle={comedyHandle}
            onSaveComedyHandle={handleSaveComedyHandle}
            gamingHandle={gamingHandle}
            onSaveGamingHandle={handleSaveGamingHandle}
            preferredModel={preferredModel}
            onSavePreferredModel={handleSavePreferredModel}
            shortsCount={shortsCount}
            onSaveShortsCount={handleSaveShortsCount}
            initialTab={settingsInitialTab}
          />
        )}

        {isApiKeyModalOpen && (
          <ApiKeyModal
            isOpen={isApiKeyModalOpen}
            onClose={() => setIsApiKeyModalOpen(false)}
            apiKey={apiKey}
            onSaveApiKey={handleSaveApiKey}
          />
        )}

        {isChannelModalOpen && (
          <ChannelHandleModal
            isOpen={isChannelModalOpen}
            onClose={() => setIsChannelModalOpen(false)}
            channelHandle={channelHandle}
            onSaveHandle={handleSaveChannelHandle}
          />
        )}

        {isReviewModalOpen && selectedShortForReview && (
          <ShortsReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            shortFile={selectedShortForReview}
            initialHook={reviewInitialHook}
            channelHandle={channelHandle}
            activeChannel={activeChannel}
            onBurnText={handleBurnText}
            isProcessing={isBurningText}
            apiKey={apiKey}
          />
        )}
      </Suspense>
    </div>
  );
}
