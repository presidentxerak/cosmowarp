import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { useWallet } from '../context/WalletContext';
import InfoTooltip from './InfoTooltip';
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

type MiningPhase = 'config' | 'mining' | 'result';
type EnergyLevel = 'low' | 'medium' | 'high' | 'max';

const BoltIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;

const ENERGY_LEVELS: { id: EnergyLevel; label: string; desc: string; multiplier: number; icon: ReactNode }[] = [
  { id: 'low', label: 'Basse', desc: 'Économe — hash lent, récompense x0.5', multiplier: 0.5, icon: <BoltIcon /> },
  { id: 'medium', label: 'Normale', desc: 'Équilibré — hash standard, récompense x1', multiplier: 1.0, icon: <><BoltIcon /><BoltIcon /></> },
  { id: 'high', label: 'Élevée', desc: 'Intensif — hash rapide, récompense x1.5', multiplier: 1.5, icon: <><BoltIcon /><BoltIcon /><BoltIcon /></> },
  { id: 'max', label: 'Maximum', desc: 'Pleine puissance — hash max, récompense x2', multiplier: 2.0, icon: <><BoltIcon /><BoltIcon /><BoltIcon /><BoltIcon /></> },
];

export default function MineView() {
  const { wallet, unlocked, mine, supplyInfo, marketplace } = useWallet();
  const [phase, setPhase] = useState<MiningPhase>('config');
  const [progress, setProgress] = useState<MiningProgress | null>(null);
  const [lastReward, setLastReward] = useState<number | null>(null);
  const [, setLastHash] = useState<string | null>(null);
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<MiningHistoryEntry[]>([]);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium');
  const [certPayload, setCertPayload] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const stopMining = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const diffState = loadDifficultyState();
  const selectedEnergy = ENERGY_LEVELS.find(e => e.id === energyLevel)!;

  // Get recent Strangrz for certification suggestions
  const recentStrangrz = (marketplace || []).slice(0, 5);

  useEffect(() => {
    setHistory(loadMiningHistory());
  }, []);

  if (!wallet) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="opacity-50">Créez un wallet pour miner des Strangrz.</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="opacity-50">Déverrouillez votre wallet pour miner des Strangrz.</p>
      </div>
    );
  }

  const startMining = async () => {
    setPhase('mining');
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
        certPayload || undefined,
      );

      if (result.success && result.proof) {
        const { tx, levelUp } = await mine(result.proof);
        const adjustedReward = Math.round(tx.amount * selectedEnergy.multiplier * 100) / 100;
        setLastReward(adjustedReward);
        setLastHash(result.proof.hash);

        const entry: MiningHistoryEntry = {
          hash: result.proof.hash,
          nonce: result.proof.nonce,
          difficulty: result.proof.difficulty,
          hashrate: result.hashrate,
          timeTaken: result.proof.timeTaken,
          reward: adjustedReward,
          timestamp: Date.now(),
        };
        addMiningHistory(entry);
        setHistory(loadMiningHistory());

        if (levelUp) {
          setLevelUpMsg(`${levelUp.levelDef.name}: ${levelUp.levelDef.title} (+${levelUp.airdropBonus} \u2B23 bonus)`);
        }

        setPhase('result');
      } else if (result.aborted) {
        setError('Mining arrêté');
        setPhase('config');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mining échoué');
      setPhase('config');
    }

    abortRef.current = null;
  };

  const resetToConfig = () => {
    setPhase('config');
    setLastReward(null);
    setLastHash(null);
    setError(null);
    setCertPayload('');
  };

  return (
    <div className="space-y-4">
      {/* ─── Header: φ-Chain Resonance Mining ────────────── */}
      <div className="glass-panel p-5">
        <div className="flex items-center gap-3">
          <h2 className="text-title-lg font-bold font-title flex-1">{'\u03C6'} Resonance Mining</h2>
          <InfoTooltip text="Proof-of-Work basé sur le ratio d'or (φ = 1.618). Minez pour créer des ⬣, certifier des oeuvres et monter en niveau. Difficulté grade Bitcoin, blocs de 10 min." align="right" />
        </div>
      </div>

      {/* ─── Stats Dashboard (simplified) ──────────────── */}

      <div className="glass-panel p-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-current/5 p-3">
            <p className="text-label opacity-50 flex items-center justify-center gap-1">DIFFICULTÉ <InfoTooltip text={`${diffState.currentDifficulty} bits — ~${(Math.pow(2, diffState.currentDifficulty)).toLocaleString()} hashes pour résoudre un bloc`} /></p>
            <p className="text-body-lg font-bold opacity-90">{diffState.currentDifficulty} bits</p>
          </div>
          <div className="bg-current/5 p-3">
            <p className="text-label opacity-50">RÉCOMPENSE</p>
            <p className="text-body-lg font-bold opacity-90">{supplyInfo?.currentReward.toFixed(2) || '50.00'} {'\u2B23'}</p>
          </div>
          <div className="bg-current/5 p-3">
            <p className="text-label opacity-50 flex items-center justify-center gap-1">BLOC <InfoTooltip text={`Époque ${supplyInfo?.currentEpoch || 0} — Multiplicateur x${wallet.rewardMultiplier}`} /></p>
            <p className="text-body-lg font-bold opacity-90">#{diffState.blocksMined}</p>
          </div>
        </div>
      </div>

      {/* ─── Phase: Configuration ────────────────────────── */}
      {phase === 'config' && (
        <div className="glass-panel p-5 space-y-5">
          <h3 className="text-title-md font-bold font-title flex items-center gap-2">
            Configuration
            <InfoTooltip text="Choisissez votre niveau d'énergie et optionnellement des Strangrz à certifier dans ce bloc." />
          </h3>

          {/* Energy Level Selection */}
          <div>
            <p className="text-label opacity-50 mb-2">ÉNERGIE</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ENERGY_LEVELS.map(e => (
                <button
                  key={e.id}
                  onClick={() => setEnergyLevel(e.id)}
                  className={`py-3 px-3 text-body-sm font-medium transition-all cursor-pointer text-center ${
                    energyLevel === e.id
                      ? 'bg-current/10 border border-current/20 opacity-100'
                      : 'border border-current/10 opacity-40 hover:opacity-70 hover:border-current/15'
                  }`}
                >
                  <div className="text-body-lg mb-0.5">{e.icon}</div>
                  <div className="font-bold">{e.label}</div>
                  <div className="text-label opacity-60 mt-0.5">x{e.multiplier}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Certification Payload (simplified) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-label opacity-50">CERTIFICATION</p>
              <InfoTooltip text="Référencez des Strangrz à certifier dans ce bloc. Votre preuve de travail renforce leur authenticité." />
            </div>
            <input
              type="text"
              placeholder="ID ou titre de Strangrz à certifier..."
              value={certPayload}
              onChange={e => setCertPayload(e.target.value.slice(0, 120))}
              className="warp-input w-full"
              maxLength={120}
            />
            {recentStrangrz.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {recentStrangrz.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setCertPayload(prev => {
                      const newVal = prev ? `${prev}, ${w.title}` : w.title;
                      return newVal.slice(0, 120);
                    })}
                    className="text-body-sm opacity-40 hover:opacity-70 border border-current/10 px-2 py-1 cursor-pointer transition-all truncate max-w-[140px]"
                  >
                    + {w.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Estimated Reward */}
          <div className="bg-current/5 border border-current/10 p-4 text-center">
            <p className="text-label opacity-50 mb-1">RÉCOMPENSE ESTIMÉE</p>
            <p className="text-title-md font-bold opacity-90">
              ~{((supplyInfo?.currentReward || 50) * selectedEnergy.multiplier * wallet.rewardMultiplier).toFixed(2)} {'\u2B23'}
            </p>
          </div>

          {/* Start Button */}
          <button
            className="warp-button w-full py-4 font-bold"
            onClick={startMining}
          >
            {'\u03C6'} Lancer le Mining
          </button>

          {error && (
            <p className="text-body-md opacity-70 text-center">{error}</p>
          )}
        </div>
      )}

      {/* ─── Phase: Mining in Progress ───────────────────── */}
      {phase === 'mining' && (
        <div className="glass-panel p-5 space-y-4">
          <h3 className="text-title-md font-bold font-title">{'\u03C6'} Mining en cours...</h3>

          {/* Live metrics — essentials only */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-current/5 p-3">
              <p className="text-label opacity-50">HASHRATE</p>
              <p className="text-body-lg font-mono font-bold opacity-90">
                {formatHashrate(progress?.hashrate || 0)}
              </p>
            </div>
            <div className="bg-current/5 p-3">
              <p className="text-label opacity-50">TEMPS</p>
              <p className="text-body-lg font-mono font-bold opacity-90">
                {formatTime(progress?.elapsed || 0)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {progress && (
            <div>
              <div className="flex justify-between text-body-sm mb-1">
                <span className="opacity-50">Progression</span>
                <span className="opacity-70 font-bold">{Math.round((progress.bestZeroBits / progress.targetBits) * 100)}%</span>
              </div>
              <div className="w-full h-3 bg-current/5 overflow-hidden">
                <div
                  className="h-full bg-current/30 transition-all duration-200"
                  style={{ width: `${Math.min(100, (progress.bestZeroBits / progress.targetBits) * 100)}%` }}
                />
              </div>
              <p className="text-label opacity-40 mt-1 text-center">
                {(progress.hashesComputed || 0).toLocaleString()} hashes — {progress.bestZeroBits}/{progress.targetBits} bits
              </p>
            </div>
          )}

          <button
            className="warp-button w-full py-4 font-bold"
            onClick={stopMining}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> Arrêter le minage
          </button>
        </div>
      )}

      {/* ─── Phase: Result ───────────────────────────────── */}
      {phase === 'result' && lastReward !== null && (
        <div className="glass-panel p-5 space-y-4">
          <div className="text-center py-4">
            <p className="text-title-xl mb-2">{'\u03C6'}</p>
            <h3 className="text-title-lg font-bold font-title">Bloc miné !</h3>
            <div className="text-title-xl font-bold mt-3">
              +{lastReward} {'\u2B23'}
            </div>
            {levelUpMsg && (
              <div className="mt-4 p-3 bg-current/5 border border-current/15">
                <p className="text-body-md font-bold opacity-80"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline', verticalAlign: 'middle' }}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg> LEVEL UP! {levelUpMsg}</p>
              </div>
            )}
          </div>

          {/* Compact stats row */}
          {progress && (
            <div className="flex justify-center gap-6 text-body-sm opacity-60">
              <span>{formatTime(progress.elapsed)}</span>
              <span>{formatHashrate(progress.hashrate)}</span>
              <span>{progress.hashesComputed.toLocaleString()} hashes</span>
            </div>
          )}

          {certPayload && (
            <p className="text-body-sm opacity-50 text-center italic">Certifié : "{certPayload}"</p>
          )}

          <button
            className="warp-button w-full py-4 font-bold"
            onClick={resetToConfig}
          >
            {'\u03C6'} Miner un nouveau bloc
          </button>
        </div>
      )}

      {/* ─── Mining History (simplified) ────────────────── */}
      {history.length > 0 && (
        <div className="glass-panel p-5">
          <h3 className="text-title-sm font-bold font-title mb-3 flex items-center gap-2">
            Historique
            <InfoTooltip text="Vos 10 derniers blocs minés avec temps, hashrate et récompense." />
          </h3>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {history.slice(0, 10).map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-body-sm py-2 border-b border-current/10 last:border-0">
                <span className="opacity-50">#{diffState.blocksMined - i}</span>
                <span className="opacity-50">{formatTime(entry.timeTaken)}</span>
                <span className="font-bold opacity-90">+{entry.reward} {'\u2B23'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
