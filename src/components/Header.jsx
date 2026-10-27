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
          className="api-key-pill"
          title="Channel Username"
        >
          {channelHandle ? (
            <>
              <AtSign size={13} color="#2563eb" />
              <span style={{ color: '#1e40af', fontWeight: 600 }}>{channelHandle}</span>
            </>
          ) : (
            <>
              <AtSign size={13} color="#64748b" />
              <span>Channel</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenApiKeyModal}
          className="api-key-pill"
          title="AI Key"
        >
          {apiKey ? (
            <>
              <Sparkles size={13} color="#16a34a" />
              <span style={{ color: '#15803d', fontWeight: 600 }}>AI Connected</span>
            </>
          ) : (
            <>
              <Key size={13} color="#ef4444" />
              <span>Connect AI</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
