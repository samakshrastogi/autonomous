import React from 'react';
import { CheckCircle2, AlertCircle, Download, Check, Clock, Gauge, HardDrive } from 'lucide-react';

export default function DownloadProgress({
  statusType,
  statusText,
  progress,
  isDownloading,
  videoTitle,
  downloadStats
}) {
  if (statusType === 'idle' && !isDownloading) {
    return null;
  }

  // Clean title: remove "Short - ", IDs, format codes, and extensions
  const cleanTitle = (name) => {
    if (!name) return 'Video';
    return name
      .replace(/^Short\s*[-–—:]\s*/i, '')
      .replace(/\[[a-zA-Z0-9_\-]{8,16}\]/g, '')
      .replace(/\([a-zA-Z0-9_\-]{8,16}\)/g, '')
      .replace(/\.f\d+(\.[a-z0-9]+)?$/i, '')
      .replace(/\.(mp4|mkv|webm|part|ytdl)$/i, '')
      .replace(/#shorts/gi, '')
      .trim();
  };

  const isSuccess = statusType === 'success';
  const isError = statusType === 'error';

  // Determine current active stepper step (1, 2, or 3)
  let currentStep = 1;
  if (isSuccess) {
    currentStep = 3;
  } else if (progress >= 99 || (statusText && statusText.toLowerCase().includes('merg'))) {
    currentStep = 3;
  } else if (progress > 0) {
    currentStep = 2;
  } else {
    currentStep = 1;
  }

  const hasValidSize = downloadStats.size && downloadStats.size.trim() !== '~' && downloadStats.size.trim() !== '';

  return (
    <div className={`studio-progress-card ${isSuccess ? 'success-card' : isError ? 'error-card' : ''}`}>
      {/* 3-Step Visual Timeline */}
      {!isError && (
        <div className="download-stepper-bar">
          <div className={`stepper-node ${currentStep > 1 || isSuccess ? 'completed' : currentStep === 1 ? 'active' : ''}`}>
            <div className="stepper-circle">
              {currentStep > 1 || isSuccess ? <Check size={11} /> : '1'}
            </div>
            <span className="stepper-label">Connecting</span>
          </div>

          <div className={`stepper-line ${currentStep >= 2 || isSuccess ? 'completed' : ''}`} />

          <div className={`stepper-node ${currentStep > 2 || isSuccess ? 'completed' : currentStep === 2 ? 'active' : ''}`}>
            <div className="stepper-circle">
              {currentStep > 2 || isSuccess ? <Check size={11} /> : '2'}
            </div>
            <span className="stepper-label">Downloading</span>
          </div>

          <div className={`stepper-line ${currentStep >= 3 || isSuccess ? 'completed' : ''}`} />

          <div className={`stepper-node ${isSuccess ? 'completed' : currentStep === 3 ? 'active' : ''}`}>
            <div className="stepper-circle">
              {isSuccess ? <Check size={11} /> : '3'}
            </div>
            <span className="stepper-label">Saved</span>
          </div>
        </div>
      )}

      {/* Header Info: Status Pill + Percentage */}
      <div className="progress-header-row">
        <div className="progress-status-wrap">
          {isDownloading && (
            <span className="status-badge status-downloading">
              <span className="pulse-dot"></span>
              <span>{currentStep === 1 ? 'Connecting...' : currentStep === 3 ? 'Finalizing 1080p...' : 'Downloading Video...'}</span>
            </span>
          )}
          {isSuccess && (
            <span className="status-badge status-success">
              <CheckCircle2 size={13} />
              <span>Downloaded</span>
            </span>
          )}
          {isError && (
            <span className="status-badge status-error">
              <AlertCircle size={13} />
              <span>Failed</span>
            </span>
          )}
        </div>

        {!isError && (
          <span className="progress-pct-value">
            {isSuccess ? '100%' : progress > 0 ? `${progress.toFixed(0)}%` : '0%'}
          </span>
        )}
      </div>

      {/* Video Title in Clean White */}
      {videoTitle && (
        <div className="progress-video-title">
          <Download size={13} className="progress-title-icon" />
          <span title={cleanTitle(videoTitle)}>
            {cleanTitle(videoTitle)}
          </span>
        </div>
      )}

      {/* Error Message */}
      {isError && (
        <div className="progress-error-box">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>Download failed. Please check the YouTube link and your connection.</span>
        </div>
      )}

      {/* Progress Track */}
      {!isError && (
        <div className="studio-progress-track">
          <div
            className={`studio-progress-fill ${isDownloading && progress === 0 ? 'progress-indeterminate' : ''}`}
            style={{ width: `${isSuccess ? 100 : progress}%` }}
          />
        </div>
      )}

      {/* High-Contrast Live Metrics (Size, Speed, ETA) */}
      {!isError && isDownloading && (
        <div className="download-metrics-row">
          {hasValidSize && (
            <div className="metric-pill">
              <HardDrive size={11} />
              <span>Size: <strong>{downloadStats.size}</strong></span>
            </div>
          )}
          {downloadStats.speed && (
            <div className="metric-pill">
              <Gauge size={11} />
              <span>Speed: <strong>{downloadStats.speed}</strong></span>
            </div>
          )}
          {downloadStats.eta && (
            <div className="metric-pill">
              <Clock size={11} />
              <span>ETA: <strong>{downloadStats.eta}</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
