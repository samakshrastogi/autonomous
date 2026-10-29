import React from 'react';
import { Clapperboard, Settings } from 'lucide-react';

export default function Header({ onOpenSettings }) {
  return (
    <header className="top-navbar">
      <div className="navbar-brand">
        <div className="navbar-logo">
          <Clapperboard size={20} color="#ef4444" />
        </div>
        <div>
          <span className="navbar-title">Shorts Studio</span>
        </div>
      </div>

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
