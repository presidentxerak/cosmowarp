import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import HexAvatar from './HexAvatar';
import { shortAddress } from '../engine/crypto';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  { id: 'profile', label: 'Profile', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )},
  { id: 'wallet', label: 'Wallet', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M16 12h.01" />
      <path d="M2 10h20" />
    </svg>
  )},
  { id: 'discover', label: 'Discover', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )},
  { id: 'signets', label: 'Signets', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )},
  { id: 'divider1', label: '', icon: null },
  { id: 'whitepaper', label: 'White Paper', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )},
  { id: 'fondation', label: 'Fondation', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
    </svg>
  )},
  { id: 'divider2', label: '', icon: null },
  { id: 'admin', label: 'Admin', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )},
  { id: 'sdk', label: 'SDK', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </svg>
  )},
  { id: 'console', label: 'Console', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  )},
  { id: 'divider3', label: '', icon: null },
  { id: 'help', label: 'Help', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )},
  { id: 'settings', label: 'Param\u00e8tres', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )},
  { id: 'divider4', label: '', icon: null },
  { id: 'legals', label: 'Legals', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )},
  { id: 'privacy', label: 'Privacy', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )},
];

export default function Sidebar({ isOpen, onClose, activeTab, setActiveTab }: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { wallet } = useWallet();

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSelect = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <>
      {/* Desktop mini sidebar - icons only */}
      <div className="hidden sm:flex fixed top-[52px] left-0 bottom-0 z-40 w-[56px] flex-col items-center py-3 gap-1 glass-panel border-r border-white/5 overflow-y-auto sidebar-mini">
        {menuItems.map((item) => {
          if (item.id.startsWith('divider')) {
            return <div key={item.id} className="w-8 my-0.5 border-b border-white/5" />;
          }
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-10 h-10 flex items-center justify-center transition-all cursor-pointer ${
                activeTab === item.id
                  ? 'text-warp-400 bg-warp-500/10'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          );
        })}
        <div className="mt-auto pt-2 border-t border-white/5 w-8">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-300 cursor-pointer transition-colors mx-auto"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            <span className="text-lg">{theme === 'dark' ? '\u2600' : '\u263D'}</span>
          </button>
        </div>
      </div>

      {/* Backdrop (mobile) */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar panel (slides open) */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 bottom-0 z-[70] w-[280px] max-w-[80vw] glass-panel overflow-y-auto transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header with profile */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img
                src={import.meta.env.BASE_URL + 'logo.svg'}
                alt="CosmoWarp"
                className="w-7 h-7 animate-float"
              />
              <span className="font-title text-sm text-gray-100">CosmoWarp</span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-200 cursor-pointer transition-colors"
              aria-label="Close menu"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>
          {wallet && (
            <button
              onClick={() => handleSelect('profile')}
              className="flex items-center gap-3 w-full text-left cursor-pointer hover:bg-white/5 p-2 -mx-2 transition-colors"
            >
              <HexAvatar address={wallet.address} size={40} animate />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-100 truncate">{wallet.alias || shortAddress(wallet.address)}</p>
                <p className="text-[10px] text-gray-500 truncate">{shortAddress(wallet.address)}</p>
              </div>
            </button>
          )}
        </div>

        {/* Menu items */}
        <nav className="py-2">
          {menuItems.map((item) => {
            if (item.id.startsWith('divider')) {
              return <div key={item.id} className="my-1 border-b border-white/5" />;
            }
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-all cursor-pointer ${
                  activeTab === item.id
                    ? 'text-warp-300 bg-warp-500/10'
                    : 'text-gray-300 hover:bg-white/5 hover:text-gray-100'
                }`}
              >
                <span className={activeTab === item.id ? 'text-warp-400' : 'text-gray-400'}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Theme toggle at bottom */}
        <div className="border-t border-white/5 p-4">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-2 py-2 text-sm text-gray-400 hover:text-gray-200 cursor-pointer transition-colors"
          >
            <span className="text-lg">{theme === 'dark' ? '\u2600' : '\u263D'}</span>
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>
    </>
  );
}
