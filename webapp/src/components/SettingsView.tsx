import { useState, lazy, Suspense } from 'react';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { shortAddress } from '../engine/crypto';
import { storage } from '../engine/storage';
import { copyToClipboard } from '../lib/clipboard';

const LegalsView = lazy(() => import('./LegalsView'));
const PrivacyView = lazy(() => import('./PrivacyView'));
const HelpView = lazy(() => import('./HelpView'));

type SettingsTab = 'settings' | 'legal' | 'privacy' | 'help';

interface SettingsViewProps {
  onNavigate: (tab: string) => void;
}

export default function SettingsView({ onNavigate }: SettingsViewProps) {
  const { wallet, unlocked, lock, signOut, deleteAccount, doExportWallet, doGenerateStrangrzLink } = useWallet();
  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>('settings');
  const { theme, toggleTheme } = useTheme();
  const [cleared, setCleared] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [strangrzLink, setStrangrzLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [linkPassword, setLinkPassword] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkGenerating, setLinkGenerating] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const handleExport = () => {
    const data = doExportWallet();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strangrz-wallet-${wallet ? shortAddress(wallet.address) : 'backup'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateStrangrzLink = async () => {
    if (!linkPassword || linkPassword.length < 6) {
      setLinkError('Password must be at least 6 characters');
      return;
    }
    setLinkGenerating(true);
    setLinkError('');
    try {
      const link = await doGenerateStrangrzLink(linkPassword);
      if (link) {
        setStrangrzLink(link);
      } else {
        setLinkError('Failed to generate StrangrzLink');
      }
    } catch {
      setLinkError('Failed to generate StrangrzLink');
    } finally {
      setLinkGenerating(false);
    }
  };

  const handleCopyStrangrzLink = () => {
    if (!strangrzLink) return;
    copyToClipboard(strangrzLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const handleClearChat = () => {
    storage.removeItem('cosmochat_posts');
    storage.removeItem('cosmochat_channels');
    storage.removeItem('cosmochat_dms');
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  const handleSignOut = () => {
    if (!confirmSignOut) {
      setConfirmSignOut(true);
      setTimeout(() => setConfirmSignOut(false), 5000);
      return;
    }
    signOut();
    onNavigate('wallet');
  };

  const settingsTabs: { id: SettingsTab; label: string }[] = [
    { id: 'settings', label: 'Settings' },
    { id: 'legal', label: 'Legal' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'help', label: 'Help' },
  ];

  if (activeSettingsTab === 'legal') {
    return (
      <div className="space-y-4">
        <div className="glass-panel p-2 flex gap-1">
          {settingsTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveSettingsTab(t.id)}
              className={`flex-1 py-2 text-body-sm font-medium transition-all cursor-pointer ${
                t.id === activeSettingsTab ? 'bg-white/10 opacity-100' : 'opacity-40 hover:opacity-70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Suspense fallback={<div className="flex items-center justify-center py-20 opacity-30"><div className="animate-pulse text-sm">Loading...</div></div>}>
          <LegalsView />
        </Suspense>
      </div>
    );
  }

  if (activeSettingsTab === 'privacy') {
    return (
      <div className="space-y-4">
        <div className="glass-panel p-2 flex gap-1">
          {settingsTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveSettingsTab(t.id)}
              className={`flex-1 py-2 text-body-sm font-medium transition-all cursor-pointer ${
                t.id === activeSettingsTab ? 'bg-white/10 opacity-100' : 'opacity-40 hover:opacity-70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Suspense fallback={<div className="flex items-center justify-center py-20 opacity-30"><div className="animate-pulse text-sm">Loading...</div></div>}>
          <PrivacyView />
        </Suspense>
      </div>
    );
  }

  if (activeSettingsTab === 'help') {
    return (
      <div className="space-y-4">
        <div className="glass-panel p-2 flex gap-1">
          {settingsTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveSettingsTab(t.id)}
              className={`flex-1 py-2 text-body-sm font-medium transition-all cursor-pointer ${
                t.id === activeSettingsTab ? 'bg-white/10 opacity-100' : 'opacity-40 hover:opacity-70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Suspense fallback={<div className="flex items-center justify-center py-20 opacity-30"><div className="animate-pulse text-sm">Loading...</div></div>}>
          <HelpView onNavigate={onNavigate} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Tab bar ──────────────────────────────────────── */}
      <div className="glass-panel p-2 flex gap-1">
        {settingsTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveSettingsTab(t.id)}
            className={`flex-1 py-2 text-body-sm font-medium transition-all cursor-pointer ${
              t.id === activeSettingsTab ? 'bg-white/10 opacity-100' : 'opacity-40 hover:opacity-70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Profile ──────────────────────────────────────── */}
      {wallet && (
        <div className="glass-panel p-4">
          <h3 className="text-title-sm font-bold font-title mb-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-60">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            Profile
          </h3>
          <div className="space-y-2 text-body-sm">
            <div className="flex justify-between items-center">
              <span className="opacity-40">Username</span>
              <span className="opacity-90">{wallet.alias ? `@${wallet.alias}` : 'Anonymous'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-40">Address</span>
              <code className="opacity-80 text-label">{shortAddress(wallet.address)}</code>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-40">Level</span>
              <span className="opacity-80">{wallet.levelName} (Lv.{wallet.level})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-40">Balance</span>
              <span className="opacity-80">{wallet.balance.toLocaleString()} {'\u2B23'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="opacity-40">Auth</span>
              <span className="opacity-80">StrangrzID</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Appearance ───────────────────────────────────── */}
      <div className="glass-panel p-4">
        <h3 className="text-title-sm font-bold font-title mb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-60">
            <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          Appearance
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-body-sm opacity-90">Theme</p>
            <p className="text-label opacity-40">Switch between dark and light mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`px-4 py-2 text-body-sm font-medium border transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-current/5 border-current/15 opacity-70'
                : 'bg-current/10 border-black/10 opacity-30'
            }`}
          >
            {theme === 'dark' ? (
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                Dark
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                Light
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── StrangrzLink (Sync) ─────────────────────────────── */}
      {wallet && unlocked && (
        <div className="glass-panel p-4">
          <h3 className="text-title-sm font-bold font-title mb-2 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-60">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            StrangrzLink
          </h3>
          <p className="text-label opacity-40 mb-3">
            Generate an encrypted code to transfer your wallet to another device. Copy it and paste it via any messaging app.
          </p>

          {!strangrzLink ? (
            <div className="space-y-3">
              <input
                className="warp-input text-center text-body-sm"
                type="password"
                placeholder="Enter your password to generate"
                value={linkPassword}
                onChange={e => { setLinkPassword(e.target.value); setLinkError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleGenerateStrangrzLink(); }}
              />
              {linkError && <p className="text-body-sm opacity-70">{linkError}</p>}
              <button
                onClick={handleGenerateStrangrzLink}
                className="warp-button w-full text-body-sm py-2"
                disabled={!linkPassword || linkGenerating}
              >
                {linkGenerating ? 'Generating...' : (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    Generate StrangrzLink
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-current/5 border border-current/10">
                <p className="text-label opacity-40 mb-1">YOUR STRANGRZLINK CODE</p>
                <p className="text-label opacity-80 break-all font-mono leading-relaxed select-all">{strangrzLink}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyStrangrzLink}
                  className="warp-button flex-1 text-body-sm py-2"
                >
                  {linkCopied ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      Copied!
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      Copy Code
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setStrangrzLink(null); setLinkPassword(''); }}
                  className="text-body-sm px-3 py-2 border border-current/15 opacity-50 hover:opacity-90 hover:bg-current/5 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="p-3 bg-current/5 border border-current/10 text-left">
                <p className="text-label opacity-50">
                  <span className="opacity-80 font-bold">How to use:</span> Copy this code and send it to yourself via any messaging app (iMessage, WhatsApp, Telegram, etc.). On the other device, choose "StrangrzLink" when signing in and paste the code + your password.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Security ─────────────────────────────────────── */}
      {wallet && unlocked && (
        <div className="glass-panel p-4">
          <h3 className="text-title-sm font-bold font-title mb-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-60">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Security
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm opacity-90">Recovery File</p>
                <p className="text-label opacity-40">Download encrypted .json backup (legacy)</p>
              </div>
              <button onClick={handleExport} className="text-body-sm px-3 py-1.5 border border-current/15 opacity-50 hover:opacity-90 hover:bg-current/5 transition-all cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  .json
                </span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm opacity-90">Lock Wallet</p>
                <p className="text-label opacity-40">Require password to access</p>
              </div>
              <button onClick={lock} className="text-body-sm px-3 py-1.5 border border-current/15 opacity-70 bg-current/5 hover:bg-current/5 transition-all cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  Lock
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Data ─────────────────────────────────────────── */}
      <div className="glass-panel p-4">
        <h3 className="text-title-sm font-bold font-title mb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-60">
            <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          Data
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body-sm opacity-90">Clear CosmoChat Data</p>
              <p className="text-label opacity-40">Delete all posts, channels and messages</p>
            </div>
            <button
              onClick={handleClearChat}
              className="text-body-sm px-3 py-1.5 border border-current/15 opacity-70 bg-current/5 hover:bg-current/5 transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
          {cleared && (
            <p className="text-body-sm opacity-80 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
              Chat data cleared
            </p>
          )}

          {/* ─── Sign Out ───────────────────────────────── */}
          {wallet && (
            <div className="flex items-center justify-between pt-2 border-t border-current/10">
              <div>
                <p className="text-body-sm opacity-90">Sign Out</p>
                <p className="text-label opacity-40">Remove wallet from this device. You can sign back in with your StrangrzID.</p>
              </div>
              <button
                onClick={handleSignOut}
                className={`text-body-sm px-3 py-1.5 border transition-all cursor-pointer ${
                  confirmSignOut
                    ? 'border-current/20 opacity-70 bg-current/5 hover:bg-current/10'
                    : 'border-current/15 opacity-70 bg-current/5 hover:bg-current/5'
                }`}
              >
                {confirmSignOut ? 'Confirm Sign Out' : 'Sign Out'}
              </button>
            </div>
          )}

          {/* ─── Delete Profile ─────────────────────────── */}
          {wallet && (
            <div className="flex items-center justify-between pt-2 border-t border-current/10">
              <div>
                <p className="text-body-sm opacity-90">Supprimer le profil</p>
                <p className="text-label opacity-40">Supprime définitivement votre profil. Vos {wallet.balance.toLocaleString()} {'\u2B23'} seront réintégrés dans la supply.</p>
              </div>
              <button
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    setTimeout(() => setConfirmDelete(false), 5000);
                    return;
                  }
                  deleteAccount();
                }}
                className={`text-body-sm px-3 py-1.5 border transition-all cursor-pointer shrink-0 ${
                  confirmDelete
                    ? 'border-current/30 opacity-90 bg-current/10 hover:bg-current/15'
                    : 'border-current/15 opacity-50 bg-current/5 hover:bg-current/5'
                }`}
              >
                {confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Quick Access ──────────────────────────────────── */}
      <div className="glass-panel p-4">
        <h3 className="text-title-sm font-bold font-title mb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-60">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
          Accès rapide
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body-sm opacity-90">CosmoVault</p>
              <p className="text-label opacity-40">Coffre-fort sécurisé pour vos objets rares</p>
            </div>
            <button
              onClick={() => onNavigate('vault')}
              className="text-body-sm px-3 py-1.5 border border-current/15 opacity-50 hover:opacity-90 hover:bg-current/5 transition-all cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M12 9V3M12 21v-6M9 12H3M21 12h-6" /></svg>
                Ouvrir
              </span>
            </button>
          </div>
          {wallet?.isAdmin && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm opacity-90">Admin Registry</p>
                <p className="text-label opacity-40">Panneau d'administration du protocole</p>
              </div>
              <button
                onClick={() => onNavigate('admin')}
                className="text-body-sm px-3 py-1.5 border border-current/15 opacity-50 hover:opacity-90 hover:bg-current/5 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  Ouvrir
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── About ────────────────────────────────────────── */}
      <div className="glass-panel p-4">
        <h3 className="text-title-sm font-bold font-title mb-3 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-60">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          About
        </h3>
        <div className="space-y-2 text-body-sm">
          <div className="flex justify-between">
            <span className="opacity-40">Version</span>
            <span className="opacity-70">Strangrz Terminal v2.0</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-40">Engine</span>
            <span className="opacity-70">StrangrzMesh v2.0</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-40">Protocol</span>
            <span className="opacity-70">Resonance Decay</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-40">Max Supply</span>
            <span className="opacity-70">69,000,000 {'\u2B23'}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-40">Encryption</span>
            <span className="opacity-70">Ed25519 + AES-256-GCM</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-40">Auth</span>
            <span className="opacity-70">StrangrzID (PBKDF2 600K)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
