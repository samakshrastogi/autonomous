import React from 'react';
import { Link2, Clipboard, X, Download, Sparkles, Loader2 } from 'lucide-react';

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
      const inputEl = document.querySelector('.download-input-field');
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

  const hasValidUrl = url && url.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="download-form-stack">
      {/* Search Input Row with Paste Pill inside */}
      <div className="download-input-container">
        <Link2 size={16} className="download-input-icon" />

        <input
          type="text"
          className="download-input-field"
          placeholder="Paste YouTube or Shorts link..."
          value={url}
          onChange={handleInputChange}
          disabled={isDownloading}
          autoFocus
        />

        {url && (
          <button
            type="button"
            className="download-clear-pill"
            title="Clear link"
            onClick={() => setUrl('')}
            disabled={isDownloading}
          >
            <X size={14} />
          </button>
        )}

        <button
          type="button"
          className="download-paste-pill"
          title="Paste link from clipboard"
          onClick={handleClipboardPaste}
          disabled={isDownloading}
        >
          <Clipboard size={13} />
          <span>Paste</span>
        </button>
      </div>

      {/* Prominent Full-Width Action Button */}
      <button
        type="submit"
        className="download-action-btn-full"
        disabled={!hasValidUrl || isDownloading}
      >
        {isDownloading ? (
          <>
            <Loader2 size={16} className="spin" />
            <span>Downloading Video...</span>
          </>
        ) : (
          <>
            <Download size={16} />
            <span>Download & Create Shorts</span>
          </>
        )}
      </button>

      {/* Helpful Tip */}
      <div className="download-hint-text">
        <Sparkles size={12} color="#f59e0b" />
        <span>Auto-generates 9:16 viral Shorts upon download</span>
      </div>
    </form>
  );
}
