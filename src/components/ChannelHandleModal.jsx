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
      <div className="modal-content glass-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-brand">
            <div className="modal-icon-badge cyan-badge">
              <AtSign size={18} />
            </div>
            <div>
              <h3 className="modal-title-glow">Channel Watermark</h3>
              <p className="modal-subtitle-glow">
                Included at the bottom of all 9:16 Shorts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* View Mode (Saved State with Watermark Preview) */}
        {!isEditing && channelHandle ? (
          <div>
            {/* Active Status Badge */}
            <div className="saved-status-badge">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Check size={14} color="#34d399" />
                <span>Active Watermark</span>
              </div>
              <span className="badge-pill-green">ACTIVE</span>
            </div>

            {/* Visual Preview */}
            <div className="watermark-preview-stage">
              <span className="preview-stage-label">Preview on Video</span>
              <div className="watermark-pill-demo">
                <span>{channelHandle}</span>
              </div>
            </div>

            <div className="modal-actions-bar">
              <button
                type="button"
                onClick={onClose}
                className="action-btn-subtle"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleStartEdit}
                className="btn-glass-primary"
              >
                <Edit3 size={14} />
                <span>Edit Handle</span>
              </button>
            </div>
          </div>
        ) : (
          /* Edit Mode (Clean Form) */
          <form onSubmit={handleSubmit}>
            <div className="input-group-styled">
              <label className="input-label-styled">
                <span>Username / Handle</span>
                <span className="input-hint">e.g. @BadmoshComedyFan</span>
              </label>

              <div className="glass-input-wrapper">
                <span className="input-prefix-at">@</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={handle.startsWith('@') ? handle.slice(1) : handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="channelname"
                  className="glass-text-input"
                  spellCheck="false"
                  autoComplete="off"
                />
                {handle && (
                  <button
                    type="button"
                    onClick={() => setHandle('')}
                    className="input-clear-btn"
                    title="Clear"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="modal-actions-bar">
              {channelHandle && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="action-btn-subtle"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn-glow-cyan"
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
