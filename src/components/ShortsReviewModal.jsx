import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, AtSign, X, Check, Film, Loader2, RotateCw, Play, RotateCcw, Clock } from 'lucide-react';

const cleanShortTitle = (rawName) => {
  if (!rawName) return '';
  return rawName.replace(/^Short\s*-\s*/i, '').replace(/\.mp4$/i, '');
};

const DEFAULT_FALLBACK_HOOKS = [
  "Wait for the end twist! 😱",
  "Reaction dekh ke hasi nahi rukegi 😂",
  "Bhai ne yeh kya bol diya?! 🤯",
  "Dhyan se dekho end me kya hua 👀",
  "Don't miss the climax! 🔥"
];

export default function ShortsReviewModal({
  isOpen,
  onClose,
  shortFile,
  initialHook,
  channelHandle,
  onBurnText,
  isProcessing,
  apiKey
}) {
  const [topText, setTopText] = useState('');
  const [handle, setHandle] = useState('');
  const [suggestedHooks, setSuggestedHooks] = useState([]);
  const [loadingHooks, setLoadingHooks] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isEditingHook, setIsEditingHook] = useState(false);
  const videoRef = useRef(null);

  // Fetch 5 Gemini-generated hook suggestions for this Short
  const fetchGeminiHooks = async (file) => {
    if (!file) return;
    setLoadingHooks(true);
    try {
      const res = await fetch('/api/suggest-hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          title: file.title || file.name,
          apiKey: apiKey || localStorage.getItem('gemini_api_key') || ''
        })
      });
      const data = await res.json();
      if (Array.isArray(data.suggestedHooks) && data.suggestedHooks.length > 0) {
        setSuggestedHooks(data.suggestedHooks.slice(0, 5));
        return data.suggestedHooks.slice(0, 5);
      }
    } catch (err) {
      console.warn('Failed to fetch Gemini hooks:', err.message);
    } finally {
      setLoadingHooks(false);
    }
    return DEFAULT_FALLBACK_HOOKS;
  };

  useEffect(() => {
    if (isOpen && shortFile) {
      const savedHandle = channelHandle || localStorage.getItem('shorts_channel_handle') || '';
      setHandle(savedHandle);
      setError('');

      // Check if file already has suggestedHooks from Gemini
      if (Array.isArray(shortFile.suggestedHooks) && shortFile.suggestedHooks.length > 0) {
        const hooks = shortFile.suggestedHooks.slice(0, 5);
        setSuggestedHooks(hooks);
        setTopText(initialHook || hooks[0] || '');
      } else {
        // Fetch fresh 5 suggestions from Gemini
        fetchGeminiHooks(shortFile).then((hooks) => {
          if (hooks && hooks.length > 0) {
            setTopText(initialHook || hooks[0] || '');
          } else {
            setTopText(initialHook || DEFAULT_FALLBACK_HOOKS[0]);
          }
        });
      }
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

  const handleRefreshSuggestions = async () => {
    if (loadingHooks || isProcessing) return;
    const hooks = await fetchGeminiHooks(shortFile);
    if (hooks && hooks.length > 0 && !topText.trim()) {
      setTopText(hooks[0]);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!topText.trim() && !handle.trim()) {
      setError('Please provide a top title/hook or a channel watermark.');
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
                Add viral title/hook and channel watermark with live visual preview
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
                ref={videoRef}
                src={shortFile.url}
                className="review-video-player"
                controls
                controlsList="nodownload"
                playsInline
                preload="metadata"
                key={shortFile.url}
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                onPause={() => setIsPaused(true)}
                onPlay={() => setIsPaused(false)}
              />

              {/* Live Overlay: Top Hook / Title (Active for first 5s or while editing/paused) */}
              {topText.trim() && (currentTime <= 5.0 || isPaused || isEditingHook) && (
                <div className={`review-top-text-overlay ${currentTime > 5.0 ? 'preview-dimmed' : ''}`}>
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

            <div className="review-preview-footer">
              <div className="review-preview-badge">
                <span className="live-dot-pulse"></span>
                <span>9:16 Live Preview</span>
              </div>

              {currentTime <= 5.0 && !isPaused && topText.trim() && (
                <div className="preview-hook-live-indicator">
                  <Clock size={11} color="#facc15" />
                  <span>5s Hook ({Math.max(0, 5 - Math.floor(currentTime))}s)</span>
                </div>
              )}

              {currentTime > 5.0 && (
                <button
                  type="button"
                  className="preview-rewind-hook-btn"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      videoRef.current.play();
                    }
                  }}
                  title="Rewind to 0:00 to see 5s retention hook"
                >
                  <RotateCcw size={11} />
                  <span>Replay 5s Hook</span>
                </button>
              )}
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

            {/* Hook / Title Section */}
            <div className="review-field-group">
              <div className="review-field-header">
                <label className="review-field-label">
                  <span className="dot-indicator" style={{ background: '#eab308' }}></span>
                  <span>Retention Hook (First 5 Seconds)</span>
                </label>
                <span className="review-tag-gold">5s Hook</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 0.45rem', lineHeight: 1.35 }}>
                Displays for the first 5 seconds to excite viewers and skyrocket retention, then disappears.
              </p>

              <textarea
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                onFocus={() => setIsEditingHook(true)}
                onBlur={() => setIsEditingHook(false)}
                placeholder="Type viral retention hook, or choose a Gemini suggestion below..."
                rows={2}
                disabled={isProcessing}
                className="review-textarea"
              />

              {/* 5 Best Hook Suggestions from Gemini */}
              <div style={{ marginTop: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#facc15', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={12} color="#facc15" />
                    5 Best Hooks (Gemini Suggestions)
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshSuggestions}
                    disabled={loadingHooks || isProcessing}
                    className="review-refresh-btn"
                    title="Generate 5 new hook suggestions with Gemini"
                  >
                    <RotateCw size={11} className={loadingHooks ? 'spin' : ''} />
                    <span>{loadingHooks ? 'Generating...' : 'Refresh'}</span>
                  </button>
                </div>

                <div className="review-hook-chips">
                  {suggestedHooks.map((hook, idx) => {
                    const isSelected = topText.trim() === hook.trim();
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isProcessing}
                        className={`review-chip-btn ${isSelected ? 'active-chip' : ''}`}
                        onClick={() => {
                          setTopText(hook);
                          if (videoRef.current && currentTime > 5) {
                            videoRef.current.currentTime = 0;
                            videoRef.current.play();
                          }
                        }}
                        title="Click to apply to video"
                      >
                        {hook}
                      </button>
                    );
                  })}
                </div>
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
