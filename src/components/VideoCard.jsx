import React from 'react';
import { Sparkles, Type, Download, Trash2, Clock, Film } from 'lucide-react';

export default function VideoCard({
  file,
  formatFileSize,
  onGenerateShorts,
  onReviewShort,
  onDelete
}) {
  const isShort =
    file.category === 'drafts' ||
    file.category === 'ready' ||
    file.name.startsWith('Short -') ||
    /#shorts|\bshorts\b/i.test(file.name);

  // Clean title: remove "Short - ", format codes, raw video IDs, and extensions
  const cleanTitle = (name) => {
    if (!name) return 'Video';
    return name
      .replace(/^Short\s*[-–—:]\s*/i, '')
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

  const formatDuration = (sec) => {
    if (!sec || isNaN(sec)) return null;
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${String(rem).padStart(2, '0')}`;
  };

  const displayTitle = file.title || cleanTitle(file.name);

  return (
    <div className={`video-card ${isShort ? 'video-card-short' : 'video-card-landscape'}`}>
      {/* Framed Video Player */}
      <div className={`video-frame-container ${isShort ? 'frame-vertical-short' : 'frame-landscape-video'}`}>
        <video
          className={`video-player ${isShort ? 'vertical-player' : 'landscape-player'}`}
          controls
          controlsList="nodownload"
          preload="metadata"
          playsInline
          src={file.url}
        >
          Your browser does not support the video tag.
        </video>

        {/* Category Badge (Top Left) */}
        {file.category === 'ready' ? (
          <span className="shorts-tag-ready">
            <Sparkles size={11} />
            <span>Shorts</span>
          </span>
        ) : file.category === 'drafts' ? (
          <span className="shorts-tag-draft">
            <Clock size={11} />
            <span>Pre Ready</span>
          </span>
        ) : (
          <span className="video-tag-download">
            <Film size={11} />
            <span>Source</span>
          </span>
        )}

        {/* Duration Pill (Bottom Right of Video) */}
        {file.duration && (
          <span className="video-duration-pill">
            {formatDuration(file.duration)}
          </span>
        )}

        {/* Quick Action Hover Buttons (Top Right) */}
        <div className="frame-quick-actions">
          <a
            href={file.url}
            download={file.name}
            className="frame-action-btn"
            title="Download original file"
            onClick={(e) => e.stopPropagation()}
          >
            <Download size={13} />
          </a>

          {onDelete && (
            <button
              type="button"
              className="frame-action-btn frame-delete-btn"
              title="Delete video"
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

      {/* Video Info & Actions */}
      <div className="video-body">
        <h3 className="video-title" title={displayTitle}>
          {displayTitle}
        </h3>

        <div className="video-meta-row">
          <div className="video-meta-tags">
            <span className="video-badge-size">{formatFileSize(file.size)}</span>
            <span className="video-badge-date">{formattedDate}</span>
          </div>

          {/* Quick Actions Bar */}
          <div className="video-actions-container">
            {file.category === 'ready' ? (
              <div className="ready-action-buttons">
                {/* 1-Click Download Button */}
                <a
                  href={file.url}
                  download={file.name}
                  className="card-btn-download-hd"
                  title="Download final Short in 1080p HD"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download size={13} />
                  <span>Download</span>
                </a>

                {/* Edit Text Button */}
                {onReviewShort && (
                  <button
                    type="button"
                    onClick={() => onReviewShort(file)}
                    className="card-btn-edit-text"
                    title="Customize title or channel watermark"
                  >
                    <Type size={12} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            ) : file.category === 'drafts' && onReviewShort ? (
              <button
                type="button"
                onClick={() => onReviewShort(file)}
                className="action-btn-amber-full"
                title="Add hook text & watermark branding"
              >
                <Sparkles size={13} />
                <span>Add Text & Brand</span>
              </button>
            ) : onGenerateShorts ? (
              <button
                type="button"
                onClick={() => onGenerateShorts(file)}
                className="action-btn-primary-full"
                title="Detect viral moments & generate 9:16 vertical Shorts"
              >
                <Sparkles size={13} />
                <span>Generate Shorts</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
