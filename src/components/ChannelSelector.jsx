import React from 'react';
import { Laugh, Gamepad2, Check } from 'lucide-react';

export default function ChannelSelector({ activeChannel, onSelectChannel }) {
  const channels = [
    {
      id: 'haso_dil_khol_k',
      name: 'Haso Dil Khol K',
      handle: '@HasoDilKholK',
      badge: 'Comedy Clips',
      icon: Laugh,
      color: '#ef4444'
    },
    {
      id: 'samaksh_gaming',
      name: 'Samaksh Gaming',
      handle: '@SamakshGaming',
      badge: 'Puzzle Moves',
      icon: Gamepad2,
      color: '#38bdf8'
    }
  ];

  return (
    <div className="studio-card channel-selector-card compact-card">
      <div className="channel-selector-header">
        <span className="channel-selector-label">ACTIVE CHANNEL</span>
        <div className={`channel-indicator-badge ${activeChannel === 'samaksh_gaming' ? 'gaming' : 'comedy'}`}>
          <span className="channel-indicator-dot" />
          <span>{activeChannel === 'samaksh_gaming' ? 'Gaming' : 'Comedy'}</span>
        </div>
      </div>

      <div className="channel-segmented-control">
        {channels.map((chan) => {
          const Icon = chan.icon;
          const isActive = activeChannel === chan.id;
          const isGaming = chan.id === 'samaksh_gaming';

          return (
            <button
              key={chan.id}
              type="button"
              onClick={() => onSelectChannel(chan.id)}
              className={`channel-segment-btn ${isActive ? 'active' : ''} ${isGaming ? 'gaming-btn' : 'comedy-btn'}`}
              title={`Switch to ${chan.name}`}
            >
              <div className="segment-icon-box">
                <Icon size={15} />
              </div>

              <div className="segment-details">
                <span className="segment-title">{chan.name}</span>
                <span className="segment-badge">{chan.badge}</span>
              </div>

              {isActive && (
                <div className="segment-check-bubble">
                  <Check size={10} strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
