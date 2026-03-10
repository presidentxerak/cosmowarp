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

type MiningPhase = 'config' | 'mining' | 'result';
type EnergyLevel = 'low' | 'medium' | 'high' | 'max';

const ENERGY_LEVELS: { id: EnergyLevel; label: string; desc: string; multiplier: number; icon: string }[] = [
  { id: 'low', label: 'Basse', desc: 'Économe — hash lent, récompense x0.5', multiplier: 0.5, icon: '\u26A1' },
  { id: 'medium', label: 'Normale', desc: 'Équilibré — hash standard, récompense x1', multiplier: 1.0, icon: '\u26A1\u26A1' },
  { id: 'high', label: 'Élevée', desc: 'Intensif — hash rapide, récompense x1.5', multiplier: 1.5, icon: '\u26A1\u26A1\u26A1' },
  { id: 'max', label: 'Maximum', desc: 'Pleine puissance — hash max, récompense x2', multiplier: 2.0, icon: '\u26A1\u26A1\u26A1\u26A1' },
];

export default function MineView() {
  const { wallet, unlocked, mine, supplyInfo, marketplace } = useWallet();
  const [phase, setPhase] = useState<MiningPhase>('config');
  const [progress, setProgress] = useState<MiningProgress | null>(null);
  const [lastReward, setLastReward] = useState<number | null>(null);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<MiningHistoryEntry[]>([]);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium');
  const [certPayload, setCertPayload] = useState('');
  const [showExplainer, setShowExplainer] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const diffState = loadDifficultyState();
  const selectedEnergy = ENERGY_LEVELS.find(e => e.id === energyLevel)!;

  // Get recent Cosmorares for certification suggestions
  const recentCosmorares = (marketplace || []).slice(0, 5);

  useEffect(() => {
    setHistory(loadMiningHistory());
  }, []);

  if (!wallet) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="opacity-50">Créez un wallet pour miner des Cosmorares.</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="opacity-50">Déverrouillez votre wallet pour miner des Cosmorares.</p>
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
          setLevelUpMsg(`${levelUp.levelDef.name}: ${levelUp.levelDef.title} (+${levelUp.airdropBonus} \u03A9 bonus)`);
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

  const stopMining = useCallback(() => {
    abortRef.current?.abort();
  }, []);

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
      <div className="glass-panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">{'\u03C6'} Resonance Mining</h2>
            <p className="text-body-sm opacity-40">
              {'\u03C6'}-Chain Proof-of-Work — algorithme unique à Cosmorare. Difficulté grade Bitcoin, blocs de 10 min.
            </p>
          </div>
          <button
            onClick={() => setShowExplainer(!showExplainer)}
            className="text-[11px] opacity-40 hover:opacity-70 cursor-pointer border border-current/10 px-2 py-1 shrink-0 transition-all"
          >
            {showExplainer ? 'Masquer' : 'Pourquoi miner ?'}
          </button>
        </div>

        {showExplainer && (
          <div className="mt-3 pt-3 border-t border-current/10 space-y-2 text-[11px] opacity-40">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-current/5 p-3">
                <p className="font-bold opacity-60 mb-1">{'\u26D3'} Sécurité du réseau</p>
                <p>Chaque bloc miné renforce la chaîne de certification des Cosmorares. Le {'\u03C6'}-mixing rend chaque preuve unique et impossible à raccourcir.</p>
              </div>
              <div className="bg-current/5 p-3">
                <p className="font-bold opacity-60 mb-1">{'\u2696'} Distribution équitable</p>
                <p>Le mining est le seul moyen de créer de nouveaux {'\u03A9'}. La Resonance Decay (décroissance dorée) garantit une distribution progressive des 58M tokens minables.</p>
              </div>
              <div className="bg-current/5 p-3">
                <p className="font-bold opacity-60 mb-1">{'\u2713'} Certification des oeuvres</p>
                <p>Chaque bloc peut référencer des Cosmorares à certifier. Le mineur participe activement à l'authentification des oeuvres numériques de la galerie.</p>
              </div>
              <div className="bg-current/5 p-3">
                <p className="font-bold opacity-60 mb-1">{'\u2B06'} Progression personnelle</p>
                <p>Plus vous minez, plus votre niveau monte dans la hiérarchie. Chaque palier débloque des bonus de récompense et des privilèges exclusifs.</p>
              </div>
            </div>
            <p className="opacity-50 text-center pt-1">
              Contrairement à Bitcoin, le Resonance Mining utilise le ratio d'or ({'\u03C6'} = 1.618...) comme fondation cryptographique.
            </p>
          </div>
        )}
      </div>

      {/* ─── φ-Chain Pipeline Visualization ──────────────── */}
      <div className="glass-panel p-4">
        <p className="text-label opacity-50 mb-2">PIPELINE {'\u03C6'}-CHAIN</p>
        <div className="flex items-center gap-1 text-[10px]">
          <div className={`flex-1 p-2 text-center border transition-all ${
            phase === 'mining' && progress ? 'border-current/20 bg-current/10 opacity-80' : 'border-current/10 opacity-30'
          }`}>
            <p className="font-bold">Phase 1</p>
            <p className="opacity-70">SHA-256</p>
            <p className="opacity-50 text-[9px]">Seed hash</p>
          </div>
          <span className="opacity-30 shrink-0">{'\u2192'}</span>
          <div className={`flex-1 p-2 text-center border transition-all ${
            phase === 'mining' && progress ? 'border-current/20 bg-current/10 opacity-80' : 'border-current/10 opacity-30'
          }`}>
            <p className="font-bold">Phase 2</p>
            <p className="opacity-70">{'\u03C6'}-Resonance</p>
            <p className="opacity-50 text-[9px]">Golden mixing</p>
          </div>
          <span className="opacity-30 shrink-0">{'\u2192'}</span>
          <div className={`flex-1 p-2 text-center border transition-all ${
            phase === 'mining' && progress ? 'border-current/20 bg-current/10 opacity-80' : 'border-current/10 opacity-30'
          }`}>
            <p className="font-bold">Phase 3</p>
            <p className="opacity-70">SHA-256</p>
            <p className="opacity-50 text-[9px]">Proof hash</p>
          </div>
          <span className="opacity-30 shrink-0">{'\u2192'}</span>
          <div className={`flex-1 p-2 text-center border transition-all ${
            phase === 'result' ? 'border-current/20 bg-current/10 opacity-80' : 'border-current/10 opacity-30'
          }`}>
            <p className="font-bold">{'\u2713'}</p>
            <p className="opacity-70">Difficultét</p>
            <p className="opacity-50 text-[9px]">{diffState.currentDifficulty} bits</p>
          </div>
        </div>
      </div>

      {/* ─── Stats Dashboard ─────────────────────────────── */}
      <div className="glass-panel p-4">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
          <div className="bg-current/5 p-2">
            <p className="text-label opacity-40">DIFFICULTÉ</p>
            <p className="text-base font-bold opacity-80">{diffState.currentDifficulty} bits</p>
          </div>
          <div className="bg-current/5 p-2">
            <p className="text-label opacity-40">BLOC</p>
            <p className="text-base font-bold opacity-80">#{diffState.blocksMined}</p>
          </div>
          <div className="bg-current/5 p-2">
            <p className="text-label opacity-40">RÉCOMPENSE</p>
            <p className="text-base font-bold opacity-80">{supplyInfo?.currentReward.toFixed(2) || '50.00'} {'\u03A9'}</p>
          </div>
          <div className="bg-current/5 p-2">
            <p className="text-label opacity-40">MULTIPLICATEUR</p>
            <p className="text-base font-bold opacity-80">{wallet.rewardMultiplier}x</p>
          </div>
          <div className="bg-current/5 p-2">
            <p className="text-label opacity-40">ÉPOQUE</p>
            <p className="text-base font-bold opacity-80">{supplyInfo?.currentEpoch || 0}</p>
          </div>
        </div>

        {/* Difficulty visualization */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-label opacity-50">CIBLE</p>
            <p className="text-label opacity-30 font-mono">
              {'0'.repeat(Math.floor(diffState.currentDifficulty / 4))}
              <span className="opacity-40">{'f'.repeat(Math.max(0, 16 - Math.floor(diffState.currentDifficulty / 4)))}</span>
              <span className="opacity-30">...</span>
            </p>
          </div>
          <div className="w-full h-1.5 bg-current/5 overflow-hidden">
            <div
              className="h-full bg-current/30 transition-all duration-300"
              style={{ width: `${(diffState.currentDifficulty / 64) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-label opacity-30 mt-0.5">
            <span>16 bits (min)</span>
            <span>64 bits (max)</span>
          </div>
          <p className="text-[10px] opacity-30 mt-1 text-center">
            ~{(Math.pow(2, diffState.currentDifficulty)).toLocaleString()} hashes en moyenne pour résoudre un bloc
          </p>
        </div>
      </div>

      {/* ─── Phase: Configuration ────────────────────────── */}
      {phase === 'config' && (
        <div className="glass-panel p-5 space-y-4">
          <h3 className="text-base font-bold opacity-70">Configuration du minage</h3>

          {/* Energy Level Selection */}
          <div>
            <label className="text-[10px] opacity-50 block mb-2 uppercase tracking-wider">Niveau d'énergie</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {ENERGY_LEVELS.map(e => (
                <button
                  key={e.id}
                  onClick={() => setEnergyLevel(e.id)}
                  className={`py-3 px-2 text-[11px] font-medium transition-all cursor-pointer text-center ${
                    energyLevel === e.id
                      ? 'bg-current/10 border border-current/20 opacity-90'
                      : 'border border-current/10 opacity-40 hover:opacity-60 hover:border-current/15'
                  }`}
                >
                  <div className="text-base mb-0.5">{e.icon}</div>
                  <div className="font-bold">{e.label}</div>
                  <div className="text-[9px] opacity-60 mt-0.5">x{e.multiplier} reward</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] opacity-30 mt-1.5">{selectedEnergy.desc}</p>
          </div>

          {/* Certification Payload */}
          <div>
            <label className="text-[10px] opacity-50 block mb-1.5 uppercase tracking-wider">Certification payload</label>
            <p className="text-[10px] opacity-30 mb-2">Référencez des Cosmorares à certifier dans ce bloc. Votre preuve de travail renforce leur authenticité.</p>
            <input
              type="text"
              placeholder="ID ou titre de Cosmorare à certifier..."
              value={certPayload}
              onChange={e => setCertPayload(e.target.value.slice(0, 120))}
              className="warp-input w-full text-body-sm py-2"
              maxLength={120}
            />
            {recentCosmorares.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {recentCosmorares.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setCertPayload(prev => {
                      const newVal = prev ? `${prev}, ${w.title}` : w.title;
                      return newVal.slice(0, 120);
                    })}
                    className="text-[9px] opacity-30 hover:opacity-60 border border-current/10 px-1.5 py-0.5 cursor-pointer transition-all truncate max-w-[120px]"
                  >
                    + {w.title}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] opacity-30 mt-0.5">{certPayload.length}/120</p>
          </div>

          {/* Estimated Reward Preview */}
          <div className="bg-current/5 border border-current/10 p-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] opacity-40 uppercase">Récompense estimée</p>
              <p className="text-base font-bold opacity-80">
                ~{((supplyInfo?.currentReward || 50) * selectedEnergy.multiplier * wallet.rewardMultiplier).toFixed(2)} {'\u03A9'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] opacity-40 uppercase">Calcul</p>
              <p className="text-[10px] opacity-50">
                {supplyInfo?.currentReward.toFixed(2) || '50.00'} x {selectedEnergy.multiplier} x {wallet.rewardMultiplier}
              </p>
            </div>
          </div>

          {/* Start Button */}
          <button
            className="warp-button w-full py-3 text-base font-bold"
            onClick={startMining}
          >
            {'\u03C6'} Lancer le Resonance Mining
          </button>

          {error && (
            <p className="text-body-sm opacity-70 text-center">{error}</p>
          )}
        </div>
      )}

      {/* ─── Phase: Mining in Progress ───────────────────── */}
      {phase === 'mining' && (
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold opacity-70">{'\u03C6'} Resonance Mining en cours...</h3>
            <span className="text-[10px] opacity-40 bg-current/5 px-2 py-1">x{selectedEnergy.multiplier}</span>
          </div>

          {/* Live metrics */}
          <div className="grid grid-cols-2 gap-2 text-body-sm">
            <div className="bg-current/5 p-2.5">
              <p className="opacity-40 text-label">{'\u03C6'}-HASHRATE</p>
              <p className="opacity-80 font-mono font-bold text-base">
                {formatHashrate(progress?.hashrate || 0)}
              </p>
            </div>
            <div className="bg-current/5 p-2.5">
              <p className="opacity-40 text-label">{'\u03C6'}-CHAINS</p>
              <p className="opacity-80 font-mono font-bold text-base">
                {(progress?.hashesComputed || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-current/5 p-2.5">
              <p className="opacity-40 text-label">NONCE</p>
              <p className="opacity-70 font-mono">
                {(progress?.currentNonce || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-current/5 p-2.5">
              <p className="opacity-40 text-label">TEMPS ÉCOULÉ</p>
              <p className="opacity-70 font-mono">
                {formatTime(progress?.elapsed || 0)}
              </p>
            </div>
          </div>

          {/* Best hash progress */}
          {progress && (
            <div>
              <div className="flex justify-between text-label mb-1">
                <span className="opacity-40">MEILLEUR HASH ({progress.bestZeroBits}/{progress.targetBits} bits)</span>
                <span className="opacity-40">{Math.round((progress.bestZeroBits / progress.targetBits) * 100)}%</span>
              </div>
              <div className="bg-current/5 p-2 font-mono text-label break-all">
                <span className="opacity-80">
                  {progress.bestHash.slice(0, Math.floor(progress.bestZeroBits / 4))}
                </span>
                <span className="opacity-40">
                  {progress.bestHash.slice(Math.floor(progress.bestZeroBits / 4))}
                </span>
              </div>
              <div className="w-full h-2 bg-current/5 mt-1 overflow-hidden">
                <div
                  className="h-full bg-current/30 transition-all duration-200"
                  style={{ width: `${Math.min(100, (progress.bestZeroBits / progress.targetBits) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] opacity-30 mt-1 text-center">
                {'\u03C6'}-Chain : SHA-256 {'\u2192'} Golden Mixing {'\u2192'} SHA-256 {'\u2192'} test {diffState.currentDifficulty} bits
              </p>
            </div>
          )}

          {/* Stop button */}
          <button
            className="w-full py-3 text-base font-medium bg-current/5 border border-current/15 opacity-70 hover:bg-current/10 transition-colors cursor-pointer"
            onClick={stopMining}
          >
            {'\u25A0'} Arrêter le minage
          </button>
        </div>
      )}

      {/* ─── Phase: Result ───────────────────────────────── */}
      {phase === 'result' && lastReward !== null && (
        <div className="glass-panel p-5 space-y-4">
          <div className="text-center py-3">
            <p className="text-3xl mb-2">{'\u03C6'}</p>
            <h3 className="text-title-sm font-bold opacity-100 font-title">Resonance Bloc miné !</h3>
            <div className="text-3xl font-bold opacity-100 mt-2">
              +{lastReward} {'\u03A9'}
            </div>
            <p className="text-body-sm opacity-40 mt-1">
              Énergie {selectedEnergy.label} — Multiplicateur x{selectedEnergy.multiplier}
            </p>
            {levelUpMsg && (
              <div className="mt-3 p-3 bg-current/5 border border-current/15">
                <p className="opacity-70 font-bold text-body-sm">{'\u2605'} LEVEL UP! {levelUpMsg}</p>
              </div>
            )}
          </div>

          {/* Block details */}
          {lastHash && (
            <div className="space-y-2">
              <div>
                <p className="text-label opacity-40 mb-1">{'\u03C6'}-PROOF HASH</p>
                <div className="bg-current/5 p-2 font-mono text-label break-all">
                  <span className="opacity-80">
                    {lastHash.slice(0, Math.floor(diffState.currentDifficulty / 4))}
                  </span>
                  <span className="opacity-50">
                    {lastHash.slice(Math.floor(diffState.currentDifficulty / 4))}
                  </span>
                </div>
              </div>

              {progress && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-current/5 p-2">
                    <p className="text-label opacity-40">TEMPS</p>
                    <p className="text-body-sm font-bold opacity-70">{formatTime(progress.elapsed)}</p>
                  </div>
                  <div className="bg-current/5 p-2">
                    <p className="text-label opacity-40">{'\u03C6'}-HASHRATE</p>
                    <p className="text-body-sm font-bold opacity-70">{formatHashrate(progress.hashrate)}</p>
                  </div>
                  <div className="bg-current/5 p-2">
                    <p className="text-label opacity-40">{'\u03C6'}-CHAINS</p>
                    <p className="text-body-sm font-bold opacity-70">{progress.hashesComputed.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {certPayload && (
                <div className="bg-current/5 p-2 text-center">
                  <p className="text-label opacity-40 mb-0.5">COSMORARES CERTIFIÉES</p>
                  <p className="text-body-sm opacity-60 italic">"{certPayload}"</p>
                </div>
              )}
            </div>
          )}

          {/* Contribution feedback */}
          <div className="bg-current/5 border border-current/10 p-3 text-[11px] opacity-40 text-center space-y-1">
            <p>Ce bloc Resonance renforce la chaîne de certification Cosmorare.</p>
            <p>Preuve {'\u03C6'}-Chain : SHA-256 {'\u2192'} Golden Mixing ({'\u03C6'} = 1.618...) {'\u2192'} SHA-256</p>
            {certPayload && <p>Les Cosmorares référencées bénéficient d'une authentification renforcée.</p>}
          </div>

          <button
            className="warp-button w-full py-3 text-base font-bold"
            onClick={resetToConfig}
          >
            {'\u03C6'} Miner un nouveau bloc
          </button>
        </div>
      )}

      {/* ─── Mining History ─────────────────────────────── */}
      {history.length > 0 && (
        <div className="glass-panel p-4">
          <h3 className="text-base font-bold opacity-70 mb-2">{'\u25B7'} Historique Resonance</h3>
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

      {/* ─── How φ-Chain Resonance Mining Works ──────────── */}
      <div className="glass-panel p-4">
        <h3 className="text-base font-bold opacity-70 mb-2">Comment fonctionne le {'\u03C6'}-Chain Resonance Mining</h3>
        <div className="text-[11px] opacity-40 space-y-2">
          <div className="bg-current/5 border border-current/10 p-2 mb-2 text-center">
            <p className="font-bold opacity-60">Algorithme unique à Cosmorare — difficulté comparable à Bitcoin mais fondé sur le nombre d'or ({'\u03C6'})</p>
          </div>
          <div className="flex gap-2">
            <span className="opacity-60 font-bold shrink-0">1.</span>
            <p><span className="font-bold opacity-60">Phase SEED :</span> Un en-tête de bloc est construit (hash précédent, timestamp, difficulté, hauteur, adresse, certification payload) et passé par <span className="opacity-80 font-mono">SHA-256</span> pour produire le seed hash.</p>
          </div>
          <div className="flex gap-2">
            <span className="opacity-60 font-bold shrink-0">2.</span>
            <p><span className="font-bold opacity-60">Phase RESONANCE ({'\u03C6'}) :</span> Le seed hash est transformé par le {'\u03C6'}-mixing : chaque octet est XOR avec une clé dérivée de l'angle d'or ({'\u2248'}137.5°), puis les octets sont permutés selon la spirale dorée, puis chaînés pour créer un effet d'avalanche. Cette transformation est déterministe mais non raccourcissable.</p>
          </div>
          <div className="flex gap-2">
            <span className="opacity-60 font-bold shrink-0">3.</span>
            <p><span className="font-bold opacity-60">Phase PROOF :</span> Les données résonantes passent par un second <span className="opacity-80 font-mono">SHA-256</span> pour produire le hash final. Ce hash doit avoir {diffState.currentDifficulty}+ zéros en tête ({'\u2248'}{(Math.pow(2, diffState.currentDifficulty)).toLocaleString()} essais en moyenne).</p>
          </div>
          <div className="flex gap-2">
            <span className="opacity-60 font-bold shrink-0">4.</span>
            <p><span className="font-bold opacity-60">Certification :</span> Les Cosmorares référencées dans le payload sont liées cryptographiquement au bloc. La preuve de travail renforce leur authenticité — plus un objet est référencé dans des blocs, plus sa certification est solide.</p>
          </div>
          <div className="flex gap-2">
            <span className="opacity-60 font-bold shrink-0">5.</span>
            <p><span className="font-bold opacity-60">Ajustement :</span> La difficulté cible ~10 minutes par bloc. Ajustement tous les 10 blocs, cappé à x4 max par période. Récompense via Resonance Decay ({'\u03C6'}<sup>-n</sup>) — décroissance dorée continue, pas de halving brutal.</p>
          </div>

          <div className="mt-3 pt-2 border-t border-current/10 opacity-50">
            <p className="font-bold mb-1">Différences avec Bitcoin :</p>
            <div className="space-y-0.5">
              <p>• Bitcoin : SHA-256(SHA-256(x)) — double hash identique</p>
              <p>• Cosmorare : SHA-256(x) {'\u2192'} {'\u03C6'}-Resonance Mix {'\u2192'} SHA-256(mixed) — transformation dorée intermédiaire</p>
              <p>• Bitcoin : halving brutal tous les 210,000 blocs</p>
              <p>• Cosmorare : Resonance Decay continue ({'\u03C6'}<sup>-totalMined/5M</sup>) — courbe lisse et prévisible</p>
              <p>• Bitcoin : blocs sans contexte applicatif</p>
              <p>• Cosmorare : chaque bloc peut certifier des oeuvres numériques</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
