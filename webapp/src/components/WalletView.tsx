import { useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { LAYER_NAMES } from '../engine/cosmomesh';
import { HIERARCHY_LEVELS } from '../engine/hierarchy';
import MineView from './MineView';
import FiatGatewayView from './FiatGatewayView';
import Logo from './Logo';
import HexAvatar from './HexAvatar';

type WalletTab = 'overview' | 'send' | 'mine' | 'payment';
type AuthTab = 'signup' | 'signin';
type SignInMethod = 'cosmoid' | 'cosmolink' | 'file';

export default function WalletView() {
  const {
    wallet, unlocked, needsMigration,
    meshStats, supplyInfo, levelProgress,
    cosmoIDLogin, unlock, lock, migrate, send,
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

  // Mine tab now uses MineView component directly

  // Spinner component
  const Spinner = () => (
    <span className="inline-block w-4 h-4 border-2 border-current/10 border-t-current rounded-none animate-spin" />
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
          <Logo className="w-16 h-16 sm:w-20 sm:h-20 animate-float" />
        </div>
        <h2 className="text-title-md sm:text-title-lg font-bold opacity-100 mb-1 font-title">{'\u30B3\u30B9\u30E2\u30E9\u30EC'}</h2>
        <p className="text-body-sm opacity-60 mb-1">Cosmorare</p>
        <p className="text-body-sm opacity-40 mb-5">
          Protocole de certification pour objets rares
        </p>

        {/* ─── Sign Up / Sign In tabs ──────────────────── */}
        <div className="flex max-w-xs mx-auto mb-5 border border-current/15 overflow-hidden">
          <button
            onClick={() => setAuthTab('signup')}
            className={`flex-1 py-2.5 text-base font-bold transition-colors cursor-pointer ${
              authTab === 'signup'
                ? 'bg-current/5 opacity-80 border-b-2 border-current/20'
                : 'opacity-40 hover:opacity-70 hover:bg-current/5'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => setAuthTab('signin')}
            className={`flex-1 py-2.5 text-base font-bold transition-colors cursor-pointer ${
              authTab === 'signin'
                ? 'bg-current/5 opacity-80 border-b-2 border-current/20'
                : 'opacity-40 hover:opacity-70 hover:bg-current/5'
            }`}
          >
            Sign In
          </button>
        </div>

        {authTab === 'signup' ? (
          <div className="max-w-xs mx-auto space-y-3">
            <p className="text-base opacity-50 mb-1">
              Create your wallet and receive 1,000 {'\u03A9'} airdrop.
            </p>

            <div className="p-3 bg-current/5 border border-current/10 text-left">
              <p className="text-label opacity-80 font-bold mb-1">CosmoID</p>
              <p className="text-label opacity-50">Same username + password = same wallet on any device. No backup file needed.</p>
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
            {createError && <p className="text-body-sm opacity-70">{createError}</p>}
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
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /></svg>
                  Sign Up
                </span>
              )}
            </button>
            <p className="text-label opacity-30 pt-2">Ed25519 + PBKDF2 (600K rounds) + AES-256-GCM</p>
          </div>
        ) : (
          <div className="max-w-xs mx-auto space-y-3">
            {/* Sign In method selector */}
            <div className="flex gap-1 mb-2">
              {([
                { id: 'cosmoid' as SignInMethod, label: 'CosmoID', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /></svg> },
                { id: 'cosmolink' as SignInMethod, label: 'CosmoLink', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> },
                { id: 'file' as SignInMethod, label: 'File', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> },
              ]).map(m => (
                <button
                  key={m.id}
                  onClick={() => setSignInMethod(m.id)}
                  className={`flex-1 py-2 text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    signInMethod === m.id
                      ? 'bg-current/5 opacity-80 border border-current/10'
                      : 'opacity-40 hover:opacity-70 border border-current/10 hover:bg-current/5'
                  }`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {/* ─── CosmoID Sign In ────────────────────────── */}
            {signInMethod === 'cosmoid' && (
              <div className="space-y-3">
                <p className="text-base opacity-50">Sign in with your CosmoID credentials.</p>
                <p className="text-label opacity-40">Same username + password = same wallet, any device.</p>
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
                {signInError && <p className="text-body-sm opacity-70">{signInError}</p>}
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
                <p className="text-base opacity-50">Paste a CosmoLink code from another device.</p>
                <p className="text-label opacity-40">CosmoLink is an encrypted transfer code you can share via any messaging app.</p>
                <textarea
                  className="warp-input text-center text-body-sm min-h-[80px] resize-none"
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
                {cosmoLinkError && <p className="text-body-sm opacity-70">{cosmoLinkError}</p>}
                <button
                  className="warp-button w-full py-3 text-base"
                  onClick={handleCosmoLinkImport}
                  disabled={!cosmoLinkInput.trim() || !cosmoLinkPassword}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    Import
                  </span>
                </button>
              </div>
            )}

            {/* ─── File Import (legacy) ──────────────────── */}
            {signInMethod === 'file' && (
              <div className="space-y-3">
                <p className="text-base opacity-50">Restore from a recovery file.</p>
                <p className="text-label opacity-40">Legacy method: upload the .json file exported from a previous wallet.</p>
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setImportData(reader.result as string);
                  reader.readAsText(file);
                }} />
                {!importData ? (
                  <button className="warp-button w-full py-4 text-base border-dashed" onClick={() => fileInputRef.current?.click()}>
                    <span className="flex items-center justify-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      Select Recovery Key (.json)
                    </span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-current/5 border border-current/10 text-body-sm opacity-80 flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      File loaded
                    </div>
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
                    {importError && <p className="text-body-sm opacity-70">{importError}</p>}
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
        <h2 className="text-title-md font-bold opacity-60 mb-2 font-title flex items-center justify-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
          Security Upgrade
        </h2>
        <p className="text-base opacity-50 mb-4">Your wallet needs encryption. Set a password to secure your private key.</p>
        <div className="max-w-xs mx-auto space-y-3">
          <input className="warp-input text-center" type="password" placeholder="Choose a password (min 6 chars)" value={password} onChange={e => { setPassword(e.target.value); setCreateError(''); }} />
          <input className="warp-input text-center" type="password" placeholder="Confirm password" value={passwordConfirm} onChange={e => { setPasswordConfirm(e.target.value); setCreateError(''); }} />
          {createError && <p className="text-body-sm opacity-70">{createError}</p>}
          <button className="warp-button w-full text-base py-3" onClick={async () => {
            if (password.length < 6) { setCreateError('Min 6 characters'); return; }
            if (password !== passwordConfirm) { setCreateError('Passwords do not match'); return; }
            const ok = await migrate(password);
            if (!ok) setCreateError('Migration failed');
          }} disabled={!password}>
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              Encrypt & Secure Wallet
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ─── Welcome screen (after CosmoID signup) ──────────────
  if (showWelcome && unlocked) {
    return (
      <div className="glass-panel p-6 sm:p-8 text-center max-w-md mx-auto">
        <div className="flex justify-center mb-4">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /></svg>
        </div>
        <h2 className="text-title-md font-bold opacity-80 mb-2 font-title">Bienvenue sur Cosmorare !</h2>
        <p className="text-base opacity-70 mb-2">Your wallet is ready.</p>

        <div className="p-4 bg-current/5 border border-current/10 mb-5 text-left space-y-3">
          <div className="flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-80 shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12" /></svg>
            <div>
              <p className="text-body-sm opacity-90 font-bold">CosmoID Active</p>
              <p className="text-label opacity-50">Your wallet is linked to your username + password. Sign in with the same credentials on any device to access the same wallet.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-80 shrink-0 mt-0.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            <div>
              <p className="text-body-sm opacity-90 font-bold">No backup file needed</p>
              <p className="text-label opacity-50">Unlike traditional crypto wallets, you don't need to save a seed phrase or download a file. Just remember your username and password.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-80 shrink-0 mt-0.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
            <div>
              <p className="text-body-sm opacity-90 font-bold">Quick device transfer</p>
              <p className="text-label opacity-50">Need to transfer your local data? Generate a CosmoLink in Settings and paste it on your other device.</p>
            </div>
          </div>
        </div>

        <div className="text-body-sm opacity-50 mb-5">
          <span className="opacity-80 font-bold">+{wallet.balance.toLocaleString()} {'\u03A9'}</span> airdrop received
        </div>

        <button className="warp-button w-full py-3 text-base" onClick={() => setShowWelcome(false)}>
          <span className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /></svg>
            Entrer dans Cosmorare
          </span>
        </button>

        <p className="text-label opacity-30 mt-3">Ed25519 + PBKDF2 (600K) + AES-256-GCM</p>
      </div>
    );
  }

  // ─── Locked wallet ─────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="glass-panel p-6 sm:p-8 text-center max-w-md mx-auto">
        <div className="flex justify-center mb-3">
          <Logo className="w-14 h-14 sm:w-16 sm:h-16 opacity-60" />
        </div>
        <p className="text-base opacity-50 mb-1">Welcome back</p>
        <h2 className="text-title-md font-bold opacity-100 mb-1 font-title">{wallet.alias ? `@${wallet.alias}` : shortAddress(wallet.address)}</h2>
        <p className="text-title-sm font-bold opacity-100/40 mb-5">{wallet.balance.toLocaleString()} {'\u03A9'}</p>
        <div className="max-w-xs mx-auto space-y-3">
          <input className="warp-input text-center" type="password" placeholder="Enter your password" value={unlockPassword}
            onChange={e => { setUnlockPassword(e.target.value); setUnlockError(''); }}
            onKeyDown={e => { if (e.key === 'Enter' && unlockPassword) { setUnlocking(true); unlock(unlockPassword).then(ok => { if (!ok) setUnlockError('Wrong password'); setUnlocking(false); setUnlockPassword(''); }); } }}
            autoFocus
          />
          {unlockError && <p className="text-body-sm opacity-70">{unlockError}</p>}
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
    a.href = url; a.download = `cosmorare-wallet-${shortAddress(wallet.address)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Send handler ──────────────────────────────────────
  const handleSend = async () => {
    const addr = sendTo.trim();
    if (!addr.startsWith('CW') || addr.length < 10) {
      setSendResult({ success: false, message: 'Invalid address — must start with CW' }); return;
    }
    if (addr === wallet.address) {
      setSendResult({ success: false, message: 'Cannot send to yourself' }); return;
    }
    const amt = parseFloat(sendAmount);
    if (isNaN(amt) || amt <= 0) { setSendResult({ success: false, message: 'Invalid amount' }); return; }
    if (amt > wallet.balance) { setSendResult({ success: false, message: 'Insufficient balance' }); return; }
    setSending(true);
    try {
      const res = await send(sendTo.trim(), amt, sendMemo || undefined);
      if (res.success) { setSendResult({ success: true, message: `Sent ${amt} \u03A9 via CosmoMesh DAG!` }); setSendTo(''); setSendAmount(''); setSendMemo(''); }
      else setSendResult({ success: false, message: res.error || 'Transaction failed' });
    } catch (err) { setSendResult({ success: false, message: err instanceof Error ? err.message : 'Transaction failed' }); }
    finally { setSending(false); }
    setTimeout(() => setSendResult(null), 4000);
  };

  // Mine handler is now in MineView component

  // ─── Unlocked wallet: Full view ────────────────────────
  const recentTxs = wallet.transactions.slice(0, 8);
  const levelDef = HIERARCHY_LEVELS[wallet.level];
  const nextLevel = wallet.level < 6 ? HIERARCHY_LEVELS[wallet.level + 1] : null;

  const subTabIcons: Record<WalletTab, ReactNode> = {
    overview: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    send: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
    mine: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>,
    payment: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M15 9.354a4 4 0 0 0-2.764-1.354C10.448 7.89 9 9.005 9 10.5c0 1.38 1.12 2.5 3.236 2.5C14.12 13 16 14.12 16 15.5c0 1.495-1.448 2.61-3.236 2.5A4 4 0 0 1 10 16.646" /><line x1="12" y1="6" x2="12" y2="8" /><line x1="12" y1="18" x2="12" y2="20" /></svg>,
  };
  const subTabs: { id: WalletTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'send', label: 'Send' },
    { id: 'mine', label: 'Mine' },
    { id: 'payment', label: 'Paiement' },
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
              className={`flex-1 px-3 py-2 rounded-none text-body-sm font-medium transition-all cursor-pointer ${
                walletTab === t.id
                  ? 'bg-current/10 opacity-80'
                  : 'opacity-50 hover:opacity-90 hover:bg-current/5'
              }`}
            >
              <span className="flex items-center gap-1.5">{subTabIcons[t.id]} {t.label}</span>
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
              <HexAvatar address={wallet.address} size={80} />
            </div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className={`text-title-sm ${levelDef.color}`}>{wallet.levelSymbol}</span>
              <span className={`text-body-sm font-bold ${levelDef.color}`}>{wallet.levelTitle}</span>
            </div>
            <p className="text-body-sm opacity-50 mb-1">{wallet.alias ? `@${wallet.alias}` : 'Cosmorare Balance'}</p>
            <div className="text-4xl sm:text-5xl font-bold opacity-100 mb-1 animate-float">
              {wallet.balance.toLocaleString()} <span className="text-title-lg">{'\u03A9'}</span>
            </div>
            <p className="text-label opacity-40">COSMORARE ENERGY UNITS</p>
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              {wallet.isAdmin && <span className="text-label px-2 py-0.5 rounded-none bg-current/5 opacity-60 border border-current/10">ADMIN</span>}
              <span className="text-label px-2 py-0.5 rounded-none bg-current/5 opacity-80 border border-current/10 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /></svg>
                CosmoID
              </span>
              <span className="text-label px-2 py-0.5 rounded-none bg-current/5 opacity-80 border border-current/10 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                ENCRYPTED
              </span>
              <button onClick={lock} className="text-label px-2 py-0.5 rounded-none bg-current/5 opacity-70 border border-current/15 hover:bg-current/5 transition-colors cursor-pointer flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Lock
              </button>
            </div>
          </div>

          {/* Address */}
          <div className="glass-panel p-3">
            <p className="text-label opacity-40 mb-1">YOUR ADDRESS (Ed25519)</p>
            <div className="flex items-center gap-2">
              <code className="text-body-sm opacity-80 flex-1 truncate">{wallet.address}</code>
              <button onClick={copyAddress} className="warp-button text-body-sm px-2 py-1">
                {copied ? (
                  <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> Copied</span>
                ) : 'Copy'}
              </button>
            </div>
          </div>

          {/* Sync info */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-label opacity-40">SYNC & BACKUP</p>
                <p className="text-body-sm opacity-50">CosmoID + CosmoLink available in Settings</p>
              </div>
              <button onClick={handleExport} className="text-label px-3 py-1.5 border border-current/15 opacity-50 hover:opacity-90 hover:bg-current/5 transition-all cursor-pointer flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                .json
              </button>
            </div>
            <p className="text-label opacity-30">Sign in with the same username + password on any device. Or use CosmoLink for quick transfer.</p>
          </div>

          {/* Level Progress */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold opacity-70"><span className={levelDef.color}>{wallet.levelSymbol}</span> Level {wallet.level}: {wallet.levelName}</h3>
              <span className="text-body-sm opacity-40">{wallet.xp} XP</span>
            </div>
            <div className="flex items-center gap-2 text-label opacity-40 mb-2">
              <span>Reward: <span className="opacity-80">{wallet.rewardMultiplier}x</span></span>
              <span>Streak: <span className="opacity-80">{wallet.streakDays} days</span></span>
            </div>
            {nextLevel ? (
              <div>
                <div className="flex justify-between text-label opacity-40 mb-1">
                  <span>Progress to {nextLevel.name}</span>
                  <span>{levelProgress}%</span>
                </div>
                <div className="w-full bg-current/5 rounded-none h-2">
                  <div className="h-2 rounded-none transition-all duration-500" style={{ width: `${levelProgress}%`, background: 'currentColor', opacity: 0.3 }} />
                </div>
              </div>
            ) : <p className="text-label opacity-80">Maximum level reached!</p>}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="glass-panel p-3 text-center"><p className="text-title-sm font-bold opacity-80">{wallet.transactions.length}</p><p className="text-label opacity-40">TXs</p></div>
            <div className="glass-panel p-3 text-center"><p className="text-title-sm font-bold opacity-80">{wallet.transactions.filter(t => t.type === 'mine').length}</p><p className="text-label opacity-40">MINED</p></div>
            <div className="glass-panel p-3 text-center"><p className="text-title-sm font-bold opacity-80">{wallet.transactions.filter(t => t.type === 'send').reduce((a, t) => a + t.amount, 0)}</p><p className="text-label opacity-40">SENT</p></div>
            <div className="glass-panel p-3 text-center"><p className="text-title-sm font-bold opacity-80">{wallet.streakDays}</p><p className="text-label opacity-40">STREAK</p></div>
          </div>

          {/* Tokenomics */}
          {supplyInfo && (
            <div className="glass-panel p-4">
              <h3 className="text-base font-bold opacity-70 mb-3">Tokenomics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm">
                <div><span className="opacity-40">Total Supply:</span><span className="opacity-80 ml-1">{supplyInfo.total.toLocaleString()}</span></div>
                <div><span className="opacity-40">Circulating:</span><span className="opacity-80 ml-1">{supplyInfo.circulating.toLocaleString()}</span></div>
                <div><span className="opacity-40">Mining Reward:</span><span className="opacity-80 ml-1">{supplyInfo.currentReward.toFixed(2)} {'\u03A9'}</span></div>
                <div><span className="opacity-40">Epoch:</span><span className="opacity-80 ml-1">{supplyInfo.currentEpoch}</span></div>
                <div><span className="opacity-40">Mined:</span><span className="opacity-80 ml-1">{supplyInfo.percentMined.toFixed(2)}%</span></div>
                <div><span className="opacity-40">Burned:</span><span className="opacity-70 ml-1">{supplyInfo.burned.toLocaleString()}</span></div>
              </div>
            </div>
          )}

          {/* Mesh Stats */}
          {meshStats && (
            <div className="glass-panel p-4">
              <h3 className="text-base font-bold opacity-70 mb-3">CosmoMesh Status</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm">
                <div><span className="opacity-40">DAG Nodes:</span><span className="opacity-80 ml-1">{meshStats.totalTransactions}</span></div>
                <div><span className="opacity-40">Active Tips:</span><span className="opacity-80 ml-1">{meshStats.totalTips}</span></div>
                <div><span className="opacity-40">Avg Resonance:</span><span className="opacity-80 ml-1">{(meshStats.avgResonance * 100).toFixed(1)}%</span></div>
                <div><span className="opacity-40">Finalized:</span><span className="opacity-80 ml-1">{meshStats.finalizedCount}</span></div>
                <div><span className="opacity-40">Max Depth:</span><span className="opacity-80 ml-1">{meshStats.maxDepth}</span></div>
                <div><span className="opacity-40">TPS:</span><span className="opacity-80 ml-1">{meshStats.totalTps.toFixed(2)}</span></div>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-70 mb-3">Recent Transactions</h3>
            {recentTxs.length === 0 ? (
              <p className="text-body-sm opacity-40 text-center py-4">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {recentTxs.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 p-2 rounded-none bg-current/5 text-body-sm">
                    <span className={`text-base ${
                      tx.type === 'mine' ? 'opacity-80' : tx.type === 'send' ? 'opacity-80' :
                      tx.type === 'genesis' || tx.type === 'airdrop' ? 'opacity-80' : tx.type === 'level_up' ? 'opacity-60' :
                      tx.type === 'wart_mint' ? 'opacity-80' : tx.type === 'wart_buy' ? 'opacity-80' :
                      tx.type === 'wart_transfer' ? 'opacity-80' : 'opacity-80'
                    }`}>
                      {tx.type === 'mine' ? '\u26CF' : tx.type === 'send' ? '\u2197' :
                       tx.type === 'genesis' || tx.type === 'airdrop' ? '\u2B21' : tx.type === 'level_up' ? '\u2605' :
                       tx.type === 'wart_mint' ? '\u2742' : tx.type === 'wart_buy' ? '\u2B22' :
                       tx.type === 'wart_transfer' ? '\u21C4' : '\u2199'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="opacity-70 truncate">
                        {tx.memo || (tx.type === 'genesis' || tx.type === 'airdrop' ? 'Airdrop' :
                          tx.type === 'mine' ? 'Mining Reward' : tx.type === 'level_up' ? 'Level Up Bonus' :
                          tx.type === 'streak_reward' ? 'Streak Reward' : tx.type === 'send' ? `To ${shortAddress(tx.to)}` :
                          `From ${shortAddress(tx.from)}`)}
                      </p>
                      <div className="flex gap-2 text-label opacity-40">
                        {tx.layer !== undefined && <span className="opacity-80/60">{LAYER_NAMES[tx.layer]}</span>}
                        {tx.resonanceScore !== undefined && <span className="opacity-80/60">{(tx.resonanceScore * 100).toFixed(0)}% resonance</span>}
                      </div>
                    </div>
                    <span className={`font-bold shrink-0 ${tx.type === 'send' || tx.type === 'wart_buy' ? 'opacity-80' : 'opacity-80'}`}>
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
            <h2 className="text-title-sm font-bold opacity-100 mb-1 font-title flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              Send Warps
            </h2>
            <p className="text-body-sm opacity-40 mb-4">
              Balance: <span className="opacity-80">{wallet.balance.toLocaleString()} {'\u03A9'}</span>
              <span className="opacity-30 ml-2">Ed25519 signed + DAG validated</span>
            </p>
            <div className="space-y-3 max-w-md mx-auto">
              <div>
                <label className="text-label opacity-50 block mb-1">RECIPIENT ADDRESS</label>
                <input className="warp-input" placeholder="CW..." value={sendTo} onChange={e => setSendTo(e.target.value)} />
              </div>
              <div>
                <label className="text-label opacity-50 block mb-1">AMOUNT ({'\u03A9'})</label>
                <div className="flex gap-2">
                  <input className="warp-input" type="number" placeholder="0" min="0" step="0.1" value={sendAmount} onChange={e => setSendAmount(e.target.value)} />
                  <button className="warp-button text-body-sm shrink-0" onClick={() => setSendAmount(wallet.balance.toString())}>MAX</button>
                </div>
              </div>
              <div>
                <label className="text-label opacity-50 block mb-1">MEMO (optional)</label>
                <input className="warp-input" placeholder="What's this for?" value={sendMemo} onChange={e => setSendMemo(e.target.value)} />
              </div>
              {sendResult && (
                <div className={`text-base p-3 rounded-none ${sendResult.success ? 'bg-current/5 border border-current/10 opacity-80' : 'bg-current/5 border border-current/15 opacity-70'}`}>
                  {sendResult.message}
                </div>
              )}
              <button className="warp-button w-full py-3 text-base" onClick={handleSend} disabled={!sendTo || !sendAmount || sending}>
                {sending ? <span className="flex items-center justify-center gap-2"><Spinner />Signing & Validating...</span> : (
                  <span className="flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    Send Transaction
                  </span>
                )}
              </button>
            </div>
          </div>
          <div className="glass-panel p-4">
            <p className="text-label opacity-40 mb-2">QUICK AMOUNTS</p>
            <div className="flex gap-2 flex-wrap">
              {[10, 25, 50, 100].map(a => (
                <button key={a} className="warp-button text-body-sm" onClick={() => setSendAmount(a.toString())} disabled={a > wallet.balance}>{a} {'\u03A9'}</button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ─── Mine Tab ────────────────────────────────────── */}
      {walletTab === 'mine' && <MineView />}

      {/* ─── Payment Tab ─────────────────────────────────── */}
      {walletTab === 'payment' && <FiatGatewayView />}
    </div>
  );
}
