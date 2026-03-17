import { useWallet } from '../context/WalletContext';
import HexAvatar from './HexAvatar';

interface BottomBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomBar({ activeTab, setActiveTab }: BottomBarProps) {
  const { wallet } = useWallet();

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
      id: 'curate',
      label: 'Curate',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
    },
    {
      id: 'trading',
      label: 'Trade',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      ),
    },
  ];

  const handleTabClick = (tabId: string) => {
    if (tabId === 'curate') {
      sessionStorage.setItem('strangrz_gallery_tab', 'curate');
      window.dispatchEvent(new CustomEvent('strangrz_gallery_tab', { detail: 'curate' }));
      setActiveTab('gallery');
    } else if (tabId === 'trading') {
      sessionStorage.setItem('strangrz_gallery_tab', 'trading');
      window.dispatchEvent(new CustomEvent('strangrz_gallery_tab', { detail: 'trading' }));
      setActiveTab('gallery');
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around max-w-lg mx-auto h-full">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id ||
            (tab.id === 'curate' && activeTab === 'gallery' && sessionStorage.getItem('strangrz_gallery_tab') === 'curate') ||
            (tab.id === 'trading' && activeTab === 'gallery' && sessionStorage.getItem('strangrz_gallery_tab') === 'trading');

          // Profile tab
          if ('isProfile' in tab && tab.isProfile) {
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`relative flex flex-col items-center gap-1 py-2.5 px-2 flex-1 transition-all cursor-pointer ${
                  isActive ? 'opacity-100' : 'opacity-60 hover:opacity-90'
                }`}
                aria-label={tab.label}
              >
                <div className="relative">
                  {wallet ? (
                    <HexAvatar address={wallet.address} size={24} />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 40 40">
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
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex flex-col items-center gap-1 py-2.5 px-2 flex-1 transition-all cursor-pointer ${
                isActive ? 'opacity-100' : 'opacity-40 hover:opacity-70'
              }`}
              aria-label={tab.label}
            >
              <div className="relative">
                {'icon' in tab && tab.icon && tab.icon(isActive)}
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
