import React, { useState, useMemo } from 'react';
import { Film, Clock, CheckCircle2, Download, Search, X, ArrowUpDown } from 'lucide-react';
import VideoCard from './VideoCard.jsx';

export default function VideoGallery({
  files,
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

  // Enforce one of the 3 allowed tabs: 'downloads', 'drafts', 'ready'
  const currentTab = (setActiveTab ? activeTab : localTab) === 'all' ? 'downloads' : (setActiveTab ? activeTab : localTab);
  const handleTabChange = setActiveTab || setLocalTab;

  // Compute category counts
  const downloadsCount = files.filter((f) => f.category === 'downloads').length;
  const draftsCount = files.filter((f) => f.category === 'drafts').length;
  const readyCount = files.filter((f) => f.category === 'ready').length;

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

  return (
    <div className="gallery-section">
      {/* Gallery Header Row */}
      <div className="gallery-header-row">
        <div className="gallery-title-group">
          <div className="gallery-title">
            <Film size={20} color="#ef4444" />
            <span>Library</span>
            <span className="gallery-total-badge">
              {filteredAndSortedFiles.length}
            </span>
          </div>
        </div>

        {/* Search & Sort Controls (Folder & Refresh removed per request) */}
        <div className="gallery-controls-group">
          {/* Real-time Search Box */}
          <div className="gallery-search-box">
            <Search size={14} className="search-icon" />
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
          <div className="gallery-sort-wrap">
            <ArrowUpDown size={13} className="sort-icon" />
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
        </div>
      </div>

      {/* Segmented Status Tabs: ONLY Downloads, Pre Ready Shorts, and Shorts */}
      <div className="gallery-tabs-container" style={{ marginBottom: '1.25rem' }}>
        <div className="gallery-tabs-bar">
          <button
            type="button"
            className={`gallery-tab-btn ${currentTab === 'downloads' ? 'active' : ''}`}
            onClick={() => handleTabChange('downloads')}
          >
            <Download size={14} />
            <span>Downloads</span>
            <span className="tab-pill tab-pill-blue">{downloadsCount}</span>
          </button>

          <button
            type="button"
            className={`gallery-tab-btn ${currentTab === 'drafts' ? 'active' : ''}`}
            onClick={() => handleTabChange('drafts')}
          >
            <Clock size={14} />
            <span>Pre Ready Shorts</span>
            <span className={`tab-pill ${draftsCount > 0 ? 'tab-pill-amber' : 'tab-pill-neutral'}`}>
              {draftsCount}
            </span>
          </button>

          <button
            type="button"
            className={`gallery-tab-btn ${currentTab === 'ready' ? 'active' : ''}`}
            onClick={() => handleTabChange('ready')}
          >
            <CheckCircle2 size={14} />
            <span>Shorts</span>
            <span className={`tab-pill ${readyCount > 0 ? 'tab-pill-green' : 'tab-pill-neutral'}`}>
              {readyCount}
            </span>
          </button>
        </div>
      </div>

      {/* Video Grid or Minimal Empty State */}
      {filteredAndSortedFiles.length === 0 ? (
        <div className="empty-state">
          {searchQuery ? (
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
              No matches for "{searchQuery}".{' '}
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
              >
                Clear
              </button>
            </p>
          ) : currentTab === 'drafts' ? (
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
              No pre ready shorts. Download a video to auto-create clips.
            </p>
          ) : currentTab === 'ready' ? (
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
              No shorts ready. Click "Add Text" on pre ready shorts.
            </p>
          ) : (
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
              No videos downloaded. Paste a link to start.
            </p>
          )}
        </div>
      ) : (
        <div className="video-grid">
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
