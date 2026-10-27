import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Type } from 'lucide-react';

export default function VideoCard({ file, formatFileSize, onGenerateShorts, onReviewShort }) {
  const [durationStr, setDurationStr] = useState('');
  const isShort = /#shorts|\bshorts\b/i.test(file.name);

  // Clean title: remove format codes (.f616), raw video IDs [yNd4wg47-PY], and extensions
  const cleanTitle = (name) => {
    if (!name) return 'Video';
    return name
      .replace(/\[[a-zA-Z0-9_\-]{8,16}\]/g, '')
      .replace(/\([a-zA-Z0-9_\-]{8,16}\)/g, '')
      .replace(/\.f\d+(\.[a-z0-9]+)?$/i, '')
      .replace(/\.(mp4|mkv|webm)$/i, '')
      .replace(/#shorts/gi, '')
      .trim();
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleMetadata = (e) => {
    if (e.target && e.target.duration) {
      setDurationStr(formatDuration(e.target.duration));
    }
  };

  const formattedDate = new Date(file.mtime).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="video-card">
      {/* Framed Video Player without download control */}
      <div className="video-frame-container">
        <video
          className="video-player"
          controls
          controlsList="nodownload"
          preload="metadata"
          playsInline
          src={file.url}
          onLoadedMetadata={handleMetadata}
        >
          Your browser does not support the video tag.
        </video>

        {isShort && (
          <span className="shorts-tag">
            Shorts
          </span>
        )}

        {durationStr && (
          <span className="video-duration-pill">
            {durationStr}
          </span>
        )}
      </div>

      {/* Video Information & Actions */}
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
            {isShort && onReviewShort ? (
              <button
                type="button"
                onClick={() => onReviewShort(file)}
                className="action-btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.28rem 0.6rem',
                  borderRadius: '0.45rem',
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer'
                }}
                title="Review this Short and customize top text & channel username"
              >
                <Type size={12} color="#ef4444" />
                <span>Add / Edit Text</span>
              </button>
            ) : !isShort && onGenerateShorts ? (
              <button
                type="button"
                onClick={() => onGenerateShorts(file)}
                className="action-btn-primary"
                title="Generate 9:16 viral Shorts with Gemini AI in Hinglish"
              >
                <Sparkles size={12} />
                <span>Shorts</span>
              </button>
            ) : (
              <span className="short-ready-badge" title="Already in vertical Shorts format">
                <CheckCircle2 size={11} color="#16a34a" />
                <span>Ready</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
