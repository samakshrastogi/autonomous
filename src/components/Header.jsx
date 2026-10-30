import React from 'react';
import { Clapperboard, Settings, Laugh, Gamepad2 } from 'lucide-react';

export default function Header({ activeChannel, onSelectChannel, onOpenSettings }) {
  const channels = [
    {
      id: 'haso_dil_khol_k',
      name: 'Haso Dil Khol K',
      tag: 'Comedy',
      icon: Laugh,
      color: '#ef4444'
    },
    {
      id: 'samaksh_gaming',
      name: 'Samaksh Gaming',
      tag: 'Gaming',
      icon: Gamepad2,
      color: '#38bdf8'
    }
  ];

  return (
    <header className="top-navbar">
      {/* Left: Brand */}
      <div className="navbar-brand">
        <div className="navbar-logo">
          <Clapperboard size={18} color="#ef4444" />
        </div>
        <div>
          <span className="navbar-title">Shorts Studio</span>
        </div>
      </div>

      {/* Center: Channel Switcher Segmented Control */}
      {onSelectChannel && (
        <div className="navbar-channel-switcher">
          {channels.map((chan) => {
            const Icon = chan.icon;
            const isActive = activeChannel === chan.id;
            const isGaming = chan.id === 'samaksh_gaming';

            return (
              <button
                key={chan.id}
                type="button"
                onClick={() => onSelectChannel(chan.id)}
                className={`navbar-channel-btn ${isActive ? 'active' : ''} ${isGaming ? 'gaming-btn' : 'comedy-btn'}`}
                title={`Switch active channel to ${chan.name}`}
              >
                <Icon size={14} />
                <span className="navbar-channel-name">{chan.name}</span>
                <span className="navbar-channel-badge">{chan.tag}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Right: Actions */}
      <div className="navbar-actions">
        <button
          type="button"
          onClick={onOpenSettings}
          className="header-glass-pill pill-settings"
          title="Studio Settings"
        >
          <Settings size={15} color="#38bdf8" />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
}
