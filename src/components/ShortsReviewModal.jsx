import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  AtSign,
  X,
  Check,
  Film,
  Loader2,
  RotateCw,
  Play,
  RotateCcw,
  Clock,
  CheckCircle2,
  Flame,
  Cpu
} from 'lucide-react';

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

const BURN_STAGES = [
  {
    step: 1,
    label: 'Overlay',
    title: 'Rendering Overlay & Emojis',
    desc: 'Generating crystal-clear typography and full-color emojis...',
    badge: 'Stage 1/5'
  },
  {
    step: 2,
    label: 'Framing',
    title: 'Applying 9:16 Vertical Framing',
    desc: 'Composing vertical ratio with cinematic ambient blur...',
    badge: 'Stage 2/5'
  },
  {
    step: 3,
    label: 'Encoding',
    title: 'FFmpeg Hardware Encoding',
    desc: 'Encoding 60fps video stream with multi-threaded x264...',
    badge: 'Stage 3/5'
  },
  {
    step: 4,
    label: 'Branding',
    title: 'Burning Retention Hook & Handle',
    desc: 'Applying viral title card and channel watermark...',
    badge: 'Stage 4/5'
  },
  {
    step: 5,
    label: 'Finalizing',
    title: 'Graduating to Shorts Ready',
    desc: 'Renaming file matching chosen title & finalizing metadata...',
    badge: 'Stage 5/5'
  }
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

  // Dynamic live progress engine
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  // Animate progress smoothly through real technical milestones while backend processes
  useEffect(() => {
    let progressTimer = null;
    let clockTimer = null;

    if (isProcessing) {
      setIsSuccess(false);
      setProgressPercent(8);
      setCurrentStageIndex(0);
      setElapsedSeconds(0);

      const startTime = Date.now();

      clockTimer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      progressTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;

        let stageIdx = 0;
        let targetPercent = 8;

        if (elapsed < 2400) {
          stageIdx = 0;
          targetPercent = 8 + Math.floor((elapsed / 2400) * 20); // 8% -> 28%
        } else if (elapsed < 5800) {
          stageIdx = 1;
          const stageElapsed = elapsed - 2400;
          targetPercent = 28 + Math.floor((stageElapsed / 3400) * 26); // 28% -> 54%
        } else if (elapsed < 9800) {
          stageIdx = 2;
          const stageElapsed = elapsed - 5800;
          targetPercent = 54 + Math.floor((stageElapsed / 4000) * 24); // 54% -> 78%
        } else if (elapsed < 13500) {
          stageIdx = 3;
          const stageElapsed = elapsed - 9800;
          targetPercent = 78 + Math.floor((stageElapsed / 3700) * 16); // 78% -> 94%
        } else {
          stageIdx = 4;
          const stageElapsed = elapsed - 13500;
          targetPercent = Math.min(98, 94 + Math.floor((stageElapsed / 5000) * 4)); // 94% -> 98%
        }

        setCurrentStageIndex(stageIdx);
        setProgressPercent((prev) => Math.max(prev, targetPercent));
      }, 140);
    } else {
      if (progressPercent > 0 && !error) {
        setProgressPercent(100);
        setIsSuccess(true);
      }
    }

    return () => {
      if (progressTimer) clearInterval(progressTimer);
      if (clockTimer) clearInterval(clockTimer);
    };
  }, [isProcessing, error]);

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
      setIsSuccess(true);
      setProgressPercent(100);
    } catch (err) {
      setError(err.message || 'Failed to update Short');
      setIsSuccess(false);
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

              {/* Live Overlay: Top Hook / Title (Active for whole video) */}
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

            <div className="review-preview-footer">
              <div className="review-preview-badge">
                <span className="live-dot-pulse"></span>
                <span>9:16 Live Preview</span>
              </div>

              {topText.trim() && (
                <div className="preview-hook-live-indicator">
                  <Sparkles size={11} color="#facc15" />
                  <span>Hook Active (Whole Video)</span>
                </div>
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
                  <span>Retention Hook & Title (Whole Video)</span>
                </label>
                <span className="review-tag-gold">Full Video Hook</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 0.45rem', lineHeight: 1.35 }}>
                Displays throughout the entire video to keep viewers engaged and maximize retention from 0s to the end.
              </p>

              <textarea
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                onFocus={() => setIsEditingHook(true)}
                onBlur={() => setIsEditingHook(false)}
                placeholder="Type viral hook / title, or choose a Gemini suggestion below..."
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

            {/* Dynamic Real-time Processing & Success Card */}
            {(isProcessing || isSuccess) && (
              <div className={`review-processing-card ${isSuccess ? 'success-card' : ''}`}>
                <div className="review-processing-header">
                  <div className="review-processing-title-wrap">
                    {isSuccess ? (
                      <>
                        <CheckCircle2 size={16} color="#10b981" />
                        <span className="review-processing-title" style={{ color: '#34d399' }}>
                          Short Ready!
                        </span>
                      </>
                    ) : (
                      <>
                        <Loader2 size={15} className="spin" color="#ef4444" />
                        <span className="review-stage-badge">
                          {BURN_STAGES[currentStageIndex]?.badge || 'Working'}
                        </span>
                        <span className="review-processing-title">
                          {BURN_STAGES[currentStageIndex]?.title || 'Processing Short...'}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="review-meta-pills">
                    {!isSuccess && (
                      <span className="review-timer-pill">
                        ⏱ 00:{String(elapsedSeconds).padStart(2, '0')}
                      </span>
                    )}
                    <span
                      className="review-progress-pct"
                      style={{ color: isSuccess ? '#34d399' : '#fb923c' }}
                    >
                      {isSuccess ? '100%' : `${progressPercent}%`}
                    </span>
                  </div>
                </div>

                <div
                  className="review-processing-desc"
                  style={{ color: isSuccess ? '#a7f3d0' : '#cbd5e1' }}
                >
                  {isSuccess
                    ? '🎉 Video successfully branded and moved to Shorts Ready gallery!'
                    : BURN_STAGES[currentStageIndex]?.desc}
                </div>

                {/* Moving Glowing Live Progress Bar */}
                <div className="review-progress-track">
                  <div
                    className={`review-progress-bar ${isSuccess ? 'success-bar' : ''}`}
                    style={{ width: `${isSuccess ? 100 : progressPercent}%` }}
                  />
                </div>

                {/* 5 Milestone Step Indicators */}
                {!isSuccess && (
                  <div className="review-stage-dots">
                    {BURN_STAGES.map((s, idx) => {
                      const isActive = idx === currentStageIndex;
                      const isDone = idx < currentStageIndex;
                      return (
                        <div key={s.step} className="review-stage-dot-wrap">
                          <div
                            className={`review-dot ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`}
                          />
                          <span
                            className={`review-dot-label ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`}
                          >
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                style={{
                  background: isSuccess
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : undefined,
                  boxShadow: isProcessing
                    ? '0 0 16px rgba(239, 68, 68, 0.4)'
                    : undefined
                }}
              >
                {isSuccess ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Short Ready (100%)</span>
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    <span>Rendering ({progressPercent}%)...</span>
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
