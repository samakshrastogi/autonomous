import React, { useState } from 'react';
import { Film, RotateCcw, Clock, CheckCircle2, Download, Layers } from 'lucide-react';
import VideoCard from './VideoCard.jsx';

export default function VideoGallery({
  files,
  loading,
  onRefresh,
  formatFileSize,
  onGenerateShorts,
  onReviewShort
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'downloads' | 'drafts' | 'ready'

  // Compute category counts
  const downloadsCount = files.filter((f) => f.category === 'downloads').length;
  const draftsCount = files.filter((f) => f.category === 'drafts').length;
  const readyCount = files.filter((f) => f.category === 'ready').length;
  const allCount = files.length;

  // Filter files based on selected tab
  const filteredFiles = activeTab === 'all'
    ? files
    : files.filter((f) => f.category === activeTab);

  return (
    <div>
      {/* Gallery Header */}
      <div className="gallery-header">
        <div className="gallery-title">
          <Film size={22} color="#ef4444" />
          <span>Video Library</span>
          <span className="gallery-total-badge">
            {allCount}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            type="button"
            onClick={onRefresh}
            className="action-btn-subtle"
            title="Refresh video list from disk"
            disabled={loading}
          >
            <RotateCcw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Segmented Status Tabs Bar */}
      <div className="gallery-tabs-container">
        <div className="gallery-tabs-bar">
          <button
            type="button"
            className={`gallery-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <Layers size={15} />
            <span>All Videos</span>
            <span className="tab-pill tab-pill-neutral">{allCount}</span>
          </button>

          <button
            type="button"
            className={`gallery-tab-btn ${activeTab === 'downloads' ? 'active' : ''}`}
            onClick={() => setActiveTab('downloads')}
            title="Full length YouTube downloads in 01_Downloads"
          >
            <Download size={15} />
            <span>Downloads</span>
            <span className="tab-pill tab-pill-blue">{downloadsCount}</span>
          </button>

          <button
            type="button"
            className={`gallery-tab-btn ${activeTab === 'drafts' ? 'active' : ''}`}
            onClick={() => setActiveTab('drafts')}
            title="9:16 Shorts waiting for custom text in 02_Shorts_Drafts"
          >
            <Clock size={15} />
            <span>Waiting for Text</span>
            <span className={`tab-pill ${draftsCount > 0 ? 'tab-pill-amber' : 'tab-pill-neutral'}`}>
              {draftsCount}
            </span>
          </button>

          <button
            type="button"
            className={`gallery-tab-btn ${activeTab === 'ready' ? 'active' : ''}`}
            onClick={() => setActiveTab('ready')}
            title="Completed branded Shorts in 03_Shorts_Ready"
          >
            <CheckCircle2 size={15} />
            <span>Ready Shorts</span>
            <span className={`tab-pill ${readyCount > 0 ? 'tab-pill-green' : 'tab-pill-neutral'}`}>
              {readyCount}
            </span>
          </button>
        </div>

        {/* Subfolder location hint */}
        <div className="gallery-folder-hint">
          {activeTab === 'all' && '📁 Showing all items across 01_Downloads, 02_Shorts_Drafts & 03_Shorts_Ready'}
          {activeTab === 'downloads' && '📁 Folder: C:\\Users\\Samaksh Rastogi\\downloads\\videos\\01_Downloads'}
          {activeTab === 'drafts' && '📁 Folder: C:\\Users\\Samaksh Rastogi\\downloads\\videos\\02_Shorts_Drafts'}
          {activeTab === 'ready' && '📁 Folder: C:\\Users\\Samaksh Rastogi\\downloads\\videos\\03_Shorts_Ready'}
        </div>
      </div>

      {/* Video Grid or Tab-Specific Empty State */}
      {filteredFiles.length === 0 ? (
        <div className="empty-state">
          {activeTab === 'drafts' ? (
            <>
              <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 0.5rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#166534', marginBottom: '0.35rem' }}>
                All Shorts Have Text!
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                No drafts waiting. All your generated shorts have hooks and are in Ready Shorts.
              </p>
            </>
          ) : activeTab === 'ready' ? (
            <>
              <Clock size={36} color="#f59e0b" style={{ margin: '0 auto 0.5rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#b45309', marginBottom: '0.35rem' }}>
                No Ready Shorts Yet
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Go to "Waiting for Text" and click "Add Text" on any short to burn your viral hook.
              </p>
            </>
          ) : activeTab === 'downloads' ? (
            <>
              <Download size={36} color="#2563eb" style={{ margin: '0 auto 0.5rem' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e40af', marginBottom: '0.35rem' }}>
                No Downloads Yet
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Paste any YouTube URL above and it will download automatically into 01_Downloads.
              </p>
            </>
          ) : (
            <>
              <Film className="empty-icon" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                No videos downloaded yet
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Paste a YouTube link above and it will download automatically.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="video-grid">
          {filteredFiles.map((file, idx) => (
            <VideoCard
              key={`${file.name}-${idx}`}
              file={file}
              formatFileSize={formatFileSize}
              onGenerateShorts={onGenerateShorts}
              onReviewShort={onReviewShort}
            />
          ))}
        </div>
      )}
    </div>
  );
}
