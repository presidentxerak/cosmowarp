import { useState, useRef, useCallback, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import {
  mineBlock,
  loadDifficultyState,
  loadMiningHistory,
  addMiningHistory,
  type MiningProgress,
  type MiningHistoryEntry,
} from '../engine/miner';

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatHashrate(h: number): string {
  if (h < 1000) return `${h} H/s`;
  if (h < 1_000_000) return `${(h / 1000).toFixed(1)} kH/s`;
  return `${(h / 1_000_000).toFixed(2)} MH/s`;
}

export default function MineView() {
  const { wallet, unlocked, mine, supplyInfo } = useWallet();
  const [mining, setMining] = useState(false);
  const [progress, setProgress] = useState<MiningProgress | null>(null);
  const [lastReward, setLastReward] = useState<number | null>(null);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<MiningHistoryEntry[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const diffState = loadDifficultyState();

  useEffect(() => {
    setHistory(loadMiningHistory());
  }, []);

  if (!wallet) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="opacity-50">Create a wallet first to mine Warps.</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="opacity-50">Unlock your wallet to mine Warps.</p>
      </div>
    );
  }

  const startMining = async () => {
    setMining(true);
    setProgress(null);
    setLastReward(null);
    setLastHash(null);
    setLevelUpMsg(null);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await mineBlock(
        wallet.address,
        controller.signal,
        (p) => setProgress(p),
      );

      if (result.success && result.proof) {
        const { tx, levelUp } = await mine(result.proof);
        setLastReward(tx.amount);
        setLastHash(result.proof.hash);

        const entry: MiningHistoryEntry = {
          hash: result.proof.hash,
          nonce: result.proof.nonce,
          difficulty: result.proof.difficulty,
          hashrate: result.hashrate,
          timeTaken: result.proof.timeTaken,
          reward: tx.amount,
          timestamp: Date.now(),
        };
        addMiningHistory(entry);
        setHistory(loadMiningHistory());

        if (levelUp) {
          setLevelUpMsg(`${levelUp.levelDef.name}: ${levelUp.levelDef.title} (+${levelUp.airdropBonus} \u03A9 bonus)`);
        }
      } else if (result.aborted) {
        setError('Mining stopped');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mining failed');
    }

    setMining(false);
    abortRef.current = null;
  };

  const stopMining = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <div className="space-y-4">
      {/* Mining Control */}
      <div className="glass-panel p-5">
        <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">{'\u26CF'} Warp Mining</h2>
        <p className="text-body-sm opacity-40 mb-3">
          Real SHA-256 Proof-of-Work. Find a nonce where hash &lt; difficulty target.
        </p>

        {/* Stats bar */}
        <div className="flex gap-3 text-label opacity-40 mb-4 flex-wrap">
          <span>Difficulty: <span className="opacity-80">{diffState.currentDifficulty} bits</span></span>
          <span>Block: <span className="opacity-80">#{diffState.blocksMined}</span></span>
          <span>Reward: <span className="opacity-80">{supplyInfo?.currentReward.toFixed(2) || '50.00'} {'\u03A9'}</span></span>
          <span>Multiplier: <span className="opacity-80">{wallet.rewardMultiplier}x</span></span>
          <span>Epoch: <span className="opacity-80">{supplyInfo?.currentEpoch || 0}</span></span>
        </div>

        {/* Difficulty visualization */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-label opacity-50">TARGET</p>
            <p className="text-label opacity-30 font-mono">
              {'0'.repeat(Math.floor(diffState.currentDifficulty / 4))}
              <span className="opacity-40">{'f'.repeat(Math.max(0, 16 - Math.floor(diffState.currentDifficulty / 4)))}</span>
              <span className="opacity-30">...</span>
            </p>
          </div>
          <div className="w-full h-1.5 bg-current/5 overflow-hidden">
            <div
              className="h-full bg-current/30 transition-all duration-300"
              style={{ width: `${(diffState.currentDifficulty / 32) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-label opacity-30 mt-0.5">
            <span>8 bits (easy)</span>
            <span>32 bits (hard)</span>
          </div>
        </div>

        {/* Mine / Stop button */}
        {!mining ? (
          <button
            className="warp-button w-full py-3 text-base"
            onClick={startMining}
          >
            {'\u26A1'} Start Mining
          </button>
        ) : (
          <button
            className="w-full py-3 text-base font-medium bg-current/5 border border-current/15 opacity-70 hover:bg-current/10 transition-colors cursor-pointer"
            onClick={stopMining}
          >
            {'\u25A0'} Stop Mining
          </button>
        )}

        {/* Success result */}
        {lastReward !== null && !mining && (
          <div className="mt-3 text-center p-3 bg-current/5 border border-current/10">
            <span className="opacity-80 font-bold">+{lastReward} {'\u03A9'}</span>
            <span className="opacity-80/70 text-body-sm ml-2">mined successfully</span>
            {levelUpMsg && (
              <p className="opacity-60 font-bold text-body-sm mt-1">{'\u2605'} LEVEL UP! {levelUpMsg}</p>
            )}
          </div>
        )}

        {/* Error */}
        {error && !mining && lastReward === null && (
          <p className="mt-2 text-body-sm opacity-70/80 text-center">{error}</p>
        )}
      </div>

      {/* Live Mining Dashboard */}
      {(mining || lastHash) && (
        <div className="glass-panel p-4">
          <h3 className="text-base font-bold opacity-70 mb-3">{mining ? '\u25B6' : '\u2713'} {mining ? 'Mining in progress...' : 'Last Block'}</h3>

          <div className="grid grid-cols-2 gap-2 text-body-sm">
            <div className="bg-current/5 p-2">
              <p className="opacity-40 text-label">HASHRATE</p>
              <p className="opacity-80 font-mono font-bold">
                {formatHashrate(progress?.hashrate || 0)}
              </p>
            </div>
            <div className="bg-current/5 p-2">
              <p className="opacity-40 text-label">HASHES</p>
              <p className="opacity-80 font-mono font-bold">
                {(progress?.hashesComputed || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-current/5 p-2">
              <p className="opacity-40 text-label">NONCE</p>
              <p className="opacity-70 font-mono">
                {(progress?.currentNonce || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-current/5 p-2">
              <p className="opacity-40 text-label">ELAPSED</p>
              <p className="opacity-70 font-mono">
                {formatTime(progress?.elapsed || 0)}
              </p>
            </div>
          </div>

          {/* Best hash progress */}
          {progress && (
            <div className="mt-3">
              <div className="flex justify-between text-label mb-1">
                <span className="opacity-40">BEST HASH ({progress.bestZeroBits}/{progress.targetBits} bits)</span>
              </div>
              <div className="bg-current/5 p-2 font-mono text-label break-all">
                <span className="opacity-80">
                  {progress.bestHash.slice(0, Math.floor(progress.bestZeroBits / 4))}
                </span>
                <span className="opacity-40">
                  {progress.bestHash.slice(Math.floor(progress.bestZeroBits / 4))}
                </span>
              </div>
              <div className="w-full h-1 bg-current/5 mt-1 overflow-hidden">
                <div
                  className="h-full bg-current/30 transition-all duration-200"
                  style={{ width: `${Math.min(100, (progress.bestZeroBits / progress.targetBits) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Winning hash */}
          {lastHash && !mining && (
            <div className="mt-3">
              <p className="text-label opacity-40 mb-1">WINNING HASH</p>
              <div className="bg-current/5 p-2 font-mono text-label break-all">
                <span className="opacity-80">
                  {lastHash.slice(0, Math.floor(diffState.currentDifficulty / 4))}
                </span>
                <span className="opacity-50">
                  {lastHash.slice(Math.floor(diffState.currentDifficulty / 4))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mining History */}
      {history.length > 0 && (
        <div className="glass-panel p-4">
          <h3 className="text-base font-bold opacity-70 mb-2">{'\u25B7'} Mining History</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {history.slice(0, 10).map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-label py-1.5 border-b border-current/10 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="opacity-30 shrink-0">#{diffState.blocksMined - i}</span>
                  <span className="opacity-50 font-mono truncate">{entry.hash.slice(0, 12)}...</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="opacity-40">{formatTime(entry.timeTaken)}</span>
                  <span className="opacity-40">{formatHashrate(entry.hashrate)}</span>
                  <span className="opacity-80 font-bold">+{entry.reward} {'\u03A9'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="glass-panel p-4">
        <h3 className="text-base font-bold opacity-70 mb-2">How PoW Mining Works</h3>
        <div className="text-[11px] opacity-40 space-y-1.5">
          <p><span className="opacity-50">1.</span> A block header is built from your address, the previous block hash, and a timestamp.</p>
          <p><span className="opacity-50">2.</span> Your browser searches for a nonce where <span className="opacity-80 font-mono">SHA-256(header + nonce)</span> produces a hash with {diffState.currentDifficulty}+ leading zero bits.</p>
          <p><span className="opacity-50">3.</span> Once found, the proof is verified cryptographically before the reward is issued.</p>
          <p><span className="opacity-50">4.</span> Difficulty adjusts every 10 blocks to target ~15s per block.</p>
        </div>
      </div>
    </div>
  );
}
