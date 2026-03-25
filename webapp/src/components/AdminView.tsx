import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { logAdminAction } from '../lib/audit';

export default function AdminView() {
  const { wallet, adminDashboard, supplyInfo, unlockAdmin, unlockCreator } = useWallet();
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockAmount, setUnlockAmount] = useState('');
  const [unlockResult, setUnlockResult] = useState<string | null>(null);

  if (!wallet) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="opacity-50">Create a wallet first.</p>
      </div>
    );
  }

  if (!wallet.isAdmin) {
    return (
      <div className="glass-panel p-6 text-center">
        <div className="text-3xl mb-3">{'\u26D4'}</div>
        <h2 className="text-title-sm font-bold opacity-70 mb-2 font-title">Access Denied</h2>
        <p className="text-base opacity-50">This section is restricted to the Strangrz administrator.</p>
        <p className="text-body-sm opacity-60 mt-2">The admin registry is encrypted and only accessible by the creator address.</p>
      </div>
    );
  }

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      const success = await unlockAdmin();
      setUnlocked(success);
      if (success) {
        logAdminAction({ action: 'unlock_registry', actor_address: wallet.address });
      } else {
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
    if (success) {
      logAdminAction({ action: 'unlock_creator_tokens', actor_address: wallet.address, details: { amount } });
    }
    setUnlockResult(success ? `Unlocked ${amount} STZ successfully!` : 'Failed to unlock tokens.');
    if (success) setUnlockAmount('');
    setTimeout(() => setUnlockResult(null), 4000);
  };

  if (!unlocked) {
    return (
      <div className="glass-panel p-6 text-center">
        <div className="text-3xl mb-3">{'\u26BF'}</div>
        <h2 className="text-title-sm font-bold opacity-60 mb-2 font-title">Admin Registry</h2>
        <p className="text-base opacity-50 mb-4">AES-GCM encrypted. Authenticate to access.</p>
        <button
          className="warp-button py-3 px-8"
          onClick={handleUnlock}
          disabled={unlocking}
        >
          {unlocking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-current/10 border-t-current rounded-none animate-spin" />
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
      <div className="glass-panel p-4 border-current/15">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-title-sm font-bold opacity-60 font-title">{'\u26BF'} Admin Registry</h2>
            <p className="text-body-sm opacity-60">Encrypted private ledger</p>
          </div>
          <span className="text-label px-2 py-1 rounded-none bg-current/5 opacity-80 border border-current/10">
            UNLOCKED
          </span>
        </div>
      </div>

      {/* Supply Overview */}
      {supplyInfo && (
        <div className="glass-panel p-4">
          <h3 className="text-base font-bold opacity-70 mb-3">Supply Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm">
            <div className="glass-panel p-3 text-center bg-current/5">
              <p className="text-title-sm font-bold opacity-80">{supplyInfo.total.toLocaleString()}</p>
              <p className="text-label opacity-60">TOTAL SUPPLY</p>
            </div>
            <div className="glass-panel p-3 text-center bg-current/5">
              <p className="text-title-sm font-bold opacity-80">{supplyInfo.circulating.toLocaleString()}</p>
              <p className="text-label opacity-60">CIRCULATING</p>
            </div>
            <div className="glass-panel p-3 text-center bg-current/5">
              <p className="text-title-sm font-bold opacity-80">{supplyInfo.totalMined.toLocaleString()}</p>
              <p className="text-label opacity-60">TOTAL MINED</p>
            </div>
            <div className="glass-panel p-3 text-center bg-current/5">
              <p className="text-title-sm font-bold opacity-80">{supplyInfo.totalAirdropped.toLocaleString()}</p>
              <p className="text-label opacity-60">AIRDROPPED</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-body-sm">
            <div>
              <span className="opacity-60">Creator Locked:</span>
              <span className="opacity-60 ml-1">{supplyInfo.creatorLocked.toLocaleString()}</span>
            </div>
            <div>
              <span className="opacity-60">Reward Pool:</span>
              <span className="opacity-80 ml-1">{supplyInfo.miningPoolRemaining.toLocaleString()}</span>
            </div>
            <div>
              <span className="opacity-60">Airdrop Pool:</span>
              <span className="opacity-80 ml-1">{supplyInfo.airdropPoolRemaining.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Creator Token Unlock */}
      <div className="glass-panel p-4">
        <h3 className="text-base font-bold opacity-70 mb-3">Creator Token Unlock</h3>
        <p className="text-body-sm opacity-60 mb-3">
          Locked: <span className="opacity-60">{supplyInfo?.creatorLocked.toLocaleString() || 0} STZ</span>
        </p>
        <div className="flex gap-2">
          <input
            className="warp-input flex-1"
            type="number"
            placeholder="Amount to unlock"
            value={unlockAmount}
            onChange={e => setUnlockAmount(e.target.value)}
          />
          <button className="warp-button text-body-sm" onClick={handleCreatorUnlock}>
            Unlock
          </button>
        </div>
        {unlockResult && (
          <p className={`text-body-sm mt-2 ${unlockResult.includes('success') ? 'opacity-80' : 'opacity-70'}`}>
            {unlockResult}
          </p>
        )}
      </div>

      {/* Dashboard Stats */}
      {adminDashboard && (
        <>
          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-70 mb-3">Protocol Dashboard</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-body-sm">
              <div className="glass-panel p-3 text-center bg-current/5">
                <p className="text-title-sm font-bold opacity-80">{adminDashboard.totalAccounts}</p>
                <p className="text-label opacity-60">ACCOUNTS</p>
              </div>
              <div className="glass-panel p-3 text-center bg-current/5">
                <p className="text-title-sm font-bold opacity-80">{adminDashboard.totalTransactions}</p>
                <p className="text-label opacity-60">TOTAL TXs</p>
              </div>
              <div className="glass-panel p-3 text-center bg-current/5">
                <p className="text-title-sm font-bold opacity-80">{adminDashboard.activeLast24h}</p>
                <p className="text-label opacity-60">ACTIVE 24H</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-body-sm">
              <div>
                <span className="opacity-60">24h TXs:</span>
                <span className="opacity-80 ml-1">{adminDashboard.transactions24h}</span>
              </div>
              <div>
                <span className="opacity-60">24h Volume:</span>
                <span className="opacity-80 ml-1">{adminDashboard.volume24h.toLocaleString()} STZ</span>
              </div>
              <div>
                <span className="opacity-60">Critical Events:</span>
                <span className={`ml-1 ${adminDashboard.unresolvedCritical > 0 ? 'opacity-70' : 'opacity-80'}`}>
                  {adminDashboard.unresolvedCritical}
                </span>
              </div>
            </div>
          </div>

          {/* Security Events */}
          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-70 mb-3">Recent Security Events</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {adminDashboard.recentEvents.length === 0 ? (
                <p className="text-body-sm opacity-60 text-center py-2">No events</p>
              ) : (
                adminDashboard.recentEvents.map(event => (
                  <div key={event.id} className={`text-[11px] p-2 rounded-none ${
                    event.severity === 'critical' ? 'bg-current/5 border border-current/20' :
                    event.severity === 'warning' ? 'bg-current/5 border border-current/15' :
                    'bg-current/5'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={
                        event.severity === 'critical' ? 'opacity-70' :
                        event.severity === 'warning' ? 'opacity-80' :
                        'opacity-50'
                      }>
                        {event.severity === 'critical' ? '\u26A0' : event.severity === 'warning' ? '\u26A1' : '\u25CE'}
                      </span>
                      <span className="opacity-70 font-medium">{event.type.replace(/_/g, ' ')}</span>
                      <span className="opacity-50 ml-auto text-label">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="opacity-60 mt-1">{event.details}</p>
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
