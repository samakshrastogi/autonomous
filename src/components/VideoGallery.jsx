import React, { useState, useMemo, useEffect } from 'react';
import { Film, Clock, CheckCircle2, Download, Search, X, ArrowUpDown, Sparkles, LayoutGrid, List, Type, Trash2 } from 'lucide-react';
import VideoCard from './VideoCard.jsx';

export default function VideoGallery({
  files,
  activeChannel = 'haso_dil_khol_k',
  formatFileSize,
  onGenerateShorts,
  onReviewShort,
  onDeleteVideo,
  activeTab = 'downloads',
  setActiveTab
}) {
  const [localTab, setLocalTab] = useState('downloads');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'size_desc' | 'size_asc' | 'title'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('shorts_studio_view_mode') || 'grid';
  });

  const downloadsCount = useMemo(() => files.filter((f) => f.category === 'downloads').length, [files]);
  const draftsCount = useMemo(() => files.filter((f) => f.category === 'drafts').length, [files]);
  const readyCount = useMemo(() => files.filter((f) => f.category === 'ready').length, [files]);

  // Current category tab
  const rawTab = (setActiveTab ? activeTab : localTab) === 'all' ? 'downloads' : (setActiveTab ? activeTab : localTab);
  const currentTab = rawTab;

  // Auto-switch to the first category that has >0 items if current tab is empty
  useEffect(() => {
    const counts = {
      downloads: downloadsCount,
      drafts: draftsCount,
      ready: readyCount
    };

    if (counts[currentTab] === 0) {
      if (counts.drafts > 0) {
        if (setActiveTab) setActiveTab('drafts');
        else setLocalTab('drafts');
      } else if (counts.ready > 0) {
        if (setActiveTab) setActiveTab('ready');
        else setLocalTab('ready');
      } else if (counts.downloads > 0) {
        if (setActiveTab) setActiveTab('downloads');
        else setLocalTab('downloads');
      }
    }
  }, [downloadsCount, draftsCount, readyCount, currentTab, setActiveTab]);

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    // 1. Filter by category tab
    let list = files.filter((f) => f.category === currentTab);

    // 2. Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((f) => f.name.toLowerCase().includes(q));
    }

    // 3. Sort files
    const sorted = [...list];
    if (sortBy === 'newest') {
      sorted.sort((a, b) => b.mtime - a.mtime);
    } else if (sortBy === 'oldest') {
      sorted.sort((a, b) => a.mtime - b.mtime);
    } else if (sortBy === 'size_desc') {
      sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
    } else if (sortBy === 'size_asc') {
      sorted.sort((a, b) => (a.size || 0) - (b.size || 0));
    } else if (sortBy === 'title') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  }, [files, currentTab, searchQuery, sortBy]);

  const cleanTitle = (name) => {
    if (!name) return 'Video';
    return name
      .replace(/^Short\s*[-–—:]\s*/i, '')
      .replace(/\[[a-zA-Z0-9_\-]{8,16}\]/g, '')
      .replace(/\([a-zA-Z0-9_\-]{8,16}\)/g, '')
      .replace(/\[Branded\]/gi, '')
      .replace(/\.f\d+(\.[a-z0-9]+)?$/i, '')
      .replace(/\.(mp4|mkv|webm)$/i, '')
      .replace(/#shorts/gi, '')
      .replace(/\bshorts\b/gi, '')
      .trim();
  };

  const formatDuration = (sec) => {
    if (!sec || isNaN(sec)) return null;
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${String(rem).padStart(2, '0')}`;
  };

  return (
    <div className="gallery-section">
      {/* Compact Gallery Header Toolbar */}
      <div className="gallery-header-row compact-toolbar">
        {/* Dynamic Category Positive Tabs */}
        <div className="gallery-toggle-group">
          {downloadsCount > 0 && (
            <button
              type="button"
              onClick={() => (setActiveTab ? setActiveTab('downloads') : setLocalTab('downloads'))}
              className={`gallery-toggle-btn ${currentTab === 'downloads' ? 'active-dl' : ''}`}
            >
              <Download size={13} />
              <span>Downloads</span>
              <span className="toggle-count-badge count-dl">
                {downloadsCount}
              </span>
            </button>
          )}

          {draftsCount > 0 && (
            <button
              type="button"
              onClick={() => (setActiveTab ? setActiveTab('drafts') : setLocalTab('drafts'))}
              className={`gallery-toggle-btn ${currentTab === 'drafts' ? 'active-drafts' : ''}`}
            >
              <Clock size={13} />
              <span>Pre Ready Shorts</span>
              <span className="toggle-count-badge count-drafts">
                {draftsCount}
              </span>
            </button>
          )}

          {readyCount > 0 && (
            <button
              type="button"
              onClick={() => (setActiveTab ? setActiveTab('ready') : setLocalTab('ready'))}
              className={`gallery-toggle-btn ${currentTab === 'ready' ? 'active-ready' : ''}`}
            >
              <CheckCircle2 size={13} />
              <span>Shorts</span>
              <span className="toggle-count-badge count-ready">
                {readyCount}
              </span>
            </button>
          )}
        </div>

        {/* Search, Sort & View Mode Switcher */}
        <div className="gallery-controls-group">
          {/* Real-time Search Box */}
          <div className="gallery-search-box compact">
            <Search size={13} className="search-icon" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="search-clear-btn"
                title="Clear"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="gallery-sort-wrap compact">
            <ArrowUpDown size={12} className="sort-icon" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="gallery-sort-select"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="size_desc">Largest</option>
              <option value="size_asc">Smallest</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>

          {/* View Mode Toggle: Compact Grid vs Dense List */}
          <div className="gallery-view-mode-toggle">
            <button
              type="button"
              onClick={() => {
                setViewMode('grid');
                localStorage.setItem('shorts_studio_view_mode', 'grid');
              }}
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              title="Compact Grid View"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('list');
                localStorage.setItem('shorts_studio_view_mode', 'list');
              }}
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              title="Dense List View (YouTube Studio)"
            >
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Videos View Area */}
      {filteredAndSortedFiles.length === 0 ? (
        <div className="gallery-empty-container">
          {searchQuery ? (
            <div className="gallery-empty-card">
              <div className="empty-icon-bubble">
                <Search size={24} color="#ef4444" />
              </div>
              <h3 className="empty-title">No matching videos</h3>
              <p className="empty-desc">
                No videos match your search term "<strong>{searchQuery}</strong>".
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="empty-action-pill"
              >
                Clear Search
              </button>
            </div>
          ) : currentTab === 'drafts' ? (
            <div className="gallery-empty-card">
              <div className="empty-icon-bubble bubble-amber">
                <Clock size={24} color="#f59e0b" />
              </div>
              <h3 className="empty-title">
                {activeChannel === 'samaksh_gaming' ? 'No Gaming Clips Uploaded' : 'No Pre-Ready Shorts Yet'}
              </h3>
              <p className="empty-desc">
                {activeChannel === 'samaksh_gaming'
                  ? 'Drag & drop a chess puzzle or gaming clip into the upload box on the left.'
                  : 'Download a video to auto-extract viral clips, or select any video from Downloads.'}
              </p>
              {files.some((f) => f.category === 'downloads') && (
                <button
                  type="button"
                  onClick={() => (setActiveTab ? setActiveTab('downloads') : setLocalTab('downloads'))}
                  className="empty-action-pill"
                >
                  <Download size={13} />
                  <span>Go to Downloads</span>
                </button>
              )}
            </div>
          ) : currentTab === 'ready' ? (
            <div className="gallery-empty-card">
              <div className="empty-icon-bubble bubble-green">
                <Sparkles size={24} color="#10b981" />
              </div>
              <h3 className="empty-title">
                {activeChannel === 'samaksh_gaming' ? 'No Ready Gaming Shorts Yet' : 'No Ready Shorts Yet'}
              </h3>
              <p className="empty-desc">
                {activeChannel === 'samaksh_gaming'
                  ? 'Open Pre Ready Shorts, review your clip with the 5s countdown timer, and render the final Short.'
                  : 'Open Pre Ready Shorts, customize your viral hook and channel watermark, then render.'}
              </p>
              {files.some((f) => f.category === 'drafts') && (
                <button
                  type="button"
                  onClick={() => (setActiveTab ? setActiveTab('drafts') : setLocalTab('drafts'))}
                  className="empty-action-pill"
                >
                  <Clock size={13} />
                  <span>Review Pre-Ready Shorts</span>
                </button>
              )}
            </div>
          ) : (
            <div className="gallery-empty-card">
              <div className="empty-icon-bubble bubble-blue">
                <Download size={24} color="#38bdf8" />
              </div>
              <h3 className="empty-title">
                {activeChannel === 'samaksh_gaming' ? 'Direct Uploads for Samaksh Gaming' : 'No Source Videos Downloaded'}
              </h3>
              <p className="empty-desc">
                {activeChannel === 'samaksh_gaming'
                  ? 'Samaksh Gaming clips are uploaded directly to Pre-Ready Shorts using the uploader on the left.'
                  : 'Paste any YouTube or Shorts link on the left to download high-resolution source video.'}
              </p>
              {activeChannel === 'samaksh_gaming' && (
                <button
                  type="button"
                  onClick={() => (setActiveTab ? setActiveTab('drafts') : setLocalTab('drafts'))}
                  className="empty-action-pill"
                >
                  <Clock size={13} />
                  <span>Go to Pre Ready Shorts</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* Dense List View (YouTube Studio style) */
        <div className="gallery-list-view">
          {filteredAndSortedFiles.map((file, idx) => {
            const isShort =
              file.category === 'drafts' ||
              file.category === 'ready' ||
              file.name.startsWith('Short -') ||
              /#shorts|\bshorts\b/i.test(file.name);
            const displayTitle = file.title || cleanTitle(file.name);
            const formattedDate = new Date(file.mtime).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric'
            });

            return (
              <div key={`${file.name}-${idx}`} className="video-list-row">
                {/* Mini Player / Thumbnail */}
                <div className={`list-preview-wrap ${isShort ? 'short-preview' : 'landscape-preview'}`}>
                  <video
                    src={file.url}
                    preload="metadata"
                    muted
                    playsInline
                    className="list-mini-video"
                  />
                  {file.duration && (
                    <span className="list-duration-pill">{formatDuration(file.duration)}</span>
                  )}
                </div>

                {/* Main Info */}
                <div className="list-main-info">
                  <div className="list-title-row">
                    <span className="list-video-title" title={displayTitle}>
                      {displayTitle}
                    </span>
                    {file.category === 'ready' ? (
                      <span className="list-cat-pill ready">Shorts</span>
                    ) : file.category === 'drafts' ? (
                      <span className="list-cat-pill draft">Pre Ready</span>
                    ) : (
                      <span className="list-cat-pill dl">Source</span>
                    )}
                  </div>
                  <div className="list-sub-meta">
                    <span className="list-filename">{file.name}</span>
                    <span className="list-meta-dot">•</span>
                    <span className="list-size">{formatFileSize(file.size)}</span>
                    <span className="list-meta-dot">•</span>
                    <span className="list-date">{formattedDate}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="list-actions-wrap">
                  {file.category === 'ready' ? (
                    <>
                      <a
                        href={file.url}
                        download={file.name}
                        className="list-action-btn-primary"
                        title="Download 1080p Short"
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </a>
                      {onReviewShort && (
                        <button
                          type="button"
                          onClick={() => onReviewShort(file)}
                          className="list-action-btn-ghost"
                          title="Edit Hook or Branding"
                        >
                          <Type size={12} />
                          <span>Edit</span>
                        </button>
                      )}
                    </>
                  ) : file.category === 'drafts' && onReviewShort ? (
                    <button
                      type="button"
                      onClick={() => onReviewShort(file)}
                      className="list-action-btn-amber"
                      title="Add Hook Text, 5s Timer & Branding"
                    >
                      <Sparkles size={13} />
                      <span>Add Text & Brand</span>
                    </button>
                  ) : onGenerateShorts ? (
                    <button
                      type="button"
                      onClick={() => onGenerateShorts(file)}
                      className="list-action-btn-cyan"
                      title="Detect viral moments & generate 9:16 vertical Shorts"
                    >
                      <Sparkles size={13} />
                      <span>Generate Shorts</span>
                    </button>
                  ) : null}

                  <a
                    href={file.url}
                    download={file.name}
                    className="list-icon-btn"
                    title="Download file"
                  >
                    <Download size={13} />
                  </a>

                  {onDeleteVideo && (
                    <button
                      type="button"
                      onClick={() => onDeleteVideo(file)}
                      className="list-icon-btn delete"
                      title="Delete video"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Grid View */
        <div className={`video-grid ${currentTab === 'downloads' ? 'grid-landscape' : 'grid-shorts'}`}>
          {filteredAndSortedFiles.map((file, idx) => (
            <VideoCard
              key={`${file.name}-${idx}`}
              file={file}
              formatFileSize={formatFileSize}
              onGenerateShorts={onGenerateShorts}
              onReviewShort={onReviewShort}
              onDelete={onDeleteVideo}
            />
          ))}
        </div>
      )}
    </div>
  );
}
