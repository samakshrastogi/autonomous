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
    }, 500);
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} color="#ef4444" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Gemini API Key
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

        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.45 }}>
          Enter your Google Gemini API key to analyze videos and automatically generate viral 9:16 Shorts with Hinglish titles.
        </p>

        {/* Saved status notification */}
        {apiKey && !isEditing && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.55rem',
            padding: '0.5rem 0.75rem',
            marginBottom: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.8rem',
            color: '#15803d',
            fontWeight: 500
          }}>
            <Check size={14} color="#16a34a" />
            <span>API Key is saved and active</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Integrated, perfectly aligned key input box */}
          <div className="key-input-wrapper" style={{ marginBottom: '1.15rem' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="key-input-field"
              placeholder="AIzaSy..."
              value={isEditing ? inputValue : getMaskedKey(inputValue)}
              onChange={handleInputChange}
              readOnly={!isEditing}
              autoFocus={isEditing}
            />

            <button
              type="button"
              className="key-eye-btn"
              title={showPassword ? 'Hide key' : 'Show key'}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '0.8rem',
                color: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                textDecoration: 'none',
                fontWeight: 500
              }}
            >
              <span>Get Free Gemini Key</span>
              <ExternalLink size={12} />
            </a>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={onClose}
                className="action-btn-subtle"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem' }}
              >
                Cancel
              </button>

              {!isEditing && apiKey ? (
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="btn-secondary"
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.825rem', gap: '0.4rem' }}
                >
                  <Edit3 size={13} />
                  <span>Edit Key</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '0.45rem 1.15rem', fontSize: '0.825rem' }}
                  disabled={!inputValue.trim()}
                >
                  {savedSuccess ? (
                    <>
                      <Check size={15} />
                      <span>Saved!</span>
                    </>
                  ) : (
                    'Save Key'
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
