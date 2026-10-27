import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header.jsx';
import DownloadForm from './components/DownloadForm.jsx';
import DownloadProgress from './components/DownloadProgress.jsx';
import VideoGallery from './components/VideoGallery.jsx';

export default function App() {
  const [url, setUrl] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadStats, setDownloadStats] = useState({ speed: '', eta: '', size: '' });
  const [statusText, setStatusText] = useState('Idle');
  const [statusType, setStatusType] = useState('idle'); // idle | running | success | error
  const [videoTitle, setVideoTitle] = useState('');
  const [autoDownloadOnPaste, setAutoDownloadOnPaste] = useState(true);
  const [recentFiles, setRecentFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const activeDownloadRef = useRef(false);

  useEffect(() => {
    fetchRecentFiles();
  }, []);

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
    const downloadTarget = (targetUrl || '').trim();
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
            setStatusText('Connecting and fetching video info...');
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
            setStatusText(`Downloading: ${eventData.percent.toFixed(1)}%`);
          } else if (eventType === 'complete') {
            setStatusType('success');
            setStatusText('Download completed successfully!');
            setProgress(100);
            if (eventData.filename) {
              setVideoTitle(eventData.filename);
            }
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

  const handlePasteEvent = (e) => {
    const pastedText = e.clipboardData?.getData('text');
    if (pastedText && isYouTubeUrl(pastedText)) {
      const cleanUrl = pastedText.trim();
      setUrl(cleanUrl);
      if (autoDownloadOnPaste && !isDownloading) {
        setTimeout(() => handleStartDownload(cleanUrl), 100);
      }
    }
  };

  const handleOpenFolder = async () => {
    try {
      await fetch('/api/open-folder', { method: 'POST' });
    } catch (err) {
      console.error('Failed to open folder:', err);
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
      <Header />

      <DownloadForm
        url={url}
        setUrl={setUrl}
        isDownloading={isDownloading}
        onDownload={handleStartDownload}
        autoDownloadOnPaste={autoDownloadOnPaste}
        setAutoDownloadOnPaste={setAutoDownloadOnPaste}
        onOpenFolder={handleOpenFolder}
      />

      <DownloadProgress
        statusType={statusType}
        statusText={statusText}
        progress={progress}
        isDownloading={isDownloading}
        videoTitle={videoTitle}
        downloadStats={downloadStats}
        onOpenFolder={handleOpenFolder}
      />

      <VideoGallery
        files={recentFiles}
        loading={loadingFiles}
        onRefresh={fetchRecentFiles}
        onOpenFolder={handleOpenFolder}
        formatFileSize={formatFileSize}
      />
    </div>
  );
}
