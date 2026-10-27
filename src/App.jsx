import React, { useState, useEffect, useRef } from 'react';
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
  const [loadingFiles, setLoadingFiles] = useState(false);

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
    } finally {
      setIsBurningText(false);
    }
  };

  const fetchRecentFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.files) {
        setRecentFiles(data.files);
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setLoadingFiles(false);
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
            setStatusText('Download completed successfully!');
            setProgress(100);
            if (eventData.filename) {
              setVideoTitle(eventData.filename);
            }
            setUrl('');
            fetchRecentFiles();
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="container" onPaste={handlePasteEvent}>
      <Header
        apiKey={apiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        channelHandle={channelHandle}
        onOpenChannelModal={() => setIsChannelModalOpen(true)}
      />

      <DownloadForm
        url={url}
        setUrl={setUrl}
        isDownloading={isDownloading}
        onDownload={handleStartDownload}
        cleanAndExtractUrl={cleanAndExtractUrl}
        isYouTubeUrl={isYouTubeUrl}
      />

      <DownloadProgress
        statusType={statusType}
        statusText={statusText}
        progress={progress}
        isDownloading={isDownloading}
        videoTitle={videoTitle}
        downloadStats={downloadStats}
      />

      <VideoGallery
        files={recentFiles}
        loading={loadingFiles}
        onRefresh={fetchRecentFiles}
        formatFileSize={formatFileSize}
        onGenerateShorts={handleGenerateShorts}
        onReviewShort={handleOpenReviewModal}
      />

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
