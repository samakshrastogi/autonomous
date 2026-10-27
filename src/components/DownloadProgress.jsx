import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

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

  // Clean format codes like .f616, .f251 or raw extensions
  const cleanTitle = (name) => {
    if (!name) return '';
    return name
      .replace(/\.f\d+(\.[a-z0-9]+)?$/i, '')
      .replace(/\.(mp4|mkv|webm|part|ytdl)$/i, '');
  };

  const hasValidSize = downloadStats.size && downloadStats.size.trim() !== '~' && downloadStats.size.trim() !== '';

  return (
    <div className="card progress-card">
      <div className="progress-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {statusType === 'running' && (
            <span className="status-badge status-downloading">
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }}></span>
              Downloading
            </span>
          )}
          {statusType === 'success' && (
            <span className="status-badge status-success">
              <CheckCircle2 size={15} />
              Completed
            </span>
          )}
          {statusType === 'error' && (
            <span className="status-badge status-error">
              <AlertCircle size={15} />
              Failed
            </span>
          )}

          {/* Show phase message only if distinct from 'Downloading' */}
          {statusText && !statusText.startsWith('Downloading') && (
            <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 500 }}>
              {statusText}
            </span>
          )}
        </div>

        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
          {progress > 0 ? `${progress.toFixed(1)}%` : isDownloading ? '...' : ''}
        </span>
      </div>

      {videoTitle && (
        <div style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '0.65rem', fontWeight: 600 }}>
          {cleanTitle(videoTitle)}
        </div>
      )}

      <div className="progress-track">
        <div
          className={`progress-fill ${isDownloading && progress === 0 ? 'progress-indeterminate' : ''}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="progress-details">
        {hasValidSize && (
          <div>
            Size: <strong>{downloadStats.size}</strong>
          </div>
        )}
        {downloadStats.speed && (
          <div>
            Speed: <strong>{downloadStats.speed}</strong>
          </div>
        )}
        {downloadStats.eta && (
          <div>
            ETA: <strong>{downloadStats.eta}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
