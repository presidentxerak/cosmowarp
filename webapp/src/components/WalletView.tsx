import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';

export default function WalletView() {
  const { wallet, initWallet } = useWallet();
  const [alias, setAlias] = useState('');
  const [copied, setCopied] = useState(false);

  if (!wallet) {
    return (
      <div className="glass-panel p-6 text-center">
        <div className="text-5xl mb-4 animate-float">{'\u2726'}</div>
        <h2 className="text-xl font-bold text-warp-300 mb-2">Create Your Warp Wallet</h2>
        <p className="text-sm text-gray-400 mb-6">
          Generate a cosmic keypair and receive 100 {'\u03A9'} genesis bonus.
        </p>
        <div className="max-w-xs mx-auto space-y-3">
          <input
            className="warp-input text-center"
            placeholder="Alias (optional)"
            value={alias}
            onChange={e => setAlias(e.target.value)}
          />
          <button className="warp-button w-full text-base py-3" onClick={() => initWallet(alias || undefined)}>
            {'\u2726'} Initialize Wallet
          </button>
        </div>
      </div>
    );
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const recentTxs = wallet.transactions.slice(0, 8);

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <div className="glass-panel p-5 text-center animate-pulse-glow">
        <p className="text-xs text-gray-400 mb-1">
          {wallet.alias ? `@${wallet.alias}` : 'Warp Balance'}
        </p>
        <div className="text-4xl sm:text-5xl font-bold text-warp-300 mb-1 animate-float">
          {wallet.balance.toLocaleString()} <span className="text-2xl">{'\u03A9'}</span>
        </div>
        <p className="text-[10px] text-gray-500">WARP ENERGY UNITS</p>
      </div>

      {/* Address */}
      <div className="glass-panel p-3">
        <p className="text-[10px] text-gray-500 mb-1">YOUR ADDRESS</p>
        <div className="flex items-center gap-2">
          <code className="text-xs text-energy-400 flex-1 truncate">{wallet.address}</code>
          <button
            onClick={copyAddress}
            className="warp-button text-xs px-2 py-1"
          >
            {copied ? '\u2713 Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-panel p-3 text-center">
          <p className="text-lg font-bold text-energy-400">{wallet.transactions.length}</p>
          <p className="text-[10px] text-gray-500">TXs</p>
        </div>
        <div className="glass-panel p-3 text-center">
          <p className="text-lg font-bold text-nebula-400">
            {wallet.transactions.filter(t => t.type === 'mine').length}
          </p>
          <p className="text-[10px] text-gray-500">MINED</p>
        </div>
        <div className="glass-panel p-3 text-center">
          <p className="text-lg font-bold text-star-400">
            {wallet.transactions.filter(t => t.type === 'send').reduce((a, t) => a + t.amount, 0)}
          </p>
          <p className="text-[10px] text-gray-500">SENT</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3">Recent Transactions</h3>
        {recentTxs.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {recentTxs.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 p-2 rounded-lg bg-cosmic-900/40 text-xs">
                <span className={`text-base ${
                  tx.type === 'mine' ? 'text-star-400' :
                  tx.type === 'send' ? 'text-nebula-400' :
                  tx.type === 'genesis' ? 'text-warp-400' :
                  'text-energy-400'
                }`}>
                  {tx.type === 'mine' ? '\u26CF' :
                   tx.type === 'send' ? '\u2197' :
                   tx.type === 'genesis' ? '\u2726' : '\u2199'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 truncate">
                    {tx.type === 'genesis' ? 'Genesis Bonus' :
                     tx.type === 'mine' ? 'Mining Reward' :
                     tx.type === 'send' ? `To ${shortAddress(tx.to)}` :
                     `From ${shortAddress(tx.from)}`}
                  </p>
                  {tx.memo && <p className="text-gray-500 truncate">{tx.memo}</p>}
                </div>
                <span className={`font-bold shrink-0 ${
                  tx.type === 'send' ? 'text-nebula-400' : 'text-energy-400'
                }`}>
                  {tx.type === 'send' ? '-' : '+'}{tx.amount} {'\u03A9'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
