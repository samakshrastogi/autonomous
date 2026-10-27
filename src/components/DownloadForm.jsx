import React from 'react';
import { Link2, Clipboard, X, Download } from 'lucide-react';

export default function DownloadForm({
  url,
  setUrl,
  isDownloading,
  onDownload,
  cleanAndExtractUrl,
  isYouTubeUrl
}) {
  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const clean = cleanAndExtractUrl(text);
        setUrl(clean);
        if (clean && !isDownloading) {
          onDownload(clean);
        }
      }
    } catch (err) {
      const inputEl = document.querySelector('.omnibar-input');
      if (inputEl) inputEl.focus();
    }
  };

  const handleInputChange = (e) => {
    const raw = e.target.value;
    setUrl(raw);
    if (isYouTubeUrl && isYouTubeUrl(raw) && !isDownloading) {
      const clean = cleanAndExtractUrl(raw);
      if (clean) {
        onDownload(clean);
      }
    }
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
    <div className="omnibar-container" style={{ marginBottom: 0 }}>
      <form onSubmit={handleSubmit} className="omnibar-form">
        <Link2 size={18} className="omnibar-icon" />

        <input
          type="text"
          className="omnibar-input"
          placeholder="Paste YouTube or Shorts link..."
          value={url}
          onChange={handleInputChange}
          disabled={isDownloading}
          autoFocus
        />

        {url && (
          <button
            type="button"
            className="omnibar-clear-btn"
            title="Clear"
            onClick={() => setUrl('')}
            disabled={isDownloading}
          >
            <X size={15} />
          </button>
        )}

        <button
          type="button"
          className="omnibar-paste-btn"
          title="Paste from clipboard"
          onClick={handleClipboardPaste}
          disabled={isDownloading}
        >
          <Clipboard size={14} />
          <span>Paste</span>
        </button>

        {url && (
          <button
            type="submit"
            className="omnibar-download-btn"
            title="Download video"
            disabled={isDownloading}
          >
            <Download size={14} />
            <span>Download</span>
          </button>
        )}
      </form>
    </div>
  );
}
