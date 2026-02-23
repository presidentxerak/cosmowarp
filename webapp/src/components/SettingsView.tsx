import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { shortAddress } from '../engine/crypto';
import { storage } from '../engine/storage';

export default function SettingsView() {
  const { wallet, unlocked, lock, signOut, doExportWallet, doGenerateCosmoLink } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const [cleared, setCleared] = useState(false);
  const [cosmoLink, setCosmoLink] = useState<string | null>(null);
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
    a.download = `cosmowarp-wallet-${wallet ? shortAddress(wallet.address) : 'backup'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateCosmoLink = async () => {
    if (!linkPassword || linkPassword.length < 6) {
      setLinkError('Password must be at least 6 characters');
      return;
    }
    setLinkGenerating(true);
    setLinkError('');
    try {
      const link = await doGenerateCosmoLink(linkPassword);
      if (link) {
        setCosmoLink(link);
      } else {
        setLinkError('Failed to generate CosmoLink');
      }
    } catch {
      setLinkError('Failed to generate CosmoLink');
    } finally {
      setLinkGenerating(false);
    }
  };

  const handleCopyCosmoLink = () => {
    if (!cosmoLink) return;
    navigator.clipboard.writeText(cosmoLink);
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
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="glass-panel p-5 text-center">
        <h2 className="text-lg font-bold text-gray-100 mb-1 font-title">{'\u2699'} Settings</h2>
        <p className="text-xs text-gray-500">Manage your CosmoWarp experience</p>
      </div>

      {/* ─── Profile ──────────────────────────────────────── */}
      {wallet && (
        <div className="glass-panel p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3">{'\u25C8'} Profile</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Username</span>
              <span className="text-gray-200">{wallet.alias ? `@${wallet.alias}` : 'Anonymous'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Address</span>
              <code className="text-energy-400 text-[10px]">{shortAddress(wallet.address)}</code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Level</span>
              <span className="text-warp-400">{wallet.levelName} (Lv.{wallet.level})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Balance</span>
              <span className="text-energy-400">{wallet.balance.toLocaleString()} {'\u03A9'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Auth</span>
              <span className="text-warp-300">{'\u2B21'} CosmoID</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Appearance ───────────────────────────────────── */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3">{'\u2600'} Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-200">Theme</p>
            <p className="text-[10px] text-gray-500">Switch between dark and light mode</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`px-4 py-2 text-xs font-medium border transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-cosmic-900/60 border-white/10 text-gray-300'
                : 'bg-white/10 border-black/10 text-gray-700'
            }`}
          >
            {theme === 'dark' ? '\u263D Dark' : '\u2600 Light'}
          </button>
        </div>
      </div>

      {/* ─── CosmoLink (Sync) ─────────────────────────────── */}
      {wallet && unlocked && (
        <div className="glass-panel p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-2">{'\u26A1'} CosmoLink</h3>
          <p className="text-[10px] text-gray-500 mb-3">
            Generate an encrypted code to transfer your wallet to another device. Copy it and paste it via any messaging app.
          </p>

          {!cosmoLink ? (
            <div className="space-y-3">
              <input
                className="warp-input text-center text-xs"
                type="password"
                placeholder="Enter your password to generate"
                value={linkPassword}
                onChange={e => { setLinkPassword(e.target.value); setLinkError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') handleGenerateCosmoLink(); }}
              />
              {linkError && <p className="text-xs text-red-400">{linkError}</p>}
              <button
                onClick={handleGenerateCosmoLink}
                className="warp-button w-full text-xs py-2"
                disabled={!linkPassword || linkGenerating}
              >
                {linkGenerating ? 'Generating...' : '\u26A1 Generate CosmoLink'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-cosmic-900/60 border border-warp-500/20">
                <p className="text-[10px] text-gray-500 mb-1">YOUR COSMOLINK CODE</p>
                <p className="text-[10px] text-warp-300 break-all font-mono leading-relaxed select-all">{cosmoLink}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyCosmoLink}
                  className="warp-button flex-1 text-xs py-2"
                >
                  {linkCopied ? '\u2713 Copied!' : '\u2398 Copy Code'}
                </button>
                <button
                  onClick={() => { setCosmoLink(null); setLinkPassword(''); }}
                  className="text-xs px-3 py-2 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="p-3 bg-warp-500/5 border border-warp-500/10 text-left">
                <p className="text-[10px] text-gray-400">
                  <span className="text-warp-300 font-bold">How to use:</span> Copy this code and send it to yourself via any messaging app (iMessage, WhatsApp, Telegram, etc.). On the other device, choose "CosmoLink" when signing in and paste the code + your password.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Security ─────────────────────────────────────── */}
      {wallet && unlocked && (
        <div className="glass-panel p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3">{'\u26BF'} Security</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-200">Recovery File</p>
                <p className="text-[10px] text-gray-500">Download encrypted .json backup (legacy)</p>
              </div>
              <button onClick={handleExport} className="text-xs px-3 py-1.5 border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all cursor-pointer">
                {'\u2B07'} .json
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-200">Lock Wallet</p>
                <p className="text-[10px] text-gray-500">Require password to access</p>
              </div>
              <button onClick={lock} className="text-xs px-3 py-1.5 border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer">
                {'\u274C'} Lock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Data ─────────────────────────────────────────── */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3">{'\u2716'} Data</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-200">Clear CosmoChat Data</p>
              <p className="text-[10px] text-gray-500">Delete all posts, channels and messages</p>
            </div>
            <button
              onClick={handleClearChat}
              className="text-xs px-3 py-1.5 border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
          {cleared && (
            <p className="text-xs text-green-400">{'\u2713'} Chat data cleared</p>
          )}

          {/* ─── Sign Out ───────────────────────────────── */}
          {wallet && (
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div>
                <p className="text-xs text-gray-200">Sign Out</p>
                <p className="text-[10px] text-gray-500">Remove wallet from this device. You can sign back in with your CosmoID.</p>
              </div>
              <button
                onClick={handleSignOut}
                className={`text-xs px-3 py-1.5 border transition-all cursor-pointer ${
                  confirmSignOut
                    ? 'border-red-500/50 text-red-300 bg-red-500/20 hover:bg-red-500/30'
                    : 'border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20'
                }`}
              >
                {confirmSignOut ? 'Confirm Sign Out' : 'Sign Out'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── About ────────────────────────────────────────── */}
      <div className="glass-panel p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3">{'\u2B21'} About</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Version</span>
            <span className="text-gray-300">CosmoWarp Terminal v2.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Engine</span>
            <span className="text-gray-300">CosmoMesh v2.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Protocol</span>
            <span className="text-gray-300">Resonance Decay</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Max Supply</span>
            <span className="text-gray-300">69,000,000 {'\u03A9'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Encryption</span>
            <span className="text-gray-300">Ed25519 + AES-256-GCM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Auth</span>
            <span className="text-gray-300">CosmoID (PBKDF2 600K)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
