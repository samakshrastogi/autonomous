import React, { useState, useEffect } from 'react';
import { Sparkles, AtSign, X, Check, Film, Loader2 } from 'lucide-react';

const HOOK_PRESETS = [
  "Wait for the end! 😱",
  "Papa ka reaction dekh ke dang! 😂",
  "Ye kya ho gaya?! 🤯",
  "Don't miss this! 🔥"
];

const cleanShortTitle = (rawName) => {
  if (!rawName) return '';
  return rawName.replace(/^Short\s*-\s*/i, '').replace(/\.mp4$/i, '');
};

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
      setError('Please provide top hook text or a channel watermark.');
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
      setError(err.message || 'Failed to update Short');
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div
        className="modal-content review-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header review-modal-header">
          <div className="review-header-title-box">
            <div className="review-header-icon-glow">
              <Sparkles size={18} color="#ef4444" />
            </div>
            <div>
              <h3 className="review-header-title">
                Customize Short & Branding
              </h3>
              <p className="review-header-subtitle">
                Add viral hook text and channel watermark before publishing
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
          <div className="review-error-card">
            {error}
          </div>
        )}

        <div className="review-modal-body">
          {/* 9:16 Vertical Live Preview Stage */}
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

              {/* Live Overlay: Top Hook Text (positioned matching video render) */}
              {topText.trim() && (
                <div className="review-top-text-overlay">
                  <div className="review-hook-badge">
                    {topText}
                  </div>
                </div>
              )}

              {/* Live Overlay: Bottom Channel Username */}
              {handle.trim() && (
                <div className="review-bottom-handle-overlay">
                  <div className="handle-pill">
                    {handle.startsWith('@') ? handle : `@${handle}`}
                  </div>
                </div>
              )}
            </div>

            <div className="review-preview-badge">
              <span className="live-dot-pulse"></span>
              <span>9:16 Live Preview</span>
            </div>
          </div>

          {/* Form & Controls Column */}
          <form className="review-controls-column" onSubmit={handleApply}>
            {/* Source Video Pill */}
            <div className="review-source-pill">
              <Film size={14} color="#ef4444" style={{ flexShrink: 0 }} />
              <span className="review-source-title">
                {cleanShortTitle(shortFile.name)}
              </span>
            </div>

            {/* Top Hook Section */}
            <div className="review-field-group">
              <div className="review-field-header">
                <label className="review-field-label">
                  <span className="dot-indicator" style={{ background: '#eab308' }}></span>
                  <span>Top Hook Text</span>
                </label>
                <span className="review-tag-gold">Hook</span>
              </div>

              <textarea
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder="e.g. Wait for Papa's epic reaction... 😂"
                rows={2}
                disabled={isProcessing}
                className="review-textarea"
              />

              {/* Quick Suggestion Chips */}
              <div className="review-hook-chips">
                {HOOK_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={isProcessing}
                    className="review-chip-btn"
                    onClick={() => setTopText(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Channel Handle Section */}
            <div className="review-field-group">
              <div className="review-field-header">
                <label className="review-field-label">
                  <AtSign size={13} color="#38bdf8" />
                  <span>Channel Watermark</span>
                </label>
                <span className="review-tag-cyan">Branding</span>
              </div>

              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. @yourchannel"
                disabled={isProcessing}
                className="review-input"
              />
            </div>

            {/* Processing State */}
            {isProcessing && (
              <div className="review-processing-card">
                <div className="review-processing-status">
                  <Loader2 size={15} className="spin" color="#ef4444" />
                  <span>Creating branded 9:16 Short...</span>
                </div>
                <div className="progress-track" style={{ height: '6px', margin: '0.6rem 0 0' }}>
                  <div className="progress-fill progress-indeterminate" style={{ width: '100%', background: 'linear-gradient(90deg, #ef4444, #f59e0b)' }}></div>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="review-actions-bar">
              <button
                type="button"
                onClick={onClose}
                className="review-btn-cancel"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="review-btn-submit"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Apply to Video</span>
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
