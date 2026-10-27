import React from 'react';
import { Key, Sparkles, AtSign, Clapperboard } from 'lucide-react';

export default function Header({
  apiKey,
  onOpenApiKeyModal,
  channelHandle,
  onOpenChannelModal
}) {
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
          onClick={onOpenChannelModal}
          className="header-glass-pill pill-channel"
          title="Channel Username"
        >
          <AtSign size={13} color="#60a5fa" />
          <span>{channelHandle || '@AddChannel'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenApiKeyModal}
          className="header-glass-pill pill-ai"
          title="AI Key"
        >
          {apiKey ? (
            <>
              <span className="header-status-dot active"></span>
              <Sparkles size={13} color="#34d399" />
              <span>AI Connected</span>
            </>
          ) : (
            <>
              <span className="header-status-dot"></span>
              <Key size={13} color="#f87171" />
              <span>Connect AI</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
