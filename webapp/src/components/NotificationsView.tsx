import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { LAYER_NAMES } from '../engine/cosmomesh';

export default function NotificationsView() {
  const { globalTxs, wallet, meshStats, refreshTxs, refreshStats } = useWallet();

  const typeIcon = (type: string) => {
    switch (type) {
      case 'mine': return '\u26CF';
      case 'send': return '\u2197';
      case 'genesis': return '\u2B21';
      default: return '\u25CE';
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'mine': return 'text-star-400';
      case 'send': return 'text-nebula-400';
      case 'genesis': return 'text-warp-400';
      default: return 'text-energy-400';
    }
  };

  const isMe = (addr: string) => wallet?.address === addr;

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  const handleRefresh = () => {
    refreshTxs();
    refreshStats();
  };

  return (
    <div className="space-y-3 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pt-2">
        <h2 className="text-lg font-bold text-gray-100 font-title">Notifications</h2>
        <button className="warp-button text-xs py-1.5 px-3" onClick={handleRefresh}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline mr-1">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Mesh stats */}
      {meshStats && (
        <div className="glass-panel p-3">
          <div className="flex gap-4 text-[10px] text-gray-500 flex-wrap">
            <span>DAG: <span className="text-warp-400">{meshStats.totalTransactions}</span></span>
            <span>Tips: <span className="text-energy-400">{meshStats.totalTips}</span></span>
            <span>Resonance: <span className="text-star-400">{(meshStats.avgResonance * 100).toFixed(0)}%</span></span>
            <span>Depth: <span className="text-nebula-400">{meshStats.maxDepth}</span></span>
          </div>
        </div>
      )}

      {/* Transaction list */}
      {globalTxs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600 mb-3">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p className="text-gray-400 text-sm">No notifications yet</p>
          <p className="text-gray-600 text-xs mt-1">Transactions will appear here</p>
        </div>
      ) : (
        <div className="space-y-1">
          {globalTxs.map(tx => (
            <div key={tx.id} className="glass-panel p-3">
              <div className="flex items-start gap-3">
                <span className={`text-lg ${typeColor(tx.type)}`}>{typeIcon(tx.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-200">
                      {tx.type === 'mine' ? 'Mining Reward' :
                       tx.type === 'genesis' ? 'Genesis' :
                       tx.type === 'send' ? 'Transfer' : tx.type}
                    </span>
                    <span className="text-[10px] text-gray-600">{timeAgo(tx.timestamp)}</span>
                    {tx.layer !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-warp-500/10 text-warp-400/70">
                        {LAYER_NAMES[tx.layer]}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {tx.type === 'send' ? (
                      <>
                        <span className={isMe(tx.from) ? 'text-warp-400' : ''}>
                          {isMe(tx.from) ? 'You' : shortAddress(tx.from)}
                        </span>
                        {' \u2192 '}
                        <span className={isMe(tx.to) ? 'text-warp-400' : ''}>
                          {isMe(tx.to) ? 'You' : shortAddress(tx.to)}
                        </span>
                      </>
                    ) : (
                      <span className={isMe(tx.to) ? 'text-warp-400' : ''}>
                        {isMe(tx.to) ? 'You' : shortAddress(tx.to)}
                      </span>
                    )}
                  </div>
                  {(tx.resonanceScore !== undefined || tx.confirmations !== undefined) && (
                    <div className="flex gap-3 mt-1 text-[10px]">
                      {tx.resonanceScore !== undefined && (
                        <span className="text-energy-400/60">{(tx.resonanceScore * 100).toFixed(0)}% resonance</span>
                      )}
                      {tx.confirmations !== undefined && tx.confirmations > 0 && (
                        <span className="text-green-400/60">{tx.confirmations} conf</span>
                      )}
                    </div>
                  )}
                  {tx.memo && <p className="text-[10px] text-gray-500 mt-1 truncate">{tx.memo}</p>}
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-sm font-bold ${
                    tx.type === 'send' && isMe(tx.from) ? 'text-nebula-400' : 'text-energy-400'
                  }`}>
                    {tx.type === 'send' && isMe(tx.from) ? '-' : '+'}{tx.amount} {'\u03A9'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
