import { useState, useRef, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { SocialEngine } from '../engine/social';
import { shortAddress } from '../engine/crypto';
import HexAvatar from './HexAvatar';

interface TopBarProps {
  onProfileClick: () => void;
  onNotificationsClick: () => void;
  onNavigate: (tab: string) => void;
}

interface SearchResult {
  type: 'user' | 'wart';
  id: string;
  title: string;
  subtitle: string;
  address?: string;
  imageData?: string;
}

export default function TopBar({ onProfileClick, onNavigate }: TopBarProps) {
  const { wallet, warts } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const matched: SearchResult[] = [];

    try {
      const social = SocialEngine.load();
      const allProfiles = social.getAllProfiles();
      for (const user of allProfiles) {
        if (
          user.alias.toLowerCase().includes(q) ||
          user.address.toLowerCase().includes(q) ||
          (user.bio && user.bio.toLowerCase().includes(q))
        ) {
          matched.push({
            type: 'user',
            id: user.address,
            title: user.alias,
            subtitle: `${shortAddress(user.address)} · ${user.followers.length} followers`,
            address: user.address,
          });
        }
        if (matched.length >= 5) break;
      }
    } catch { /* no social data yet */ }

    if (warts) {
      for (const wart of warts) {
        if (
          wart.title.toLowerCase().includes(q) ||
          wart.description.toLowerCase().includes(q) ||
          wart.creator.toLowerCase().includes(q)
        ) {
          matched.push({
            type: 'wart',
            id: wart.id,
            title: wart.title,
            subtitle: `Wart · ${wart.price !== null ? wart.price + ' \u03A9' : 'Not for sale'}`,
            address: wart.creator,
            imageData: wart.imageData,
          });
        }
        if (matched.length >= 10) break;
      }
    }

    setResults(matched);
  }, [warts]);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery, doSearch]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'user' && result.address) {
      sessionStorage.setItem('cosmorare_view_user', result.address);
      onNavigate('user-profile');
    } else if (result.type === 'wart') {
      onNavigate('gallery');
    }
    setSearchQuery('');
    setResults([]);
    setSearchFocused(false);
    inputRef.current?.blur();
  };

  const showDropdown = searchFocused && searchQuery.trim().length > 0;

  return (
    <header className="sticky top-0 z-50 glass-panel">
      <div className="flex items-center gap-3 px-3 py-2 sm:px-[10px]">
        {/* Profile icon */}
        <button
          onClick={onProfileClick}
          className="shrink-0 w-10 h-10 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity profile-icon-ring"
          aria-label="Open menu"
        >
          <HexAvatar address={wallet?.address || 'default'} size={34} animate />
        </button>

        {/* Search bar */}
        <div className="flex-1 relative" ref={containerRef}>
          <div className={`flex items-center gap-3 px-4 py-2 transition-all duration-200 ${
            searchFocused
              ? 'bg-white/10 dark:bg-white/10'
              : 'bg-white/5 dark:bg-white/5'
          }`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-40 shrink-0">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Rechercher objets, utilisateurs..."
              className="w-full bg-transparent text-base placeholder-current/30 outline-none"
              style={{ opacity: searchQuery ? 1 : 0.6 }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setResults([]); inputRef.current?.focus(); }}
                className="opacity-40 hover:opacity-80 cursor-pointer shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 glass-panel z-[60] max-h-72 overflow-y-auto">
              {results.length === 0 ? (
                <div className="px-4 py-4 text-base opacity-40 text-center">
                  No results for "{searchQuery}"
                </div>
              ) : (
                results.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer text-left border-b border-current/5 last:border-0"
                  >
                    {result.type === 'user' && result.address ? (
                      <HexAvatar address={result.address} size={36} />
                    ) : result.imageData ? (
                      <div className="w-9 h-9 overflow-hidden shrink-0">
                        <img src={result.imageData} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 bg-current/5 flex items-center justify-center shrink-0">
                        <span className="opacity-30">{'\u25C8'}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-base truncate">{result.title}</p>
                      <p className="text-body-sm opacity-40 truncate">{result.subtitle}</p>
                    </div>
                    <span className="text-label px-2 py-0.5 shrink-0 opacity-50">
                      {result.type === 'user' ? 'User' : 'Wart'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
