import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { SocialEngine } from '../engine/social';
import { shortAddress } from '../engine/crypto';
import HexAvatar from './HexAvatar';

interface TopBarProps {
  onNavigate: (tab: string) => void;
}

interface SearchResult {
  type: 'user' | 'wart' | 'collection';
  id: string;
  title: string;
  subtitle: string;
  address?: string;
  imageData?: string;
}

export default function TopBar({ onNavigate }: TopBarProps) {
  const { warts, globalTxs } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const notifCount = globalTxs?.length || 0;
  // Message badge: count DM threads (visual indicator)
  const msgCount = 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build collections index for search
  const collections = useMemo(() => {
    if (!warts) return [];
    const collMap: Record<string, { title: string; creator: string; count: number; imageData?: string }> = {};
    warts.forEach(w => {
      if (w.editionType === 'unique' && !w.maxEditions) return;
      const baseTitle = w.title.replace(/\s*#\d+$/, '');
      const key = `${w.creator}::${baseTitle}`;
      if (!collMap[key]) collMap[key] = { title: baseTitle, creator: w.creator, count: 0, imageData: w.imageData };
      collMap[key].count++;
    });
    return Object.values(collMap).filter(c => c.count >= 2);
  }, [warts]);

  const doSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase().trim();
    const matched: SearchResult[] = [];

    // Search users
    try {
      const social = SocialEngine.load();
      const allProfiles = social.getAllProfiles();
      for (const user of allProfiles) {
        if (
          user.alias.toLowerCase().startsWith(q) ||
          user.address.toLowerCase().startsWith(q)
        ) {
          matched.push({
            type: 'user',
            id: user.address,
            title: user.alias,
            subtitle: `${shortAddress(user.address)} · ${user.followers.length} followers`,
            address: user.address,
          });
        }
        if (matched.filter(m => m.type === 'user').length >= 8) break;
      }
    } catch { /* no social data yet */ }

    // Search warts (artworks)
    if (warts) {
      for (const wart of warts) {
        if (
          wart.title.toLowerCase().startsWith(q) ||
          wart.title.toLowerCase().includes(q)
        ) {
          matched.push({
            type: 'wart',
            id: wart.id,
            title: wart.title,
            subtitle: `Strangrz · ${wart.price !== null ? wart.price + ' \u2B23' : 'Not for sale'}`,
            address: wart.creator,
            imageData: wart.imageData,
          });
        }
        if (matched.filter(m => m.type === 'wart').length >= 8) break;
      }
    }

    // Search collections
    for (const coll of collections) {
      if (
        coll.title.toLowerCase().startsWith(q) ||
        coll.title.toLowerCase().includes(q)
      ) {
        matched.push({
          type: 'collection',
          id: `${coll.creator}::${coll.title}`,
          title: coll.title,
          subtitle: `Collection · ${coll.count} items`,
          address: coll.creator,
          imageData: coll.imageData,
        });
      }
      if (matched.filter(m => m.type === 'collection').length >= 8) break;
    }

    // Sort each category alphabetically
    const users = matched.filter(m => m.type === 'user').sort((a, b) => a.title.localeCompare(b.title));
    const wartsResults = matched.filter(m => m.type === 'wart').sort((a, b) => a.title.localeCompare(b.title));
    const collResults = matched.filter(m => m.type === 'collection').sort((a, b) => a.title.localeCompare(b.title));

    setResults([...users, ...wartsResults, ...collResults]);
  }, [warts, collections]);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 150);
    return () => clearTimeout(timer);
  }, [searchQuery, doSearch]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'user' && result.address) {
      sessionStorage.setItem('strangrz_view_user', result.address);
      onNavigate('user-profile');
    } else if (result.type === 'wart') {
      sessionStorage.setItem('strangrz_open_wart', result.id);
      sessionStorage.setItem('strangrz_gallery_tab', 'detail');
      window.dispatchEvent(new CustomEvent('strangrz_gallery_tab', { detail: 'detail' }));
      onNavigate('gallery');
    } else if (result.type === 'collection' && result.address) {
      sessionStorage.setItem('strangrz_view_user', result.address);
      onNavigate('user-profile');
    }
    setSearchQuery('');
    setResults([]);
    setSearchFocused(false);
    inputRef.current?.blur();
  };

  const showDropdown = searchFocused && searchQuery.trim().length > 0;

  const userResults = results.filter(r => r.type === 'user');
  const wartResults = results.filter(r => r.type === 'wart');
  const collectionResults = results.filter(r => r.type === 'collection');

  return (
    <header className="sticky top-0 z-50 glass-panel">
      <div className="flex items-center gap-2 px-3 py-2 sm:px-[10px]">
        {/* Search bar */}
        <div className="flex-1 relative" ref={containerRef}>
          <div className={`flex items-center gap-3 px-4 py-2 transition-all duration-200 ${
            searchFocused
              ? 'bg-white/10 dark:bg-white/10'
              : 'bg-white/5 dark:bg-white/5'
          }`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60 shrink-0">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="Rechercher utilisateurs, œuvres, collections..."
              className="w-full bg-transparent text-base placeholder-current/30 outline-none"
              style={{ opacity: searchQuery ? 1 : 0.6 }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setResults([]); inputRef.current?.focus(); }}
                className="opacity-60 hover:opacity-80 cursor-pointer shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            )}
          </div>

          {/* Search results dropdown — three columns: artists | artworks | collections */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-[60] max-h-80 overflow-y-auto search-dropdown">
              {results.length === 0 ? (
                <div className="px-4 py-4 text-base opacity-60 text-center">
                  Aucun résultat pour "{searchQuery}"
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-current/5">
                  {/* Left column: Artists */}
                  <div>
                    <p className="text-label opacity-50 px-3 pt-2 pb-1">Artists</p>
                    {userResults.length === 0 ? (
                      <p className="px-3 py-2 text-body-sm opacity-40">—</p>
                    ) : userResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer text-left"
                      >
                        {result.address && <HexAvatar address={result.address} size={28} />}
                        <div className="min-w-0 flex-1">
                          <p className="text-body-sm truncate">{result.title}</p>
                          <p className="text-label opacity-50 truncate">{result.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {/* Middle column: Artworks */}
                  <div>
                    <p className="text-label opacity-50 px-3 pt-2 pb-1">Strangrz</p>
                    {wartResults.length === 0 ? (
                      <p className="px-3 py-2 text-body-sm opacity-40">—</p>
                    ) : wartResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer text-left"
                      >
                        {result.imageData ? (
                          <div className="w-7 h-7 overflow-hidden shrink-0">
                            <img src={result.imageData} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 bg-current/5 flex items-center justify-center shrink-0">
                            <span className="opacity-50">{'\u25C8'}</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-body-sm truncate">{result.title}</p>
                          <p className="text-label opacity-50 truncate">{result.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {/* Right column: Collections */}
                  <div>
                    <p className="text-label opacity-50 px-3 pt-2 pb-1">Collections</p>
                    {collectionResults.length === 0 ? (
                      <p className="px-3 py-2 text-body-sm opacity-40">—</p>
                    ) : collectionResults.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer text-left"
                      >
                        {result.imageData ? (
                          <div className="w-7 h-7 overflow-hidden shrink-0">
                            <img src={result.imageData} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 bg-current/5 flex items-center justify-center shrink-0">
                            <span className="opacity-50">{'\u25C8'}</span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-body-sm truncate">{result.title}</p>
                          <p className="text-label opacity-50 truncate">{result.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create button */}
        <button
          onClick={() => { sessionStorage.setItem('strangrz_gallery_tab', 'create'); window.dispatchEvent(new CustomEvent('strangrz_gallery_tab', { detail: 'create' })); onNavigate('gallery'); }}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-body-sm font-medium cursor-pointer transition-all hover:opacity-80 bg-pink-600 text-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create
        </button>

        {/* Notifications button */}
        <button
          onClick={() => onNavigate('notifications')}
          className="shrink-0 relative p-2 cursor-pointer transition-all hover:opacity-80"
          aria-label="Notifications"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {notifCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ backgroundColor: '#e91e8c' }}>
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </button>

        {/* Messages button */}
        <button
          onClick={() => onNavigate('message')}
          className="shrink-0 relative p-2 cursor-pointer transition-all hover:opacity-80"
          aria-label="Messages"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {msgCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ backgroundColor: '#e91e8c' }}>
              {msgCount > 99 ? '99+' : msgCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
