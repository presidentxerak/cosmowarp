import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useTheme } from '../context/ThemeContext';
import { shortAddress } from '../engine/crypto';
import { storage } from '../engine/storage';

export default function SettingsView() {
  const { wallet, unlocked, lock, doExportWallet } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const [cleared, setCleared] = useState(false);

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

  const handleClearChat = () => {
    storage.removeItem('cosmochat_posts');
    storage.removeItem('cosmochat_channels');
    storage.removeItem('cosmochat_dms');
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
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

      {/* ─── Security ─────────────────────────────────────── */}
      {wallet && unlocked && (
        <div className="glass-panel p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-3">{'\u26BF'} Security</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-200">Recovery Key</p>
                <p className="text-[10px] text-gray-500">Download encrypted backup file</p>
              </div>
              <button onClick={handleExport} className="warp-button text-xs px-3 py-1.5">
                {'\u2B07'} Download
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
          <p className="text-xs text-green-400 mt-2">{'\u2713'} Chat data cleared</p>
        )}
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
        </div>
      </div>
    </div>
  );
}
