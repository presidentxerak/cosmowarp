import { useWallet } from '../context/WalletContext';
import HexAvatar from './HexAvatar';

interface BottomBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomBar({ activeTab, setActiveTab }: BottomBarProps) {
  const { wallet, globalTxs } = useWallet();

  const getBadgeCount = (tabId: string): number => {
    if (tabId === 'notifications') return globalTxs?.length || 0;
    return 0;
  };

  const tabs = [
    {
      id: 'wall',
      label: 'Wall',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      id: 'gallery',
      label: 'Gallery',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Profile',
      isProfile: true,
    },
    {
      id: 'notifications',
      label: 'Notifs',
      badge: true,
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      id: 'message',
      label: 'Messages',
      badge: true,
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around max-w-lg mx-auto h-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const badgeCount = 'badge' in tab && tab.badge ? getBadgeCount(tab.id) : 0;

          // Profile tab — HexAvatar that overflows 5px above the bar
          if ('isProfile' in tab && tab.isProfile) {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-1 px-2 flex-1 transition-all cursor-pointer ${
                  isActive ? 'opacity-100' : 'opacity-60 hover:opacity-90'
                }`}
                style={{ paddingTop: '0px', paddingBottom: '10px' }}
                aria-label={tab.label}
              >
                <div className="relative" style={{ marginTop: '0px' }}>
                  {wallet ? (
                    <HexAvatar address={wallet.address} size={32} />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 40 40">
                      <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="#111111" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                      <text x="20" y="24" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="14">?</text>
                    </svg>
                  )}
                </div>
                <span className="text-[11px] font-medium">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-1 py-2.5 px-2 flex-1 transition-all cursor-pointer ${
                isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'
              }`}
              aria-label={tab.label}
            >
              <div className="relative">
                {'icon' in tab && tab.icon && tab.icon(isActive)}
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full" style={{ backgroundColor: '#e91e8c' }}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
