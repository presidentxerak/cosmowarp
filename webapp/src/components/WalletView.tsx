import { useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { LAYER_NAMES } from '../engine/strangrmesh';
import { HIERARCHY_LEVELS } from '../engine/hierarchy';
import { setup2FA, enable2FA, disable2FA, is2FAEnabled } from '../engine/totp';
import { SocialEngine } from '../engine/social';
import { isAliasTakenCloud } from '../lib/supabase-db';
// MineView removed — mining disabled
import FiatGatewayView from './FiatGatewayView';
import Logo from './Logo';
import HexAvatar from './HexAvatar';
import InfoTooltip from './InfoTooltip';
import { copyToClipboard } from '../lib/clipboard';

type WalletTab = 'overview' | 'payment' | 'ethereum';
type AuthTab = 'signup' | 'signin';
type SignInMethod = 'strangrzid' | 'strangrzlink' | 'file';

/** Welcome tutorial — shown on first sign-up */
function WelcomeTutorial({ wallet, onNavigate, onSkip }: { wallet: { balance: number }; onNavigate: (tab: string) => void; onSkip: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Bienvenue sur Strangrz !',
      desc: 'Votre compte est prêt. Strangrz est une plateforme de certification pour objets rares : art, cartes, sneakers, vinyles, montres...',
      icon: '\u2B21',
    },
    {
      title: 'Publiez vos oeuvres',
      desc: 'Chaque oeuvre reçoit un certificat d\'authenticité infalsifiable (STCERT). Fixez un prix en euros et recevez vos paiements directement sur votre compte bancaire.',
      icon: '\u2B06',
    },
    {
      title: 'Collectionnez',
      desc: 'Parcourez la marketplace, achetez par carte bancaire en euros. Le protocole gère le certificat, la provenance et les royalties automatiquement.',
      icon: '\u2B23',
    },
  ];

  if (step < steps.length) {
    return (
      <div className="glass-panel p-6 sm:p-8 text-center max-w-md mx-auto">
        <div className="text-4xl mb-4 opacity-60">{steps[step].icon}</div>
        <h2 className="text-title-md font-bold opacity-80 mb-2 font-title">{steps[step].title}</h2>
        {step === 0 && (
          <div className="text-body-sm opacity-50 mb-3">
            <span className="opacity-80 font-bold">+{wallet.balance.toLocaleString()} {'\u2B23'}</span> reward coins received
          </div>
        )}
        <p className="text-base opacity-60 mb-6 leading-relaxed">{steps[step].desc}</p>

        {/* Step dots */}
        <div className="flex justify-center gap-2 mb-5">
          {steps.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-current opacity-80 scale-125' : 'bg-current/20'}`} />
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 py-2.5 text-body-sm opacity-40 border border-current/10 hover:opacity-60 transition-all cursor-pointer"
          >
            Skip
          </button>
          <button
            onClick={() => setStep(step + 1)}
            className="warp-button flex-1 py-2.5 text-body-sm"
          >
            {step < steps.length - 1 ? 'Next' : 'Continue'}
          </button>
        </div>
      </div>
    );
  }

  // Final step: choose your path
  return (
    <div className="glass-panel p-6 sm:p-8 text-center max-w-md mx-auto">
      <div className="text-4xl mb-4 opacity-60">{'\u2B21'}</div>
      <h2 className="text-title-md font-bold opacity-80 mb-2 font-title">Que souhaitez-vous faire ?</h2>
      <p className="text-base opacity-50 mb-6">Vous pourrez toujours changer plus tard.</p>

      <div className="space-y-3">
        <button
          onClick={() => onNavigate('gallery')}
          className="warp-button w-full py-4 text-base"
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 16V12M10 14l2-2 2 2" /></svg>
            Publier une oeuvre
          </span>
        </button>

        <button
          onClick={() => onNavigate('gallery')}
          className="w-full py-4 text-base border border-current/15 opacity-70 hover:opacity-90 transition-all cursor-pointer"
        >
          <span className="flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            Explorer et collectionner
          </span>
        </button>

        <button
          onClick={() => onNavigate('profile')}
          className="w-full py-2 text-body-sm opacity-40 hover:opacity-60 transition-all cursor-pointer"
        >
          Voir mon profil
        </button>
      </div>
    </div>
  );
}

export default function WalletView() {
  const {
    wallet, unlocked, needsMigration,
    meshStats, levelProgress,
    strangrzIDLogin, verify2FACode, pending2FA,
    showRecoveryReminder, dismissRecoveryReminder,
    unlock, lock, signOut, migrate,
    doExportWallet, doImportWallet, doImportStrangrzLink,
    generateRecoveryKit,
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPassword, setImportPassword] = useState('');
  const [importError, setImportError] = useState('');
  const [importData, setImportData] = useState<string | null>(null);
  const [authTab, setAuthTab] = useState<AuthTab>('signup');
  const [signInMethod, setSignInMethod] = useState<SignInMethod>('strangrzid');
  const [showWelcome, setShowWelcome] = useState(false);

  // StrangrzLink import state
  const [strangrzLinkInput, setStrangrzLinkInput] = useState('');
  const [strangrzLinkPassword, setStrangrzLinkPassword] = useState('');
  const [strangrzLinkError, setStrangrzLinkError] = useState('');

  // Sign In StrangrzID state
  const [signInUsername, setSignInUsername] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInError, setSignInError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // 2FA state
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFAError, setTwoFAError] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);
  // 2FA setup state (in wallet settings)
  const [setting2FA, setSetting2FA] = useState(false);
  const [setup2FAData, setSetup2FAData] = useState<{ secret: string; uri: string; backupCodes: string[] } | null>(null);
  const [setup2FACode, setSetup2FACode] = useState('');
  const [setup2FAError, setSetup2FAError] = useState('');
  const [disable2FACode, setDisable2FACode] = useState('');
  const [disable2FAError, setDisable2FAError] = useState('');

  // Wallet sub-tabs
  const [walletTab, setWalletTab] = useState<WalletTab>('overview');


  // Mine tab now uses MineView component directly

  // Spinner component
  const Spinner = () => (
    <span className="inline-block w-4 h-4 border-2 border-current/10 border-t-current rounded-none animate-spin" />
  );

  // ─── StrangrzID Sign Up handler ────────────────────────────
  const handleSignUp = async () => {
    if (!alias.trim()) { setCreateError('Username is required for StrangrzID'); return; }
    if (password.length < 6) { setCreateError('Password must be at least 6 characters'); return; }
    if (password !== passwordConfirm) { setCreateError('Passwords do not match'); return; }
    setCreating(true);
    setCreateError('');
    try {
      // Check alias uniqueness (local + cloud)
      const social = SocialEngine.load();
      if (social.isAliasTaken(alias.trim())) {
        setCreateError('This username is already taken');
        return;
      }
      const takenCloud = await isAliasTakenCloud(alias.trim());
      if (takenCloud) {
        setCreateError('This username is already taken');
        return;
      }
      const result = await strangrzIDLogin(alias.trim(), password);
      if (result.success) {
        setShowWelcome(true);
      } else {
        setCreateError(result.error || 'Sign up failed');
      }
    } finally {
      setCreating(false);
    }
  };

  // ─── StrangrzID Sign In handler ────────────────────────────
  const handleStrangrzIDSignIn = async () => {
    if (!signInUsername.trim()) { setSignInError('Username is required'); return; }
    if (signInPassword.length < 6) { setSignInError('Password must be at least 6 characters'); return; }
    setSigningIn(true);
    setSignInError('');
    try {
      const result = await strangrzIDLogin(signInUsername.trim(), signInPassword);
      if (!result.success) {
        setSignInError(result.error || 'Sign in failed');
      } else if (!result.needs2FA) {
        // Navigate to profile after successful sign-in
        window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'profile' }));
      }
    } finally {
      setSigningIn(false);
    }
  };

  // ─── 2FA Verification handler ──────────────────────────
  const handle2FAVerify = async () => {
    if (!twoFACode.trim()) { setTwoFAError('Enter your 2FA code'); return; }
    setVerifying2FA(true);
    setTwoFAError('');
    try {
      const result = await verify2FACode(twoFACode.trim());
      if (!result.success) {
        setTwoFAError(result.error || 'Invalid code');
      } else {
        setTwoFACode('');
        window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'profile' }));
      }
    } finally {
      setVerifying2FA(false);
    }
  };

  // ─── StrangrzLink Import handler ────────────────────────────
  const handleStrangrzLinkImport = async () => {
    if (!strangrzLinkInput.trim()) { setStrangrzLinkError('Paste your StrangrzLink code'); return; }
    if (!strangrzLinkPassword) { setStrangrzLinkError('Password is required'); return; }
    setStrangrzLinkError('');
    try {
      const ok = await doImportStrangrzLink(strangrzLinkInput.trim(), strangrzLinkPassword);
      if (!ok) setStrangrzLinkError('Invalid StrangrzLink or wrong password');
    } catch {
      setStrangrzLinkError('Failed to import StrangrzLink');
    }
  };

  // ─── 2FA Verification Screen ──────────────────────────────
  if (pending2FA) {
    return (
      <div className="glass-panel p-6 sm:p-8 text-center max-w-md mx-auto">
        <div className="flex justify-center mb-4">
          <Logo className="w-16 h-16 sm:w-20 sm:h-20 animate-float" />
        </div>
        <h2 className="text-title-md font-bold opacity-100 mb-2 font-title">2FA Verification</h2>
        <p className="text-base opacity-50 mb-4">
          Enter the 6-digit code from your authenticator app.
        </p>
        <div className="max-w-xs mx-auto space-y-3">
          <input
            className="warp-input text-center text-title-md tracking-[0.5em] font-mono"
            placeholder="000000"
            value={twoFACode}
            maxLength={8}
            onChange={e => { setTwoFACode(e.target.value.replace(/[^0-9A-Fa-f]/g, '')); setTwoFAError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handle2FAVerify(); }}
            autoFocus
          />
          {twoFAError && <p className="text-body-sm opacity-70">{twoFAError}</p>}
          <button
            className="warp-button w-full text-base py-3"
            onClick={handle2FAVerify}
            disabled={verifying2FA || !twoFACode.trim()}
          >
            {verifying2FA ? (
              <span className="flex items-center justify-center gap-2"><Spinner /> Verifying...</span>
            ) : 'Verify'}
          </button>
          <p className="text-label opacity-50">You can also enter a backup code</p>
        </div>
      </div>
    );
  }

  // ─── No wallet: Sign Up / Sign In screen ───────────────
  if (!wallet) {
    return (
      <div className="glass-panel p-6 sm:p-8 text-center max-w-md mx-auto">
        <div className="flex justify-center mb-4">
          <Logo className="w-16 h-16 sm:w-20 sm:h-20 animate-float" />
        </div>
        <h2 className="text-title-md sm:text-title-lg font-bold opacity-100 mb-1 font-logo">{'\u30B9\u30C8\u30EC\u30F3\u30B8\u30E3\u30FC\u30BA'}</h2>
        <p className="text-body-sm opacity-60 mb-1">Strangrz</p>
        <p className="text-body-sm opacity-60 mb-5">
          Protocole de certification pour objets rares
        </p>

        {/* Promo banner */}
        <div
          className="max-w-xs mx-auto mb-4 py-2 px-3 text-[11px] font-bold tracking-wide"
          style={{
            background: 'linear-gradient(90deg, #d4af37, #e91e8c, #339af0, #51cf66, #d4af37)',
            backgroundSize: '300% 100%',
            animation: 'promoBannerScroll 6s linear infinite',
            color: '#000',
          }}
        >
          First 100 signups: 2000 Strngrz Coins = 1 Exclusive Limited Edition artwork by Xerak!
        </div>
        <style>{`@keyframes promoBannerScroll { 0% { background-position: 0% 50%; } 100% { background-position: 300% 50%; } }`}</style>

        {/* ─── Sign Up / Sign In tabs ──────────────────── */}
        <div className="flex max-w-xs mx-auto mb-5 border border-current/15 overflow-hidden">
          <button
            onClick={() => setAuthTab('signup')}
            className={`flex-1 py-2.5 text-base font-bold transition-colors cursor-pointer ${
              authTab === 'signup'
                ? 'bg-current/5 opacity-80 border-b-2 border-current/20'
                : 'opacity-60 hover:opacity-70 hover:bg-current/5'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => setAuthTab('signin')}
            className={`flex-1 py-2.5 text-base font-bold transition-colors cursor-pointer ${
              authTab === 'signin'
                ? 'bg-current/5 opacity-80 border-b-2 border-current/20'
                : 'opacity-60 hover:opacity-70 hover:bg-current/5'
            }`}
          >
            Sign In
          </button>
        </div>

        {authTab === 'signup' ? (
          <div className="max-w-xs mx-auto space-y-3">
            <p className="text-base opacity-50 mb-1">
              Create your wallet and receive 300 {'\u2B23'} reward coins. Collect artworks to earn more!
            </p>

            <div className="p-3 bg-current/5 border border-current/10 text-left">
              <p className="text-label opacity-80 font-bold mb-1">StrangrzID</p>
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
            <p className="text-label opacity-50 pt-2">Ed25519 + PBKDF2 (600K rounds) + AES-256-GCM</p>
          </div>
        ) : (
          <div className="max-w-xs mx-auto space-y-3">
            {/* Sign In method selector */}
            <div className="flex gap-1 mb-2">
              {([
                { id: 'strangrzid' as SignInMethod, label: 'StrangrzID', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /></svg> },
                { id: 'strangrzlink' as SignInMethod, label: 'StrangrzLink', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> },
                { id: 'file' as SignInMethod, label: 'File', icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> },
              ]).map(m => (
                <button
                  key={m.id}
                  onClick={() => setSignInMethod(m.id)}
                  className={`flex-1 py-2 text-[11px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    signInMethod === m.id
                      ? 'bg-current/5 opacity-80 border border-current/10'
                      : 'opacity-60 hover:opacity-70 border border-current/10 hover:bg-current/5'
                  }`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {/* ─── StrangrzID Sign In ────────────────────────── */}
            {signInMethod === 'strangrzid' && (
              <div className="space-y-3">
                <p className="text-base opacity-50">Sign in with your StrangrzID credentials.</p>
                <p className="text-label opacity-60">Same username + password = same wallet, any device.</p>
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
                  onKeyDown={e => { if (e.key === 'Enter') handleStrangrzIDSignIn(); }}
                />
                {signInError && <p className="text-body-sm opacity-70">{signInError}</p>}
                <button
                  className="warp-button w-full py-3 text-base"
                  onClick={handleStrangrzIDSignIn}
                  disabled={!signInUsername.trim() || !signInPassword || signingIn}
                >
                  {signingIn ? (
                    <span className="flex items-center justify-center gap-2"><Spinner />Deriving keys...</span>
                  ) : 'Sign In'}
                </button>
                <p className="text-label opacity-60">
                  Mot de passe oublié ? Votre wallet est dérivé de votre username + mot de passe. Sans ces identifiants, le wallet ne peut pas être récupéré. Vous pouvez aussi importer un fichier de récupération via l'onglet <strong>File</strong>.
                </p>
              </div>
            )}

            {/* ─── StrangrzLink Import ──────────────────────── */}
            {signInMethod === 'strangrzlink' && (
              <div className="space-y-3">
                <p className="text-base opacity-50">Paste a StrangrzLink code from another device.</p>
                <p className="text-label opacity-60">StrangrzLink is an encrypted transfer code you can share via any messaging app.</p>
                <textarea
                  className="warp-input text-center text-body-sm min-h-[80px] resize-none"
                  placeholder="Paste STZLINK-... code here"
                  value={strangrzLinkInput}
                  onChange={e => { setStrangrzLinkInput(e.target.value); setStrangrzLinkError(''); }}
                />
                <input
                  className="warp-input text-center"
                  type="password"
                  placeholder="Your wallet password"
                  value={strangrzLinkPassword}
                  onChange={e => { setStrangrzLinkPassword(e.target.value); setStrangrzLinkError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleStrangrzLinkImport(); }}
                />
                {strangrzLinkError && <p className="text-body-sm opacity-70">{strangrzLinkError}</p>}
                <button
                  className="warp-button w-full py-3 text-base"
                  onClick={handleStrangrzLinkImport}
                  disabled={!strangrzLinkInput.trim() || !strangrzLinkPassword}
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
                <p className="text-label opacity-60">Legacy method: upload the .json file exported from a previous wallet.</p>
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

  // ─── Welcome screen (after StrangrzID signup) ──────────────
  if (showWelcome && unlocked) {
    return (
      <WelcomeTutorial
        wallet={wallet}
        onNavigate={(tab: string) => {
          setShowWelcome(false);
          localStorage.setItem('strangrz_onboarded', '1');
          window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: tab }));
        }}
        onSkip={() => {
          setShowWelcome(false);
          localStorage.setItem('strangrz_onboarded', '1');
          window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'profile' }));
        }}
      />
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
        <p className="text-title-sm font-bold opacity-100 mb-5">{wallet.balance.toLocaleString()} {'\u2B23'}</p>
        <div className="max-w-xs mx-auto space-y-3">
          <input className="warp-input text-center" type="password" placeholder="Enter your password" value={unlockPassword}
            onChange={e => { setUnlockPassword(e.target.value); setUnlockError(''); }}
            onKeyDown={e => { if (e.key === 'Enter' && unlockPassword) { setUnlocking(true); unlock(unlockPassword).then(ok => { if (!ok) { setUnlockError('Wrong password'); } else { window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'profile' })); } setUnlocking(false); setUnlockPassword(''); }); } }}
            autoFocus
          />
          {unlockError && <p className="text-body-sm opacity-70">{unlockError}</p>}
          <button className="warp-button w-full py-3 text-base" onClick={async () => { setUnlocking(true); const ok = await unlock(unlockPassword); if (!ok) { setUnlockError('Wrong password'); } else { window.dispatchEvent(new CustomEvent('strangrz-navigate', { detail: 'profile' })); } setUnlocking(false); setUnlockPassword(''); }} disabled={!unlockPassword || unlocking}>
            {unlocking ? <span className="flex items-center justify-center gap-2"><Spinner />Unlocking...</span> : 'Unlock'}
          </button>
          <button
            className="text-label opacity-60 hover:opacity-70 transition-opacity cursor-pointer bg-transparent border-none"
            onClick={() => setShowForgotPassword(!showForgotPassword)}
          >
            Mot de passe oublié ?
          </button>
          {showForgotPassword && (
            <div className="p-3 bg-current/5 border border-current/10 text-left space-y-2">
              <p className="text-label opacity-60">
                Votre wallet est lié à votre <strong>username + mot de passe</strong> (StrangrzID). Il n'y a pas de serveur qui stocke votre mot de passe — il sert à dériver votre clé privée.
              </p>
              <p className="text-label opacity-60">
                Si vous vous souvenez de vos identifiants StrangrzID, déconnectez-vous puis reconnectez-vous avec le même username et mot de passe.
              </p>
              <p className="text-label opacity-60">
                Si vous avez un fichier de récupération (.json), déconnectez-vous puis importez-le via <strong>Sign In &gt; File</strong>.
              </p>
              <button
                className="warp-button w-full py-2 text-label mt-1"
                onClick={() => { if (confirm('Se déconnecter ? Assurez-vous d\'avoir une sauvegarde.')) signOut(); }}
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Helper functions ──────────────────────────────────
  const copyAddress = () => {
    copyToClipboard(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const data = doExportWallet();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `strangrz-wallet-${shortAddress(wallet.address)}.json`; a.click();
    URL.revokeObjectURL(url);
  };


  // ─── Unlocked wallet: Full view ────────────────────────
  const recentTxs = wallet.transactions.slice(0, 8);
  const levelDef = HIERARCHY_LEVELS[wallet.level];
  const nextLevel = wallet.level < 6 ? HIERARCHY_LEVELS[wallet.level + 1] : null;

  const subTabIcons: Record<WalletTab, ReactNode> = {
    overview: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
    payment: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M15 9.354a4 4 0 0 0-2.764-1.354C10.448 7.89 9 9.005 9 10.5c0 1.38 1.12 2.5 3.236 2.5C14.12 13 16 14.12 16 15.5c0 1.495-1.448 2.61-3.236 2.5A4 4 0 0 1 10 16.646" /><line x1="12" y1="6" x2="12" y2="8" /><line x1="12" y1="18" x2="12" y2="20" /></svg>,
    ethereum: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L4 12l8 5 8-5L12 2z" /><path d="M4 12l8 10 8-10-8 5-8-5z" /></svg>,
  };
  const subTabs: { id: WalletTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'payment', label: 'Paiement' },
    { id: 'ethereum', label: 'Ethereum' },
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
          <div className="glass-panel p-6 text-center animate-pulse-glow">
            <div className="flex justify-center mb-3">
              <HexAvatar address={wallet.address} size={80} />
            </div>
            <p className="text-body-md opacity-60 mb-1">{wallet.alias ? `@${wallet.alias}` : 'Strangrz Balance'}</p>
            <div className="text-title-xl sm:text-[3.5rem] font-bold opacity-100 mb-2 animate-float leading-tight">
              {wallet.balance.toLocaleString()} <span className="text-title-lg">{'\u2B23'}</span>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span className={`text-body-sm font-bold ${levelDef.color}`}>{wallet.levelSymbol} {wallet.levelTitle}</span>
              <InfoTooltip text={`Lv.${wallet.level} — Reward x${wallet.rewardMultiplier} — Streak ${wallet.streakDays}j — ${wallet.xp} XP`} />
              <button onClick={lock} className="text-label px-3 py-1 bg-current/5 opacity-60 border border-current/15 hover:opacity-90 transition-colors cursor-pointer flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                Lock
              </button>
            </div>
          </div>

          {/* Address */}
          <div className="glass-panel p-3">
            <p className="text-label opacity-60 mb-1">YOUR ADDRESS (Ed25519)</p>
            <div className="flex items-center gap-2">
              <code className="text-body-sm opacity-80 flex-1 truncate">{wallet.address}</code>
              <button onClick={copyAddress} className="warp-button text-body-sm px-2 py-1">
                {copied ? (
                  <span className="flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg> Copied</span>
                ) : 'Copy'}
              </button>
            </div>
          </div>

          {/* Recovery Kit Reminder */}
          {showRecoveryReminder && (
            <div className="glass-panel p-4 border-l-4 border-current/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold opacity-80">{'\u26A0'} Recovery Kit Reminder</p>
                  <p className="text-body-sm opacity-50 mt-1">
                    Download your Recovery Kit to protect your artworks. Without it, local vault data may be lost if you lose access to this device.
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      className="warp-button text-body-sm px-3 py-1.5"
                      onClick={async () => {
                        const kit = await generateRecoveryKit(prompt('Enter a recovery password:') || '');
                        if (kit) {
                          const blob = new Blob([JSON.stringify(kit, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `strangrz-recovery-kit-${wallet.address.slice(0, 10)}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                          dismissRecoveryReminder();
                        }
                      }}
                    >
                      Download Recovery Kit
                    </button>
                    <button
                      className="text-body-sm px-3 py-1.5 opacity-60 hover:opacity-70 border border-current/10 cursor-pointer"
                      onClick={dismissRecoveryReminder}
                    >
                      Later
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2FA Security */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-label opacity-60">TWO-FACTOR AUTHENTICATION</p>
                <p className="text-body-sm opacity-50">
                  {is2FAEnabled(wallet.address) ? 'Enabled — your account is protected' : 'Not enabled — add an extra layer of security'}
                </p>
              </div>
              {is2FAEnabled(wallet.address) ? (
                <span className="text-label px-2 py-0.5 bg-current/5 opacity-80 border border-current/10">{'\u2714'} Active</span>
              ) : (
                <button
                  className="warp-button text-body-sm px-3 py-1.5"
                  onClick={async () => {
                    setSetting2FA(true);
                    const data = await setup2FA(wallet.address, wallet.alias || wallet.address.slice(0, 10));
                    setSetup2FAData(data);
                  }}
                >
                  Enable
                </button>
              )}
            </div>

            {/* 2FA Setup Flow */}
            {setting2FA && setup2FAData && !is2FAEnabled(wallet.address) && (
              <div className="mt-3 p-3 bg-current/5 border border-current/10 space-y-3">
                <p className="text-body-sm font-bold opacity-70">Setup TOTP</p>
                <p className="text-label opacity-50">
                  1. Copy this secret into your authenticator app (Google Authenticator, Authy, etc.):
                </p>
                <div className="p-2 bg-current/5 border border-current/10">
                  <code className="text-body-sm opacity-80 break-all select-all">{setup2FAData.secret}</code>
                </div>
                <p className="text-label opacity-50">
                  2. Or use this URI: <code className="text-[9px] opacity-60 break-all select-all">{setup2FAData.uri}</code>
                </p>
                <p className="text-label opacity-50">
                  3. Enter the 6-digit code from your app to verify:
                </p>
                <div className="flex gap-2">
                  <input
                    className="warp-input flex-1 text-center font-mono tracking-widest"
                    placeholder="000000"
                    value={setup2FACode}
                    maxLength={6}
                    onChange={e => { setSetup2FACode(e.target.value.replace(/\D/g, '')); setSetup2FAError(''); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        enable2FA(wallet.address, setup2FACode).then(ok => {
                          if (ok) { setSetting2FA(false); setSetup2FACode(''); setSetup2FAData(null); }
                          else setSetup2FAError('Invalid code. Try again.');
                        });
                      }
                    }}
                  />
                  <button
                    className="warp-button text-body-sm px-3"
                    onClick={async () => {
                      const ok = await enable2FA(wallet.address, setup2FACode);
                      if (ok) { setSetting2FA(false); setSetup2FACode(''); setSetup2FAData(null); }
                      else setSetup2FAError('Invalid code. Try again.');
                    }}
                  >
                    Verify
                  </button>
                </div>
                {setup2FAError && <p className="text-body-sm opacity-70">{setup2FAError}</p>}

                <div className="p-2 bg-current/5 border border-current/10">
                  <p className="text-label font-bold opacity-60 mb-1">Backup Codes (save these!)</p>
                  <div className="grid grid-cols-2 gap-1">
                    {setup2FAData.backupCodes.map((code, i) => (
                      <code key={i} className="text-[10px] opacity-70 font-mono">{code}</code>
                    ))}
                  </div>
                </div>

                <button
                  className="text-body-sm opacity-60 hover:opacity-70 cursor-pointer"
                  onClick={() => { setSetting2FA(false); setSetup2FAData(null); setSetup2FACode(''); }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Disable 2FA */}
            {is2FAEnabled(wallet.address) && (
              <div className="mt-2">
                <div className="flex gap-2 items-center">
                  <input
                    className="warp-input flex-1 text-center font-mono text-body-sm"
                    placeholder="Enter code to disable"
                    value={disable2FACode}
                    maxLength={6}
                    onChange={e => { setDisable2FACode(e.target.value.replace(/\D/g, '')); setDisable2FAError(''); }}
                  />
                  <button
                    className="text-body-sm px-3 py-1.5 opacity-50 hover:opacity-80 border border-current/15 cursor-pointer"
                    onClick={async () => {
                      const ok = await disable2FA(wallet.address, disable2FACode);
                      if (ok) { setDisable2FACode(''); }
                      else setDisable2FAError('Invalid code');
                    }}
                  >
                    Disable 2FA
                  </button>
                </div>
                {disable2FAError && <p className="text-body-sm opacity-70 mt-1">{disable2FAError}</p>}
              </div>
            )}
          </div>

          {/* Sync info */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-label opacity-60">SYNC & BACKUP</p>
                <p className="text-body-sm opacity-50">StrangrzID + StrangrzLink available in Settings</p>
              </div>
              <button onClick={handleExport} className="text-label px-3 py-1.5 border border-current/15 opacity-50 hover:opacity-90 hover:bg-current/5 transition-all cursor-pointer flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                .json
              </button>
            </div>
            <p className="text-label opacity-50">Sign in with the same username + password on any device. Or use StrangrzLink for quick transfer.</p>
          </div>

          {/* Level Progress */}
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-title-sm font-bold font-title"><span className={levelDef.color}>{wallet.levelSymbol}</span> Lv.{wallet.level}</h3>
              <InfoTooltip text={`${wallet.levelName} — Reward x${wallet.rewardMultiplier} — Streak ${wallet.streakDays}j — ${wallet.xp} XP`} align="right" />
            </div>
            {nextLevel ? (
              <div>
                <div className="flex justify-between text-body-sm opacity-60 mb-2">
                  <span>{nextLevel.name}</span>
                  <span className="font-bold">{levelProgress}%</span>
                </div>
                <div className="w-full bg-current/5 h-3">
                  <div className="h-3 transition-all duration-500" style={{ width: `${levelProgress}%`, background: 'currentColor', opacity: 0.25 }} />
                </div>
              </div>
            ) : <p className="text-body-sm opacity-80">Maximum level reached!</p>}
          </div>

          {/* Stats Grid (simplified) */}
          <div className="grid grid-cols-3 gap-2">
            <div className="glass-panel p-3 text-center"><p className="text-title-sm font-bold opacity-90">{wallet.transactions.length}</p><p className="text-label opacity-50">TXs</p></div>
            <div className="glass-panel p-3 text-center"><p className="text-title-sm font-bold opacity-90">{wallet.balance.toLocaleString()}</p><p className="text-label opacity-50">STZ</p></div>
            <div className="glass-panel p-3 text-center"><p className="text-title-sm font-bold opacity-90">{wallet.streakDays}</p><p className="text-label opacity-50">STREAK</p></div>
          </div>

          {/* Mesh Stats (simplified) */}
          {meshStats && (
            <div className="glass-panel p-5">
              <h3 className="text-title-sm font-bold font-title mb-3 flex items-center gap-2">
                Mesh Status
                <InfoTooltip text={`Resonance ${(meshStats.avgResonance * 100).toFixed(1)}% — Depth ${meshStats.maxDepth} — Finalized ${meshStats.finalizedCount}`} />
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-current/5 p-3">
                  <p className="text-label opacity-50">NODES</p>
                  <p className="text-body-lg font-bold opacity-90">{meshStats.totalTransactions}</p>
                </div>
                <div className="bg-current/5 p-3">
                  <p className="text-label opacity-50">TIPS</p>
                  <p className="text-body-lg font-bold opacity-90">{meshStats.totalTips}</p>
                </div>
                <div className="bg-current/5 p-3">
                  <p className="text-label opacity-50">TPS</p>
                  <p className="text-body-lg font-bold opacity-90">{meshStats.totalTps.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-70 mb-3">Recent Transactions</h3>
            {recentTxs.length === 0 ? (
              <p className="text-body-sm opacity-60 text-center py-4">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {recentTxs.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 p-2 rounded-none bg-current/5 text-body-sm">
                    <span className="text-base opacity-80">
                      {tx.type === 'mine' ? '\u2B23' : tx.type === 'send' ? '\u2197' :
                       tx.type === 'genesis' || tx.type === 'airdrop' ? '\u2B21' : tx.type === 'level_up' ? '\u2605' :
                       tx.type === 'wart_mint' ? '\u2742' : tx.type === 'wart_buy' ? '\u2B22' :
                       tx.type === 'wart_transfer' ? '\u21C4' : '\u2199'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="opacity-70 truncate">
                        {(tx.memo || (tx.type === 'genesis' || tx.type === 'airdrop' ? 'Airdrop' :
                          tx.type === 'mine' ? 'Récompense' : tx.type === 'level_up' ? 'Level Up Bonus' :
                          tx.type === 'streak_reward' ? 'Streak Reward' : tx.type === 'send' ? `To ${shortAddress(tx.to)}` :
                          `From ${shortAddress(tx.from)}`)).replace(/Cosmorare/gi, 'Strangrz')}
                      </p>
                      <div className="flex gap-2 text-label opacity-60">
                        {tx.layer !== undefined && <span className="opacity-60">{LAYER_NAMES[tx.layer]}</span>}
                        {tx.resonanceScore !== undefined && <span className="opacity-60">{(tx.resonanceScore * 100).toFixed(0)}% resonance</span>}
                      </div>
                    </div>
                    <span className={`font-bold shrink-0 ${tx.type === 'send' || tx.type === 'wart_buy' ? 'opacity-80' : 'opacity-80'}`}>
                      {tx.type === 'send' || tx.type === 'wart_buy' ? '-' : '+'}{tx.amount} {'\u2B23'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── Payment Tab ─────────────────────────────────── */}
      {walletTab === 'payment' && <FiatGatewayView />}

      {/* ─── Ethereum Tab ──────────────────────────────────── */}
      {walletTab === 'ethereum' && (
        <div className="space-y-4">
          {/* ETH Balance Card */}
          <div className="glass-panel p-5 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 flex items-center justify-center bg-current/5 border border-current/10" style={{ clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)' }}>
                <span className="text-2xl opacity-70">{'\u039E'}</span>
              </div>
            </div>
            <p className="text-body-sm opacity-50 mb-1">Ethereum Balance</p>
            <div className="text-4xl sm:text-5xl font-bold opacity-100 mb-1">
              0.00 <span className="text-title-lg">ETH</span>
            </div>
            <p className="text-label opacity-60">ERC-721 COMPATIBLE</p>
          </div>

          {/* Connection Status */}
          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-70 mb-3">Wallet Connection</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-current/5 border border-current/10">
                <div className="flex items-center gap-3">
                  <span className="text-lg opacity-60">{'\u26A0'}</span>
                  <div>
                    <p className="text-body-sm opacity-70">No wallet connected</p>
                    <p className="text-label opacity-60">Connect MetaMask or WalletConnect</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-current/10 border border-current/20 text-body-sm opacity-70 hover:opacity-90 cursor-pointer transition-all">
                  Connect
                </button>
              </div>
            </div>
          </div>

          {/* Multi-chain Info */}
          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-70 mb-3">Multi-Chain Minting</h3>
            <div className="space-y-3 text-body-sm">
              <div className="flex items-start gap-3 p-3 bg-current/5 border border-current/10">
                <span className="text-lg shrink-0">{'\u2B22'}</span>
                <div>
                  <p className="opacity-70 font-bold mb-0.5">Strangrz Chain (SZ-721)</p>
                  <p className="opacity-60">Zero gas fees. Instant minting. Protected by Strangrz system with STCERT certificates and StrangrzCode on-chain backup.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-current/5 border border-current/10">
                <span className="text-lg shrink-0">{'\u039E'}</span>
                <div>
                  <p className="opacity-70 font-bold mb-0.5">Ethereum (ERC-721)</p>
                  <p className="opacity-60">Standard ERC-721 Strangrz on Ethereum mainnet. Gas fees apply. Full Strangrz protection and cross-chain verification via the adapter system.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ETH Strangrz */}
          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-70 mb-3">Ethereum Strangrz</h3>
            <p className="text-body-sm opacity-60 text-center py-6">No Ethereum Strangrz yet. Mint your first artwork on Ethereum from the Gallery.</p>
          </div>

          {/* ETH Transactions */}
          <div className="glass-panel p-4">
            <h3 className="text-base font-bold opacity-70 mb-3">Ethereum Transactions</h3>
            <p className="text-body-sm opacity-60 text-center py-4">No Ethereum transactions yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
