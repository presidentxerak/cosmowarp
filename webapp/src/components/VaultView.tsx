import { useState, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import type { RecoveryKit } from '../engine/cosmovault';

export default function VaultView() {
  const {
    wallet, unlocked, myCollection, vaultStats,
    addToVault, addAllToVault,
    generateRecoveryKit, restoreFromRecoveryKit,
  } = useWallet();

  const [backingUp, setBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<string | null>(null);
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [generatingKit, setGeneratingKit] = useState(false);
  const [restoringKit, setRestoringKit] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreResult, setRestoreResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedKit, setImportedKit] = useState<RecoveryKit | null>(null);

  if (!wallet || !unlocked) {
    return (
      <div className="glass-panel p-8 text-center">
        <p className="text-base opacity-50">Unlock your wallet to access the Vault.</p>
      </div>
    );
  }

  const stats = vaultStats;

  const handleBackupAll = async () => {
    setBackingUp(true);
    setBackupResult(null);
    try {
      const result = await addAllToVault();
      setBackupResult(`${result.added} artwork(s) backed up${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
    } catch {
      setBackupResult('Backup failed');
    }
    setBackingUp(false);
    setTimeout(() => setBackupResult(null), 4000);
  };

  const handleBackupOne = async (wartId: string) => {
    const ok = await addToVault(wartId);
    if (ok) setBackupResult('Artwork backed up to vault');
    else setBackupResult('Failed to backup artwork');
    setTimeout(() => setBackupResult(null), 3000);
  };

  const handleGenerateKit = async () => {
    if (!recoveryPassword || recoveryPassword.length < 6) return;
    setGeneratingKit(true);
    try {
      const kit = await generateRecoveryKit(recoveryPassword);
      if (kit) {
        const blob = new Blob([JSON.stringify(kit, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cosmovault-recovery-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setRecoveryPassword('');
        setBackupResult(`Recovery kit downloaded (${kit.entries.length} artworks)`);
      } else {
        setBackupResult('Failed to generate recovery kit');
      }
    } catch {
      setBackupResult('Failed to generate recovery kit');
    }
    setGeneratingKit(false);
    setTimeout(() => setBackupResult(null), 4000);
  };

  const handleImportKit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const kit = JSON.parse(reader.result as string) as RecoveryKit;
        if (kit.type !== 'cosmovault-recovery') throw new Error('Invalid file');
        setImportedKit(kit);
      } catch {
        setRestoreResult('Invalid recovery kit file');
        setTimeout(() => setRestoreResult(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleRestore = async () => {
    if (!importedKit || !restorePassword) return;
    setRestoringKit(true);
    try {
      const result = await restoreFromRecoveryKit(importedKit, restorePassword);
      setRestoreResult(`Restored ${result.restored} artwork(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
      if (result.errors.length > 0) {
        setRestoreResult(prev => `${prev}\n${result.errors.join('\n')}`);
      }
      setImportedKit(null);
      setRestorePassword('');
    } catch {
      setRestoreResult('Restore failed — wrong password?');
    }
    setRestoringKit(false);
    setTimeout(() => setRestoreResult(null), 6000);
  };

  const healthLabel = stats?.vaultHealth === 'healthy' ? 'Healthy' : stats?.vaultHealth === 'partial' ? 'Partial' : 'At Risk';
  const healthIcon = stats?.vaultHealth === 'healthy' ? '\u2713' : stats?.vaultHealth === 'partial' ? '\u26A0' : '\u2717';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-8 text-center">
        <h2 className="text-title-lg font-bold font-title mb-2">{'\u26BF'} CosmoVault</h2>
        <p className="text-base opacity-50">Encrypted artwork backup & recovery</p>
      </div>

      {/* Vault Health */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-title-sm font-bold">Vault Status</h3>
          <span className="text-base font-bold">
            {healthIcon} {healthLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-4 bg-current/5 text-center card">
            <p className="text-title-md font-bold">{stats?.totalArtworks || 0}</p>
            <p className="text-label opacity-40">ARTWORKS</p>
          </div>
          <div className="p-4 bg-current/5 text-center card">
            <p className="text-title-md font-bold">{stats?.hybridBackups || 0}</p>
            <p className="text-label opacity-40">HYBRID</p>
          </div>
          <div className="p-4 bg-current/5 text-center card">
            <p className="text-title-md font-bold">{stats?.localBackups || 0}</p>
            <p className="text-label opacity-40">LOCAL</p>
          </div>
          <div className="p-4 bg-current/5 text-center card">
            <p className="text-title-md font-bold">
              {stats ? (stats.totalSizeBytes / 1024).toFixed(0) : 0} KB
            </p>
            <p className="text-label opacity-40">TOTAL SIZE</p>
          </div>
        </div>

        {backupResult && (
          <div className="text-base p-3 bg-current/5 mb-4 opacity-70">
            {backupResult}
          </div>
        )}

        <button
          className="warp-button w-full py-3 text-base"
          onClick={handleBackupAll}
          disabled={backingUp || myCollection.length === 0}
        >
          {backingUp ? 'Encrypting & backing up...' : `${'\u26BF'} Backup All Artworks (${myCollection.length})`}
        </button>
      </div>

      {/* Recovery Kit */}
      <div className="glass-panel p-6">
        <h3 className="text-title-sm font-bold mb-4">{'\u2B07'} Recovery Kit</h3>
        <p className="text-base opacity-50 mb-4">
          Download an encrypted backup of all your artworks. Use it to restore on any device.
        </p>

        <div className="space-y-3 mb-4">
          <input
            className="warp-input"
            type="password"
            placeholder="Recovery password (min 6 chars)"
            value={recoveryPassword}
            onChange={e => setRecoveryPassword(e.target.value)}
          />
          <button
            className="warp-button w-full py-3"
            onClick={handleGenerateKit}
            disabled={generatingKit || !recoveryPassword || recoveryPassword.length < 6 || myCollection.length === 0}
          >
            {generatingKit ? 'Generating...' : `${'\u2B07'} Download Recovery Kit`}
          </button>
        </div>

        <div className="border-t border-current/10 pt-4 mt-4">
          <p className="text-base opacity-50 mb-3">{'\u2B06'} Restore from Recovery Kit</p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportKit}
          />

          {!importedKit ? (
            <button
              className="warp-button w-full py-3"
              onClick={() => fileInputRef.current?.click()}
            >
              {'\u2B06'} Select Recovery Kit File
            </button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-current/5 text-base opacity-70">
                {'\u2713'} Kit loaded: {importedKit.entries.length} artworks from {new Date(importedKit.createdAt).toLocaleDateString()}
              </div>
              <input
                className="warp-input"
                type="password"
                placeholder="Recovery password"
                value={restorePassword}
                onChange={e => setRestorePassword(e.target.value)}
              />
              <button
                className="warp-button w-full py-3"
                onClick={handleRestore}
                disabled={restoringKit || !restorePassword}
              >
                {restoringKit ? 'Restoring...' : `${'\u26A1'} Restore Artworks`}
              </button>
            </div>
          )}

          {restoreResult && (
            <div className="text-base p-3 mt-3 bg-current/5 opacity-70 whitespace-pre-line">
              {restoreResult}
            </div>
          )}
        </div>
      </div>

      {/* Collection with vault status */}
      <div className="glass-panel p-6">
        <h3 className="text-title-sm font-bold mb-4">Your Collection ({myCollection.length})</h3>

        {myCollection.length === 0 ? (
          <p className="text-base opacity-40 text-center py-6">No artworks yet. Create one in the Marketplace.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myCollection.map(wart => (
              <div key={wart.id} className="p-4 card">
                <div className="flex items-start gap-4">
                  {wart.mediaType !== 'audio' && (
                    <div className="w-20 h-20 overflow-hidden shrink-0">
                      <img src={wart.imageData} alt={wart.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium truncate">{wart.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {wart.vaultBackup ? (
                        <span className="text-label px-2 py-1 bg-current/5">
                          {'\u26BF'} Backed up
                        </span>
                      ) : (
                        <span className="text-label px-2 py-1 bg-current/5 opacity-50">
                          {'\u26A0'} Not backed up
                        </span>
                      )}
                      {wart.certId && (
                        <span className="text-label px-2 py-1 bg-current/5">
                          {'\u2713'} Certified
                        </span>
                      )}
                    </div>
                    {!wart.vaultBackup && (
                      <button
                        className="text-body-sm opacity-60 hover:opacity-100 mt-2 cursor-pointer transition-opacity"
                        onClick={() => handleBackupOne(wart.id)}
                      >
                        {'\u26BF'} Backup now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Info */}
      <div className="glass-panel p-6">
        <h3 className="text-title-sm font-bold mb-4">Security</h3>
        <div className="space-y-3 text-base opacity-60">
          <div className="flex items-start gap-3">
            <span className="shrink-0">{'\u2713'}</span>
            <span>AES-256-GCM encryption at rest</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0">{'\u2713'}</span>
            <span>Vault key derived from StrangrzID (PBKDF2 600K rounds)</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0">{'\u2713'}</span>
            <span>Recovery kit double-encrypted (vault key + recovery password)</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0">{'\u2713'}</span>
            <span>SHA-256 content fingerprint integrity verification</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0">{'\u2713'}</span>
            <span>Ed25519 signed vault manifest</span>
          </div>
        </div>
      </div>
    </div>
  );
}
