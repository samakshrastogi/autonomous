import React from 'react';
import { Laugh, Gamepad2, Check } from 'lucide-react';

export default function ChannelSelector({ activeChannel, onSelectChannel }) {
  const channels = [
    {
      id: 'haso_dil_khol_k',
      name: 'Haso Dil Khol K',
      handle: '@HasoDilKholK',
      badge: 'Comedy & Entertainment',
      icon: Laugh,
      color: '#ef4444',
      bgGlow: 'rgba(239, 68, 68, 0.15)',
      desc: 'YouTube video downloads & viral Hinglish comedy shorts'
    },
    {
      id: 'samaksh_gaming',
      name: 'Samaksh Gaming',
      handle: '@SamakshGaming',
      badge: 'Chess, Puzzles & Moves',
      icon: Gamepad2,
      color: '#38bdf8',
      bgGlow: 'rgba(56, 189, 248, 0.15)',
      desc: 'Silent video uploads, 5s countdown timer & puzzle questions'
    }
  ];

  return (
    <div className="studio-card channel-selector-card">
      <div className="channel-selector-header">
        <span className="channel-selector-title">Active Channel</span>
        <span className="channel-active-indicator">
          <span className="active-dot" />
          {activeChannel === 'samaksh_gaming' ? 'Gaming Mode' : 'Comedy Mode'}
        </span>
      </div>

      <div className="channel-options-grid">
        {channels.map((chan) => {
          const Icon = chan.icon;
          const isActive = activeChannel === chan.id;

          return (
            <button
              key={chan.id}
              type="button"
              onClick={() => onSelectChannel(chan.id)}
              className={`channel-option-btn ${isActive ? 'active' : ''}`}
              style={{
                borderColor: isActive ? chan.color : undefined,
                boxShadow: isActive ? `0 0 16px ${chan.bgGlow}` : undefined
              }}
            >
              <div className="channel-btn-top">
                <div
                  className="channel-icon-pill"
                  style={{
                    background: isActive ? chan.bgGlow : 'rgba(255, 255, 255, 0.05)',
                    color: chan.color
                  }}
                >
                  <Icon size={16} />
                </div>
                {isActive && (
                  <div className="channel-check-pill" style={{ background: chan.color }}>
                    <Check size={11} color="#ffffff" strokeWidth={3} />
                  </div>
                )}
              </div>

              <div className="channel-btn-info">
                <div className="channel-btn-name">{chan.name}</div>
                <div className="channel-btn-tag" style={{ color: isActive ? chan.color : '#94a3b8' }}>
                  {chan.badge}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
