import React, { useState, useEffect, useRef } from 'react';
import { AtSign, X, Check, Edit3, Sparkles } from 'lucide-react';

export default function ChannelHandleModal({
  isOpen,
  onClose,
  channelHandle,
  onSaveHandle
}) {
  const [handle, setHandle] = useState(channelHandle || '');
  const [isEditing, setIsEditing] = useState(!channelHandle);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const inputRef = useRef(null);

  // Sync state whenever modal opens or channelHandle changes
  useEffect(() => {
    if (isOpen) {
      setHandle(channelHandle || '');
      setIsEditing(!channelHandle);
      setSavedSuccess(false);
    }
  }, [isOpen, channelHandle]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing, isOpen]);

  // Close on 'Escape' key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleStartEdit = (e) => {
    e.preventDefault();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setHandle(channelHandle || '');
    setIsEditing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let cleaned = handle.trim();
    if (cleaned && !cleaned.startsWith('@')) {
      cleaned = `@${cleaned}`;
    }
    onSaveHandle(cleaned);
    setSavedSuccess(true);
    setIsEditing(false);

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 450);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '0.5rem',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb'
            }}>
              <AtSign size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Channel Username / Branding
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.1rem' }}>
                Watermark included on the bottom center of all 9:16 Shorts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Saved Status Banner when not editing */}
        {channelHandle && !isEditing && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.6rem',
            padding: '0.6rem 0.85rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.825rem', color: '#15803d', fontWeight: 600 }}>
              <Check size={16} color="#16a34a" />
              <span>Channel watermark is active</span>
            </div>
            <span style={{
              background: '#dcfce7',
              color: '#166534',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              letterSpacing: '0.03em'
            }}>
              SAVED
            </span>
          </div>
        )}

        {/* View Mode (Saved State with Watermark Preview) */}
        {!isEditing && channelHandle ? (
          <div>
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: '0.75rem',
              padding: '1.25rem 1rem',
              textAlign: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              border: '1px solid #334155',
              marginBottom: '1.25rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 600, marginBottom: '0.6rem' }}>
                Bottom Watermark Preview
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(0, 0, 0, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#ffffff',
                padding: '0.45rem 1rem',
                borderRadius: '0.45rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.02em',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
              }}>
                <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>▶</span>
                <span>{channelHandle}</span>
              </div>

              <p style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.75rem', marginBottom: 0 }}>
                Burned at bottom center of all 9:16 Shorts automatically
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="action-btn-subtle"
                style={{ padding: '0.45rem 0.95rem', fontSize: '0.825rem' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleStartEdit}
                className="btn-secondary"
                style={{
                  padding: '0.45rem 1.15rem',
                  fontSize: '0.825rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Edit3 size={14} color="#ef4444" />
                <span>Edit Handle</span>
              </button>
            </div>
          </div>
        ) : (
          /* Edit Mode (Form with Input & Save Button) */
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.45rem' }}>
                <span>Channel Handle / Watermark</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>
                  e.g. @BadmoshComedyFan
                </span>
              </label>

              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '0.55rem',
                padding: '0 0.75rem',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                transition: 'border-color 0.15s ease'
              }}>
                <span style={{ color: '#2563eb', fontWeight: 700, fontSize: '0.95rem', userSelect: 'none', marginRight: '0.35rem' }}>
                  @
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={handle.startsWith('@') ? handle.slice(1) : handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="BadmoshComedyFan"
                  className="url-input"
                  style={{
                    border: 'none',
                    boxShadow: 'none',
                    padding: '0.65rem 0',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    width: '100%'
                  }}
                />
                {handle && (
                  <button
                    type="button"
                    onClick={() => setHandle('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '50%'
                    }}
                    title="Clear"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              💡 This watermark will be centered below the main video in the blurred area, leaving the video clean.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
              {channelHandle && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="action-btn-subtle"
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.825rem' }}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn-primary"
                style={{
                  padding: '0.48rem 1.25rem',
                  fontSize: '0.825rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
                disabled={!handle.trim()}
              >
                {savedSuccess ? (
                  <>
                    <Check size={15} />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Save Handle</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
