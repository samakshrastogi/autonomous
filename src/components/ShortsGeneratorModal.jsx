import React, { useEffect } from 'react';
import { Sparkles, X, CheckCircle2, AlertCircle, Film, Type } from 'lucide-react';

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

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content" style={{ maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Sparkles size={19} color="#ef4444" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Gemini AI Shorts Generator
            </h3>
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

        {videoFile && (
          <div style={{ background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '0.55rem', marginBottom: '1rem', border: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Film size={15} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {videoFile.name}
            </span>
          </div>
        )}

        {/* Live Processing State */}
        {isProcessing && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }}></span>
                {generationStatus || 'Processing...'}
              </span>
            </div>

            <div className="progress-track" style={{ height: '7px', margin: '0.5rem 0' }}>
              <div className="progress-fill progress-indeterminate" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.8rem', borderRadius: '0.6rem', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Discovered Moments in Hinglish */}
        {discoveredMoments && discoveredMoments.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <h4 style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
              Detected Viral Moments (Hinglish):
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '180px', overflowY: 'auto' }}>
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

        {/* Completion Success State */}
        {!isProcessing && generatedShorts && generatedShorts.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.85rem', borderRadius: '0.6rem', marginBottom: '0.85rem', textAlign: 'center' }}>
              <CheckCircle2 size={22} color="#16a34a" style={{ margin: '0 auto 0.35rem' }} />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#166534' }}>
                {generatedShorts.length} Shorts Created in 9:16 Frame!
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '0.2rem' }}>
                All clips are ready. You can review and customize text on any clip below:
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
              {generatedShorts.map((short, idx) => (
                <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {short.title || short.name}
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
                      className="action-btn-secondary"
                      style={{
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        flexShrink: 0,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.4rem',
                        cursor: 'pointer'
                      }}
                      title="Review Short and customize top hook text"
                    >
                      <Type size={12} color="#ef4444" />
                      <span>Review / Text</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
            disabled={isProcessing}
          >
            {isProcessing ? 'Generating...' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
