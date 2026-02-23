import { useState, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { LAYER_NAMES } from '../engine/cosmomesh';
import { HIERARCHY_LEVELS } from '../engine/hierarchy';
import { runMiningProgram, MINING_PROGRAMS } from '../engine/miner';

type WalletTab = 'overview' | 'send' | 'mine';
type Difficulty = 'basic' | 'crypto' | 'deep';
type AuthTab = 'signup' | 'signin';
type SignInMethod = 'cosmoid' | 'cosmolink' | 'file';

const DIFFICULTY_INFO: Record<Difficulty, { label: string; reward: string; color: string }> = {
  basic: { label: 'Basic', reward: 'Low', color: 'text-energy-400' },
  crypto: { label: 'Crypto', reward: 'Medium', color: 'text-warp-400' },
  deep: { label: 'Deep', reward: 'High', color: 'text-star-400' },
};

interface MiningLog {
  text: string;
  type: 'info' | 'success' | 'energy' | 'level_up';
}

export default function WalletView() {
  const {
    wallet, unlocked, needsMigration,
    meshStats, supplyInfo, levelProgress,
    cosmoIDLogin, unlock, lock, migrate, mine, send,
    doExportWallet, doImportWallet, doImportCosmoLink,
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
  const [authTab, setAuthTab] = useState<AuthTab>('signup');
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('cosmoid');
  const [showWelcome, setShowWelcome] = useState(false);

  // CosmoLink import state
  const [cosmoLinkInput, setCosmoLinkInput] = useState('');
  const [cosmoLinkPassword, setCosmoLinkPassword] = useState('');
  const [cosmoLinkError, setCosmoLinkError] = useState('');

  // Sign In CosmoID state
  const [signInUsername, setSignInUsername] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // Wallet sub-tabs
  const [walletTab, setWalletTab] = useState<WalletTab>('overview');

  // Send state
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendMemo, setSendMemo] = useState('');
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);

  // Mine state
  const [difficulty, setDifficulty] = useState<Difficulty>('basic');
  const [mining, setMining] = useState(false);
  const [miningLogs, setMiningLogs] = useState<MiningLog[]>([]);
  const [lastReward, setLastReward] = useState<number | null>(null);
  const miningLogRef = useRef<HTMLDivElement>(null);

  // Spinner component
  const Spinner = () => (
    <span className="inline-block w-4 h-4 border-2 border-warp-300/30 border-t-warp-300 rounded-none animate-spin" />
  );

  // ─── CosmoID Sign Up handler ────────────────────────────
  const handleSignUp = async () => {
    if (!alias.trim()) { setCreateError('Username is required for CosmoID'); return; }
    if (password.length < 6) { setCreateError('Password must be at least 6 characters'); return; }
    if (password !== passwordConfirm) { setCreateError('Passwords do not match'); return; }
    setCreating(true);
    setCreateError('');
    try {
      const result = await cosmoIDLogin(alias.trim(), password);
      if (result.success) {
        setShowWelcome(true);
      } else {
        setCreateError(result.error || 'Sign up failed');
      }
    } finally {
      setCreating(false);
    }
  };

  // ─── CosmoID Sign In handler ────────────────────────────
  const handleCosmoIDSignIn = async () => {
    if (!signInUsername.trim()) { setSignInError('Username is required'); return; }
    if (signInPassword.length < 6) { setSignInError('Password must be at least 6 characters'); return; }
    setSigningIn(true);
    setSignInError('');
    try {
      const result = await cosmoIDLogin(signInUsername.trim(), signInPassword);
      if (!result.success) {
        setSignInError(result.error || 'Sign in failed');
      }
    } finally {
      setSigningIn(false);
    }
  };

  // ─── CosmoLink Import handler ────────────────────────────
  const handleCosmoLinkImport = async () => {
    if (!cosmoLinkInput.trim()) { setCosmoLinkError('Paste your CosmoLink code'); return; }
    if (!cosmoLinkPassword) { setCosmoLinkError('Password is required'); return; }
    setCosmoLinkError('');
    try {
      const ok = await doImportCosmoLink(cosmoLinkInput.trim(), cosmoLinkPassword);
      if (!ok) setCosmoLinkError('Invalid CosmoLink or wrong password');
    } catch {
      setCosmoLinkError('Failed to import CosmoLink');
    }
  };

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
          <div className="max-w-xs mx-auto space-y-3">
            <p className="text-sm text-gray-400 mb-1">
              Create your wallet and receive 1,000 {'\u03A9'} airdrop.
            </p>

            <div className="p-3 bg-warp-500/5 border border-warp-500/20 text-left">
              <p className="text-[10px] text-warp-300 font-bold mb-1">CosmoID</p>
              <p className="text-[10px] text-gray-400">Same username + password = same wallet on any device. No backup file needed.</p>
            </div>

            <input
              className="warp-input text-center"
              placeholder="Choose a username"
              value={alias}
              onChange={e => { setAlias(e.target.value); setCreateError(''); }}
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
              onKeyDown={e => { if (e.key === 'Enter') handleSignUp(); }}
            />
            {createError && <p className="text-xs text-red-400">{createError}</p>}
            <button
              className="warp-button w-full text-base py-3"
              onClick={handleSignUp}
              disabled={creating || !alias.trim() || !password}
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  Generating keys...
                </span>
              ) : <>{'\u2B21'} Sign Up</>}
            </button>
            <p className="text-[10px] text-gray-600 pt-2">Ed25519 + PBKDF2 (600K rounds) + AES-256-GCM</p>
          </div>
        ) : (
          <div className="max-w-xs mx-auto space-y-3">
            {/* Sign In method selector */}
            <div className="flex gap-1 mb-2">
              {([
                { id: 'cosmoid' as SignInMethod, label: 'CosmoID', icon: '\u2B21' },
                { id: 'cosmolink' as SignInMethod, label: 'CosmoLink', icon: '\u26A1' },
                { id: 'file' as SignInMethod, label: 'File', icon: '\u2B07' },
              ]).map(m => (
                <button
                  key={m.id}
                  onClick={() => setSignInMethod(m.id)}
                  className={`flex-1 py-2 text-[11px] font-medium transition-all cursor-pointer ${
                    signInMethod === m.id
                      ? 'bg-warp-500/20 text-warp-300 border border-warp-500/30'
                      : 'text-gray-500 hover:text-gray-300 border border-white/5 hover:bg-white/5'
                  }`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {/* ─── CosmoID Sign In ────────────────────────── */}
            {signInMethod === 'cosmoid' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Sign in with your CosmoID credentials.</p>
                <p className="text-[10px] text-gray-500">Same username + password = same wallet, any device.</p>
                <input
                  className="warp-input text-center"
                  placeholder="Username"
                  value={signInUsername}
                  onChange={e => { setSignInUsername(e.target.value); setSignInError(''); }}
                />
                <input
                  className="warp-input text-center"
                  type="password"
                  placeholder="Password"
                  value={signInPassword}
                  onChange={e => { setSignInPassword(e.target.value); setSignInError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleCosmoIDSignIn(); }}
                />
                {signInError && <p className="text-xs text-red-400">{signInError}</p>}
                <button
                  className="warp-button w-full py-3 text-base"
                  onClick={handleCosmoIDSignIn}
                  disabled={!signInUsername.trim() || !signInPassword || signingIn}
                >
                  {signingIn ? (
                    <span className="flex items-center justify-center gap-2"><Spinner />Deriving keys...</span>
                  ) : 'Sign In'}
                </button>
              </div>
            )}

            {/* ─── CosmoLink Import ──────────────────────── */}
            {signInMethod === 'cosmolink' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Paste a CosmoLink code from another device.</p>
                <p className="text-[10px] text-gray-500">CosmoLink is an encrypted transfer code you can share via any messaging app.</p>
                <textarea
                  className="warp-input text-center text-xs min-h-[80px] resize-none"
                  placeholder="Paste CWLINK-... code here"
                  value={cosmoLinkInput}
                  onChange={e => { setCosmoLinkInput(e.target.value); setCosmoLinkError(''); }}
                />
                <input
                  className="warp-input text-center"
                  type="password"
                  placeholder="Your wallet password"
                  value={cosmoLinkPassword}
                  onChange={e => { setCosmoLinkPassword(e.target.value); setCosmoLinkError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleCosmoLinkImport(); }}
                />
                {cosmoLinkError && <p className="text-xs text-red-400">{cosmoLinkError}</p>}
                <button
                  className="warp-button w-full py-3 text-base"
                  onClick={handleCosmoLinkImport}
                  disabled={!cosmoLinkInput.trim() || !cosmoLinkPassword}
                >
                  {'\u26A1'} Import
                </button>
              </div>
            )}

            {/* ─── File Import (legacy) ──────────────────── */}
            {signInMethod === 'file' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">Restore from a recovery file.</p>
                <p className="text-[10px] text-gray-500">Legacy method: upload the .json file exported from a previous wallet.</p>
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setImportData(reader.result as string);
                  reader.readAsText(file);
                }} />
                {!importData ? (
                  <button className="warp-button w-full py-4 text-sm border-dashed" onClick={() => fileInputRef.current?.click()}>
                    {'\u2B06'} Select Recovery Key (.json)
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-500/10 border border-green-500/20 text-xs text-green-400">{'\u2713'} File loaded</div>
                    <input
                      className="warp-input text-center" type="password" placeholder="Your wallet password"
                      value={importPassword}
                      onChange={e => { setImportPassword(e.target.value); setImportError(''); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && importPassword) {
                          (async () => {
                            try { const data = JSON.parse(importData!); const ok = await doImportWallet(data, importPassword); if (!ok) setImportError('Wrong password or invalid file'); }
                            catch { setImportError('Invalid wallet file'); }
                          })();
                        }
                      }}
                    />
                    {importError && <p className="text-xs text-red-400">{importError}</p>}
                    <button className="warp-button w-full py-3 text-base" onClick={async () => {
                      try { const data = JSON.parse(importData!); const ok = await doImportWallet(data, importPassword); if (!ok) setImportError('Wrong password or invalid file'); }
                      catch { setImportError('Invalid wallet file'); }
                    }} disabled={!importPassword}>Import</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Migration screen ──────────────────────────────────
  if (needsMigration) {
    return (
      <div className="glass-panel p-6 text-center">
        <h2 className="text-xl font-bold text-amber-400 mb-2 font-title">{'\u26A0'} Security Upgrade</h2>
        <p className="text-sm text-gray-400 mb-4">Your wallet needs encryption. Set a password to secure your private key.</p>
        <div className="max-w-xs mx-auto space-y-3">
          <input className="warp-input text-center" type="password" placeholder="Choose a password (min 6 chars)" value={password} onChange={e => { setPassword(e.target.value); setCreateError(''); }} />
          <input className="warp-input text-center" type="password" placeholder="Confirm password" value={passwordConfirm} onChange={e => { setPasswordConfirm(e.target.value); setCreateError(''); }} />
          {createError && <p className="text-xs text-red-400">{createError}</p>}
          <button className="warp-button w-full text-base py-3" onClick={async () => {
            if (password.length < 6) { setCreateError('Min 6 characters'); return; }
            if (password !== passwordConfirm) { setCreateError('Passwords do not match'); return; }
            const ok = await migrate(password);
            if (!ok) setCreateError('Migration failed');
          }} disabled={!password}>{'\u26BF'} Encrypt & Secure Wallet</button>
        </div>
      </div>
    );
  }

  // ─── Welcome screen (after CosmoID signup) ──────────────
  if (showWelcome && unlocked) {
    return (
      <div className="glass-panel p-6 sm:p-8 text-center max-w-md mx-auto">
        <div className="text-4xl mb-4">{'\u2B21'}</div>
        <h2 className="text-xl font-bold text-warp-300 mb-2 font-title">Welcome to CosmoWarp!</h2>
        <p className="text-sm text-gray-300 mb-2">Your wallet is ready.</p>

        <div className="p-4 bg-warp-500/10 border border-warp-500/20 mb-5 text-left space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-lg text-green-400 shrink-0 mt-0.5">{'\u2713'}</span>
            <div>
              <p className="text-xs text-gray-200 font-bold">CosmoID Active</p>
              <p className="text-[10px] text-gray-400">Your wallet is linked to your username + password. Sign in with the same credentials on any device to access the same wallet.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg text-warp-400 shrink-0 mt-0.5">{'\u26BF'}</span>
            <div>
              <p className="text-xs text-gray-200 font-bold">No backup file needed</p>
              <p className="text-[10px] text-gray-400">Unlike traditional crypto wallets, you don't need to save a seed phrase or download a file. Just remember your username and password.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg text-energy-400 shrink-0 mt-0.5">{'\u26A1'}</span>
            <div>
              <p className="text-xs text-gray-200 font-bold">Quick device transfer</p>
              <p className="text-[10px] text-gray-400">Need to transfer your local data? Generate a CosmoLink in Settings and paste it on your other device.</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400 mb-5">
          <span className="text-energy-400 font-bold">+{wallet.balance.toLocaleString()} {'\u03A9'}</span> airdrop received
        </div>

        <button className="warp-button w-full py-3 text-base" onClick={() => setShowWelcome(false)}>
          {'\u2B21'} Enter CosmoWarp
        </button>

        <p className="text-[10px] text-gray-600 mt-3">Ed25519 + PBKDF2 (600K) + AES-256-GCM</p>
      </div>
    );
  }

  // ─── Locked wallet ─────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="glass-panel p-6 sm:p-8 text-center max-w-md mx-auto">
        <div className="flex justify-center mb-3">
          <img src={import.meta.env.BASE_URL + 'logo.svg'} alt="CosmoWarp" className="w-14 h-14 sm:w-16 sm:h-16 opacity-60" />
        </div>
        <p className="text-sm text-gray-400 mb-1">Welcome back</p>
        <h2 className="text-xl font-bold text-gray-100 mb-1 font-title">{wallet.alias ? `@${wallet.alias}` : shortAddress(wallet.address)}</h2>
        <p className="text-lg font-bold text-gray-100/40 mb-5">{wallet.balance.toLocaleString()} {'\u03A9'}</p>
        <div className="max-w-xs mx-auto space-y-3">
          <input className="warp-input text-center" type="password" placeholder="Enter your password" value={unlockPassword}
            onChange={e => { setUnlockPassword(e.target.value); setUnlockError(''); }}
            onKeyDown={e => { if (e.key === 'Enter' && unlockPassword) { setUnlocking(true); unlock(unlockPassword).then(ok => { if (!ok) setUnlockError('Wrong password'); setUnlocking(false); setUnlockPassword(''); }); } }}
            autoFocus
          />
          {unlockError && <p className="text-xs text-red-400">{unlockError}</p>}
          <button className="warp-button w-full py-3 text-base" onClick={async () => { setUnlocking(true); const ok = await unlock(unlockPassword); if (!ok) setUnlockError('Wrong password'); setUnlocking(false); setUnlockPassword(''); }} disabled={!unlockPassword || unlocking}>
            {unlocking ? <span className="flex items-center justify-center gap-2"><Spinner />Unlocking...</span> : 'Unlock'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Helper functions ──────────────────────────────────
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
    a.href = url; a.download = `cosmowarp-wallet-${shortAddress(wallet.address)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Send handler ──────────────────────────────────────
  const handleSend = async () => {
    const amt = parseFloat(sendAmount);
    if (isNaN(amt)) { setSendResult({ success: false, message: 'Invalid amount' }); return; }
    setSending(true);
    try {
      const res = await send(sendTo.trim(), amt, sendMemo || undefined);
      if (res.success) { setSendResult({ success: true, message: `Sent ${amt} \u03A9 via CosmoMesh DAG!` }); setSendTo(''); setSendAmount(''); setSendMemo(''); }
      else setSendResult({ success: false, message: res.error || 'Transaction failed' });
    } catch (err) { setSendResult({ success: false, message: err instanceof Error ? err.message : 'Transaction failed' }); }
    finally { setSending(false); }
    setTimeout(() => setSendResult(null), 4000);
  };

  // ─── Mine handler ──────────────────────────────────────
  const addMineLog = (text: string, type: MiningLog['type'] = 'info') => {
    setMiningLogs(prev => [...prev, { text, type }]);
    setTimeout(() => miningLogRef.current?.scrollTo(0, miningLogRef.current.scrollHeight), 50);
  };

  const startMining = async () => {
    setMining(true);
    setMiningLogs([]);
    setLastReward(null);
    const program = MINING_PROGRAMS[difficulty];
    addMineLog(`\u25B6 Starting ${difficulty} mining program...`);
    addMineLog(`\u229A Loading CosmoASM bytecode...`);
    await new Promise(r => setTimeout(r, 400));
    addMineLog('\u26A1 Executing Planck cycles...');
    await new Promise(r => setTimeout(r, 300));
    const result = runMiningProgram(program);
    addMineLog(`\u2699 Cycles: ${result.cycles} | Energy: ${result.energy.toFixed(1)}`);
    addMineLog(`\u25C8 Hash: ${result.hash.toFixed(8)}`, 'energy');
    if (result.output.length > 0) addMineLog(`\u25CE Output: [${result.output.map(v => typeof v === 'number' ? v.toFixed(4) : v).join(', ')}]`);
    await new Promise(r => setTimeout(r, 200));
    addMineLog('\u229A Submitting to CosmoMesh DAG...');
    addMineLog(`\u229A Reward multiplier: ${wallet.rewardMultiplier}x (Level: ${wallet.levelName})`);
    if (result.success) {
      try {
        const { tx, levelUp } = await mine(result.energy, result.cycles);
        setLastReward(tx.amount);
        addMineLog(`\u229A Ed25519 signature generated`, 'energy');
        addMineLog(`\u229A Resonance Consensus: validated`, 'energy');
        addMineLog(`\u2713 Mining complete! Reward: +${tx.amount} \u03A9`, 'success');
        if (levelUp) addMineLog(`\u2605 LEVEL UP! ${levelUp.levelDef.name}: ${levelUp.levelDef.title} (+${levelUp.airdropBonus} \u03A9 bonus)`, 'level_up');
      } catch (err) { addMineLog(`\u2717 Mining failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'info'); }
    } else { addMineLog('\u2717 Mining failed: cycle limit reached', 'info'); }
    setMining(false);
  };

  // ─── Unlocked wallet: Full view ────────────────────────
  const recentTxs = wallet.transactions.slice(0, 8);
  const levelDef = HIERARCHY_LEVELS[wallet.level];
  const nextLevel = wallet.level < 6 ? HIERARCHY_LEVELS[wallet.level + 1] : null;

  const subTabs: { id: WalletTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '\u25C8' },
    { id: 'send', label: 'Send', icon: '\u2197' },
    { id: 'mine', label: 'Mine', icon: '\u26CF' },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="glass-panel p-2">
        <div className="flex gap-1">
          {subTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setWalletTab(t.id)}
              className={`flex-1 px-3 py-2 rounded-none text-xs font-medium transition-all cursor-pointer ${
                walletTab === t.id
                  ? 'bg-warp-500/30 text-warp-300'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Overview ────────────────────────────────────── */}
      {walletTab === 'overview' && (
        <>
          {/* Balance Card */}
          <div className="glass-panel p-5 text-center animate-pulse-glow">
            <div className="flex justify-center mb-3">
              <div className="profile-icon-ring">
                <img src={import.meta.env.BASE_URL + 'profile.svg'} alt="Profile" className="profile-icon w-16 h-16 sm:w-20 sm:h-20" />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className={`text-lg ${levelDef.color}`}>{wallet.levelSymbol}</span>
              <span className={`text-xs font-bold ${levelDef.color}`}>{wallet.levelTitle}</span>
            </div>
            <p className="text-xs text-gray-400 mb-1">{wallet.alias ? `@${wallet.alias}` : 'Warp Balance'}</p>
            <div className="text-4xl sm:text-5xl font-bold text-gray-100 mb-1 animate-float">
              {wallet.balance.toLocaleString()} <span className="text-2xl">{'\u03A9'}</span>
            </div>
            <p className="text-[10px] text-gray-500">WARP ENERGY UNITS</p>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              {wallet.isAdmin && <span className="text-[10px] px-2 py-0.5 rounded-none bg-amber-500/20 text-amber-400 border border-amber-500/30">ADMIN</span>}
              <span className="text-[10px] px-2 py-0.5 rounded-none bg-warp-500/20 text-warp-300 border border-warp-500/30">{'\u2B21'} CosmoID</span>
              <span className="text-[10px] px-2 py-0.5 rounded-none bg-green-500/20 text-green-400 border border-green-500/30">{'\u26BF'} ENCRYPTED</span>
              <button onClick={lock} className="text-[10px] px-2 py-0.5 rounded-none bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors cursor-pointer">{'\u274C'} Lock</button>
            </div>
          </div>

          {/* Address */}
          <div className="glass-panel p-3">
            <p className="text-[10px] text-gray-500 mb-1">YOUR ADDRESS (Ed25519)</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-energy-400 flex-1 truncate">{wallet.address}</code>
              <button onClick={copyAddress} className="warp-button text-xs px-2 py-1">{copied ? '\u2713 Copied' : 'Copy'}</button>
            </div>
          </div>

          {/* Sync info */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[10px] text-gray-500">SYNC & BACKUP</p>
                <p className="text-xs text-gray-400">CosmoID + CosmoLink available in Settings</p>
              </div>
              <button onClick={handleExport} className="text-[10px] px-3 py-1.5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all cursor-pointer">{'\u2B07'} .json</button>
            </div>
            <p className="text-[10px] text-gray-600">Sign in with the same username + password on any device. Or use CosmoLink for quick transfer.</p>
          </div>

          {/* Level Progress */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-300"><span className={levelDef.color}>{wallet.levelSymbol}</span> Level {wallet.level}: {wallet.levelName}</h3>
              <span className="text-xs text-gray-500">{wallet.xp} XP</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-2">
              <span>Reward: <span className="text-energy-400">{wallet.rewardMultiplier}x</span></span>
              <span>Streak: <span className="text-star-400">{wallet.streakDays} days</span></span>
            </div>
            {nextLevel ? (
              <div>
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>Progress to {nextLevel.name}</span>
                  <span>{levelProgress}%</span>
                </div>
                <div className="w-full bg-cosmic-900/60 rounded-none h-2">
                  <div className="h-2 rounded-none transition-all duration-500" style={{ width: `${levelProgress}%`, background: 'linear-gradient(90deg, #a855f7, #06b6d4)' }} />
                </div>
              </div>
            ) : <p className="text-[10px] text-amber-300">Maximum level reached!</p>}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="glass-panel p-3 text-center"><p className="text-lg font-bold text-energy-400">{wallet.transactions.length}</p><p className="text-[10px] text-gray-500">TXs</p></div>
            <div className="glass-panel p-3 text-center"><p className="text-lg font-bold text-nebula-400">{wallet.transactions.filter(t => t.type === 'mine').length}</p><p className="text-[10px] text-gray-500">MINED</p></div>
            <div className="glass-panel p-3 text-center"><p className="text-lg font-bold text-star-400">{wallet.transactions.filter(t => t.type === 'send').reduce((a, t) => a + t.amount, 0)}</p><p className="text-[10px] text-gray-500">SENT</p></div>
            <div className="glass-panel p-3 text-center"><p className="text-lg font-bold text-warp-400">{wallet.streakDays}</p><p className="text-[10px] text-gray-500">STREAK</p></div>
          </div>

          {/* Tokenomics */}
          {supplyInfo && (
            <div className="glass-panel p-4">
              <h3 className="text-sm font-bold text-gray-300 mb-3">Tokenomics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div><span className="text-gray-500">Total Supply:</span><span className="text-warp-400 ml-1">{supplyInfo.total.toLocaleString()}</span></div>
                <div><span className="text-gray-500">Circulating:</span><span className="text-energy-400 ml-1">{supplyInfo.circulating.toLocaleString()}</span></div>
                <div><span className="text-gray-500">Mining Reward:</span><span className="text-star-400 ml-1">{supplyInfo.currentReward.toFixed(2)} {'\u03A9'}</span></div>
                <div><span className="text-gray-500">Epoch:</span><span className="text-nebula-400 ml-1">{supplyInfo.currentEpoch}</span></div>
                <div><span className="text-gray-500">Mined:</span><span className="text-cyan-400 ml-1">{supplyInfo.percentMined.toFixed(2)}%</span></div>
                <div><span className="text-gray-500">Burned:</span><span className="text-red-400 ml-1">{supplyInfo.burned.toLocaleString()}</span></div>
              </div>
            </div>
          )}

          {/* Mesh Stats */}
          {meshStats && (
            <div className="glass-panel p-4">
              <h3 className="text-sm font-bold text-gray-300 mb-3">CosmoMesh Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div><span className="text-gray-500">DAG Nodes:</span><span className="text-warp-400 ml-1">{meshStats.totalTransactions}</span></div>
                <div><span className="text-gray-500">Active Tips:</span><span className="text-energy-400 ml-1">{meshStats.totalTips}</span></div>
                <div><span className="text-gray-500">Avg Resonance:</span><span className="text-star-400 ml-1">{(meshStats.avgResonance * 100).toFixed(1)}%</span></div>
                <div><span className="text-gray-500">Finalized:</span><span className="text-green-400 ml-1">{meshStats.finalizedCount}</span></div>
                <div><span className="text-gray-500">Max Depth:</span><span className="text-nebula-400 ml-1">{meshStats.maxDepth}</span></div>
                <div><span className="text-gray-500">TPS:</span><span className="text-energy-400 ml-1">{meshStats.totalTps.toFixed(2)}</span></div>
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
                      tx.type === 'mine' ? 'text-star-400' : tx.type === 'send' ? 'text-nebula-400' :
                      tx.type === 'genesis' || tx.type === 'airdrop' ? 'text-warp-400' : tx.type === 'level_up' ? 'text-amber-400' :
                      tx.type === 'wart_mint' ? 'text-pink-400' : tx.type === 'wart_buy' ? 'text-cyan-400' :
                      tx.type === 'wart_transfer' ? 'text-purple-400' : 'text-energy-400'
                    }`}>
                      {tx.type === 'mine' ? '\u26CF' : tx.type === 'send' ? '\u2197' :
                       tx.type === 'genesis' || tx.type === 'airdrop' ? '\u2B21' : tx.type === 'level_up' ? '\u2605' :
                       tx.type === 'wart_mint' ? '\u2742' : tx.type === 'wart_buy' ? '\u2B22' :
                       tx.type === 'wart_transfer' ? '\u21C4' : '\u2199'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 truncate">
                        {tx.memo || (tx.type === 'genesis' || tx.type === 'airdrop' ? 'Airdrop' :
                          tx.type === 'mine' ? 'Mining Reward' : tx.type === 'level_up' ? 'Level Up Bonus' :
                          tx.type === 'streak_reward' ? 'Streak Reward' : tx.type === 'send' ? `To ${shortAddress(tx.to)}` :
                          `From ${shortAddress(tx.from)}`)}
                      </p>
                      <div className="flex gap-2 text-[10px] text-gray-500">
                        {tx.layer !== undefined && <span className="text-warp-400/60">{LAYER_NAMES[tx.layer]}</span>}
                        {tx.resonanceScore !== undefined && <span className="text-energy-400/60">{(tx.resonanceScore * 100).toFixed(0)}% resonance</span>}
                      </div>
                    </div>
                    <span className={`font-bold shrink-0 ${tx.type === 'send' || tx.type === 'wart_buy' ? 'text-nebula-400' : 'text-energy-400'}`}>
                      {tx.type === 'send' || tx.type === 'wart_buy' ? '-' : '+'}{tx.amount} {'\u03A9'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Send Tab ────────────────────────────────────── */}
      {walletTab === 'send' && (
        <>
          <div className="glass-panel p-5">
            <h2 className="text-lg font-bold text-gray-100 mb-1 font-title">{'\u2197'} Send Warps</h2>
            <p className="text-xs text-gray-500 mb-4">
              Balance: <span className="text-energy-400">{wallet.balance.toLocaleString()} {'\u03A9'}</span>
              <span className="text-gray-600 ml-2">Ed25519 signed + DAG validated</span>
            </p>
            <div className="space-y-3 max-w-md mx-auto">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">RECIPIENT ADDRESS</label>
                <input className="warp-input" placeholder="CW..." value={sendTo} onChange={e => setSendTo(e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">AMOUNT ({'\u03A9'})</label>
                <div className="flex gap-2">
                  <input className="warp-input" type="number" placeholder="0" min="0" step="0.1" value={sendAmount} onChange={e => setSendAmount(e.target.value)} />
                  <button className="warp-button text-xs shrink-0" onClick={() => setSendAmount(wallet.balance.toString())}>MAX</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">MEMO (optional)</label>
                <input className="warp-input" placeholder="What's this for?" value={sendMemo} onChange={e => setSendMemo(e.target.value)} />
              </div>
              {sendResult && (
                <div className={`text-sm p-3 rounded-none ${sendResult.success ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                  {sendResult.message}
                </div>
              )}
              <button className="warp-button w-full py-3 text-base" onClick={handleSend} disabled={!sendTo || !sendAmount || sending}>
                {sending ? <span className="flex items-center justify-center gap-2"><Spinner />Signing & Validating...</span> : <>{'\u26A1'} Send Transaction</>}
              </button>
            </div>
          </div>
          <div className="glass-panel p-4">
            <p className="text-[10px] text-gray-500 mb-2">QUICK AMOUNTS</p>
            <div className="flex gap-2 flex-wrap">
              {[10, 25, 50, 100].map(a => (
                <button key={a} className="warp-button text-xs" onClick={() => setSendAmount(a.toString())} disabled={a > wallet.balance}>{a} {'\u03A9'}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── Mine Tab ────────────────────────────────────── */}
      {walletTab === 'mine' && (
        <>
          <div className="glass-panel p-5">
            <h2 className="text-lg font-bold text-gray-100 mb-1 font-title">{'\u26CF'} Warp Mining</h2>
            <p className="text-xs text-gray-500 mb-2">Execute CosmoCode programs to mine Warps via proof-of-computation.</p>
            <div className="flex gap-3 text-[10px] text-gray-500 mb-4 flex-wrap">
              <span>Current Reward: <span className="text-energy-400">{supplyInfo?.currentReward.toFixed(2) || '50.00'} {'\u03A9'}</span></span>
              <span>Your Multiplier: <span className="text-star-400">{wallet.rewardMultiplier}x</span></span>
              <span>Epoch: <span className="text-warp-400">{supplyInfo?.currentEpoch || 0}</span></span>
            </div>
            <div className="mb-4">
              <p className="text-[10px] text-gray-400 mb-2">DIFFICULTY</p>
              <div className="flex gap-2">
                {(Object.keys(DIFFICULTY_INFO) as Difficulty[]).map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 px-3 rounded-none text-xs font-medium transition-all cursor-pointer ${
                      difficulty === d ? 'bg-warp-500/30 border border-warp-500/50 text-warp-300' : 'bg-cosmic-900/40 border border-gray-700/30 text-gray-400 hover:text-gray-200'
                    }`}>
                    <div className="font-bold">{DIFFICULTY_INFO[d].label}</div>
                    <div className={`text-[10px] ${DIFFICULTY_INFO[d].color}`}>{DIFFICULTY_INFO[d].reward}</div>
                  </button>
                ))}
              </div>
            </div>
            <button className="warp-button w-full py-3 text-base" onClick={startMining} disabled={mining}>
              {mining ? <span className="flex items-center justify-center gap-2"><Spinner />Mining...</span> : <>{'\u26A1'} Start Mining</>}
            </button>
            {lastReward !== null && !mining && (
              <div className="mt-3 text-center p-3 rounded-none bg-green-500/10 border border-green-500/30">
                <span className="text-green-400 font-bold">+{lastReward} {'\u03A9'}</span>
                <span className="text-green-400/70 text-xs ml-2">mined successfully</span>
              </div>
            )}
          </div>
          <div className="glass-panel p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-2">{'\u25B7'} Mining Log</h3>
            <div ref={miningLogRef} className="bg-cosmic-900/80 rounded-none p-3 h-48 overflow-y-auto text-xs space-y-1">
              {miningLogs.length === 0 ? <p className="text-gray-600">Waiting for mining operation...</p> : (
                miningLogs.map((log, i) => (
                  <div key={i} className={log.type === 'success' ? 'text-green-400' : log.type === 'energy' ? 'text-energy-400' : log.type === 'level_up' ? 'text-amber-400 font-bold' : 'text-gray-400'}>
                    {log.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
