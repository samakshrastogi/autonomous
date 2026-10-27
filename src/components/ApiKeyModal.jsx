import React, { useState } from 'react';
import { Key, X, Check, ExternalLink } from 'lucide-react';

export default function ApiKeyModal({ isOpen, onClose, apiKey, onSaveApiKey }) {
  const [inputValue, setInputValue] = useState(apiKey || '');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSaveApiKey(inputValue.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} color="#ef4444" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Gemini API Key
            </h3>
          </div>
          <button type="button" onClick={onClose} className="clear-btn">
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.4 }}>
          Enter your Google Gemini API key to analyze videos and automatically generate viral 9:16 Shorts with Hinglish titles.
        </p>

        <form onSubmit={handleSave}>
          <input
            type="password"
            className="url-input"
            style={{ marginBottom: '1rem', fontFamily: 'monospace', fontSize: '0.85rem' }}
            placeholder="AIzaSy..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '0.8rem', color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
            >
              <span>Get Free Gemini Key</span>
              <ExternalLink size={12} />
            </a>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                className="action-btn-subtle"
                style={{ padding: '0.5rem 0.9rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}
                disabled={!inputValue.trim()}
              >
                {saved ? <Check size={16} /> : 'Save Key'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
