import React from 'react';

export default function Header() {
  return (
    <header className="header">
      <div className="logo-badge">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="#ef4444" style={{ flexShrink: 0 }}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
        <span>Fast MP4 Downloader</span>
      </div>
      <h1 className="title">YouTube Video Downloader</h1>
      <p className="subtitle">
        Paste any YouTube or Shorts link to download and watch the video.
      </p>
    </header>
  );
}
