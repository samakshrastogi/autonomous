import React from 'react';
import { Sparkles, Type, Download, Trash2 } from 'lucide-react';

export default function VideoCard({
  file,
  formatFileSize,
  onGenerateShorts,
  onReviewShort,
  onDelete
}) {
  const isShort = file.category === 'drafts' || file.category === 'ready' || file.name.startsWith('Short -') || /#shorts|\bshorts\b/i.test(file.name);

  // Clean title: remove "Short - ", format codes, raw video IDs, and extensions
  const cleanTitle = (name) => {
    if (!name) return 'Video';
    return name
      .replace(/^Short\s*[-–—:]\s*/i, '') // Remove "Short - "
      .replace(/\[[a-zA-Z0-9_\-]{8,16}\]/g, '')
      .replace(/\([a-zA-Z0-9_\-]{8,16}\)/g, '')
      .replace(/\[Branded\]/gi, '')
      .replace(/\.f\d+(\.[a-z0-9]+)?$/i, '')
      .replace(/\.(mp4|mkv|webm)$/i, '')
      .replace(/#shorts/gi, '')
      .replace(/\bshorts\b/gi, '')
      .trim();
  };

  const formattedDate = new Date(file.mtime).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className={`video-card ${isShort ? 'video-card-short' : ''}`}>
      {/* Framed Video Player */}
      <div className={`video-frame-container ${isShort ? 'frame-vertical-short' : 'frame-landscape-video'}`}>
        <video
          className="video-player"
          controls
          controlsList="nodownload"
          preload="metadata"
          playsInline
          src={file.url}
        >
          Your browser does not support the video tag.
        </video>

        {/* Status Badge */}
        {file.category === 'ready' ? (
          <span className="shorts-tag-ready">
            Shorts
          </span>
        ) : file.category === 'drafts' ? (
          <span className="shorts-tag-draft">
            Pre Ready
          </span>
        ) : (
          <span className="video-tag-download">
            Download
          </span>
        )}

        {/* Quick Action Hover Buttons */}
        <div className="frame-quick-actions">
          <a
            href={file.url}
            download={file.name}
            className="frame-action-btn"
            title="Download"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={13} />
          </a>

          {onDelete && (
            <button
              type="button"
              className="frame-action-btn frame-delete-btn"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(file);
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Video Info & Action */}
      <div className="video-body">
        <h3 className="video-title" title={cleanTitle(file.name)}>
          {cleanTitle(file.name)}
        </h3>

        <div className="video-meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span className="video-badge">{formatFileSize(file.size)}</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formattedDate}</span>
          </div>

          <div className="video-actions">
            {file.category === 'drafts' && onReviewShort ? (
              <button
                type="button"
                onClick={() => onReviewShort(file)}
                className="action-btn-amber"
              >
                <Type size={12} />
                <span>Add Text</span>
              </button>
            ) : file.category === 'ready' && onReviewShort ? (
              <button
                type="button"
                onClick={() => onReviewShort(file)}
                className="action-btn-green"
              >
                <Type size={12} />
                <span>Edit Text</span>
              </button>
            ) : onGenerateShorts ? (
              <button
                type="button"
                onClick={() => onGenerateShorts(file)}
                className="action-btn-primary"
              >
                <Sparkles size={12} />
                <span>Shorts</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
