import React, { useState, useMemo } from 'react';
import { Film, RotateCcw, Clock, CheckCircle2, Download, Layers, Search, X, FolderOpen, ArrowUpDown } from 'lucide-react';
import VideoCard from './VideoCard.jsx';

export default function VideoGallery({
  files,
  loading,
  onRefresh,
  formatFileSize,
  onGenerateShorts,
  onReviewShort,
  onDeleteVideo,
  onOpenFolder,
  activeTab = 'all',
  setActiveTab
}) {
  const [localTab, setLocalTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'size_desc' | 'size_asc' | 'title'

  const currentTab = setActiveTab ? activeTab : localTab;
  const handleTabChange = setActiveTab || setLocalTab;

  // Compute category counts
  const downloadsCount = files.filter((f) => f.category === 'downloads').length;
  const draftsCount = files.filter((f) => f.category === 'drafts').length;
  const readyCount = files.filter((f) => f.category === 'ready').length;
  const allCount = files.length;

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    // 1. Filter by category tab
    let list = currentTab === 'all'
      ? files
      : files.filter((f) => f.category === currentTab);

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
      {/* Gallery Header: Title, Search, Sort & Refresh */}
      <div className="gallery-header-row">
        <div className="gallery-title-group">
          <div className="gallery-title">
            <Film size={22} color="#ef4444" />
            <span>Video Library</span>
            <span className="gallery-total-badge" title="Total videos in this view">
              {filteredAndSortedFiles.length}
            </span>
          </div>
        </div>

        {/* Search, Sort, Open Folder & Refresh Controls */}
        <div className="gallery-controls-group">
          {/* Real-time Search Box */}
          <div className="gallery-search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="search-clear-btn"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="gallery-sort-wrap" title="Sort videos">
            <ArrowUpDown size={13} className="sort-icon" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="gallery-sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="size_desc">Largest Size</option>
              <option value="size_asc">Smallest Size</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>

          {/* Open Folder in Windows Explorer */}
          {onOpenFolder && (
            <button
              type="button"
              onClick={() => onOpenFolder(currentTab)}
              className="action-btn-subtle"
              title="Open current folder in Windows Explorer"
            >
              <FolderOpen size={14} />
              <span className="hide-on-mobile">Folder</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            className="action-btn-subtle"
            title="Refresh video list from disk"
            disabled={loading}
          >
            <RotateCcw size={14} className={loading ? 'spin' : ''} />
            <span className="hide-on-mobile">Refresh</span>
          </button>
        </div>
      </div>

      {/* Segmented Status Tabs Bar */}
      <div className="gallery-tabs-container">
        <div className="gallery-tabs-bar">
          <button
            type="button"
            className={`gallery-tab-btn ${currentTab === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            <Layers size={14} />
            <span>All Videos</span>
            <span className="tab-pill tab-pill-neutral">{allCount}</span>
          </button>

          <button
            type="button"
            className={`gallery-tab-btn ${currentTab === 'downloads' ? 'active' : ''}`}
            onClick={() => handleTabChange('downloads')}
            title="Full length YouTube downloads in 01_Downloads"
          >
            <Download size={14} />
            <span>Downloads</span>
            <span className="tab-pill tab-pill-blue">{downloadsCount}</span>
          </button>

          <button
            type="button"
            className={`gallery-tab-btn ${currentTab === 'drafts' ? 'active' : ''}`}
            onClick={() => handleTabChange('drafts')}
            title="9:16 Shorts waiting for custom text in 02_Shorts_Drafts"
          >
            <Clock size={14} />
            <span>Waiting for Text</span>
            <span className={`tab-pill ${draftsCount > 0 ? 'tab-pill-amber' : 'tab-pill-neutral'}`}>
              {draftsCount}
            </span>
          </button>

          <button
            type="button"
            className={`gallery-tab-btn ${currentTab === 'ready' ? 'active' : ''}`}
            onClick={() => handleTabChange('ready')}
            title="Completed branded Shorts in 03_Shorts_Ready"
          >
            <CheckCircle2 size={14} />
            <span>Ready Shorts</span>
            <span className={`tab-pill ${readyCount > 0 ? 'tab-pill-green' : 'tab-pill-neutral'}`}>
              {readyCount}
            </span>
          </button>
        </div>

        {/* Subfolder location hint */}
        <div className="gallery-folder-hint">
          {currentTab === 'all' && '📁 Showing all items across 01_Downloads, 02_Shorts_Drafts & 03_Shorts_Ready'}
          {currentTab === 'downloads' && '📁 Folder: C:\\Users\\Samaksh Rastogi\\downloads\\videos\\01_Downloads'}
          {currentTab === 'drafts' && '📁 Folder: C:\\Users\\Samaksh Rastogi\\downloads\\videos\\02_Shorts_Drafts'}
          {currentTab === 'ready' && '📁 Folder: C:\\Users\\Samaksh Rastogi\\downloads\\videos\\03_Shorts_Ready'}
        </div>
      </div>

      {/* Video Grid or Search / Tab Empty State */}
      {filteredAndSortedFiles.length === 0 ? (
        <div className="empty-state">
          {searchQuery ? (
            <>
              <Search size={36} color="#94a3b8" style={{ margin: '0 auto 0.5rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                No videos match "{searchQuery}"
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Try searching with a different keyword or{' '}
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                >
                  clear search
                </button>
              </p>
            </>
          ) : currentTab === 'drafts' ? (
            <>
              <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 0.5rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#166534', marginBottom: '0.35rem' }}>
                All Shorts Have Text!
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                No drafts waiting. All your generated shorts have hooks and are in Ready Shorts.
              </p>
            </>
          ) : currentTab === 'ready' ? (
            <>
              <Clock size={36} color="#f59e0b" style={{ margin: '0 auto 0.5rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#b45309', marginBottom: '0.35rem' }}>
                No Ready Shorts Yet
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Go to "Waiting for Text" and click "Add Text" on any short to burn your viral hook.
              </p>
            </>
          ) : currentTab === 'downloads' ? (
            <>
              <Download size={36} color="#2563eb" style={{ margin: '0 auto 0.5rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e40af', marginBottom: '0.35rem' }}>
                No Downloads Yet
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Paste any YouTube URL in the left studio panel to download in HD into 01_Downloads.
              </p>
            </>
          ) : (
            <>
              <Film className="empty-icon" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                No videos downloaded yet
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Paste a YouTube or Shorts link in the left panel to begin.
              </p>
            </>
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
