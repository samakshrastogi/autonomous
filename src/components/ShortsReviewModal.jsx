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
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle2,
  Gamepad2,
  Timer,
  MessageSquare,
  Copy,
  BrainCircuit,
  Heart,
  Share2,
  Laugh,
  HelpCircle
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

const GAMING_CTA_PRESETS = [
  "Comment your move 👇",
  "Can you spot the mate? 🤔",
  "White to move: comment below ♟️",
  "Did you solve it in time? ⏱️"
];

const COMEDY_CTA_PRESETS = [
  "Comment your reaction 😂👇",
  "Subscribe for part 2! ❤️",
  "Did you expect that twist?! 🤯",
  "Tag a friend who does this 🤣"
];

const BURN_STAGES = [
  { step: 1, label: 'Overlay', title: 'Rendering High-Res Overlay', desc: 'Composing crystal-clear typography & full-color Unicode emojis...', badge: 'Stage 1/5' },
  { step: 2, label: 'Framing', title: 'Applying 9:16 Vertical Framing', desc: 'Composing 9:16 vertical ratio with cinematic ambient edge-blur...', badge: 'Stage 2/5' },
  { step: 3, label: 'Encoding', title: 'FFmpeg Multi-Core Hardware Encoding', desc: 'Encoding 60fps video stream with multi-threaded x264...', badge: 'Stage 3/5' },
  { step: 4, label: 'Branding', title: 'Burning Challenge, Timer & Branding', desc: 'Burning retention hook, 5s countdown timer & channel watermark...', badge: 'Stage 4/5' },
  { step: 5, label: 'Finalizing', title: 'Saving to Shorts Ready', desc: 'Moving branded short to 03_Shorts_Ready library...', badge: 'Stage 5/5' }
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
  apiKey,
  apiKeys = []
}) {
  const isGaming = activeChannel === 'samaksh_gaming' || shortFile?.channelMode === 'gaming';

  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState(isGaming ? 'Comment your move 👇' : '');
  const [handle, setHandle] = useState('');
  const [showTimer, setShowTimer] = useState(isGaming);
  const [timerDuration, setTimerDuration] = useState(5);
  const [solution, setSolution] = useState('');
  const [suggestedHooks, setSuggestedHooks] = useState(isGaming ? DEFAULT_GAMING_HOOKS : DEFAULT_FALLBACK_HOOKS);
  const [loadingHooks, setLoadingHooks] = useState(false);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);
  const [copiedSolution, setCopiedSolution] = useState(false);
  const [error, setError] = useState('');

  // Video playback custom controls state
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showPlaySplash, setShowPlaySplash] = useState(false);

  // Dynamic live progress animation
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

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
          targetPercent = 8 + Math.floor((elapsed / 2400) * 20);
        } else if (elapsed < 5800) {
          stageIdx = 1;
          const stageElapsed = elapsed - 2400;
          targetPercent = 28 + Math.floor((stageElapsed / 3400) * 26);
        } else if (elapsed < 9800) {
          stageIdx = 2;
          const stageElapsed = elapsed - 5800;
          targetPercent = 54 + Math.floor((stageElapsed / 4000) * 24);
        } else if (elapsed < 14000) {
          stageIdx = 3;
          const stageElapsed = elapsed - 9800;
          targetPercent = 78 + Math.floor((stageElapsed / 4200) * 15);
        } else {
          stageIdx = 4;
          const stageElapsed = elapsed - 14000;
          targetPercent = Math.min(98, 93 + Math.floor((stageElapsed / 3000) * 5));
        }

        setCurrentStageIndex(stageIdx);
        setProgressPercent((prev) => {
          if (prev < targetPercent) return prev + 1;
          return prev;
        });
      }, 120);
    } else {
      if (progressTimer) clearInterval(progressTimer);
      if (clockTimer) clearInterval(clockTimer);
    }

    return () => {
      if (progressTimer) clearInterval(progressTimer);
      if (clockTimer) clearInterval(clockTimer);
    };
  }, [isProcessing]);

  // Fetch 5 Gemini-generated hook suggestions for this Short
  const fetchGeminiHooks = async (file) => {
    if (!file) return;
    setLoadingHooks(true);
    const keysToSend = (Array.isArray(apiKeys) && apiKeys.length > 0)
      ? apiKeys
      : (apiKey ? [apiKey] : []);

    try {
      const res = await fetch('/api/suggest-hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          title: file.title || file.name,
          channel: activeChannel,
          apiKey: keysToSend[0] || localStorage.getItem('gemini_api_key') || '',
          apiKeys: keysToSend
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
    const fallback = isGaming ? DEFAULT_GAMING_HOOKS : DEFAULT_FALLBACK_HOOKS;
    setSuggestedHooks(fallback);
    return fallback;
  };

  // Analyze silent gaming video with Gemini Vision (No Audio required)
  const handleAnalyzeGamingVision = async () => {
    if (!shortFile || isAnalyzingVision || isProcessing) return;
    setIsAnalyzingVision(true);
    setError('');
    const keysToSend = (Array.isArray(apiKeys) && apiKeys.length > 0)
      ? apiKeys
      : (apiKey ? [apiKey] : []);

    try {
      const res = await fetch('/api/analyze-gaming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: shortFile.name,
          apiKey: keysToSend[0] || localStorage.getItem('gemini_api_key') || '',
          apiKeys: keysToSend
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

  // Initialize values when opened
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
      setIsPlaying(true);

      if (Array.isArray(shortFile.suggestedHooks) && shortFile.suggestedHooks.length > 0) {
        const hooks = shortFile.suggestedHooks.slice(0, 5);
        setSuggestedHooks(hooks);
        setTopText(initialHook || shortFile.hook || hooks[0] || '');
      } else {
        // Immediate fallback based on channel mode
        const initialList = isGamingMode ? DEFAULT_GAMING_HOOKS : DEFAULT_FALLBACK_HOOKS;
        setSuggestedHooks(initialList);
        setTopText(initialHook || shortFile.hook || initialList[0]);

        // Background fetch for customized suggestions
        fetchGeminiHooks(shortFile).then((hooks) => {
          if (hooks && hooks.length > 0 && !initialHook && !shortFile.hook) {
            setTopText(hooks[0]);
          }
        });
      }
    }
  }, [isOpen, shortFile, initialHook, channelHandle, activeChannel]);

  // Close on Escape key when not rendering
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

  // Video custom player handlers
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setShowPlaySplash(true);
    setTimeout(() => setShowPlaySplash(false), 500);
  };

  const handleToggleMute = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleRewind = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  const handleCopySolution = () => {
    if (solution) {
      navigator.clipboard.writeText(solution);
      setCopiedSolution(true);
      setTimeout(() => setCopiedSolution(false), 2000);
    }
  };

  const handleApply = async (e) => {
    if (e) e.preventDefault();
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
        channel: activeChannel,
        timerDuration: showTimer ? timerDuration : 0
      });
      setIsSuccess(true);
      setProgressPercent(100);
    } catch (err) {
      setError(err.message || 'Failed to update Short');
      setIsSuccess(false);
    }
  };

  if (!isOpen || !shortFile) return null;

  const progressRatio = duration > 0 ? (currentTime / duration) * 100 : 0;
  const timerRemaining = Math.max(0, Math.ceil(timerDuration - currentTime));
  const isTimerExpired = currentTime > timerDuration;

  return (
    <div className="modal-overlay review-modal-overlay" onClick={() => !isProcessing && onClose()}>
      <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Fixed Header */}
        <header className="review-modal-header">
          <div className="review-header-title-box">
            <div
              className="review-header-icon-glow"
              style={{
                background: isGaming ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.14)',
                borderColor: isGaming ? 'rgba(56, 189, 248, 0.4)' : 'rgba(239, 68, 68, 0.4)'
              }}
            >
              {isGaming ? <Gamepad2 size={18} color="#38bdf8" /> : <Laugh size={18} color="#ef4444" />}
            </div>
            <div>
              <div className="review-header-title-row">
                <h3 className="review-header-title">
                  {isGaming ? 'Customize Gaming Short & Challenge' : 'Customize Short & Retention Hook'}
                </h3>
                <span className={`review-channel-tag ${isGaming ? 'gaming' : 'comedy'}`}>
                  {isGaming ? 'Samaksh Gaming' : 'Haso Dil Khol K'}
                </span>
              </div>
              <p className="review-header-subtitle">
                {isGaming
                  ? 'Add puzzle question, countdown timer & "Comment your move" CTA'
                  : 'Add viral hook title and channel watermark with real-time 9:16 preview'}
              </p>
            </div>
          </div>

          <div className="review-header-actions">
            <div className="review-source-chip" title={shortFile.name}>
              <Film size={12} color={isGaming ? '#38bdf8' : '#ef4444'} />
              <span>{cleanShortTitle(shortFile.name)}</span>
            </div>

            {!isProcessing && (
              <button
                type="button"
                onClick={onClose}
                className="modal-close-btn"
                title="Close (Esc)"
              >
                <X size={17} />
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="review-error-strip">
            <span>{error}</span>
          </div>
        )}

        {/* Modal Main Split Body */}
        <div className="review-modal-body">
          {/* Left Column: 9:16 Vertical Smartphone Stage */}
          <div className="review-preview-column">
            <div className="shorts-phone-frame">
              {/* Phone Camera Notch */}
              <div className="phone-notch-pill"></div>

              {/* Video Player */}
              <div className="phone-screen-container" onClick={handleTogglePlay}>
                <video
                  ref={videoRef}
                  src={shortFile.url}
                  className="shorts-video-element"
                  playsInline
                  autoPlay
                  loop
                  muted={isMuted}
                  key={shortFile.url}
                  onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.target.duration)}
                />

                {/* Animated Center Play/Pause Splash */}
                {showPlaySplash && (
                  <div className="player-splash-bubble">
                    {isPlaying ? <Play size={28} /> : <Pause size={28} />}
                  </div>
                )}

                {/* Top Corner Discreet Audio & Rewind Floating Controls */}
                <div className="shorts-top-hud">
                  <button
                    type="button"
                    onClick={handleRewind}
                    className="shorts-hud-btn"
                    title="Replay from start (0s)"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    className="shorts-hud-btn"
                    title={isMuted ? 'Unmute video' : 'Mute video'}
                  >
                    {isMuted ? <VolumeX size={12} color="#f87171" /> : <Volume2 size={12} color="#38bdf8" />}
                  </button>
                </div>

                {/* Simulated YouTube Shorts Side Icons (Authentic look) */}
                <div className="shorts-social-sidebar">
                  <div className="social-icon-btn"><Heart size={15} /><span>Like</span></div>
                  <div className="social-icon-btn"><MessageSquare size={15} /><span>Reply</span></div>
                  <div className="social-icon-btn"><Share2 size={15} /><span>Share</span></div>
                </div>

                {/* Live Overlay 1: Top Hook / Puzzle Question Card */}
                {topText.trim() && (
                  <div className="shorts-overlay-top">
                    <div className={`shorts-hook-badge ${isGaming ? 'gaming-hook' : 'comedy-hook'}`}>
                      {topText}
                    </div>
                  </div>
                )}

                {/* Live Overlay 2: Countdown Timer Badge (Gaming Mode) */}
                {showTimer && (
                  <div className="shorts-overlay-timer">
                    <div className={`shorts-timer-badge ${isTimerExpired ? 'expired' : 'active'}`}>
                      <span className="timer-icon">⏳</span>
                      <span className="timer-digits">
                        {isTimerExpired
                          ? "TIME'S UP! 🔥"
                          : `0${timerRemaining}s`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Live Overlay 3: Bottom Comment CTA + Channel Watermark */}
                {(bottomText.trim() || handle.trim()) && (
                  <div className="shorts-overlay-bottom">
                    {bottomText.trim() && (
                      <div className="shorts-comment-cta-pill">
                        💬 {bottomText}
                      </div>
                    )}
                    {handle.trim() && (
                      <div className="shorts-watermark-pill">
                        {handle.startsWith('@') ? handle : `@${handle}`}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Video Progress Scrub Bar */}
                <div className="shorts-scrubber-track">
                  <div
                    className="shorts-scrubber-fill"
                    style={{ width: `${progressRatio}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Stage Footer Status Indicators */}
            <div className="review-preview-footer">
              <div className="review-preview-badge">
                <span className="live-dot-pulse"></span>
                <span>9:16 Live Preview</span>
              </div>

              {showTimer && (
                <div className="preview-hook-live-indicator">
                  <Timer size={11} />
                  <span>{timerDuration}s Countdown Active</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Scrollable Studio Controls & Customizer */}
          <div className="review-controls-column">
            {/* AI Vision Gaming Analysis Quick Action (Samaksh Gaming Mode) */}
            {isGaming && (
              <div className="review-card vision-action-card">
                <div className="vision-card-left">
                  <BrainCircuit size={16} color="#38bdf8" />
                  <div>
                    <span className="vision-title">Silent Clip Analysis</span>
                    <span className="vision-desc">Detect board puzzle & exciting move automatically</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAnalyzeGamingVision}
                  disabled={isAnalyzingVision || isProcessing}
                  className="review-vision-btn"
                  title="Analyze visual puzzle moves with Gemini Vision (Works without audio)"
                >
                  <Sparkles size={13} className={isAnalyzingVision ? 'spin' : ''} />
                  <span>{isAnalyzingVision ? 'Analyzing...' : 'Analyze with Gemini Vision'}</span>
                </button>
              </div>
            )}

            {/* Section 1: Viral Challenge / Hook Question */}
            <div className="review-card">
              <div className="review-card-header">
                <div className="review-card-label">
                  <span className={`dot-indicator ${isGaming ? 'gaming' : 'comedy'}`}></span>
                  <span>{isGaming ? 'Exciting Puzzle Question (Above Video)' : 'Retention Hook & Title'}</span>
                </div>
                <span className={`review-tag ${isGaming ? 'tag-cyan' : 'tag-gold'}`}>
                  {isGaming ? 'Moves & Puzzle' : 'Full Video Hook'}
                </span>
              </div>

              <textarea
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                placeholder={isGaming ? "e.g. Can you solve this puzzle in 1 move?! 🤯" : "Type viral hook / title..."}
                rows={2}
                disabled={isProcessing}
                className="review-textarea"
              />

              {/* 5 Suggestion Chips */}
              <div className="review-suggestions-wrap">
                <div className="suggestions-header">
                  <span className="suggestions-title">
                    <Sparkles size={11} />
                    <span>{isGaming ? '5 Exciting Move Suggestions' : '5 Best Viral Hooks'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchGeminiHooks(shortFile)}
                    disabled={loadingHooks || isProcessing}
                    className="review-refresh-btn"
                    title="Generate new suggestions"
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
                        title="Click to apply to video"
                      >
                        {hook}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 2: Interactive Engagement (Countdown Timer & Comment CTA) */}
            <div className="review-card">
              <div className="review-card-header">
                <div className="review-card-label">
                  <Timer size={13} color="#facc15" />
                  <span>Countdown Timer & Audience Prompt</span>
                </div>
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

              {showTimer && (
                <div className="timer-duration-row">
                  <span className="field-hint">Timer Duration:</span>
                  <div className="segmented-pill-row">
                    {[3, 5, 8, 10].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        disabled={isProcessing}
                        className={`segmented-sec-btn ${timerDuration === sec ? 'active' : ''}`}
                        onClick={() => setTimerDuration(sec)}
                      >
                        {sec}s {sec === 5 ? '(Default)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Comment CTA Prompt */}
              <div className="cta-input-group">
                <label className="field-hint">Bottom Call To Action (Below Video):</label>
                <input
                  type="text"
                  value={bottomText}
                  onChange={(e) => setBottomText(e.target.value)}
                  placeholder="e.g. Comment your move 👇"
                  disabled={isProcessing}
                  className="review-input"
                />

                {/* Quick Presets */}
                <div className="preset-chips-row">
                  {(isGaming ? GAMING_CTA_PRESETS : COMEDY_CTA_PRESETS).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isProcessing}
                      className="preset-chip"
                      onClick={() => setBottomText(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Channel Watermark Branding */}
            <div className="review-card">
              <div className="review-card-header">
                <div className="review-card-label">
                  <AtSign size={13} color="#38bdf8" />
                  <span>Channel Watermark Branding</span>
                </div>
                <span className="review-tag tag-cyan">Watermark</span>
              </div>

              <div className="settings-input-wrap">
                <span className="input-prefix">@</span>
                <input
                  type="text"
                  value={handle.replace(/^@/, '')}
                  onChange={(e) => setHandle(`@${e.target.value.replace(/^@/, '').trim()}`)}
                  placeholder="SamakshGaming"
                  disabled={isProcessing}
                  className="review-input unbordered"
                />
              </div>
            </div>

            {/* Section 4: Pinned Solution Card (If detected by Vision) */}
            {solution && (
              <div className="review-solution-card">
                <div className="review-solution-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BrainCircuit size={14} color="#38bdf8" />
                    <span className="solution-title">Solution for Pinned Comment:</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySolution}
                    className="review-copy-btn"
                    title="Copy solution text"
                  >
                    {copiedSolution ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
                    <span>{copiedSolution ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <p className="review-solution-text">{solution}</p>
              </div>
            )}

            {/* Section 5: Real-Time Dynamic Processing Card (When rendering) */}
            {(isProcessing || isSuccess) && (
              <div className={`review-processing-card ${isSuccess ? 'success-card' : ''}`}>
                <div className="review-processing-header">
                  <div className="review-processing-title-wrap">
                    {isSuccess ? (
                      <>
                        <CheckCircle2 size={16} color="#10b981" />
                        <span className="review-processing-title" style={{ color: '#34d399' }}>
                          Short Ready & Branded!
                        </span>
                      </>
                    ) : (
                      <>
                        <Loader2 size={15} className="spin" color="#38bdf8" />
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
                      style={{ color: isSuccess ? '#34d399' : '#38bdf8' }}
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
                    ? '🎉 Video successfully branded and moved to Shorts Ready library!'
                    : BURN_STAGES[currentStageIndex]?.desc}
                </div>

                {/* Glowing Progress Bar */}
                <div className="review-progress-track">
                  <div
                    className={`review-progress-bar ${isSuccess ? 'success-bar' : ''}`}
                    style={{ width: `${isSuccess ? 100 : progressPercent}%` }}
                  />
                </div>

                {/* 5 Stage Dots */}
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
          </div>
        </div>

        {/* Fixed Pinned Bottom Footer (Never Cut Off!) */}
        <footer className="review-modal-footer">
          <div className="footer-left-info">
            <span className="footer-hint-text">
              Press <kbd>Esc</kbd> to cancel • Changes burn directly into 1080x1920 60fps Short
            </span>
          </div>

          <div className="footer-actions-group">
            <button
              type="button"
              onClick={onClose}
              className="review-btn-cancel"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="review-btn-submit"
              disabled={isProcessing}
              style={{
                background: isSuccess
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : isGaming
                  ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                  : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                boxShadow: isProcessing
                  ? '0 0 16px rgba(56, 189, 248, 0.4)'
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
                  <span>Burning Video ({progressPercent}%)...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Apply to Video</span>
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
