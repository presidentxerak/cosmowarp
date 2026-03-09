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
    { id: 'wallet', label: 'Wallet', icon: '\u25C8', group: 'main' },
    { id: 'warts', label: 'Cosmorares', icon: '\u2B22', group: 'main' },
    { id: 'cosmochat', label: 'CosmoChat', icon: '\u25CE', group: 'main' },
    { id: 'feed', label: 'Feed', icon: '\u25C9', group: 'main' },
    { id: 'settings', label: 'Settings', icon: '\u2699', group: 'main' },
    { id: 'help', label: 'Help', icon: '\u2753', group: 'info' },
    { id: 'whitepaper', label: 'Paper', icon: '\u2B21', group: 'info' },
    { id: 'dev', label: 'Dev', icon: '\u269B', group: 'more' },
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
              コスモラレ
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
              {tab.icon} {tab.label}
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
              {'\u2261'} More
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
                    {tab.icon} {tab.label}
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
            {theme === 'dark' ? '\u2600' : '\u263D'}
          </button>
        </nav>

        {/* Mobile: active tab label + theme toggle + burger button */}
        <div className="flex items-center gap-1 ml-auto sm:hidden">
          <span className="text-xs opacity-90 font-medium">
            {activeLabel ? `${activeLabel.icon} ${activeLabel.label}` : ''}
          </span>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 opacity-40 hover:opacity-80 transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            <span className="text-base">{theme === 'dark' ? '\u2600' : '\u263D'}</span>
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
