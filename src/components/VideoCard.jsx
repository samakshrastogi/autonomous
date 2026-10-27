import React from 'react';
import { Sparkles, CheckCircle2, Type, Clock, Download } from 'lucide-react';

export default function VideoCard({ file, formatFileSize, onGenerateShorts, onReviewShort }) {
  const isShort = file.category === 'drafts' || file.category === 'ready' || /#shorts|\bshorts\b/i.test(file.name);

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

  const formattedDate = new Date(file.mtime).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
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

        {/* Status Pill on Video Frame */}
        {file.category === 'ready' ? (
          <span className="shorts-tag-ready">
            ✅ Ready Short
          </span>
        ) : file.category === 'drafts' ? (
          <span className="shorts-tag-draft">
            ⏳ Needs Text
          </span>
        ) : file.category === 'downloads' ? (
          <span className="video-tag-download">
            📥 Full Video
          </span>
        ) : isShort ? (
          <span className="shorts-tag">
            Shorts
          </span>
        ) : null}
      </div>

      {/* Video Information & Actions */}
      <div className="video-body">
        <h3 className="video-title" title={cleanTitle(file.name)}>
          {cleanTitle(file.name)}
        </h3>

        <div className="video-meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span className="video-badge">{formatFileSize(file.size)}</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formattedDate}</span>
            {file.subfolder && (
              <span className="subfolder-pill" title={`Located in ${file.subfolder}`}>
                {file.subfolder.replace(/^\d+_/, '')}
              </span>
            )}
          </div>

          <div className="video-actions">
            {file.category === 'drafts' && onReviewShort ? (
              <button
                type="button"
                onClick={() => onReviewShort(file)}
                className="action-btn-amber"
                title="Review this draft and burn your custom top text hook"
              >
                <Type size={12} />
                <span>Add Text</span>
              </button>
            ) : file.category === 'ready' && onReviewShort ? (
              <button
                type="button"
                onClick={() => onReviewShort(file)}
                className="action-btn-secondary"
                title="Edit text hook or channel handle on this Short"
              >
                <Type size={12} color="#16a34a" />
                <span>Edit Text</span>
              </button>
            ) : (!file.category || file.category === 'downloads') && onGenerateShorts ? (
              <button
                type="button"
                onClick={() => onGenerateShorts(file)}
                className="action-btn-primary"
                title="Generate 9:16 viral Shorts with Gemini AI in Hinglish"
              >
                <Sparkles size={12} />
                <span>Shorts</span>
              </button>
            ) : isShort && onReviewShort ? (
              <button
                type="button"
                onClick={() => onReviewShort(file)}
                className="action-btn-secondary"
              >
                <Type size={12} color="#ef4444" />
                <span>Add / Edit Text</span>
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
