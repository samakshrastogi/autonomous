import React, { useState, useEffect } from 'react';
import { Key, X, Check, ExternalLink, Eye, EyeOff, Edit3 } from 'lucide-react';

export default function ApiKeyModal({ isOpen, onClose, apiKey, onSaveApiKey }) {
  const [inputValue, setInputValue] = useState(apiKey || '');
  const [isEditing, setIsEditing] = useState(!apiKey);
  const [showPassword, setShowPassword] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputValue(apiKey || '');
      setIsEditing(!apiKey);
      setShowPassword(false);
      setSavedSuccess(false);
    }
  }, [isOpen, apiKey]);

  // Close on 'Escape' key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    onSaveApiKey(inputValue.trim());
    setSavedSuccess(true);
    setIsEditing(false);

    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 450);
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    setIsEditing(true);
    setShowPassword(true);
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const getMaskedKey = (key) => {
    if (!key) return '';
    if (key.length <= 10) return '••••••••••••';
    return key.slice(0, 7) + '••••••••••••••••' + key.slice(-4);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-brand">
            <div className="modal-icon-badge amber-badge">
              <Key size={18} />
            </div>
            <div>
              <h3 className="modal-title-glow">Gemini API Key</h3>
              <p className="modal-subtitle-glow">
                Used to find viral scenes and create 9:16 Shorts
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

        {/* Saved status notification */}
        {apiKey && !isEditing && (
          <div className="saved-status-badge">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Check size={14} color="#34d399" />
              <span>API Key is active</span>
            </div>
            <span className="badge-pill-green">CONNECTED</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="input-group-styled">
            <label className="input-label-styled">
              <span>API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="get-key-link"
              >
                <span>Get Free Key</span>
                <ExternalLink size={11} />
              </a>
            </label>

            <div className="glass-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="glass-text-input"
                placeholder="AIzaSy..."
                value={isEditing ? inputValue : getMaskedKey(inputValue)}
                onChange={handleInputChange}
                readOnly={!isEditing}
                autoFocus={isEditing}
                spellCheck="false"
                autoComplete="off"
              />

              <button
                type="button"
                className="key-eye-btn"
                title={showPassword ? 'Hide key' : 'Show key'}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="modal-actions-bar">
            <button
              type="button"
              onClick={onClose}
              className="action-btn-subtle"
            >
              Cancel
            </button>

            {!isEditing && apiKey ? (
              <button
                type="button"
                onClick={handleEditClick}
                className="btn-glass-primary"
              >
                <Edit3 size={14} />
                <span>Edit Key</span>
              </button>
            ) : (
              <button
                type="submit"
                className="btn-glow-amber"
                disabled={!inputValue.trim()}
              >
                {savedSuccess ? (
                  <>
                    <Check size={15} />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Save Key</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
