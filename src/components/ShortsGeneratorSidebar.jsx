import React from 'react';
import { Sparkles, X, CheckCircle2, AlertCircle, Clapperboard, Type, Check } from 'lucide-react';

export default function ShortsGeneratorSidebar({
  videoFile,
  generationStatus,
  discoveredMoments = [],
  generatedShorts = [],
  isProcessing = false,
  error = '',
  onClose,
  onReviewGeneratedShort
}) {
  // If not processing and no moments or shorts, don't show
  if (!isProcessing && !error && (!generatedShorts || generatedShorts.length === 0) && (!discoveredMoments || discoveredMoments.length === 0)) {
    return null;
  }

  // Clean video title
  const cleanTitle = (name) => {
    if (!name) return 'Video';
    return name
      .replace(/^Short\s*[-–—:]\s*/i, '')
      .replace(/\[[a-zA-Z0-9_\-]{8,16}\]/g, '')
      .replace(/\([a-zA-Z0-9_\-]{8,16}\)/g, '')
      .replace(/\.f\d+(\.[a-z0-9]+)?$/i, '')
      .replace(/\.(mp4|mkv|webm)$/i, '')
      .replace(/#shorts/gi, '')
      .trim();
  };

  // Determine current pipeline step (1: Audio, 2: AI Moments, 3: 9:16 Rendering, 4: Ready)
  const isComplete = !isProcessing && generatedShorts && generatedShorts.length > 0;
  let activeStep = 1;
  if (isComplete) {
    activeStep = 4;
  } else if (generationStatus && generationStatus.toLowerCase().includes('rendering')) {
    activeStep = 3;
  } else if (generationStatus && (generationStatus.toLowerCase().includes('analyzing') || generationStatus.toLowerCase().includes('viral') || discoveredMoments.length > 0)) {
    activeStep = 2;
  } else {
    activeStep = 1;
  }

  return (
    <div className="studio-card shorts-sidebar-panel">
      {/* Panel Header */}
      <div className="shorts-sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div className="studio-icon-badge">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
              AI Shorts Studio
            </h3>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Viral clip creation
            </p>
          </div>
        </div>

        {!isProcessing && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="sidebar-close-btn"
            title="Dismiss"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Source Video Pill */}
      {videoFile && (
        <div className="sidebar-source-pill">
          <Clapperboard size={13} color="#ef4444" style={{ flexShrink: 0 }} />
          <span className="sidebar-source-title">
            {cleanTitle(videoFile.name)}
          </span>
        </div>
      )}

      {/* 4-Step Pipeline Stepper */}
      {!error && (
        <div className="pipeline-stepper-card" style={{ marginBottom: '0.85rem' }}>
          {/* Step 1 */}
          <div className={`pipeline-step ${activeStep > 1 || isComplete ? 'done' : activeStep === 1 ? 'current' : ''}`}>
            <div className="pipeline-dot">
              {activeStep > 1 || isComplete ? <Check size={11} /> : '1'}
            </div>
            <div className="pipeline-text">
              <span className="pipeline-title">Extract Audio</span>
              <span className="pipeline-desc">Rapid sound extraction</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className={`pipeline-step ${activeStep > 2 || isComplete ? 'done' : activeStep === 2 ? 'current' : ''}`}>
            <div className="pipeline-dot">
              {activeStep > 2 || isComplete ? <Check size={11} /> : '2'}
            </div>
            <div className="pipeline-text">
              <span className="pipeline-title">AI Video Intelligence</span>
              <span className="pipeline-desc">Finding viral Hinglish hooks</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className={`pipeline-step ${activeStep > 3 || isComplete ? 'done' : activeStep === 3 ? 'current' : ''}`}>
            <div className="pipeline-dot">
              {activeStep > 3 || isComplete ? <Check size={11} /> : '3'}
            </div>
            <div className="pipeline-text">
              <span className="pipeline-title">Render 9:16 Vertical Video</span>
              <span className="pipeline-desc">Creating mobile vertical frame</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className={`pipeline-step ${isComplete ? 'done' : ''}`}>
            <div className="pipeline-dot">
              {isComplete ? <Check size={11} /> : '4'}
            </div>
            <div className="pipeline-text">
              <span className="pipeline-title">Pre Ready Shorts</span>
              <span className="pipeline-desc">Saved to library</span>
            </div>
          </div>
        </div>
      )}

      {/* Live Processing Indicator */}
      {isProcessing && (
        <div className="sidebar-live-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.4rem' }}>
            <span className="pulse-dot"></span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#38bdf8' }}>
              {generationStatus || 'AI Studio processing...'}
            </span>
          </div>

          <div className="progress-track" style={{ height: '5px', margin: 0 }}>
            <div className="progress-fill progress-indeterminate" style={{ width: '100%' }}></div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="sidebar-error-box">
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error || 'AI analysis could not complete. Please check connection.'}</span>
        </div>
      )}

      {/* Discovered Viral Moments (Hinglish) */}
      {discoveredMoments && discoveredMoments.length > 0 && (
        <div style={{ marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Discovered Moments
            </span>
            <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>
              {discoveredMoments.length} found
            </span>
          </div>

          <div className="sidebar-moments-scroll">
            {discoveredMoments.map((m, idx) => (
              <div key={idx} className="sidebar-moment-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.45rem', marginBottom: '0.15rem' }}>
                  <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.title}
                  </span>
                  <span style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: '0.7rem', flexShrink: 0 }}>
                    {m.start} - {m.end}
                  </span>
                </div>
                {m.hook && (
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                    💡 "{m.hook}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed State: Generated Shorts */}
      {isComplete && (
        <div>
          <div className="sidebar-success-banner">
            <CheckCircle2 size={16} color="#34d399" />
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#34d399' }}>
              {generatedShorts.length} Clips Created!
            </span>
          </div>

          <div className="sidebar-moments-scroll" style={{ maxHeight: '180px' }}>
            {generatedShorts.map((short, idx) => (
              <div key={idx} className="sidebar-completed-card">
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {short.title || cleanTitle(short.name)}
                  </div>
                  {short.hook && (
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      💡 "{short.hook}"
                    </div>
                  )}
                </div>

                {onReviewGeneratedShort && (
                  <button
                    type="button"
                    onClick={() => onReviewGeneratedShort(short)}
                    className="action-btn-amber"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem', flexShrink: 0 }}
                  >
                    <Type size={11} />
                    <span>Text</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
