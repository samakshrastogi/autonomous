import React, { useState, useEffect } from 'react';
import { AtSign, X, Check } from 'lucide-react';

export default function ChannelHandleModal({
  isOpen,
  onClose,
  channelHandle,
  onSaveHandle
}) {
  const [handle, setHandle] = useState(channelHandle || '');

  useEffect(() => {
    setHandle(channelHandle || '');
  }, [channelHandle, isOpen]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    let cleaned = handle.trim();
    if (cleaned && !cleaned.startsWith('@')) {
      cleaned = `@${cleaned}`;
    }
    onSaveHandle(cleaned);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AtSign size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Channel Username / Branding
            </h3>
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

        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.2rem', lineHeight: '1.45' }}>
          Set your YouTube or social channel username. It will automatically be watermarked on the bottom center of all generated 9:16 Shorts.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.45rem' }}>
              Channel Handle / Watermark
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. @yourchannel or @samakshrastogi"
                className="url-input"
                style={{ fontSize: '0.9rem', padding: '0.65rem 0.85rem' }}
                autoFocus
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="action-btn-subtle"
              style={{ padding: '0.5rem 1rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ padding: '0.5rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Check size={16} />
              <span>Save Handle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
