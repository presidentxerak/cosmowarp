import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { LAYER_NAMES } from '../engine/cosmomesh';

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
      case 'mine': return 'text-star-400';
      case 'send': return 'text-nebula-400';
      case 'genesis': return 'text-warp-400';
      default: return 'text-energy-400';
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
          <h2 className="text-lg font-bold text-warp-300 font-title">{'\u25CE'} CosmoMesh Feed</h2>
          <button className="warp-button text-xs" onClick={handleRefresh}>Refresh</button>
        </div>
        <p className="text-xs text-gray-500">
          {globalTxs.length} transactions on the CosmoMesh DAG
        </p>

        {/* Mesh Stats Summary */}
        {meshStats && (
          <div className="flex gap-4 mt-2 text-[10px] text-gray-500 flex-wrap">
            <span>DAG: <span className="text-warp-400">{meshStats.totalTransactions}</span> nodes</span>
            <span>Tips: <span className="text-energy-400">{meshStats.totalTips}</span></span>
            <span>Resonance: <span className="text-star-400">{(meshStats.avgResonance * 100).toFixed(0)}%</span></span>
            <span>Depth: <span className="text-nebula-400">{meshStats.maxDepth}</span></span>
          </div>
        )}
      </div>

      {globalTxs.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <img src={import.meta.env.BASE_URL + 'logo.png'} alt="CosmoWarp" className="w-12 h-12 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No transactions yet. Be the first to mine or send!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {globalTxs.map(tx => (
            <div key={tx.id} className="glass-panel p-3">
              <div className="flex items-start gap-3">
                <span className={`text-xl ${typeColor(tx.type)}`}>{typeIcon(tx.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-200">
                      {tx.type === 'mine' ? 'Mining Reward' :
                       tx.type === 'genesis' ? 'Genesis' :
                       tx.type === 'send' ? 'Transfer' : tx.type}
                    </span>
                    <span className="text-[10px] text-gray-600">{timeAgo(tx.timestamp)}</span>
                    {tx.layer !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-none bg-warp-500/10 text-warp-400/70">
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
                    ) : tx.type === 'mine' ? (
                      <span className={isMe(tx.to) ? 'text-warp-400' : ''}>
                        {isMe(tx.to) ? 'You' : shortAddress(tx.to)}
                      </span>
                    ) : (
                      <span className={isMe(tx.to) ? 'text-warp-400' : ''}>
                        {isMe(tx.to) ? 'You' : shortAddress(tx.to)}
                      </span>
                    )}
                  </div>

                  {/* Resonance & Confirmations */}
                  {(tx.resonanceScore !== undefined || tx.confirmations !== undefined) && (
                    <div className="flex gap-3 mt-1 text-[10px]">
                      {tx.resonanceScore !== undefined && (
                        <span className="text-energy-400/60">
                          {(tx.resonanceScore * 100).toFixed(0)}% resonance
                        </span>
                      )}
                      {tx.confirmations !== undefined && tx.confirmations > 0 && (
                        <span className="text-green-400/60">
                          {tx.confirmations} conf
                        </span>
                      )}
                      {tx.meshDepth !== undefined && (
                        <span className="text-gray-600">
                          depth {tx.meshDepth}
                        </span>
                      )}
                    </div>
                  )}

                  {tx.memo && (
                    <p className="text-[10px] text-gray-500 mt-1 truncate">{tx.memo}</p>
                  )}
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
