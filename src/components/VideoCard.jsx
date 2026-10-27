import React from 'react';
import { Sparkles } from 'lucide-react';

export default function VideoCard({ file, formatFileSize, onGenerateShorts }) {
  const isShort = /#shorts|\bshorts\b/i.test(file.name);

  const cleanTitle = (name) => {
    if (!name) return 'Video';
    return name
      .replace(/\.f\d+(\.[a-z0-9]+)?$/i, '')
      .replace(/\.(mp4|mkv|webm)$/i, '');
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
        >
          Your browser does not support the video tag.
        </video>
        {isShort && (
          <span className="shorts-tag">
            Shorts
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
            {!isShort && onGenerateShorts && (
              <button
                type="button"
                onClick={() => onGenerateShorts(file)}
                className="action-btn-primary"
                title="Generate 9:16 viral Shorts with Gemini AI in Hinglish"
              >
                <Sparkles size={12} />
                <span>Shorts</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
