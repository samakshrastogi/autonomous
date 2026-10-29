import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Tv,
  Sparkles,
  HardDrive,
  Film,
  Check,
  Eye,
  EyeOff,
  FolderOpen,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Timer,
  Laugh,
  Gamepad2
} from 'lucide-react';

export default function SettingsDrawer({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  channelHandle,
  onSaveChannelHandle,
  activeChannel,
  autoPilotEnabled,
  onToggleAutoPilot,
  defaultTimerDuration = 5,
  onSaveDefaultTimer,
  defaultGamingCta = '💬 Comment your move 👇',
  onSaveDefaultGamingCta,
  comedyHandle = '@HasoDilKholK',
  onSaveComedyHandle,
  gamingHandle = '@SamakshGaming',
  onSaveGamingHandle,
  preferredModel = 'auto',
  onSavePreferredModel,
  shortsCount = 3,
  onSaveShortsCount,
  initialTab = 'channels'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showApiKey, setShowApiKey] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(apiKey || '');
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null); // { valid: bool, message: string }
  const [storageInfo, setStorageInfo] = useState(null);
  const [loadingStorage, setLoadingStorage] = useState(false);
  const [cleaningCache, setCleaningCache] = useState(false);
  const [cacheResult, setCacheResult] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Sync initial tab when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'channels');
      setLocalApiKey(apiKey || '');
      setKeyStatus(null);
      setCacheResult('');
      fetchStorageInfo();
    }
  }, [isOpen, initialTab, apiKey]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchStorageInfo = async () => {
    setLoadingStorage(true);
    try {
      const res = await fetch('/api/storage-info');
      const data = await res.json();
      setStorageInfo(data);
    } catch (err) {
      console.error('Failed to fetch storage info:', err);
    } finally {
      setLoadingStorage(false);
    }
  };

  const handleTestKey = async () => {
    if (!localApiKey.trim()) {
      setKeyStatus({ valid: false, message: 'Please enter an API key first.' });
      return;
    }
    setTestingKey(true);
    setKeyStatus(null);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${localApiKey.trim()}`);
      const data = await res.json();
      if (res.ok && data.models) {
        setKeyStatus({
          valid: true,
          message: `API Key Connected! (${data.models.length} models accessible)`
        });
        onSaveApiKey(localApiKey.trim());
        triggerSavedBanner();
      } else {
        setKeyStatus({
          valid: false,
          message: data.error?.message || 'Invalid API key. Please check your credentials.'
        });
      }
    } catch (err) {
      setKeyStatus({
        valid: false,
        message: 'Network error validating API key.'
      });
    } finally {
      setTestingKey(false);
    }
  };

  const handleOpenFolder = async (category) => {
    try {
      await fetch('/api/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      });
    } catch (err) {
      alert(`Could not open folder: ${err.message}`);
    }
  };

  const handleCleanCache = async () => {
    setCleaningCache(true);
    setCacheResult('');
    try {
      const res = await fetch('/api/clean-cache', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const mb = (data.freedBytes / (1024 * 1024)).toFixed(1);
        setCacheResult(`Cleaned ${data.freedCount} temporary files (${mb} MB freed)!`);
        fetchStorageInfo();
      } else {
        setCacheResult('Cache cleanup encountered an issue.');
      }
    } catch (err) {
      setCacheResult(`Error: ${err.message}`);
    } finally {
      setCleaningCache(false);
    }
  };

  const triggerSavedBanner = () => {
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2200);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="settings-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <div className="drawer-icon-badge">
              <Settings size={20} color="#38bdf8" />
            </div>
            <div>
              <h2 className="drawer-title">Studio Settings</h2>
              <p className="drawer-subtitle">Channels, Gemini AI & Storage configuration</p>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            title="Close Settings (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="drawer-tabs">
          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'channels' ? 'active' : ''}`}
            onClick={() => setActiveTab('channels')}
          >
            <Tv size={15} />
            <span>Channels</span>
          </button>

          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Sparkles size={15} />
            <span>AI Engine</span>
          </button>

          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'storage' ? 'active' : ''}`}
            onClick={() => setActiveTab('storage')}
          >
            <HardDrive size={15} />
            <span>Storage</span>
          </button>

          <button
            type="button"
            className={`drawer-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
            onClick={() => setActiveTab('video')}
          >
            <Film size={15} />
            <span>Video</span>
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="drawer-body">
          {/* TAB 1: CHANNELS */}
          {activeTab === 'channels' && (
            <div className="settings-section-stack">
              {/* Channel 1: Haso Dil Khol K */}
              <div className="settings-card channel-profile-card comedy">
                <div className="settings-card-header">
                  <div className="profile-icon-pill comedy">
                    <Laugh size={18} />
                  </div>
                  <div>
                    <h3 className="settings-card-title">Haso Dil Khol K</h3>
                    <p className="settings-card-subtitle">Comedy & viral Hinglish Shorts</p>
                  </div>
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Channel Handle / Watermark</label>
                  <div className="settings-input-wrap">
                    <span className="input-prefix">@</span>
                    <input
                      type="text"
                      className="settings-text-input"
                      value={(comedyHandle || '').replace(/^@/, '')}
                      onChange={(e) => {
                        const val = `@${e.target.value.replace(/^@/, '').trim()}`;
                        onSaveComedyHandle(val);
                        if (activeChannel === 'haso_dil_khol_k') {
                          onSaveChannelHandle(val);
                        }
                        triggerSavedBanner();
                      }}
                      placeholder="HasoDilKholK"
                    />
                  </div>
                  <span className="settings-hint">
                    Burned into comedy Shorts bottom pill and YouTube download metadata.
                  </span>
                </div>
              </div>

              {/* Channel 2: Samaksh Gaming */}
              <div className="settings-card channel-profile-card gaming">
                <div className="settings-card-header">
                  <div className="profile-icon-pill gaming">
                    <Gamepad2 size={18} />
                  </div>
                  <div>
                    <h3 className="settings-card-title">Samaksh Gaming</h3>
                    <p className="settings-card-subtitle">Chess moves, puzzles & silent video clips</p>
                  </div>
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Channel Handle / Watermark</label>
                  <div className="settings-input-wrap">
                    <span className="input-prefix">@</span>
                    <input
                      type="text"
                      className="settings-text-input"
                      value={(gamingHandle || '').replace(/^@/, '')}
                      onChange={(e) => {
                        const val = `@${e.target.value.replace(/^@/, '').trim()}`;
                        onSaveGamingHandle(val);
                        if (activeChannel === 'samaksh_gaming') {
                          onSaveChannelHandle(val);
                        }
                        triggerSavedBanner();
                      }}
                      placeholder="SamakshGaming"
                    />
                  </div>
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Default Countdown Timer Duration</label>
                  <div className="segmented-selector-row">
                    {[3, 5, 10].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        className={`segmented-btn ${defaultTimerDuration === sec ? 'active' : ''}`}
                        onClick={() => {
                          onSaveDefaultTimer(sec);
                          triggerSavedBanner();
                        }}
                      >
                        <Timer size={13} />
                        <span>{sec} Seconds</span>
                      </button>
                    ))}
                  </div>
                  <span className="settings-hint">
                    Applied automatically to newly uploaded silent chess puzzle shorts.
                  </span>
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Default Call-To-Action (CTA) Text</label>
                  <input
                    type="text"
                    className="settings-text-input"
                    value={defaultGamingCta}
                    onChange={(e) => {
                      onSaveDefaultGamingCta(e.target.value);
                      triggerSavedBanner();
                    }}
                    placeholder="💬 Comment your move 👇"
                  />
                  <span className="settings-hint">
                    Text displayed on the bottom pill before the channel watermark.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI ENGINE */}
          {activeTab === 'ai' && (
            <div className="settings-section-stack">
              {/* Gemini API Key */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="profile-icon-pill" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399' }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="settings-card-title">Google Gemini API Key</h3>
                    <p className="settings-card-subtitle">Powers audio transcript analysis & silent vision recognition</p>
                  </div>
                </div>

                <div className="settings-field-group">
                  <div className="api-key-input-container">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      className="settings-text-input key-input"
                      placeholder="AIzaSy..."
                      value={localApiKey}
                      onChange={(e) => {
                        setLocalApiKey(e.target.value);
                        setKeyStatus(null);
                      }}
                    />
                    <button
                      type="button"
                      className="key-toggle-btn"
                      onClick={() => setShowApiKey(!showApiKey)}
                      title={showApiKey ? 'Hide key' : 'Show key'}
                    >
                      {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <div className="key-actions-row">
                    <button
                      type="button"
                      className="settings-action-btn primary"
                      onClick={handleTestKey}
                      disabled={testingKey || !localApiKey.trim()}
                    >
                      {testingKey ? (
                        <>
                          <RefreshCw size={14} className="spin" />
                          <span>Testing Key...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          <span>Save & Test Key</span>
                        </>
                      )}
                    </button>

                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="settings-link-btn"
                    >
                      <span>Get Free API Key</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {keyStatus && (
                    <div className={`settings-status-box ${keyStatus.valid ? 'success' : 'error'}`}>
                      {keyStatus.valid ? <Check size={14} /> : <AlertCircle size={14} />}
                      <span>{keyStatus.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Model & Generation Preferences */}
              <div className="settings-card">
                <h3 className="settings-card-title" style={{ marginBottom: '0.65rem' }}>AI Model & Automation</h3>

                <div className="settings-field-group">
                  <label className="settings-label">Preferred Gemini Model</label>
                  <div className="segmented-selector-row">
                    {[
                      { id: 'auto', label: 'Auto-Detect (Fastest)' },
                      { id: 'gemini-2.5-flash', label: 'Flash 2.5' },
                      { id: 'gemini-1.5-pro', label: 'Pro 1.5' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`segmented-btn ${preferredModel === m.id ? 'active' : ''}`}
                        onClick={() => {
                          onSavePreferredModel(m.id);
                          triggerSavedBanner();
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <span className="settings-hint">
                    Auto-Detect automatically queries Google AI to pick your account's highest-quota model.
                  </span>
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Target Shorts Count Per Video</label>
                  <div className="segmented-selector-row">
                    {[3, 5, 8].map((count) => (
                      <button
                        key={count}
                        type="button"
                        className={`segmented-btn ${shortsCount === count ? 'active' : ''}`}
                        onClick={() => {
                          onSaveShortsCount(count);
                          triggerSavedBanner();
                        }}
                      >
                        {count} Shorts
                      </button>
                    ))}
                  </div>
                </div>

                <div className="settings-toggle-row">
                  <div className="toggle-text-wrap">
                    <span className="toggle-title">Auto-Pilot Generation</span>
                    <span className="toggle-subtitle">
                      Automatically start AI viral clip creation immediately after a YouTube video is downloaded
                    </span>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={autoPilotEnabled}
                      onChange={(e) => {
                        onToggleAutoPilot(e.target.checked);
                        triggerSavedBanner();
                      }}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STORAGE */}
          {activeTab === 'storage' && (
            <div className="settings-section-stack">
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="profile-icon-pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                    <HardDrive size={18} />
                  </div>
                  <div>
                    <h3 className="settings-card-title">Studio Video Library Folders</h3>
                    <p className="settings-card-subtitle">Physical Windows directories for videos and metadata</p>
                  </div>
                </div>

                <div className="folder-cards-list">
                  {[
                    {
                      category: 'downloads',
                      name: '01_Downloads',
                      desc: 'Raw source downloads from YouTube',
                      size: storageInfo?.downloads
                    },
                    {
                      category: 'drafts',
                      name: '02_Shorts_Drafts',
                      desc: 'Pre-ready 9:16 vertical clips and uploaded gaming clips',
                      size: storageInfo?.drafts
                    },
                    {
                      category: 'ready',
                      name: '03_Shorts_Ready',
                      desc: 'Ready Shorts with hooks, countdown timers & watermarks',
                      size: storageInfo?.ready
                    },
                    {
                      category: 'metadata',
                      name: '04_Metadata',
                      desc: 'JSON files containing hooks, moment timestamps & tags',
                      size: storageInfo?.metadata
                    }
                  ].map((folder) => (
                    <div key={folder.category} className="folder-item-card">
                      <div className="folder-item-left">
                        <span className="folder-item-name">{folder.name}</span>
                        <span className="folder-item-desc">{folder.desc}</span>
                        <span className="folder-item-size">
                          {loadingStorage ? '...' : formatBytes(folder.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="folder-open-btn"
                        onClick={() => handleOpenFolder(folder.category)}
                        title={`Open ${folder.name} in Explorer`}
                      >
                        <FolderOpen size={14} />
                        <span>Open</span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="storage-summary-bar">
                  <span>Total Video Storage:</span>
                  <strong>{loadingStorage ? 'Calculating...' : formatBytes(storageInfo?.total)}</strong>
                </div>
              </div>

              {/* Cache Cleaner Card */}
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="profile-icon-pill" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <h3 className="settings-card-title">Cache & Temp File Cleaner</h3>
                    <p className="settings-card-subtitle">Purge temporary audio cuts, crop intermediates and render frames</p>
                  </div>
                </div>

                <div className="cache-cleaner-row">
                  <button
                    type="button"
                    className="settings-action-btn danger"
                    onClick={handleCleanCache}
                    disabled={cleaningCache}
                  >
                    {cleaningCache ? (
                      <>
                        <RefreshCw size={14} className="spin" />
                        <span>Cleaning Cache...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        <span>Clean Temporary Files</span>
                      </>
                    )}
                  </button>

                  {cacheResult && (
                    <span className="cache-result-text">{cacheResult}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VIDEO & OUTPUT */}
          {activeTab === 'video' && (
            <div className="settings-section-stack">
              <div className="settings-card">
                <div className="settings-card-header">
                  <div className="profile-icon-pill" style={{ background: 'rgba(250, 204, 21, 0.15)', color: '#facc15' }}>
                    <Film size={18} />
                  </div>
                  <div>
                    <h3 className="settings-card-title">Export Specifications</h3>
                    <p className="settings-card-subtitle">YouTube Shorts, TikTok & Reels standards</p>
                  </div>
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Target Resolution & Aspect Ratio</label>
                  <div className="preset-pill-box">
                    <strong>1080 × 1920</strong>
                    <span>(9:16 Vertical HD — YouTube Shorts & Reels standard)</span>
                  </div>
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Frame Rate & Fluidity</label>
                  <div className="segmented-selector-row">
                    <button type="button" className="segmented-btn active">
                      30 FPS (Recommended)
                    </button>
                    <button type="button" className="segmented-btn" disabled title="Standard studio default">
                      60 FPS
                    </button>
                  </div>
                </div>

                <div className="settings-field-group">
                  <label className="settings-label">Subtitle & Watermark Rendering Engine</label>
                  <div className="preset-pill-box">
                    <strong>Chrome Headless Vector Render (Ultra-Sharp)</strong>
                    <span>Full-color emoji support (😂, ♟️, ⏳) with custom drop shadows and rounded glow</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="drawer-footer">
          {savedFeedback && (
            <div className="drawer-saved-indicator animate-fade">
              <Check size={14} color="#10b981" />
              <span>Saved</span>
            </div>
          )}

          <div style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              className="drawer-done-btn"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
