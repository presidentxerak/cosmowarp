import { useState, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import HexAvatar from './HexAvatar';

interface TopBarProps {
  onProfileClick: () => void;
  onNotificationsClick: () => void;
  notificationCount?: number;
}

export default function TopBar({ onProfileClick, onNotificationsClick, notificationCount = 0 }: TopBarProps) {
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
          className="shrink-0 w-9 h-9 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
          aria-label="Open menu"
        >
          <HexAvatar address={wallet?.address || 'default'} size={32} />
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

        {/* Notifications bell */}
        <button
          onClick={onNotificationsClick}
          className="shrink-0 w-9 h-9 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-all relative"
          aria-label="Notifications"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-warp-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
