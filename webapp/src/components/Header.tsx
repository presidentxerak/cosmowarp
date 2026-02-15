export default function Header({ activeTab, setActiveTab }: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const tabs = [
    { id: 'wallet', label: '\u25C8 Wallet' },
    { id: 'send', label: '\u2197 Send' },
    { id: 'mine', label: '\u26CF Mine' },
    { id: 'feed', label: '\u25CE Feed' },
    { id: 'admin', label: '\u26BF Admin' },
    { id: 'console', label: '> Console' },
  ];

  return (
    <header className="glass-panel mb-4 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-full animate-warp-spin"
            style={{
              background: 'conic-gradient(from 0deg, #a855f7, #06b6d4, #ec4899, #a855f7)',
            }}
          />
          <div>
            <h1 className="text-base font-bold text-warp-300 leading-tight">CosmoWarp</h1>
            <p className="text-[10px] text-gray-500">Terminal v0.2</p>
          </div>
        </div>

        <nav className="flex gap-1 flex-wrap sm:ml-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-warp-500/30 text-warp-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
