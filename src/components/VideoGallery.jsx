import React from 'react';
import { Film, RotateCcw, FolderOpen } from 'lucide-react';
import VideoCard from './VideoCard.jsx';

export default function VideoGallery({
  files,
  loading,
  onRefresh,
  onOpenFolder,
  formatFileSize
}) {
  return (
    <div>
      <div className="gallery-header">
        <div className="gallery-title">
          <Film size={22} color="#ef4444" />
          <span>Downloaded Videos</span>
          <span style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            background: '#fee2e2',
            color: '#b91c1c',
            padding: '0.2rem 0.65rem',
            borderRadius: 9999
          }}>
            {files.length}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={onRefresh}
            className="action-btn-subtle"
            title="Refresh video list"
            disabled={loading}
          >
            <RotateCcw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={onOpenFolder}
            className="action-btn-subtle"
            title="Open folder in Windows Explorer"
          >
            <FolderOpen size={14} />
            <span>Open in Folder</span>
          </button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="empty-state">
          <Film className="empty-icon" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            No videos downloaded yet
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
            Paste a YouTube link above and it will download automatically.
          </p>
        </div>
      ) : (
        <div className="video-grid">
          {files.map((file, idx) => (
            <VideoCard
              key={`${file.name}-${idx}`}
              file={file}
              onOpenFolder={onOpenFolder}
              formatFileSize={formatFileSize}
            />
          ))}
        </div>
      )}
    </div>
  );
}
