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
  Cpu,
  Gamepad2,
  Timer,
  MessageSquare,
  Copy,
  BrainCircuit
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

const DEFAULT_GAMING_HOOKS = [
  "Can you solve this puzzle?! 🤯",
  "White to move: Win in 2 moves! ♟️🔥",
  "Find the winning move! 🧠⏳",
  "Grandmaster Trap! What's the move? 👀",
  "99% People Fail This Move! 😱"
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
    title: 'Burning Retention Hook, Timer & CTA',
    desc: 'Applying viral title card, 5s countdown timer & channel branding...',
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
  activeChannel = 'haso_dil_khol_k',
  onBurnText,
  isProcessing,
  apiKey
}) {
  const isGaming = activeChannel === 'samaksh_gaming' || shortFile?.channelMode === 'gaming';

  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState(isGaming ? 'Comment your move 👇' : '');
  const [handle, setHandle] = useState('');
  const [showTimer, setShowTimer] = useState(isGaming);
  const [timerDuration, setTimerDuration] = useState(5);
  const [solution, setSolution] = useState('');
  const [suggestedHooks, setSuggestedHooks] = useState([]);
  const [loadingHooks, setLoadingHooks] = useState(false);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);
  const [copiedSolution, setCopiedSolution] = useState(false);
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
    return isGaming ? DEFAULT_GAMING_HOOKS : DEFAULT_FALLBACK_HOOKS;
  };

  // Analyze silent gaming video with Gemini Vision (No Audio required)
  const handleAnalyzeGamingVision = async () => {
    if (!shortFile || isAnalyzingVision || isProcessing) return;
    setIsAnalyzingVision(true);
    setError('');
    try {
      const res = await fetch('/api/analyze-gaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: shortFile.name,
          apiKey: apiKey || localStorage.getItem('gemini_api_key') || ''
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gemini Vision analysis failed.');
      }
      if (data.hook) setTopText(data.hook);
      if (Array.isArray(data.suggestedHooks) && data.suggestedHooks.length > 0) {
        setSuggestedHooks(data.suggestedHooks.slice(0, 5));
      }
      if (data.solution) setSolution(data.solution);
      if (data.bottomText) setBottomText(data.bottomText);
      setShowTimer(true);
    } catch (err) {
      setError(err.message || 'Vision analysis could not complete.');
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  useEffect(() => {
    if (isOpen && shortFile) {
      const isGamingMode = activeChannel === 'samaksh_gaming' || shortFile.channelMode === 'gaming';
      setShowTimer(isGamingMode);
      setTimerDuration(shortFile.timerDuration || 5);
      setBottomText(shortFile.bottomText || (isGamingMode ? 'Comment your move 👇' : ''));
      setSolution(shortFile.solution || '');

      const defaultHandle = isGamingMode ? '@SamakshGaming' : '@HasoDilKholK';
      const savedHandle = channelHandle || localStorage.getItem('shorts_channel_handle') || defaultHandle;
      setHandle(savedHandle);
      setError('');

      if (Array.isArray(shortFile.suggestedHooks) && shortFile.suggestedHooks.length > 0) {
        const hooks = shortFile.suggestedHooks.slice(0, 5);
        setSuggestedHooks(hooks);
        setTopText(initialHook || shortFile.hook || hooks[0] || '');
      } else {
        fetchGeminiHooks(shortFile).then((hooks) => {
          if (hooks && hooks.length > 0) {
            setTopText(initialHook || hooks[0] || '');
          } else {
            setTopText(initialHook || (isGamingMode ? DEFAULT_GAMING_HOOKS[0] : DEFAULT_FALLBACK_HOOKS[0]));
          }
        });
      }
    }
  }, [isOpen, shortFile, initialHook, channelHandle, activeChannel]);

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

  const handleCopySolution = () => {
    if (solution) {
      navigator.clipboard.writeText(solution);
      setCopiedSolution(true);
      setTimeout(() => setCopiedSolution(false), 2000);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!topText.trim() && !handle.trim() && !bottomText.trim()) {
      setError('Please provide a top challenge/hook, comment text, or channel handle.');
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
        bottomText: bottomText.trim(),
        channelHandle: cleanHandle,
        timerDuration: showTimer ? timerDuration : 0
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
            <div
              className="review-header-icon-glow"
              style={{
                background: isGaming ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.12)',
                borderColor: isGaming ? 'rgba(56, 189, 248, 0.35)' : 'rgba(239, 68, 68, 0.3)'
              }}
            >
              {isGaming ? (
                <Gamepad2 size={18} color="#38bdf8" />
              ) : (
                <Sparkles size={18} color="#ef4444" />
              )}
            </div>
            <div>
              <h3 className="review-header-title">
                {isGaming ? 'Customize Gaming Short & Challenge' : 'Customize Short & Retention Hook'}
              </h3>
              <p className="review-header-subtitle">
                {isGaming
                  ? 'Add puzzle question, 5s countdown timer & "Comment your move" CTA'
                  : 'Add viral title/hook and channel watermark with live visual preview'}
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

              {/* Live Overlay: Top Hook / Puzzle Question */}
              {topText.trim() && (
                <div className="review-top-text-overlay">
                  <div className="review-hook-badge">
                    {topText}
                  </div>
                </div>
              )}

              {/* Live Overlay: 5-Second Countdown Timer Badge */}
              {showTimer && (
                <div className="review-timer-overlay">
                  <div className="review-timer-badge">
                    <span className="timer-badge-icon">⏳</span>
                    <span className="timer-badge-digits">
                      {currentTime <= timerDuration
                        ? `0${Math.max(1, Math.ceil(timerDuration - currentTime))}s`
                        : currentTime <= timerDuration + 1.5
                        ? "TIME'S UP! 🔥"
                        : null}
                    </span>
                  </div>
                </div>
              )}

              {/* Live Overlay: Bottom Comment CTA + Channel Handle */}
              {(bottomText.trim() || handle.trim()) && (
                <div className="review-bottom-branding-group">
                  {bottomText.trim() && (
                    <div className="review-cta-comment-pill">
                      💬 {bottomText}
                    </div>
                  )}
                  {handle.trim() && (
                    <div className="handle-pill">
                      {handle.startsWith('@') ? handle : `@${handle}`}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="review-preview-footer">
              <div className="review-preview-badge">
                <span className="live-dot-pulse"></span>
                <span>9:16 Live Preview</span>
              </div>

              {showTimer && (
                <div className="preview-hook-live-indicator" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                  <Timer size={11} color="#38bdf8" />
                  <span>{timerDuration}s Timer Active</span>
                </div>
              )}
            </div>
          </div>

          {/* Form & Controls Column */}
          <form className="review-controls-column" onSubmit={handleApply}>
            {/* Source Video Pill */}
            <div className="review-source-pill">
              <Film size={14} color={isGaming ? '#38bdf8' : '#ef4444'} style={{ flexShrink: 0 }} />
              <span className="review-source-title">
                {cleanShortTitle(shortFile.name)}
              </span>
            </div>

            {/* AI Vision Gaming Analysis Quick Action (Samaksh Gaming Mode) */}
            {isGaming && (
              <div className="review-vision-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <BrainCircuit size={15} color="#38bdf8" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>
                    Silent Clip? Gemini Vision
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAnalyzeGamingVision}
                  disabled={isAnalyzingVision || isProcessing}
                  className="review-vision-btn"
                  title="Analyze visual puzzle moves with Gemini Vision (Works without audio)"
                >
                  <Sparkles size={12} className={isAnalyzingVision ? 'spin' : ''} />
                  <span>{isAnalyzingVision ? 'Analyzing Frames...' : 'Analyze Moves & Puzzles'}</span>
                </button>
              </div>
            )}

            {/* Hook / Puzzle Challenge Question Section */}
            <div className="review-field-group">
              <div className="review-field-header">
                <label className="review-field-label">
                  <span
                    className="dot-indicator"
                    style={{ background: isGaming ? '#38bdf8' : '#eab308' }}
                  ></span>
                  <span>{isGaming ? 'Exciting Puzzle Question (Above Video)' : 'Retention Hook & Title'}</span>
                </label>
                <span className={isGaming ? 'review-tag-cyan' : 'review-tag-gold'}>
                  {isGaming ? 'Moves & Puzzle' : 'Full Video Hook'}
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 0.45rem', lineHeight: 1.35 }}>
                {isGaming
                  ? 'Excite viewers with the puzzle, moves, or trick to get them guessing and commenting below.'
                  : 'Displays throughout the video to maximize viewer retention and interest.'}
              </p>

              <textarea
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                onFocus={() => setIsEditingHook(true)}
                onBlur={() => setIsEditingHook(false)}
                placeholder={isGaming ? "e.g. White to move: Win in 2 moves! ♟️🔥" : "Type viral hook / title..."}
                rows={2}
                disabled={isProcessing}
                className="review-textarea"
              />

              {/* 5 Best Suggestions */}
              <div style={{ marginTop: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: isGaming ? '#38bdf8' : '#facc15', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Sparkles size={12} color={isGaming ? '#38bdf8' : '#facc15'} />
                    {isGaming ? '5 Exciting Move Suggestions' : '5 Best Hooks (Gemini Suggestions)'}
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshSuggestions}
                    disabled={loadingHooks || isProcessing}
                    className="review-refresh-btn"
                    title="Generate 5 new hook suggestions"
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
                        onClick={() => setTopText(hook)}
                        title="Click to apply"
                      >
                        {hook}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Countdown Timer Configuration (Samaksh Gaming Mode) */}
            <div className="review-field-group">
              <div className="review-field-header">
                <label className="review-field-label">
                  <Timer size={13} color="#facc15" />
                  <span>Countdown Timer (First 5 Seconds)</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label className="timer-toggle-label">
                    <input
                      type="checkbox"
                      checked={showTimer}
                      onChange={(e) => setShowTimer(e.target.checked)}
                      disabled={isProcessing}
                    />
                    <span>Enable Timer</span>
                  </label>
                </div>
              </div>

              {showTimer && (
                <div className="timer-options-row">
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Duration:</span>
                  {[3, 5, 8, 10].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      disabled={isProcessing}
                      className={`timer-sec-btn ${timerDuration === sec ? 'active' : ''}`}
                      onClick={() => setTimerDuration(sec)}
                    >
                      {sec}s {sec === 5 ? '(Default)' : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Call-To-Action Text */}
            <div className="review-field-group">
              <div className="review-field-header">
                <label className="review-field-label">
                  <MessageSquare size={13} color="#38bdf8" />
                  <span>Bottom Call To Action (Below Video)</span>
                </label>
                <span className="review-tag-cyan">Comment Prompt</span>
              </div>

              <input
                type="text"
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                placeholder="e.g. Comment your move 👇"
                disabled={isProcessing}
                className="review-input"
              />
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
                placeholder="e.g. @SamakshGaming or @HasoDilKholK"
                disabled={isProcessing}
                className="review-input"
              />
            </div>

            {/* Pinned Solution Helper (If solution detected by Gemini) */}
            {solution && (
              <div className="review-solution-card">
                <div className="review-solution-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BrainCircuit size={14} color="#38bdf8" />
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#f8fafc' }}>
                      Solution for Pinned Comment:
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySolution}
                    className="review-copy-btn"
                    title="Copy solution text to paste into YouTube pinned comment"
                  >
                    {copiedSolution ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
                    <span>{copiedSolution ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <p className="review-solution-text">{solution}</p>
              </div>
            )}

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
