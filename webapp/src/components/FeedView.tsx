import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { LAYER_NAMES } from '../engine/strangrmesh';
import Logo from './Logo';

export default function FeedView() {
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
      case 'mine': return 'opacity-80';
      case 'send': return 'opacity-80';
      case 'genesis': return 'opacity-80';
      default: return 'opacity-80';
    }
  };

  const isMe = (addr: string) => wallet?.address === addr;

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const handleRefresh = () => {
    refreshTxs();
    refreshStats();
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-title-sm font-bold opacity-100 font-title">{'\u25CE'} StrangrzMesh Feed</h2>
          <button className="warp-button text-body-sm" onClick={handleRefresh}>Refresh</button>
        </div>
        <p className="text-body-sm opacity-40">
          {globalTxs.length} transactions on the StrangrzMesh DAG
        </p>

        {/* Mesh Stats Summary */}
        {meshStats && (
          <div className="flex gap-4 mt-2 text-label opacity-40 flex-wrap">
            <span>DAG: <span className="opacity-80">{meshStats.totalTransactions}</span> nodes</span>
            <span>Tips: <span className="opacity-80">{meshStats.totalTips}</span></span>
            <span>Resonance: <span className="opacity-80">{(meshStats.avgResonance * 100).toFixed(0)}%</span></span>
            <span>Depth: <span className="opacity-80">{meshStats.maxDepth}</span></span>
          </div>
        )}
      </div>

      {globalTxs.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <Logo className="w-12 h-12 mx-auto mb-2" />
          <p className="opacity-50 text-base">No transactions yet. Be the first to mine or send!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {globalTxs.map(tx => (
            <div key={tx.id} className="glass-panel p-3">
              <div className="flex items-start gap-3">
                <span className={`text-title-md ${typeColor(tx.type)}`}>{typeIcon(tx.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-body-sm font-bold opacity-90">
                      {tx.type === 'mine' ? 'Mining Reward' :
                       tx.type === 'genesis' ? 'Genesis' :
                       tx.type === 'send' ? 'Transfer' : tx.type}
                    </span>
                    <span className="text-label opacity-30">{timeAgo(tx.timestamp)}</span>
                    {tx.layer !== undefined && (
                      <span className="text-label px-1.5 py-0.5 rounded-none bg-current/5 opacity-80/70">
                        {LAYER_NAMES[tx.layer] || `L${tx.layer}`}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] opacity-50 mt-1">
                    {tx.type === 'send' ? (
                      <>
                        <span className={isMe(tx.from) ? 'opacity-80' : ''}>
                          {isMe(tx.from) ? 'You' : shortAddress(tx.from)}
                        </span>
                        {' \u2192 '}
                        <span className={isMe(tx.to) ? 'opacity-80' : ''}>
                          {isMe(tx.to) ? 'You' : shortAddress(tx.to)}
                        </span>
                      </>
                    ) : tx.type === 'mine' ? (
                      <span className={isMe(tx.to) ? 'opacity-80' : ''}>
                        {isMe(tx.to) ? 'You' : shortAddress(tx.to)}
                      </span>
                    ) : (
                      <span className={isMe(tx.to) ? 'opacity-80' : ''}>
                        {isMe(tx.to) ? 'You' : shortAddress(tx.to)}
                      </span>
                    )}
                  </div>

                  {/* Resonance & Confirmations */}
                  {(tx.resonanceScore !== undefined || tx.confirmations !== undefined) && (
                    <div className="flex gap-3 mt-1 text-label">
                      {tx.resonanceScore !== undefined && (
                        <span className="opacity-80/60">
                          {(tx.resonanceScore * 100).toFixed(0)}% resonance
                        </span>
                      )}
                      {tx.confirmations !== undefined && tx.confirmations > 0 && (
                        <span className="opacity-80/60">
                          {tx.confirmations} conf
                        </span>
                      )}
                      {tx.meshDepth !== undefined && (
                        <span className="opacity-30">
                          depth {tx.meshDepth}
                        </span>
                      )}
                    </div>
                  )}

                  {tx.memo && (
                    <p className="text-label opacity-40 mt-1 truncate">{tx.memo}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-base font-bold ${
                    tx.type === 'send' && isMe(tx.from) ? 'opacity-80' : 'opacity-80'
                  }`}>
                    {tx.type === 'send' && isMe(tx.from) ? '-' : '+'}{tx.amount} {'\u2B23'}
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
