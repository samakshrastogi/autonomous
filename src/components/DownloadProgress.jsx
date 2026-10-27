import React from 'react';
import { CheckCircle2, AlertCircle, FolderOpen } from 'lucide-react';

export default function DownloadProgress({
  statusType,
  statusText,
  progress,
  isDownloading,
  videoTitle,
  downloadStats,
  onOpenFolder
}) {
  if (statusType === 'idle' && !isDownloading) {
    return null;
  }

  const cleanTitle = (name) => {
    if (!name) return '';
    return name.replace(/\.(mp4|mkv|webm)$/i, '');
  };

  return (
    <div className="card progress-card">
      <div className="progress-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
          <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0f172a' }}>{statusText}</span>
        </div>

        <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
          {progress > 0 ? `${progress.toFixed(0)}%` : isDownloading ? '...' : ''}
        </span>
      </div>

      {videoTitle && (
        <div style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem', fontWeight: 500 }}>
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
        {downloadStats.size && (
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
            Time Left: <strong>{downloadStats.eta}</strong>
          </div>
        )}
        {statusType === 'success' && (
          <button
            type="button"
            onClick={onOpenFolder}
            className="action-btn-subtle"
            style={{ marginLeft: 'auto' }}
          >
            <FolderOpen size={14} color="#16a34a" />
            <span>Show in Windows Explorer</span>
          </button>
        )}
      </div>
    </div>
  );
}
