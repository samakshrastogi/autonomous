import React from 'react';
import { Download, Clipboard, X, FolderOpen, Sparkles } from 'lucide-react';

export default function DownloadForm({
  url,
  setUrl,
  isDownloading,
  onDownload,
  autoDownloadOnPaste,
  setAutoDownloadOnPaste,
  onOpenFolder
}) {
  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        if (autoDownloadOnPaste && !isDownloading) {
          onDownload(text.trim());
        }
      }
    } catch (err) {
      // Fallback: focus input if clipboard API is restricted
      const inputEl = document.querySelector('.url-input');
      if (inputEl) inputEl.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim() && !isDownloading) {
      onDownload(url.trim());
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
            onChange={(e) => setUrl(e.target.value)}
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

        <button
          type="button"
          onClick={onOpenFolder}
          className="action-btn-subtle"
          title="Open downloaded videos folder on your computer"
        >
          <FolderOpen size={15} color="#2563eb" />
          <span>Open in Folder</span>
        </button>
      </div>
    </div>
  );
}
