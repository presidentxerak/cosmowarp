import { useState, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { LAYER_NAMES } from '../engine/cosmomesh';
import { HIERARCHY_LEVELS } from '../engine/hierarchy';

export default function WalletView() {
  const {
    wallet, unlocked, needsMigration,
    meshStats, supplyInfo, levelProgress,
    initWallet, unlock, lock, migrate,
    doExportWallet, doImportWallet,
  } = useWallet();

  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [createError, setCreateError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPassword, setImportPassword] = useState('');
  const [importError, setImportError] = useState('');
  const [importData, setImportData] = useState<string | null>(null);
  const [authTab, setAuthTab] = useState<'signup' | 'signin'>('signup');
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [backupDownloaded, setBackupDownloaded] = useState(false);

  // ─── No wallet: Sign Up / Sign In screen ───────────────
  if (!wallet) {
    return (
      <div className="glass-panel p-6 sm:p-8 text-center max-w-md mx-auto">
        <div className="flex justify-center mb-4">
          <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="CosmoWarp" className="w-16 h-16 sm:w-20 sm:h-20 animate-float" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-100 mb-1 font-title">CosmoWarp</h2>
        <p className="text-xs text-gray-500 mb-5">
          Post-blockchain transactional fabric
        </p>

        {/* ─── Sign Up / Sign In tabs ──────────────────── */}
        <div className="flex max-w-xs mx-auto mb-5 border border-white/10 overflow-hidden">
          <button
            onClick={() => setAuthTab('signup')}
            className={`flex-1 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
              authTab === 'signup'
                ? 'bg-warp-500/20 text-warp-300 border-b-2 border-warp-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => setAuthTab('signin')}
            className={`flex-1 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
              authTab === 'signin'
                ? 'bg-warp-500/20 text-warp-300 border-b-2 border-warp-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            Sign In
          </button>
        </div>

        {authTab === 'signup' ? (
          /* ─── Sign Up: Create wallet ─────────────────── */
          <div className="max-w-xs mx-auto space-y-3">
            <p className="text-sm text-gray-400 mb-1">
              Create your wallet and receive 1,000 {'\u03A9'} airdrop.
            </p>
            <input
              className="warp-input text-center"
              placeholder="Choose a username (optional)"
              value={alias}
              onChange={e => setAlias(e.target.value)}
            />
            <input
              className="warp-input text-center"
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={e => { setPassword(e.target.value); setCreateError(''); }}
            />
            <input
              className="warp-input text-center"
              type="password"
              placeholder="Confirm password"
              value={passwordConfirm}
              onChange={e => { setPasswordConfirm(e.target.value); setCreateError(''); }}
            />
            {createError && (
              <p className="text-xs text-red-400">{createError}</p>
            )}
            <button
              className="warp-button w-full text-base py-3"
              onClick={async () => {
                if (password.length < 6) {
                  setCreateError('Password must be at least 6 characters');
                  return;
                }
                if (password !== passwordConfirm) {
                  setCreateError('Passwords do not match');
                  return;
                }
                setCreating(true);
                try {
                  await initWallet(password, alias || undefined);
                  setShowBackupPrompt(true);
                } finally {
                  setCreating(false);
                }
              }}
              disabled={creating || !password}
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-warp-300/30 border-t-warp-300 rounded-none animate-spin" />
                  Creating...
                </span>
              ) : (
                <>{'\u2B21'} Sign Up</>
              )}
            </button>

            <p className="text-[10px] text-gray-600 pt-2">
              Ed25519 keypair encrypted with AES-256-GCM
            </p>
          </div>
        ) : (
          /* ─── Sign In: Restore wallet from backup ────── */
          <div className="max-w-xs mx-auto space-y-3">
            <p className="text-sm text-gray-400 mb-1">
              Restore your wallet from your backup file.
            </p>
            <p className="text-[10px] text-gray-500 mb-2">
              Select the encrypted .json recovery key you downloaded when creating your account.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setImportData(reader.result as string);
                reader.readAsText(file);
              }}
            />
            {!importData ? (
              <button
                className="warp-button w-full py-4 text-sm border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                {'\u2B06'} Select Recovery Key (.json)
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-green-500/10 border border-green-500/20 text-xs text-green-400">
                  {'\u2713'} Recovery key loaded
                </div>
                <input
                  className="warp-input text-center"
                  type="password"
                  placeholder="Your wallet password"
                  value={importPassword}
                  onChange={e => { setImportPassword(e.target.value); setImportError(''); }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && importPassword) {
                      (async () => {
                        try {
                          const data = JSON.parse(importData!);
                          const ok = await doImportWallet(data, importPassword);
                          if (!ok) setImportError('Wrong password or invalid file');
                        } catch {
                          setImportError('Invalid wallet file');
                        }
                      })();
                    }
                  }}
                />
                {importError && <p className="text-xs text-red-400">{importError}</p>}
                <button
                  className="warp-button w-full py-3 text-base"
                  onClick={async () => {
                    try {
                      const data = JSON.parse(importData!);
                      const ok = await doImportWallet(data, importPassword);
                      if (!ok) setImportError('Wrong password or invalid file');
                    } catch {
                      setImportError('Invalid wallet file');
                    }
                  }}
                  disabled={!importPassword}
                >
                  Sign In
                </button>
              </div>
            )}

            <div className="p-3 bg-cosmic-900/40 border border-white/5 text-left mt-2">
              <p className="text-[10px] text-gray-500">
                {'\u2139'} Your recovery key (.json) was downloaded when you created your account.
                It is your only way to restore your wallet — like a seed phrase.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Migration screen (legacy wallet) ─────────────────
  if (needsMigration) {
    return (
      <div className="glass-panel p-6 text-center">
        <h2 className="text-xl font-bold text-amber-400 mb-2 font-title">{'\u26A0'} Security Upgrade</h2>
        <p className="text-sm text-gray-400 mb-4">
          Your wallet needs encryption. Set a password to secure your private key.
        </p>
        <div className="max-w-xs mx-auto space-y-3">
          <input
            className="warp-input text-center"
            type="password"
            placeholder="Choose a password (min 6 chars)"
            value={password}
            onChange={e => { setPassword(e.target.value); setCreateError(''); }}
          />
          <input
            className="warp-input text-center"
            type="password"
            placeholder="Confirm password"
            value={passwordConfirm}
            onChange={e => { setPasswordConfirm(e.target.value); setCreateError(''); }}
          />
          {createError && <p className="text-xs text-red-400">{createError}</p>}
          <button
            className="warp-button w-full text-base py-3"
            onClick={async () => {
              if (password.length < 6) { setCreateError('Min 6 characters'); return; }
              if (password !== passwordConfirm) { setCreateError('Passwords do not match'); return; }
              const ok = await migrate(password);
              if (ok) {
                setShowBackupPrompt(true);
              } else {
                setCreateError('Migration failed');
              }
            }}
            disabled={!password}
          >
            {'\u26BF'} Encrypt & Secure Wallet
          </button>
        </div>
      </div>
    );
  }

  // ─── Backup prompt after wallet creation ─────────────
  if (showBackupPrompt && unlocked) {
    const handleBackupDownload = () => {
      const data = doExportWallet();
      if (!data) return;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cosmowarp-wallet-${shortAddress(wallet.address)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupDownloaded(true);
    };

    return (
      <div className="glass-panel p-6 sm:p-8 text-center max-w-md mx-auto">
        <div className="text-4xl mb-4">{'\u26A0'}</div>
        <h2 className="text-xl font-bold text-amber-400 mb-2 font-title">Save Your Recovery Key</h2>
        <p className="text-sm text-gray-300 mb-2">
          Your wallet has been created successfully!
        </p>
        <p className="text-sm text-gray-400 mb-5">
          Download your <span className="text-warp-300 font-bold">encrypted backup file</span> now.
          This is the only way to recover your wallet on a new device or if your browser data is cleared.
        </p>

        <div className="p-4 bg-amber-500/10 border border-amber-500/20 mb-5 text-left space-y-2">
          <p className="text-xs text-amber-300 font-bold">Important:</p>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>{'\u2022'} This file is your <span className="text-amber-300">recovery key</span> (like a seed phrase)</li>
            <li>{'\u2022'} It is encrypted with your password — keep both safe</li>
            <li>{'\u2022'} Without this file, there is <span className="text-red-400">no way to recover</span> your wallet</li>
            <li>{'\u2022'} Store it somewhere safe (cloud drive, USB, etc.)</li>
          </ul>
        </div>

        <div className="max-w-xs mx-auto space-y-3">
          {!backupDownloaded ? (
            <button
              className="warp-button w-full py-3 text-base"
              onClick={handleBackupDownload}
            >
              {'\u2B07'} Download Backup File
            </button>
          ) : (
            <>
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-sm text-green-400">
                {'\u2713'} Backup downloaded
              </div>
              <button
                className="warp-button w-full py-3 text-base"
                onClick={() => setShowBackupPrompt(false)}
              >
                {'\u2B21'} Enter CosmoWarp
              </button>
              <button
                className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer"
                onClick={handleBackupDownload}
              >
                Download again
              </button>
            </>
          )}

          <button
            onClick={() => setShowBackupPrompt(false)}
            className="text-[10px] text-gray-600 hover:text-gray-400 cursor-pointer block mx-auto pt-2"
          >
            I'll do this later (not recommended)
          </button>
        </div>
      </div>
    );
  }

  // ─── Locked wallet: Sign In screen ───────────────────
  if (!unlocked) {
    return (
      <div className="glass-panel p-6 sm:p-8 text-center max-w-md mx-auto">
        <div className="flex justify-center mb-3">
          <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="CosmoWarp" className="w-14 h-14 sm:w-16 sm:h-16 opacity-60" />
        </div>
        <p className="text-sm text-gray-400 mb-1">Welcome back</p>
        <h2 className="text-xl font-bold text-gray-100 mb-1 font-title">
          {wallet.alias ? `@${wallet.alias}` : shortAddress(wallet.address)}
        </h2>
        <p className="text-lg font-bold text-gray-100/40 mb-5">
          {wallet.balance.toLocaleString()} {'\u03A9'}
        </p>
        <div className="max-w-xs mx-auto space-y-3">
          <input
            className="warp-input text-center"
            type="password"
            placeholder="Enter your password"
            value={unlockPassword}
            onChange={e => { setUnlockPassword(e.target.value); setUnlockError(''); }}
            onKeyDown={e => {
              if (e.key === 'Enter' && unlockPassword) {
                setUnlocking(true);
                unlock(unlockPassword).then(ok => {
                  if (!ok) setUnlockError('Wrong password');
                  setUnlocking(false);
                  setUnlockPassword('');
                });
              }
            }}
            autoFocus
          />
          {unlockError && <p className="text-xs text-red-400">{unlockError}</p>}
          <button
            className="warp-button w-full py-3 text-base"
            onClick={async () => {
              setUnlocking(true);
              const ok = await unlock(unlockPassword);
              if (!ok) setUnlockError('Wrong password');
              setUnlocking(false);
              setUnlockPassword('');
            }}
            disabled={!unlockPassword || unlocking}
          >
            {unlocking ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-warp-300/30 border-t-warp-300 rounded-none animate-spin" />
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Unlocked wallet: Full view ───────────────────────
  const copyAddress = () => {
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const data = doExportWallet();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cosmowarp-wallet-${shortAddress(wallet.address)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const recentTxs = wallet.transactions.slice(0, 8);
  const levelDef = HIERARCHY_LEVELS[wallet.level];
  const nextLevel = wallet.level < 6 ? HIERARCHY_LEVELS[wallet.level + 1] : null;

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <div className="glass-panel p-5 text-center animate-pulse-glow">
        <div className="flex justify-center mb-3">
          <img
            src={import.meta.env.BASE_URL + 'profile.svg'}
            alt="Profile"
            className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]"
          />
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className={`text-lg ${levelDef.color}`}>{wallet.levelSymbol}</span>
          <span className={`text-xs font-bold ${levelDef.color}`}>{wallet.levelTitle}</span>
        </div>
        <p className="text-xs text-gray-400 mb-1">
          {wallet.alias ? `@${wallet.alias}` : 'Warp Balance'}
        </p>
        <div className="text-4xl sm:text-5xl font-bold text-gray-100 mb-1 animate-float">
          {wallet.balance.toLocaleString()} <span className="text-2xl">{'\u03A9'}</span>
        </div>
        <p className="text-[10px] text-gray-500">WARP ENERGY UNITS</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          {wallet.isAdmin && (
            <span className="text-[10px] px-2 py-0.5 rounded-none bg-amber-500/20 text-amber-400 border border-amber-500/30">
              ADMIN
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-none bg-green-500/20 text-green-400 border border-green-500/30">
            {'\u26BF'} ENCRYPTED
          </span>
          <button
            onClick={lock}
            className="text-[10px] px-2 py-0.5 rounded-none bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            {'\u274C'} Lock
          </button>
        </div>
      </div>

      {/* Address */}
      <div className="glass-panel p-3">
        <p className="text-[10px] text-gray-500 mb-1">YOUR ADDRESS (Ed25519)</p>
        <div className="flex items-center gap-2">
          <code className="text-xs text-energy-400 flex-1 truncate">{wallet.address}</code>
          <button onClick={copyAddress} className="warp-button text-xs px-2 py-1">
            {copied ? '\u2713 Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Backup & Security */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[10px] text-gray-500">RECOVERY KEY</p>
            <p className="text-xs text-gray-400">Encrypted backup &middot; AES-256-GCM</p>
          </div>
          <button
            onClick={handleExport}
            className="warp-button text-xs px-3 py-1.5"
          >
            {'\u2B07'} Download Backup
          </button>
        </div>
        <p className="text-[10px] text-gray-600">
          This file + your password = the only way to restore your wallet. Keep it safe.
        </p>
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
            <div className="w-full bg-cosmic-900/60 rounded-none h-2">
              <div
                className="h-2 rounded-none transition-all duration-500"
                style={{
                  width: `${levelProgress}%`,
                  background: 'linear-gradient(90deg, #a855f7, #06b6d4)',
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
              <div key={tx.id} className="flex items-center gap-3 p-2 rounded-none bg-cosmic-900/40 text-xs">
                <span className={`text-base ${
                  tx.type === 'mine' ? 'text-star-400' :
                  tx.type === 'send' ? 'text-nebula-400' :
                  tx.type === 'genesis' || tx.type === 'airdrop' ? 'text-warp-400' :
                  tx.type === 'level_up' ? 'text-amber-400' :
                  tx.type === 'wart_mint' ? 'text-pink-400' :
                  tx.type === 'wart_buy' ? 'text-cyan-400' :
                  tx.type === 'wart_transfer' ? 'text-purple-400' :
                  'text-energy-400'
                }`}>
                  {tx.type === 'mine' ? '\u26CF' :
                   tx.type === 'send' ? '\u2197' :
                   tx.type === 'genesis' || tx.type === 'airdrop' ? '\u2B21' :
                   tx.type === 'level_up' ? '\u2605' :
                   tx.type === 'wart_mint' ? '\u2742' :
                   tx.type === 'wart_buy' ? '\u2B22' :
                   tx.type === 'wart_transfer' ? '\u21C4' : '\u2199'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 truncate">
                    {tx.memo || (
                      tx.type === 'genesis' || tx.type === 'airdrop' ? 'Airdrop' :
                      tx.type === 'mine' ? 'Mining Reward' :
                      tx.type === 'level_up' ? 'Level Up Bonus' :
                      tx.type === 'streak_reward' ? 'Streak Reward' :
                      tx.type === 'send' ? `To ${shortAddress(tx.to)}` :
                      `From ${shortAddress(tx.from)}`
                    )}
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
                  tx.type === 'send' || tx.type === 'wart_buy' ? 'text-nebula-400' : 'text-energy-400'
                }`}>
                  {tx.type === 'send' || tx.type === 'wart_buy' ? '-' : '+'}{tx.amount} {'\u03A9'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
