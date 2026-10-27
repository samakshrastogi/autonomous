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
    <div className="studio-card shorts-sidebar-panel compact">
      {/* Panel Header */}
      <div className="shorts-sidebar-header compact">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div className="studio-icon-badge mini">
            <Sparkles size={14} color="#ef4444" />
          </div>
          <span style={{ fontSize: '0.885rem', fontWeight: 700, color: '#f8fafc' }}>
            AI Shorts Studio
          </span>
        </div>

        {!isProcessing && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="sidebar-close-btn"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Source Video Pill */}
      {videoFile && (
        <div className="sidebar-source-pill compact">
          <Clapperboard size={12} color="#ef4444" style={{ flexShrink: 0 }} />
          <span className="sidebar-source-title">
            {cleanTitle(videoFile.name)}
          </span>
        </div>
      )}

      {/* Compact 4-Step Pipeline Stepper */}
      {!error && (
        <div className="compact-stepper-wrap">
          <div className={`compact-step-item ${activeStep > 1 || isComplete ? 'done' : activeStep === 1 ? 'active' : ''}`}>
            <div className="compact-step-circle">
              {activeStep > 1 || isComplete ? <Check size={10} /> : '1'}
            </div>
            <span className="compact-step-label">Audio</span>
          </div>

          <div className={`compact-step-bar ${activeStep > 1 || isComplete ? 'done' : ''}`} />

          <div className={`compact-step-item ${activeStep > 2 || isComplete ? 'done' : activeStep === 2 ? 'active' : ''}`}>
            <div className="compact-step-circle">
              {activeStep > 2 || isComplete ? <Check size={10} /> : '2'}
            </div>
            <span className="compact-step-label">AI</span>
          </div>

          <div className={`compact-step-bar ${activeStep > 2 || isComplete ? 'done' : ''}`} />

          <div className={`compact-step-item ${activeStep > 3 || isComplete ? 'done' : activeStep === 3 ? 'active' : ''}`}>
            <div className="compact-step-circle">
              {activeStep > 3 || isComplete ? <Check size={10} /> : '3'}
            </div>
            <span className="compact-step-label">Render</span>
          </div>

          <div className={`compact-step-bar ${isComplete ? 'done' : ''}`} />

          <div className={`compact-step-item ${isComplete ? 'done' : ''}`}>
            <div className="compact-step-circle">
              {isComplete ? <Check size={10} /> : '4'}
            </div>
            <span className="compact-step-label">Ready</span>
          </div>
        </div>
      )}

      {/* Live Processing Indicator */}
      {isProcessing && (
        <div className="sidebar-live-box compact">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
            <span className="pulse-dot"></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {generationStatus || 'AI Studio processing...'}
            </span>
          </div>

          <div className="progress-track" style={{ height: '4px', margin: 0 }}>
            <div className="progress-fill progress-indeterminate" style={{ width: '100%' }}></div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="sidebar-error-box compact">
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{error || 'AI analysis failed. Please check connection.'}</span>
        </div>
      )}

      {/* Discovered Viral Moments (Hinglish) */}
      {discoveredMoments && discoveredMoments.length > 0 && !isComplete && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Moments Found
            </span>
            <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700 }}>
              {discoveredMoments.length}
            </span>
          </div>

          <div className="sidebar-moments-scroll" style={{ maxHeight: '130px' }}>
            {discoveredMoments.map((m, idx) => (
              <div key={idx} className="sidebar-moment-card compact">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                    {m.duration && (
                      <span style={{ color: '#34d399', fontSize: '0.66rem', fontWeight: 700, background: 'rgba(52, 211, 153, 0.12)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
                        {m.duration}s
                      </span>
                    )}
                    <span style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: '0.68rem' }}>
                      {m.start} - {m.end}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed State: Generated Shorts */}
      {isComplete && (
        <div style={{ marginTop: '0.5rem' }}>
          <div className="sidebar-success-banner compact">
            <CheckCircle2 size={14} color="#34d399" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#34d399' }}>
              {generatedShorts.length} Clips Created!
            </span>
          </div>

          <div className="sidebar-moments-scroll" style={{ maxHeight: '160px' }}>
            {generatedShorts.map((short, idx) => (
              <div key={idx} className="sidebar-completed-card compact">
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {short.title || cleanTitle(short.name)}
                  </div>
                </div>

                {onReviewGeneratedShort && (
                  <button
                    type="button"
                    onClick={() => onReviewGeneratedShort(short)}
                    className="action-btn-amber"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', flexShrink: 0 }}
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
