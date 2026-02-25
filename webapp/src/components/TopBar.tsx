import { useState, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import HexAvatar from './HexAvatar';

interface TopBarProps {
  onProfileClick: () => void;
  onNotificationsClick: () => void;
}

export default function TopBar({ onProfileClick }: TopBarProps) {
  const { wallet } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-50 glass-panel">
      <div className="flex items-center gap-2 px-3 py-2 sm:px-[10px]">
        {/* Profile icon - opens sidebar */}
        <button
          onClick={onProfileClick}
          className="shrink-0 w-9 h-9 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity profile-icon-ring"
          aria-label="Open menu"
        >
          <HexAvatar address={wallet?.address || 'default'} size={32} animate />
        </button>

        {/* Search bar */}
        <div className="flex-1 relative">
          <div className={`flex items-center gap-2 px-3 py-1.5 transition-all duration-200 ${
            searchFocused
              ? 'bg-cosmic-700/80 border border-warp-500/40 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
              : 'bg-cosmic-800/60 border border-white/5 hover:border-white/10'
          }`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 shrink-0">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search CosmoWarp"
              className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }}
                className="text-gray-500 hover:text-gray-300 cursor-pointer shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
