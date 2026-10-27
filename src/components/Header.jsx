import React from 'react';
import { Key, Sparkles, AtSign, HardDrive } from 'lucide-react';

export default function Header({
  apiKey,
  onOpenApiKeyModal,
  channelHandle,
  onOpenChannelModal,
  totalVideosCount = 0,
  totalStorageBytes = 0,
  formatFileSize = (b) => `${(b / (1024 * 1024)).toFixed(1)} MB`
}) {
  return (
    <header className="top-navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">
          <svg width={22} height={22} viewBox="0 0 24 24" fill="#ef4444" style={{ flexShrink: 0 }}>
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        </div>
        <div>
          <span className="navbar-title">YouTube Studio & Downloader</span>
          <span className="navbar-tag">Fast MP4 & AI Shorts Generator</span>
        </div>
      </div>

      <div className="navbar-actions">
        {totalVideosCount > 0 && (
          <div className="navbar-stat-pill" title="Total videos stored locally on disk">
            <HardDrive size={13} color="#64748b" />
            <span>{totalVideosCount} Videos • {formatFileSize(totalStorageBytes)}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onOpenChannelModal}
          className="api-key-pill"
          title="Click to set your default channel username for Shorts"
        >
          {channelHandle ? (
            <>
              <AtSign size={13} color="#2563eb" />
              <span style={{ color: '#1e40af', fontWeight: 600 }}>{channelHandle}</span>
            </>
          ) : (
            <>
              <AtSign size={13} color="#64748b" />
              <span>Set Channel Username</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenApiKeyModal}
          className="api-key-pill"
          title="Click to manage your Google Gemini API Key"
        >
          {apiKey ? (
            <>
              <Sparkles size={13} color="#16a34a" />
              <span style={{ color: '#15803d', fontWeight: 600 }}>Gemini AI Connected</span>
            </>
          ) : (
            <>
              <Key size={13} color="#ef4444" />
              <span>Connect Gemini API Key</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
