import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { LAYER_NAMES } from '../engine/cosmomesh';
import { HIERARCHY_LEVELS } from '../engine/hierarchy';

export default function WalletView() {
  const { wallet, meshStats, supplyInfo, levelProgress, initWallet } = useWallet();
  const [alias, setAlias] = useState('');
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  if (!wallet) {
    return (
      <div className="glass-panel p-6 text-center">
        <div className="text-5xl mb-4 animate-float">{'\u2B21'}</div>
        <h2 className="text-xl font-bold text-warp-300 mb-2 font-title">Create Your Warp Wallet</h2>
        <p className="text-sm text-gray-400 mb-2">
          Generate an Ed25519 keypair and receive 1,000 {'\u03A9'} airdrop.
        </p>
        <p className="text-xs text-gray-500 mb-6">
          Powered by CosmoMesh DAG + Resonance Consensus + Resonance Decay
        </p>
        <div className="max-w-xs mx-auto space-y-3">
          <input
            className="warp-input text-center"
            placeholder="Alias (optional)"
            value={alias}
            onChange={e => setAlias(e.target.value)}
          />
          <button
            className="warp-button w-full text-base py-3"
            onClick={async () => {
              setCreating(true);
              try {
                await initWallet(alias || undefined);
              } finally {
                setCreating(false);
              }
            }}
            disabled={creating}
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-warp-300/30 border-t-warp-300 rounded-full animate-spin" />
                Generating Ed25519 Keys...
              </span>
            ) : (
              <>{'\u2B21'} Initialize Wallet</>
            )}
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
  const levelDef = HIERARCHY_LEVELS[wallet.level];
  const nextLevel = wallet.level < 6 ? HIERARCHY_LEVELS[wallet.level + 1] : null;

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <div className="glass-panel p-5 text-center animate-pulse-glow">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className={`text-lg ${levelDef.color}`}>{wallet.levelSymbol}</span>
          <span className={`text-xs font-bold ${levelDef.color}`}>{wallet.levelTitle}</span>
        </div>
        <p className="text-xs text-gray-400 mb-1">
          {wallet.alias ? `@${wallet.alias}` : 'Warp Balance'}
        </p>
        <div className="text-4xl sm:text-5xl font-bold text-warp-300 mb-1 animate-float">
          {wallet.balance.toLocaleString()} <span className="text-2xl">{'\u03A9'}</span>
        </div>
        <p className="text-[10px] text-gray-500">WARP ENERGY UNITS</p>
        {wallet.isAdmin && (
          <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            ADMIN
          </span>
        )}
      </div>

      {/* Address */}
      <div className="glass-panel p-3">
        <p className="text-[10px] text-gray-500 mb-1">YOUR ADDRESS (Ed25519)</p>
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

      {/* Hierarchy & Level Progress */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-gray-300">
            <span className={levelDef.color}>{wallet.levelSymbol}</span> Level {wallet.level}: {wallet.levelName}
          </h3>
          <span className="text-xs text-gray-500">{wallet.xp} XP</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
          <span>Reward: <span className="text-energy-400">{wallet.rewardMultiplier}x</span></span>
          <span>Streak: <span className="text-star-400">{wallet.streakDays} days</span></span>
        </div>
        {nextLevel && (
          <div>
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
              <span>Progress to {nextLevel.name}</span>
              <span>{levelProgress}%</span>
            </div>
            <div className="w-full bg-cosmic-900/60 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${levelProgress}%`,
                  background: `linear-gradient(90deg, #a855f7, #06b6d4)`,
                }}
              />
            </div>
          </div>
        )}
        {!nextLevel && (
          <p className="text-[10px] text-amber-300">Maximum level reached!</p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
        <div className="glass-panel p-3 text-center">
          <p className="text-lg font-bold text-warp-400">{wallet.streakDays}</p>
          <p className="text-[10px] text-gray-500">STREAK</p>
        </div>
      </div>

      {/* Tokenomics Supply Info */}
      {supplyInfo && (
        <div className="glass-panel p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3">Tokenomics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Total Supply:</span>
              <span className="text-warp-400 ml-1">{supplyInfo.total.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Circulating:</span>
              <span className="text-energy-400 ml-1">{supplyInfo.circulating.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Mining Reward:</span>
              <span className="text-star-400 ml-1">{supplyInfo.currentReward.toFixed(2)} {'\u03A9'}</span>
            </div>
            <div>
              <span className="text-gray-500">Epoch:</span>
              <span className="text-nebula-400 ml-1">{supplyInfo.currentEpoch}</span>
            </div>
            <div>
              <span className="text-gray-500">Mined:</span>
              <span className="text-cyan-400 ml-1">{supplyInfo.percentMined.toFixed(2)}%</span>
            </div>
            <div>
              <span className="text-gray-500">Burned:</span>
              <span className="text-red-400 ml-1">{supplyInfo.burned.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mesh Stats */}
      {meshStats && (
        <div className="glass-panel p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3">CosmoMesh Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">DAG Nodes:</span>
              <span className="text-warp-400 ml-1">{meshStats.totalTransactions}</span>
            </div>
            <div>
              <span className="text-gray-500">Active Tips:</span>
              <span className="text-energy-400 ml-1">{meshStats.totalTips}</span>
            </div>
            <div>
              <span className="text-gray-500">Avg Resonance:</span>
              <span className="text-star-400 ml-1">{(meshStats.avgResonance * 100).toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-500">Finalized:</span>
              <span className="text-green-400 ml-1">{meshStats.finalizedCount}</span>
            </div>
            <div>
              <span className="text-gray-500">Max Depth:</span>
              <span className="text-nebula-400 ml-1">{meshStats.maxDepth}</span>
            </div>
            <div>
              <span className="text-gray-500">TPS:</span>
              <span className="text-energy-400 ml-1">{meshStats.totalTps.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

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
                  tx.type === 'genesis' || tx.type === 'airdrop' ? 'text-warp-400' :
                  tx.type === 'level_up' ? 'text-amber-400' :
                  'text-energy-400'
                }`}>
                  {tx.type === 'mine' ? '\u26CF' :
                   tx.type === 'send' ? '\u2197' :
                   tx.type === 'genesis' || tx.type === 'airdrop' ? '\u2B21' :
                   tx.type === 'level_up' ? '\u2605' : '\u2199'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 truncate">
                    {tx.type === 'genesis' || tx.type === 'airdrop' ? 'Airdrop' :
                     tx.type === 'mine' ? 'Mining Reward' :
                     tx.type === 'level_up' ? 'Level Up Bonus' :
                     tx.type === 'streak_reward' ? 'Streak Reward' :
                     tx.type === 'send' ? `To ${shortAddress(tx.to)}` :
                     `From ${shortAddress(tx.from)}`}
                  </p>
                  <div className="flex gap-2 text-[10px] text-gray-500">
                    {tx.layer !== undefined && (
                      <span className="text-warp-400/60">{LAYER_NAMES[tx.layer]}</span>
                    )}
                    {tx.resonanceScore !== undefined && (
                      <span className="text-energy-400/60">{(tx.resonanceScore * 100).toFixed(0)}% resonance</span>
                    )}
                  </div>
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
