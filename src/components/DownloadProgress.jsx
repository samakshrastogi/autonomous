import React from 'react';
import { CheckCircle2, AlertCircle, Download, Check } from 'lucide-react';

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
    <div className="card progress-card" style={{ marginBottom: '1.25rem', border: isSuccess ? '1px solid #bbf7d0' : isError ? '1px solid #fecaca' : '1px solid #e2e8f0' }}>
      {/* 3-Step Timeline */}
      {!isError && (
        <div className="download-stepper-bar">
          <div className={`stepper-node ${currentStep > 1 || isSuccess ? 'completed' : currentStep === 1 ? 'active' : ''}`}>
            <div className="stepper-circle">
              {currentStep > 1 || isSuccess ? <Check size={12} /> : '1'}
            </div>
            <span className="stepper-label">Connecting</span>
          </div>

          <div className={`stepper-line ${currentStep >= 2 || isSuccess ? 'completed' : ''}`} />

          <div className={`stepper-node ${currentStep > 2 || isSuccess ? 'completed' : currentStep === 2 ? 'active' : ''}`}>
            <div className="stepper-circle">
              {currentStep > 2 || isSuccess ? <Check size={12} /> : '2'}
            </div>
            <span className="stepper-label">Downloading</span>
          </div>

          <div className={`stepper-line ${currentStep >= 3 || isSuccess ? 'completed' : ''}`} />

          <div className={`stepper-node ${isSuccess ? 'completed' : currentStep === 3 ? 'active' : ''}`}>
            <div className="stepper-circle">
              {isSuccess ? <Check size={12} /> : '3'}
            </div>
            <span className="stepper-label">Saved</span>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="progress-header" style={{ marginTop: isError ? '0' : '0.5rem', marginBottom: '0.45rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {isDownloading && (
            <span className="status-badge status-downloading">
              <span className="pulse-dot"></span>
              {currentStep === 1 ? 'Connecting...' : currentStep === 3 ? 'Finalizing...' : 'Downloading...'}
            </span>
          )}
          {isSuccess && (
            <span className="status-badge status-success">
              <CheckCircle2 size={14} />
              Downloaded
            </span>
          )}
          {isError && (
            <span className="status-badge status-error">
              <AlertCircle size={14} />
              Failed
            </span>
          )}
        </div>

        {!isError && (
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            {isSuccess ? '100%' : progress > 0 ? `${progress.toFixed(0)}%` : '...'}
          </span>
        )}
      </div>

      {/* Clean Video Title */}
      {videoTitle && (
        <div style={{ fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Download size={14} color="#2563eb" style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cleanTitle(videoTitle)}
          </span>
        </div>
      )}

      {/* Error Message */}
      {isError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.65rem 0.75rem', borderRadius: '0.55rem', color: '#b91c1c', fontSize: '0.825rem', marginBottom: '0.5rem' }}>
          Download failed. Please check the link and connection.
        </div>
      )}

      {/* Progress Track */}
      {!isError && (
        <div className="progress-track" style={{ height: '0.6rem', margin: '0.35rem 0 0.65rem' }}>
          <div
            className={`progress-fill ${isDownloading && progress === 0 ? 'progress-indeterminate' : ''}`}
            style={{ width: `${isSuccess ? 100 : progress}%` }}
          />
        </div>
      )}

      {/* User-Facing Metrics */}
      {!isError && isDownloading && (
        <div className="progress-details" style={{ fontSize: '0.78rem', color: '#64748b' }}>
          {hasValidSize && (
            <div>
              Size: <strong style={{ color: '#0f172a' }}>{downloadStats.size}</strong>
            </div>
          )}
          {downloadStats.speed && (
            <div>
              Speed: <strong style={{ color: '#0f172a' }}>{downloadStats.speed}</strong>
            </div>
          )}
          {downloadStats.eta && (
            <div>
              ETA: <strong style={{ color: '#0f172a' }}>{downloadStats.eta}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
