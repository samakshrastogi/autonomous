import React, { useState, useMemo } from 'react';
import { Film, Clock, CheckCircle2, Download, Search, X, ArrowUpDown, Sparkles } from 'lucide-react';
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

  // Current category tab
  const currentTab = (setActiveTab ? activeTab : localTab) === 'all' ? 'downloads' : (setActiveTab ? activeTab : localTab);

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
      {/* Gallery View Header: Category Title Badge, Count, Search & Sort */}
      <div className="gallery-header-row">
        <div className="gallery-title-group">
          <div className="gallery-title">
            <span className={`gallery-view-badge view-${currentTab}`}>
              {currentTab === 'downloads' && (
                <>
                  <Download size={15} />
                  <span>Downloads</span>
                </>
              )}
              {currentTab === 'drafts' && (
                <>
                  <Clock size={15} />
                  <span>Pre Ready Shorts</span>
                </>
              )}
              {currentTab === 'ready' && (
                <>
                  <CheckCircle2 size={15} />
                  <span>Shorts</span>
                </>
              )}
            </span>
            <span className="gallery-total-badge">
              {filteredAndSortedFiles.length}
            </span>
          </div>
        </div>

        {/* Search & Sort Controls */}
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

      {/* Video Grid or Minimal Dark Empty State */}
      {filteredAndSortedFiles.length === 0 ? (
        <div className="empty-state">
          {searchQuery ? (
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
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
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              No pre ready shorts. Download a video to auto-create clips.
            </p>
          ) : currentTab === 'ready' ? (
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              No shorts ready. Click "Add Text" on pre ready shorts.
            </p>
          ) : (
            <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              No videos downloaded. Paste a link on the left to start.
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
