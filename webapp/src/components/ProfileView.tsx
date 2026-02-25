import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';

export default function ProfileView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet, unlocked, lock, signOut } = useWallet();

  if (!wallet || !unlocked) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-120px)]">
        <div className="text-center px-6">
          <div className="w-20 h-20 rounded-full bg-warp-500/10 border border-warp-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <p className="text-gray-400 text-sm">Unlock your wallet to view profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Profile header */}
      <div className="glass-panel p-5">
        <div className="flex items-start gap-4">
          <div className="profile-icon-ring">
            <img
              src={import.meta.env.BASE_URL + 'profile.svg'}
              alt="Profile"
              className="w-16 h-16 rounded-full profile-icon"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = 'none';
                el.parentElement!.innerHTML = '<div class="w-16 h-16 rounded-full bg-warp-500/20 flex items-center justify-center text-2xl text-warp-300">\u2B21</div>';
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-100 font-title truncate">
              {wallet.alias || shortAddress(wallet.address)}
            </h2>
            <p className="text-xs text-gray-500 font-mono truncate mt-0.5">{wallet.address}</p>
            <div className="flex gap-3 mt-2">
              <div>
                <p className="text-sm font-bold text-energy-400">{wallet.balance.toFixed(2)} <span className="text-[10px]">{'\u03A9'}</span></p>
                <p className="text-[10px] text-gray-500">Balance</p>
              </div>
              <div>
                <p className="text-sm font-bold text-warp-400">Lv.{wallet.level || 1}</p>
                <p className="text-[10px] text-gray-500">Level</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onNavigate('wallet')} className="glass-panel p-3 text-center hover:bg-white/5 transition-colors cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mx-auto text-warp-400 mb-1">
            <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M16 12h.01" /><path d="M2 10h20" />
          </svg>
          <p className="text-xs text-gray-300">Wallet</p>
        </button>
        <button onClick={() => onNavigate('signets')} className="glass-panel p-3 text-center hover:bg-white/5 transition-colors cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mx-auto text-warp-400 mb-1">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-xs text-gray-300">Signets</p>
        </button>
        <button onClick={() => onNavigate('settings')} className="glass-panel p-3 text-center hover:bg-white/5 transition-colors cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mx-auto text-energy-400 mb-1">
            <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <p className="text-xs text-gray-300">Settings</p>
        </button>
        <button onClick={() => onNavigate('help')} className="glass-panel p-3 text-center hover:bg-white/5 transition-colors cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mx-auto text-star-400 mb-1">
            <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-xs text-gray-300">Help</p>
        </button>
      </div>

      {/* Account actions */}
      <div className="glass-panel p-4 space-y-2">
        <button
          onClick={lock}
          className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-gray-500">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Lock Wallet
        </button>
        <button
          onClick={() => { if (confirm('Sign out? Make sure you have a backup.')) signOut(); }}
          className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-red-400/70">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}
