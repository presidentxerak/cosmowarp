import { useState } from 'react';
import { useWallet } from '../context/WalletContext';

export default function AdminView() {
  const { wallet, adminDashboard, supplyInfo, unlockAdmin, unlockCreator } = useWallet();
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockAmount, setUnlockAmount] = useState('');
  const [unlockResult, setUnlockResult] = useState<string | null>(null);

  if (!wallet) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="text-gray-400">Create a wallet first.</p>
      </div>
    );
  }

  if (!wallet.isAdmin) {
    return (
      <div className="glass-panel p-6 text-center">
        <div className="text-3xl mb-3">{'\u26D4'}</div>
        <h2 className="text-lg font-bold text-red-400 mb-2 font-title">Access Denied</h2>
        <p className="text-sm text-gray-400">This section is restricted to the CosmoWarp administrator.</p>
        <p className="text-xs text-gray-500 mt-2">The admin registry is encrypted and only accessible by the creator address.</p>
      </div>
    );
  }

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      const success = await unlockAdmin();
      setUnlocked(success);
      if (!success) {
        setUnlockResult('Failed to unlock registry.');
      }
    } finally {
      setUnlocking(false);
    }
  };

  const handleCreatorUnlock = async () => {
    const amount = parseFloat(unlockAmount);
    if (isNaN(amount) || amount <= 0) {
      setUnlockResult('Invalid amount');
      return;
    }
    const success = await unlockCreator(amount);
    setUnlockResult(success ? `Unlocked ${amount} CW successfully!` : 'Failed to unlock tokens.');
    if (success) setUnlockAmount('');
    setTimeout(() => setUnlockResult(null), 4000);
  };

  if (!unlocked) {
    return (
      <div className="glass-panel p-6 text-center">
        <div className="text-3xl mb-3">{'\u26BF'}</div>
        <h2 className="text-lg font-bold text-amber-400 mb-2 font-title">Admin Registry</h2>
        <p className="text-sm text-gray-400 mb-4">AES-GCM encrypted. Authenticate to access.</p>
        <button
          className="warp-button py-3 px-8"
          onClick={handleUnlock}
          disabled={unlocking}
        >
          {unlocking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-warp-300/30 border-t-warp-300 rounded-none animate-spin" />
              Decrypting...
            </span>
          ) : (
            <>{'\u26BF'} Unlock Registry</>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin Header */}
      <div className="glass-panel p-4 border-amber-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-amber-400 font-title">{'\u26BF'} Admin Registry</h2>
            <p className="text-xs text-gray-500">Encrypted private ledger</p>
          </div>
          <span className="text-[10px] px-2 py-1 rounded-none bg-green-500/20 text-green-400 border border-green-500/30">
            UNLOCKED
          </span>
        </div>
      </div>

      {/* Supply Overview */}
      {supplyInfo && (
        <div className="glass-panel p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3">Supply Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="glass-panel p-3 text-center bg-cosmic-900/40">
              <p className="text-lg font-bold text-warp-400">{supplyInfo.total.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">TOTAL SUPPLY</p>
            </div>
            <div className="glass-panel p-3 text-center bg-cosmic-900/40">
              <p className="text-lg font-bold text-energy-400">{supplyInfo.circulating.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">CIRCULATING</p>
            </div>
            <div className="glass-panel p-3 text-center bg-cosmic-900/40">
              <p className="text-lg font-bold text-star-400">{supplyInfo.totalMined.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">TOTAL MINED</p>
            </div>
            <div className="glass-panel p-3 text-center bg-cosmic-900/40">
              <p className="text-lg font-bold text-nebula-400">{supplyInfo.totalAirdropped.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">AIRDROPPED</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
            <div>
              <span className="text-gray-500">Creator Locked:</span>
              <span className="text-amber-400 ml-1">{supplyInfo.creatorLocked.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Mining Pool:</span>
              <span className="text-cyan-400 ml-1">{supplyInfo.miningPoolRemaining.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Airdrop Pool:</span>
              <span className="text-green-400 ml-1">{supplyInfo.airdropPoolRemaining.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Creator Token Unlock */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3">Creator Token Unlock</h3>
        <p className="text-xs text-gray-500 mb-3">
          Locked: <span className="text-amber-400">{supplyInfo?.creatorLocked.toLocaleString() || 0} CW</span>
        </p>
        <div className="flex gap-2">
          <input
            className="warp-input flex-1"
            type="number"
            placeholder="Amount to unlock"
            value={unlockAmount}
            onChange={e => setUnlockAmount(e.target.value)}
          />
          <button className="warp-button text-xs" onClick={handleCreatorUnlock}>
            Unlock
          </button>
        </div>
        {unlockResult && (
          <p className={`text-xs mt-2 ${unlockResult.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
            {unlockResult}
          </p>
        )}
      </div>

      {/* Dashboard Stats */}
      {adminDashboard && (
        <>
          <div className="glass-panel p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3">Protocol Dashboard</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="glass-panel p-3 text-center bg-cosmic-900/40">
                <p className="text-lg font-bold text-warp-400">{adminDashboard.totalAccounts}</p>
                <p className="text-[10px] text-gray-500">ACCOUNTS</p>
              </div>
              <div className="glass-panel p-3 text-center bg-cosmic-900/40">
                <p className="text-lg font-bold text-energy-400">{adminDashboard.totalTransactions}</p>
                <p className="text-[10px] text-gray-500">TOTAL TXs</p>
              </div>
              <div className="glass-panel p-3 text-center bg-cosmic-900/40">
                <p className="text-lg font-bold text-star-400">{adminDashboard.activeLast24h}</p>
                <p className="text-[10px] text-gray-500">ACTIVE 24H</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
              <div>
                <span className="text-gray-500">24h TXs:</span>
                <span className="text-energy-400 ml-1">{adminDashboard.transactions24h}</span>
              </div>
              <div>
                <span className="text-gray-500">24h Volume:</span>
                <span className="text-warp-400 ml-1">{adminDashboard.volume24h.toLocaleString()} CW</span>
              </div>
              <div>
                <span className="text-gray-500">Critical Events:</span>
                <span className={`ml-1 ${adminDashboard.unresolvedCritical > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {adminDashboard.unresolvedCritical}
                </span>
              </div>
            </div>
          </div>

          {/* Security Events */}
          <div className="glass-panel p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3">Recent Security Events</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {adminDashboard.recentEvents.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">No events</p>
              ) : (
                adminDashboard.recentEvents.map(event => (
                  <div key={event.id} className={`text-[11px] p-2 rounded-none ${
                    event.severity === 'critical' ? 'bg-red-500/10 border border-red-500/20' :
                    event.severity === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                    'bg-cosmic-900/40'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={
                        event.severity === 'critical' ? 'text-red-400' :
                        event.severity === 'warning' ? 'text-yellow-400' :
                        'text-gray-400'
                      }>
                        {event.severity === 'critical' ? '\u26A0' : event.severity === 'warning' ? '\u26A1' : '\u25CE'}
                      </span>
                      <span className="text-gray-300 font-medium">{event.type.replace(/_/g, ' ')}</span>
                      <span className="text-gray-600 ml-auto text-[10px]">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-500 mt-1">{event.details}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
