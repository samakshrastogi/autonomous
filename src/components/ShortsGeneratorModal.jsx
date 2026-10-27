import React, { useEffect } from 'react';
import { Sparkles, X, CheckCircle2, AlertCircle, Film, Type, Check, Clock } from 'lucide-react';

export default function ShortsGeneratorModal({
  isOpen,
  onClose,
  videoFile,
  generationStatus,
  discoveredMoments,
  generatedShorts,
  isProcessing,
  error,
  onReviewGeneratedShort
}) {
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

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (!isProcessing) {
      onClose();
    }
  };

  // Clean video title
  const cleanTitle = (name) => {
    if (!name) return 'Video';
    return name
      .replace(/\[[a-zA-Z0-9_\-]{8,16}\]/g, '')
      .replace(/\([a-zA-Z0-9_\-]{8,16}\)/g, '')
      .replace(/\.f\d+(\.[a-z0-9]+)?$/i, '')
      .replace(/\.(mp4|mkv|webm)$/i, '')
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
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '0.5rem',
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444'
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                AI Shorts Studio
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.1rem' }}>
                Automatic viral moment detection & vertical 9:16 clip creation
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

        {/* Source Video Pill */}
        {videoFile && (
          <div style={{ background: '#f8fafc', padding: '0.55rem 0.8rem', borderRadius: '0.55rem', marginBottom: '1.15rem', border: '1px solid #e2e8f0', fontSize: '0.825rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Film size={14} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {cleanTitle(videoFile.name)}
            </span>
          </div>
        )}

        {/* User-Perspective 4-Step Visual Progress Stepper */}
        {!error && (
          <div className="pipeline-stepper-card">
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
                <span className="pipeline-title">Saved to 02_Shorts_Drafts</span>
                <span className="pipeline-desc">Ready for your custom text</span>
              </div>
            </div>
          </div>
        )}

        {/* Live Processing Indicator */}
        {isProcessing && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.6rem', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <span className="pulse-dot"></span>
                <span>{generationStatus || 'AI Studio processing...'}</span>
              </span>
            </div>

            <div className="progress-track" style={{ height: '6px', margin: '0.35rem 0 0' }}>
              <div className="progress-fill progress-indeterminate" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}

        {/* Friendly Consumer Error State */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.85rem 1rem', borderRadius: '0.6rem', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>AI analysis could not complete. Please check your Gemini API key or try another video.</span>
          </div>
        )}

        {/* Real-time Detected Moments */}
        {discoveredMoments && discoveredMoments.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
              <h4 style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Discovered Viral Moments (Hinglish):
              </h4>
              <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                {discoveredMoments.length} moments found
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '160px', overflowY: 'auto' }}>
              {discoveredMoments.map((m, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.55rem 0.75rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: '#0f172a', marginBottom: '0.2rem' }}>
                    <span>{m.title}</span>
                    <span style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {m.start} - {m.end}
                    </span>
                  </div>
                  {m.hook && (
                    <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      💡 Hook: "{m.hook}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed State */}
        {isComplete && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.85rem', borderRadius: '0.6rem', marginBottom: '0.85rem', textAlign: 'center' }}>
              <CheckCircle2 size={24} color="#16a34a" style={{ margin: '0 auto 0.35rem' }} />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#166534' }}>
                {generatedShorts.length} Vertical Shorts Created & Saved!
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '0.2rem' }}>
                Saved into <strong>02_Shorts_Drafts</strong>. Review and customize text on any clip below:
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
              {generatedShorts.map((short, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {short.title || cleanTitle(short.name)}
                    </div>
                    {short.hook && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        💡 Hook: "{short.hook}"
                      </div>
                    )}
                  </div>
                  {onReviewGeneratedShort && (
                    <button
                      type="button"
                      onClick={() => onReviewGeneratedShort(short)}
                      className="action-btn-amber"
                      style={{ padding: '0.35rem 0.75rem', flexShrink: 0 }}
                      title="Review Short and add your top text hook"
                    >
                      <Type size={12} />
                      <span>Review & Text</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '0.5rem 1.35rem', fontSize: '0.85rem' }}
            disabled={isProcessing}
          >
            {isProcessing ? 'Creating Shorts...' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
