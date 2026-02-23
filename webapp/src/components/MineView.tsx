import { useState, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { runMiningProgram, MINING_PROGRAMS } from '../engine/miner';

type Difficulty = 'basic' | 'crypto' | 'deep';

const DIFFICULTY_INFO: Record<Difficulty, { label: string; reward: string; color: string }> = {
  basic: { label: 'Basic', reward: 'Low', color: 'text-energy-400' },
  crypto: { label: 'Crypto', reward: 'Medium', color: 'text-warp-400' },
  deep: { label: 'Deep', reward: 'High', color: 'text-star-400' },
};

interface MiningLog {
  text: string;
  type: 'info' | 'success' | 'energy' | 'level_up';
}

export default function MineView() {
  const { wallet, unlocked, mine, supplyInfo } = useWallet();
  const [difficulty, setDifficulty] = useState<Difficulty>('basic');
  const [mining, setMining] = useState(false);
  const [logs, setLogs] = useState<MiningLog[]>([]);
  const [lastReward, setLastReward] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  if (!wallet) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="text-gray-400">Create a wallet first to mine Warps.</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="text-gray-400">Unlock your wallet to mine Warps.</p>
      </div>
    );
  }

  const addLog = (text: string, type: MiningLog['type'] = 'info') => {
    setLogs(prev => [...prev, { text, type }]);
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  };

  const startMining = async () => {
    setMining(true);
    setLogs([]);
    setLastReward(null);

    const program = MINING_PROGRAMS[difficulty];

    addLog(`\u25B6 Starting ${difficulty} mining program...`);
    addLog(`\u229A Loading CosmoASM bytecode...`);

    await new Promise(r => setTimeout(r, 400));
    addLog('\u26A1 Executing Planck cycles...');

    await new Promise(r => setTimeout(r, 300));
    const result = runMiningProgram(program);

    addLog(`\u2699 Cycles: ${result.cycles} | Energy: ${result.energy.toFixed(1)}`);
    addLog(`\u25C8 Hash: ${result.hash.toFixed(8)}`, 'energy');

    if (result.output.length > 0) {
      addLog(`\u25CE Output: [${result.output.map(v => typeof v === 'number' ? v.toFixed(4) : v).join(', ')}]`);
    }

    await new Promise(r => setTimeout(r, 200));
    addLog('\u229A Submitting to CosmoMesh DAG...');
    addLog(`\u229A Reward multiplier: ${wallet.rewardMultiplier}x (Level: ${wallet.levelName})`);

    if (result.success) {
      try {
        const { tx, levelUp } = await mine(result.energy, result.cycles);
        setLastReward(tx.amount);
        addLog(`\u229A Ed25519 signature generated`, 'energy');
        addLog(`\u229A Resonance Consensus: validated`, 'energy');
        addLog(`\u229A Resonance Decay applied`, 'energy');
        addLog(`\u2713 Mining complete! Reward: +${tx.amount} \u03A9`, 'success');

        if (levelUp) {
          addLog(`\u2605 LEVEL UP! ${levelUp.levelDef.name}: ${levelUp.levelDef.title} (+${levelUp.airdropBonus} \u03A9 bonus)`, 'level_up');
        }
      } catch (err) {
        addLog(`\u2717 Mining failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'info');
      }
    } else {
      addLog('\u2717 Mining failed: cycle limit reached', 'info');
    }

    setMining(false);
  };

  return (
    <div className="space-y-4">
      {/* Mining Control */}
      <div className="glass-panel p-5">
        <h2 className="text-lg font-bold text-gray-100 mb-1 font-title">{'\u26CF'} Warp Mining</h2>
        <p className="text-xs text-gray-500 mb-2">
          Execute CosmoCode programs to mine Warps via proof-of-computation.
        </p>
        <div className="flex gap-3 text-[10px] text-gray-500 mb-4 flex-wrap">
          <span>Current Reward: <span className="text-energy-400">{supplyInfo?.currentReward.toFixed(2) || '50.00'} {'\u03A9'}</span></span>
          <span>Your Multiplier: <span className="text-star-400">{wallet.rewardMultiplier}x</span></span>
          <span>Epoch: <span className="text-warp-400">{supplyInfo?.currentEpoch || 0}</span></span>
        </div>

        {/* Difficulty Selector */}
        <div className="mb-4">
          <p className="text-[10px] text-gray-400 mb-2">DIFFICULTY</p>
          <div className="flex gap-2">
            {(Object.keys(DIFFICULTY_INFO) as Difficulty[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 px-3 rounded-none text-xs font-medium transition-all cursor-pointer ${
                  difficulty === d
                    ? 'bg-warp-500/30 border border-warp-500/50 text-warp-300'
                    : 'bg-cosmic-900/40 border border-gray-700/30 text-gray-400 hover:text-gray-200'
                }`}
              >
                <div className="font-bold">{DIFFICULTY_INFO[d].label}</div>
                <div className={`text-[10px] ${DIFFICULTY_INFO[d].color}`}>
                  {DIFFICULTY_INFO[d].reward}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          className="warp-button w-full py-3 text-base"
          onClick={startMining}
          disabled={mining}
        >
          {mining ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-warp-300/30 border-t-warp-300 rounded-none animate-spin" />
              Mining...
            </span>
          ) : (
            <>{'\u26A1'} Start Mining</>
          )}
        </button>

        {lastReward !== null && !mining && (
          <div className="mt-3 text-center p-3 rounded-none bg-green-500/10 border border-green-500/30">
            <span className="text-green-400 font-bold">+{lastReward} {'\u03A9'}</span>
            <span className="text-green-400/70 text-xs ml-2">mined successfully</span>
          </div>
        )}
      </div>

      {/* Mining Log */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-2">{'\u25B7'} Mining Log</h3>
        <div
          ref={logRef}
          className="bg-cosmic-900/80 rounded-none p-3 h-48 overflow-y-auto text-xs space-y-1"
        >
          {logs.length === 0 ? (
            <p className="text-gray-600">Waiting for mining operation...</p>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={
                log.type === 'success' ? 'text-green-400' :
                log.type === 'energy' ? 'text-energy-400' :
                log.type === 'level_up' ? 'text-amber-400 font-bold' :
                'text-gray-400'
              }>
                {log.text}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Program Preview */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-2">CosmoASM Source</h3>
        <pre className="bg-cosmic-900/80 rounded-none p-3 text-[11px] text-gray-400 overflow-x-auto max-h-48 overflow-y-auto">
          {MINING_PROGRAMS[difficulty]}
        </pre>
      </div>
    </div>
  );
}
