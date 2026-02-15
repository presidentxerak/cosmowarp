import { useState } from 'react';

export default function Header({ activeTab, setActiveTab }: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = [
    { id: 'wallet', label: '\u25C8 Wallet', group: 'main' },
    { id: 'send', label: '\u2197 Send', group: 'main' },
    { id: 'mine', label: '\u26CF Mine', group: 'main' },
    { id: 'feed', label: '\u25CE Feed', group: 'main' },
    { id: 'whitepaper', label: '\u2726 Paper', group: 'info' },
    { id: 'sdk', label: '\u269B SDK', group: 'info' },
    { id: 'admin', label: '\u26BF Admin', group: 'more' },
    { id: 'console', label: '> Console', group: 'more' },
  ];

  const mainTabs = tabs.filter(t => t.group === 'main');
  const moreTabs = tabs.filter(t => t.group !== 'main');

  return (
    <header className="glass-panel mb-4 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-full animate-warp-spin cursor-pointer"
            onClick={() => setActiveTab('whitepaper')}
            style={{
              background: 'conic-gradient(from 0deg, #a855f7, #06b6d4, #ec4899, #a855f7)',
            }}
          />
          <div>
            <h1 className="text-base font-bold text-warp-300 leading-tight cursor-pointer"
              onClick={() => setActiveTab('whitepaper')}>
              CosmoWarp
            </h1>
            <p className="text-[10px] text-gray-500">Terminal v0.3</p>
          </div>
        </div>

        <nav className="flex gap-1 flex-wrap sm:ml-auto items-center">
          {/* Main tabs always visible */}
          {mainTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-warp-500/30 text-warp-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-all cursor-pointer ${
                moreTabs.some(t => t.id === activeTab)
                  ? 'bg-warp-500/30 text-warp-300'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {'\u2261'} More
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 glass-panel p-1 min-w-[140px]">
                  {moreTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-md text-xs transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-warp-500/30 text-warp-300'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
