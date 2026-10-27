import React, { useState, useEffect } from 'react';
import { Type, AtSign, X, Check, Film, Loader2 } from 'lucide-react';

export default function ShortsReviewModal({
  isOpen,
  onClose,
  shortFile,
  initialHook,
  channelHandle,
  onBurnText,
  isProcessing
}) {
  const [topText, setTopText] = useState('');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && shortFile) {
      setTopText(initialHook || '');
      setHandle(channelHandle || '');
      setError('');
    }
  }, [isOpen, shortFile, initialHook, channelHandle]);

  // Close on 'Escape' key when not processing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen || !shortFile) return null;

  const handleBackdropClick = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!topText.trim() && !handle.trim()) {
      setError('Please provide top text or a channel handle to apply.');
      return;
    }

    let cleanHandle = handle.trim();
    if (cleanHandle && !cleanHandle.startsWith('@')) {
      cleanHandle = `@${cleanHandle}`;
    }

    setError('');
    try {
      await onBurnText({
        filename: shortFile.name,
        topText: topText.trim(),
        channelHandle: cleanHandle
      });
    } catch (err) {
      setError(err.message || 'Failed to burn text to Short');
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div
        className="modal-content review-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Type size={20} color="#ef4444" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Review Short & Add Text
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.1rem' }}>
                Live visual preview: customize top hook & bottom username before burning
              </p>
            </div>
          </div>
          {!isProcessing && (
            <button
              type="button"
              onClick={onClose}
              className="modal-close-btn"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.65rem 0.85rem', borderRadius: '0.55rem', color: '#b91c1c', fontSize: '0.825rem', marginBottom: '0.9rem' }}>
            {error}
          </div>
        )}

        <div className="review-modal-body">
          {/* 9:16 Vertical Live Preview Frame */}
          <div className="review-preview-column">
            <div className="review-video-stage">
              <video
                src={shortFile.url}
                className="review-video-player"
                controls
                controlsList="nodownload"
                playsInline
                preload="metadata"
                key={shortFile.url}
              />

              {/* Live Overlay: Top Hook Text (Above center video) */}
              {topText.trim() && (
                <div className="live-overlay-top">
                  <div className="overlay-top-box">
                    {topText}
                  </div>
                </div>
              )}

              {/* Live Overlay: Bottom Channel Username (Below center video) */}
              {handle.trim() && (
                <div className="live-overlay-bottom">
                  <div className="overlay-bottom-box">
                    {handle.startsWith('@') ? handle : `@${handle}`}
                  </div>
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '0.4rem' }}>
              🔴 Live Preview Mockup (matches final 1080x1920 video)
            </div>
          </div>

          {/* Controls Column */}
          <form className="review-controls-column" onSubmit={handleApply}>
            <div style={{ background: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '0.55rem', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.85rem' }}>
              <Film size={14} color="#ef4444" style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shortFile.name}
              </span>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.4rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308', display: 'inline-block' }}></span>
                  Top Text (Above Video)
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>
                  High-retention viral hook
                </span>
              </label>
              <textarea
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder="e.g. Wait for Papa's epic reaction... 😂"
                rows={2}
                disabled={isProcessing}
                className="url-input"
                style={{ fontSize: '0.875rem', resize: 'vertical', minHeight: '56px', width: '100%', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.4rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AtSign size={13} color="#2563eb" />
                  Channel Username (Bottom Center)
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>
                  Permanent watermark
                </span>
              </label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. @yourchannel"
                disabled={isProcessing}
                className="url-input"
                style={{ fontSize: '0.875rem', padding: '0.6rem 0.8rem', width: '100%' }}
              />
            </div>

            {isProcessing && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.55rem', padding: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', color: '#1d4ed8', fontWeight: 600 }}>
                  <Loader2 size={16} className="spin" />
                  <span>Burning text & branding into 9:16 Short (takes ~15s)...</span>
                </div>
                <div className="progress-track" style={{ height: '6px', margin: '0.5rem 0 0' }}>
                  <div className="progress-fill progress-indeterminate" style={{ width: '100%' }}></div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={onClose}
                className="action-btn-subtle"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                disabled={isProcessing}
              >
                Close
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '0.55rem 1.35rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Burn Text to Video</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
