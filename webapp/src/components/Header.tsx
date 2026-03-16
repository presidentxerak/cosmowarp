import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';

export default function Header({ activeTab, setActiveTab }: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const tabs = [
    { id: 'wallet', label: 'Wallet', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M16 12h.01" /><path d="M2 10h20" /></svg>, group: 'main' },
    { id: 'warts', label: 'Strangrz', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12,2 22,8 22,16 12,22 2,16 2,8" /></svg>, group: 'main' },
    { id: 'cosmochat', label: 'CosmoChat', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>, group: 'main' },
    { id: 'feed', label: 'Feed', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="10" /></svg>, group: 'main' },
    { id: 'settings', label: 'Settings', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>, group: 'main' },
    { id: 'help', label: 'Help', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>, group: 'info' },
    { id: 'whitepaper', label: 'Paper', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>, group: 'info' },
    { id: 'dev', label: 'Dev', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>, group: 'more' },
  ];

  const mainTabs = tabs.filter(t => t.group === 'main');
  const moreTabs = tabs.filter(t => t.group !== 'main');
  const activeLabel = tabs.find(t => t.id === activeTab);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // Close menu on escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [menuOpen]);

  const selectTab = (id: string) => {
    setActiveTab(id);
    setMenuOpen(false);
  };

  return (
    <header className="glass-panel mb-3 sm:mb-4 sticky top-0 sm:relative z-50" ref={menuRef}>
      {/* ─── Top bar ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 p-3 sm:p-4">
        {/* Logo + title */}
        <div className="flex items-center gap-2 shrink-0">
          <Logo
            className="w-7 h-7 sm:w-8 sm:h-8 animate-float cursor-pointer"
            onClick={() => selectTab('landing')}
          />
          <div className="hidden sm:block">
            <h1
              className="text-base font-bold opacity-90 leading-tight cursor-pointer font-title"
              onClick={() => selectTab('landing')}
            >
              Strangrz
            </h1>
            <p className="text-[10px] opacity-40">Terminal v2.0</p>
          </div>
        </div>

        {/* Desktop nav (hidden on mobile) */}
        <nav className="hidden sm:flex gap-1 ml-auto items-center">
          {mainTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-current/10 opacity-80 '
                  : 'opacity-40 hover:opacity-80 hover:bg-white/5'
              }`}
            >
              <span className="inline-flex items-center gap-1">{tab.icon} {tab.label}</span>
            </button>
          ))}

          {/* Desktop "More" dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                moreTabs.some(t => t.id === activeTab)
                  ? 'bg-current/10 opacity-80'
                  : 'opacity-40 hover:opacity-80 hover:bg-white/5'
              }`}
            >
              <span className="inline-flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg> More</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 glass-panel p-1 min-w-[140px]">
                {moreTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => selectTab(tab.id)}
                    className={`w-full text-left px-3 py-2 text-xs transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-current/10 opacity-80'
                        : 'opacity-40 hover:opacity-80 hover:bg-white/5'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">{tab.icon} {tab.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer opacity-40 hover:opacity-80 hover:bg-white/5"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>}
          </button>
        </nav>

        {/* Mobile: active tab label + theme toggle + burger button */}
        <div className="flex items-center gap-1 ml-auto sm:hidden">
          <span className="text-xs opacity-90 font-medium inline-flex items-center gap-1">
            {activeLabel ? <>{activeLabel.icon} {activeLabel.label}</> : ''}
          </span>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 opacity-40 hover:opacity-80 transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center justify-center w-10 h-10 opacity-50 hover:opacity-80 hover:bg-white/5 transition-all cursor-pointer"
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 5h14M3 10h14M3 15h14" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ─── Mobile dropdown menu ─────────────────────────── */}
      {menuOpen && (
        <div className="sm:hidden border-t border-white/5">
          <nav className="p-2 grid grid-cols-3 gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                className={`flex flex-col items-center gap-1 py-3 px-2 text-center transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-current/5 opacity-80 '
                    : 'opacity-40 active:bg-white/5'
                }`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                <span className="text-[11px] font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
