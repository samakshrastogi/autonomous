import React from 'react';
import { FolderOpen, Download } from 'lucide-react';

export default function VideoCard({ file, onOpenFolder, formatFileSize }) {
  const cleanTitle = (name) => {
    if (!name) return 'Video';
    return name.replace(/\.(mp4|mkv|webm)$/i, '');
  };

  const formattedDate = new Date(file.mtime).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="video-card">
      {/* Framed Video Player */}
      <div className="video-frame-container">
        <video
          className="video-player"
          controls
          preload="metadata"
          playsInline
          src={file.url}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Video Information & Actions */}
      <div className="video-body">
        <h3 className="video-title" title={cleanTitle(file.name)}>
          {cleanTitle(file.name)}
        </h3>

        <div className="video-meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="video-badge">{formatFileSize(file.size)}</span>
            <span style={{ fontSize: '0.75rem' }}>{formattedDate}</span>
          </div>

          <div className="video-actions">
            <a
              href={file.url}
              download={file.name}
              className="action-btn-subtle"
              title="Save copy to your computer"
            >
              <Download size={13} />
              <span>Save</span>
            </a>

            <button
              type="button"
              onClick={onOpenFolder}
              className="action-btn-subtle"
              title="Show in Windows File Explorer"
            >
              <FolderOpen size={13} />
              <span>Explorer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
