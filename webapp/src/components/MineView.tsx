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
  const { wallet, unlocked, mine, supplyInfo } = useWallet();
  const [phase, setPhase] = useState<MiningPhase>('config');
  const [progress, setProgress] = useState<MiningProgress | null>(null);
  const [lastReward, setLastReward] = useState<number | null>(null);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<MiningHistoryEntry[]>([]);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium');
  const [miningMessage, setMiningMessage] = useState('');
  const [showExplainer, setShowExplainer] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const diffState = loadDifficultyState();
  const selectedEnergy = ENERGY_LEVELS.find(e => e.id === energyLevel)!;

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
    setMiningMessage('');
  };

  return (
    <div className="space-y-4">
      {/* ─── Role Explanation Banner ─────────────────────── */}
      <div className="glass-panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title">{'\u26CF'} Cosmorare Mining</h2>
            <p className="text-body-sm opacity-40">
              Sécurisez le protocole et gagnez des {'\u03A9'} en validant des blocs par Proof-of-Work.
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
                <p>Chaque bloc miné renforce la chaîne de certification des Cosmorares. Plus il y a de mineurs, plus les certificats d'authenticité sont fiables et inaltérables.</p>
              </div>
              <div className="bg-current/5 p-3">
                <p className="font-bold opacity-60 mb-1">{'\u2696'} Distribution équitable</p>
                <p>Le mining est le seul moyen de créer de nouveaux {'\u03A9'}. La Resonance Decay (décroissance dorée) garantit une distribution progressive et prévisible des 58M tokens minables.</p>
              </div>
              <div className="bg-current/5 p-3">
                <p className="font-bold opacity-60 mb-1">{'\u2713'} Validation des transactions</p>
                <p>Les mineurs valident indirectement les transferts de Cosmorares entre collectionneurs. Votre puissance de calcul contribue à la fiabilité de chaque transaction.</p>
              </div>
              <div className="bg-current/5 p-3">
                <p className="font-bold opacity-60 mb-1">{'\u2B06'} Progression personnelle</p>
                <p>Plus vous minez, plus votre niveau monte dans la hiérarchie Cosmorare. Chaque palier débloque des bonus de récompense et des privilèges exclusifs.</p>
              </div>
            </div>
            <p className="opacity-50 text-center pt-1">
              Le mining utilise SHA-256 Proof-of-Work réel dans votre navigateur — même algorithme que Bitcoin.
            </p>
          </div>
        )}
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
              style={{ width: `${(diffState.currentDifficulty / 32) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-label opacity-30 mt-0.5">
            <span>8 bits (facile)</span>
            <span>32 bits (difficile)</span>
          </div>
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

          {/* Mining Message (optional) */}
          <div>
            <label className="text-[10px] opacity-50 block mb-1.5 uppercase tracking-wider">Message du mineur (optionnel)</label>
            <input
              type="text"
              placeholder="Inscrivez un message dans le bloc..."
              value={miningMessage}
              onChange={e => setMiningMessage(e.target.value.slice(0, 80))}
              className="warp-input w-full text-body-sm py-2"
              maxLength={80}
            />
            <p className="text-[10px] opacity-30 mt-0.5">{miningMessage.length}/80 — Ce message sera inscrit de façon permanente dans le bloc.</p>
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
            {'\u26A1'} Lancer le minage — Énergie {selectedEnergy.label}
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
            <h3 className="text-base font-bold opacity-70">{'\u25B6'} Minage en cours...</h3>
            <span className="text-[10px] opacity-40 bg-current/5 px-2 py-1">Énergie: {selectedEnergy.label}</span>
          </div>

          {/* Live metrics */}
          <div className="grid grid-cols-2 gap-2 text-body-sm">
            <div className="bg-current/5 p-2.5">
              <p className="opacity-40 text-label">HASHRATE</p>
              <p className="opacity-80 font-mono font-bold text-base">
                {formatHashrate(progress?.hashrate || 0)}
              </p>
            </div>
            <div className="bg-current/5 p-2.5">
              <p className="opacity-40 text-label">HASHES CALCULÉS</p>
              <p className="opacity-80 font-mono font-bold text-base">
                {(progress?.hashesComputed || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-current/5 p-2.5">
              <p className="opacity-40 text-label">NONCE ACTUEL</p>
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
                Recherche d'un hash avec {diffState.currentDifficulty}+ zéros en tête... Votre navigateur teste des milliards de combinaisons.
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
            <p className="text-3xl mb-2">{'\u2713'}</p>
            <h3 className="text-title-sm font-bold opacity-100 font-title">Bloc miné avec succès !</h3>
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
                <p className="text-label opacity-40 mb-1">HASH GAGNANT</p>
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
                    <p className="text-label opacity-40">HASHRATE</p>
                    <p className="text-body-sm font-bold opacity-70">{formatHashrate(progress.hashrate)}</p>
                  </div>
                  <div className="bg-current/5 p-2">
                    <p className="text-label opacity-40">HASHES</p>
                    <p className="text-body-sm font-bold opacity-70">{progress.hashesComputed.toLocaleString()}</p>
                  </div>
                </div>
              )}

              {miningMessage && (
                <div className="bg-current/5 p-2 text-center">
                  <p className="text-label opacity-40 mb-0.5">MESSAGE DU BLOC</p>
                  <p className="text-body-sm opacity-60 italic">"{miningMessage}"</p>
                </div>
              )}
            </div>
          )}

          {/* Contribution feedback */}
          <div className="bg-current/5 border border-current/10 p-3 text-[11px] opacity-40 text-center space-y-1">
            <p>Ce bloc contribue à la sécurité de la chaîne Cosmorare.</p>
            <p>Il certifie l'authenticité de toutes les Cosmorares enregistrées jusqu'au bloc #{diffState.blocksMined}.</p>
          </div>

          <button
            className="warp-button w-full py-3 text-base font-bold"
            onClick={resetToConfig}
          >
            {'\u26A1'} Miner un nouveau bloc
          </button>
        </div>
      )}

      {/* ─── Mining History ─────────────────────────────── */}
      {history.length > 0 && (
        <div className="glass-panel p-4">
          <h3 className="text-base font-bold opacity-70 mb-2">{'\u25B7'} Historique de minage</h3>
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

      {/* ─── How it works (detailed) ───────────────────── */}
      <div className="glass-panel p-4">
        <h3 className="text-base font-bold opacity-70 mb-2">Comment fonctionne le Proof-of-Work</h3>
        <div className="text-[11px] opacity-40 space-y-2">
          <div className="flex gap-2">
            <span className="opacity-60 font-bold shrink-0">1.</span>
            <p><span className="font-bold opacity-60">Préparation du bloc :</span> Un en-tête est construit avec votre adresse, le hash du bloc précédent, le timestamp et votre message optionnel.</p>
          </div>
          <div className="flex gap-2">
            <span className="opacity-60 font-bold shrink-0">2.</span>
            <p><span className="font-bold opacity-60">Recherche du nonce :</span> Votre navigateur teste des millions de valeurs pour trouver un nonce tel que <span className="opacity-80 font-mono">SHA-256(bloc + nonce)</span> produise un hash avec {diffState.currentDifficulty}+ zéros en tête.</p>
          </div>
          <div className="flex gap-2">
            <span className="opacity-60 font-bold shrink-0">3.</span>
            <p><span className="font-bold opacity-60">Vérification :</span> La preuve est vérifiée cryptographiquement — n'importe qui peut recalculer le hash et confirmer sa validité.</p>
          </div>
          <div className="flex gap-2">
            <span className="opacity-60 font-bold shrink-0">4.</span>
            <p><span className="font-bold opacity-60">Récompense :</span> Le reward suit la Resonance Decay ({'\u03C6'} = 1.618...) : une décroissance douce basée sur le ratio d'or, au lieu du halving brutal de Bitcoin.</p>
          </div>
          <div className="flex gap-2">
            <span className="opacity-60 font-bold shrink-0">5.</span>
            <p><span className="font-bold opacity-60">Ajustement :</span> La difficulté s'ajuste tous les 10 blocs pour cibler ~15s par bloc, garantissant un rythme d'émission stable.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
