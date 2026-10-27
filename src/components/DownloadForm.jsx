import React from 'react';
import { Download, Clipboard, X, Sparkles } from 'lucide-react';

export default function DownloadForm({
  url,
  setUrl,
  isDownloading,
  onDownload,
  autoDownloadOnPaste,
  setAutoDownloadOnPaste,
  cleanAndExtractUrl
}) {
  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const clean = cleanAndExtractUrl(text);
        setUrl(clean);
        if (clean && autoDownloadOnPaste && !isDownloading) {
          onDownload(clean);
        }
      }
    } catch (err) {
      const inputEl = document.querySelector('.url-input');
      if (inputEl) inputEl.focus();
    }
  };

  const handleInputChange = (e) => {
    const raw = e.target.value;
    setUrl(raw);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = cleanAndExtractUrl(url);
    if (clean && !isDownloading) {
      setUrl(clean);
      onDownload(clean);
    }
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="input-container">
        <div className="url-input-wrapper">
          <input
            type="text"
            className="url-input"
            placeholder="Paste YouTube or Shorts URL here..."
            value={url}
            onChange={handleInputChange}
            disabled={isDownloading}
            autoFocus
          />
          {url && (
            <button
              type="button"
              className="clear-btn"
              title="Clear input"
              onClick={() => setUrl('')}
              disabled={isDownloading}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn-secondary"
          title="Paste link from clipboard"
          onClick={handleClipboardPaste}
          disabled={isDownloading}
        >
          <Clipboard size={18} />
          <span>Paste</span>
        </button>

        <button
          type="submit"
          className="btn-primary"
          disabled={isDownloading || !url.trim()}
        >
          <Download size={18} />
          <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
        </button>
      </form>

      <div className="controls-bar">
        <label className="switch-label">
          <label className="switch">
            <input
              type="checkbox"
              checked={autoDownloadOnPaste}
              onChange={(e) => setAutoDownloadOnPaste(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} color="#ef4444" />
            Auto-download instantly when URL is pasted
          </span>
        </label>
      </div>
    </div>
  );
}
