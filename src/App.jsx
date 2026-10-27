import React, { useState, useEffect, useRef } from 'react';
import { Download, Sparkles, FolderDown, Layers, HardDrive } from 'lucide-react';
import Header from './components/Header.jsx';
import DownloadForm from './components/DownloadForm.jsx';
import DownloadProgress from './components/DownloadProgress.jsx';
import VideoGallery from './components/VideoGallery.jsx';
import ApiKeyModal from './components/ApiKeyModal.jsx';
import ShortsGeneratorModal from './components/ShortsGeneratorModal.jsx';
import ChannelHandleModal from './components/ChannelHandleModal.jsx';
import ShortsReviewModal from './components/ShortsReviewModal.jsx';

export default function App() {
  const [url, setUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadStats, setDownloadStats] = useState({ speed: '', eta: '', size: '' });
  const [statusText, setStatusText] = useState('Idle');
  const [statusType, setStatusType] = useState('idle'); // idle | running | success | error
  const [videoTitle, setVideoTitle] = useState('');
  const [recentFiles, setRecentFiles] = useState([]);
  const [folderSizes, setFolderSizes] = useState({ all: 0, downloads: 0, drafts: 0, ready: 0 });
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'downloads' | 'drafts' | 'ready'
  const [autoGenerateShorts, setAutoGenerateShorts] = useState(() => localStorage.getItem('auto_shorts_enabled') === 'true');

  // Gemini API Key state
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Channel Username Branding state
  const [channelHandle, setChannelHandle] = useState(() => localStorage.getItem('shorts_channel_handle') || '');
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);

  // Shorts Review & Text Burn modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedShortForReview, setSelectedShortForReview] = useState(null);
  const [reviewInitialHook, setReviewInitialHook] = useState('');
  const [isBurningText, setIsBurningText] = useState(false);

  // Shorts Generation modal state
  const [isShortsModalOpen, setIsShortsModalOpen] = useState(false);
  const [selectedVideoForShorts, setSelectedVideoForShorts] = useState(null);
  const [shortsStatus, setShortsStatus] = useState('');
  const [discoveredMoments, setDiscoveredMoments] = useState([]);
  const [generatedShorts, setGeneratedShorts] = useState([]);
  const [isProcessingShorts, setIsProcessingShorts] = useState(false);
  const [shortsError, setShortsError] = useState('');

  const activeDownloadRef = useRef(false);

  useEffect(() => {
    fetchRecentFiles();
  }, []);

  // Silent background auto-refresh every 5 seconds so any changes on disk reflect instantly
  useEffect(() => {
    const timer = setInterval(() => {
      fetchRecentFiles(true);
    }, 5000);
    return () => clearInterval(timer);
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

  const handleOpenReviewModal = (file, hook = '') => {
    setSelectedShortForReview(file);
    setReviewInitialHook(hook || '');
    setIsReviewModalOpen(true);
  };

  const handleReviewFromGenerator = (short) => {
    setIsShortsModalOpen(false);
    handleOpenReviewModal(short, short.hook);
  };

  const handleBurnText = async ({ filename, topText, channelHandle: customHandle }) => {
    setIsBurningText(true);
    try {
      const res = await fetch('/api/burn-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          topText,
          channelHandle: customHandle
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
      setIsReviewModalOpen(false);
      // Auto-switch to Ready Shorts tab!
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
      if (data.sizes) {
        setFolderSizes(data.sizes);
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
            setStatusText('Saved to 01_Downloads');
            setProgress(100);
            if (eventData.filename) {
              setVideoTitle(eventData.filename);
            }
            setUrl('');
            fetchRecentFiles();
            setActiveTab('downloads');

            // Auto-trigger AI Shorts if toggle enabled
            if (autoGenerateShorts && eventData.filename) {
              const dlFile = {
                name: eventData.filename,
                category: 'downloads',
                subfolder: '01_Downloads'
              };
              setTimeout(() => {
                handleGenerateShorts(dlFile);
              }, 600);
            }
          } else if (eventType === 'error') {
            setStatusType('error');
            setStatusText(eventData.message || 'Download failed');
          }
        }
      }
    } catch (err) {
      setStatusType('error');
      setStatusText(err.message || 'Failed to download video.');
    } finally {
      setIsDownloading(false);
      activeDownloadRef.current = false;
    }
  };

  // Automatically triggers download whenever a link is pasted into the window
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
    setIsShortsModalOpen(true);
    setIsProcessingShorts(true);
    setShortsStatus('Starting AI Shorts analysis...');
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
            // Automatically switch active tab in library to Waiting for Text drafts!
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
    if (!window.confirm(`Are you sure you want to delete "${file.name}"? This file will be removed from disk.`)) {
      return;
    }
    try {
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, subfolder: file.subfolder })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete file');
      await fetchRecentFiles();
    } catch (err) {
      alert(`Error deleting video: ${err.message}`);
    }
  };

  const handleOpenFolder = async (category = 'all') => {
    try {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      });
    } catch (err) {
      console.error('Error opening folder:', err);
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
      {/* Sleek Top Navbar with System Storage Stats */}
      <Header
        apiKey={apiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        channelHandle={channelHandle}
        onOpenChannelModal={() => setIsChannelModalOpen(true)}
        totalVideosCount={recentFiles.length}
        totalStorageBytes={folderSizes.all || 0}
        formatFileSize={formatFileSize}
      />

      <div className="dashboard-layout">
        {/* LEFT SIDE: All Input and Processing */}
        <aside className="dashboard-left">
          {/* Download Studio Card */}
          <div className="studio-card">
            <div className="studio-card-header">
              <div className="studio-icon-badge">
                <Download size={18} />
              </div>
              <div>
                <h2 className="studio-card-title">Download Video</h2>
                <p className="studio-card-subtitle">
                  Paste any YouTube video or Shorts link
                </p>
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

            {/* Auto-Shorts Toggle */}
            <div className="studio-actions-row">
              <label
                className="studio-toggle-label"
                title="Automatically create 9:16 Shorts with Hinglish moments right after downloading"
              >
                <input
                  type="checkbox"
                  checked={autoGenerateShorts}
                  onChange={(e) => {
                    setAutoGenerateShorts(e.target.checked);
                    localStorage.setItem('auto_shorts_enabled', e.target.checked ? 'true' : 'false');
                  }}
                />
                <span className="toggle-slider"></span>
                <span className="studio-toggle-text">
                  <Sparkles size={13} color="#ef4444" />
                  Auto-create AI Shorts
                </span>
              </label>
            </div>

            <div className="paste-tip">
              <span>💡</span>
              <span><strong>Tip:</strong> Press <code>Ctrl+V</code> anywhere to auto-paste & start.</span>
            </div>
          </div>

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

            {/* Live AI Shorts Processing Card */}
            {isProcessingShorts && (
              <div className="card live-ai-card">
                <div className="live-ai-header">
                  <span className="status-badge status-downloading">
                    <span className="pulse-dot"></span>
                    AI Shorts Processing
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsShortsModalOpen(true)}
                    className="action-btn-subtle"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  >
                    View Studio
                  </button>
                </div>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0f172a', margin: '0.6rem 0 0.25rem' }}>
                  {shortsStatus || 'Analyzing video highlights with Gemini AI...'}
                </div>
                {selectedVideoForShorts && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedVideoForShorts.name}
                  </div>
                )}
              </div>
            )}

            {/* Interactive Storage Overview Card when idle */}
            {!isDownloading && statusType === 'idle' && !isProcessingShorts && (
              <div className="card standby-card">
                <div className="standby-header">
                  <div className="standby-status-pill">
                    <span className="status-dot-green"></span>
                    <span>Ready for links</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Filter by Folder</span>
                </div>

                <div className="storage-destinations">
                  <button
                    type="button"
                    onClick={() => setActiveTab('downloads')}
                    className={`storage-item-btn ${activeTab === 'downloads' ? 'active' : ''}`}
                    title="Click to view full video downloads"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="storage-badge badge-dl">01_Downloads</span>
                      <span className="storage-desc">Full HD Videos</span>
                    </div>
                    <span className="storage-meta-count">
                      {recentFiles.filter((f) => f.category === 'downloads').length} • {formatFileSize(folderSizes.downloads || 0)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('drafts')}
                    className={`storage-item-btn ${activeTab === 'drafts' ? 'active' : ''}`}
                    title="Click to view 9:16 Shorts waiting for text"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="storage-badge badge-drafts">02_Shorts_Drafts</span>
                      <span className="storage-desc">Draft Shorts</span>
                    </div>
                    <span className="storage-meta-count">
                      {recentFiles.filter((f) => f.category === 'drafts').length} • {formatFileSize(folderSizes.drafts || 0)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('ready')}
                    className={`storage-item-btn ${activeTab === 'ready' ? 'active' : ''}`}
                    title="Click to view branded ready Shorts"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="storage-badge badge-ready">03_Shorts_Ready</span>
                      <span className="storage-desc">Ready to Post</span>
                    </div>
                    <span className="storage-meta-count">
                      {recentFiles.filter((f) => f.category === 'ready').length} • {formatFileSize(folderSizes.ready || 0)}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT SIDE: All Videos Data */}
        <main className="dashboard-right">
          <VideoGallery
            files={recentFiles}
            loading={loadingFiles}
            onRefresh={fetchRecentFiles}
            formatFileSize={formatFileSize}
            onGenerateShorts={handleGenerateShorts}
            onReviewShort={handleOpenReviewModal}
            onDeleteVideo={handleDeleteVideo}
            onOpenFolder={handleOpenFolder}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </main>
      </div>

      {/* Gemini API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      {/* Channel Handle Watermark Modal */}
      <ChannelHandleModal
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        channelHandle={channelHandle}
        onSaveHandle={handleSaveChannelHandle}
      />

      {/* Shorts Generation Live Modal */}
      <ShortsGeneratorModal
        isOpen={isShortsModalOpen}
        onClose={() => setIsShortsModalOpen(false)}
        videoFile={selectedVideoForShorts}
        generationStatus={shortsStatus}
        discoveredMoments={discoveredMoments}
        generatedShorts={generatedShorts}
        isProcessing={isProcessingShorts}
        error={shortsError}
        onReviewGeneratedShort={handleReviewFromGenerator}
      />

      {/* Shorts Review & Text Burn Modal */}
      <ShortsReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        shortFile={selectedShortForReview}
        initialHook={reviewInitialHook}
        channelHandle={channelHandle}
        onBurnText={handleBurnText}
        isProcessing={isBurningText}
      />
    </div>
  );
}
