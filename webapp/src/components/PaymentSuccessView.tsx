import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';

/**
 * PaymentSuccessView — Post-payment confirmation page
 *
 * Displayed after Stripe redirects back to /payment-success?tx=FIAT_xxx
 *
 * Flow:
 * 1. Show payment confirmation with transaction ID
 * 2. Verify cloud backup status (Supabase sync)
 * 3. Auto-trigger vault backup for newly purchased artwork
 * 4. Show recovery options & reassure about multi-layer protection
 */

type BackupStep = 'checking' | 'syncing' | 'done' | 'error';

export default function PaymentSuccessView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const {
    wallet, unlocked, myCollection, vaultStats,
    addAllToVault, refreshWarts,
  } = useWallet();

  const [txId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tx') || null;
  });

  const [backupStep, setBackupStep] = useState<BackupStep>('checking');
  const [backupMessage, setBackupMessage] = useState('');
  const [autoBackupDone, setAutoBackupDone] = useState(false);

  // Refresh warts on mount to pick up newly purchased artwork
  useEffect(() => {
    refreshWarts();
  }, []);

  // Auto-trigger vault backup after warts refresh
  const runAutoBackup = useCallback(async () => {
    if (autoBackupDone || !wallet || !unlocked) return;
    setAutoBackupDone(true);
    setBackupStep('syncing');
    setBackupMessage('Chiffrement et sauvegarde de votre collection...');

    try {
      const result = await addAllToVault();
      if (result.added > 0 || result.failed === 0) {
        setBackupStep('done');
        setBackupMessage(
          result.added > 0
            ? `${result.added} oeuvre(s) sauvegardée(s) dans le CosmoVault`
            : 'Toutes vos oeuvres sont déjà protégées'
        );
      } else {
        setBackupStep('error');
        setBackupMessage(`${result.failed} sauvegarde(s) en échec — réessayez depuis le Vault`);
      }
    } catch {
      setBackupStep('error');
      setBackupMessage('Sauvegarde automatique échouée — vos oeuvres restent accessibles via le cloud');
    }
  }, [wallet, unlocked, addAllToVault, autoBackupDone]);

  useEffect(() => {
    if (wallet && unlocked && myCollection.length > 0 && !autoBackupDone) {
      // Small delay to let sync settle
      const timer = setTimeout(runAutoBackup, 1500);
      return () => clearTimeout(timer);
    }
    if (wallet && unlocked && myCollection.length === 0 && !autoBackupDone) {
      setBackupStep('done');
      setBackupMessage('En attente de confirmation du paiement...');
    }
  }, [wallet, unlocked, myCollection.length, autoBackupDone, runAutoBackup]);

  // ─── Not logged in ──────────────────────────────────────
  if (!wallet || !unlocked) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-200px)]">
        <div className="text-center px-6">
          <p className="text-5xl mb-4">{'\u2B21'}</p>
          <h2 className="text-title-sm font-bold mb-2 font-title">Paiement reçu</h2>
          <p className="opacity-50 text-base mb-4">
            Déverrouillez votre wallet pour voir votre achat
          </p>
          {txId && (
            <p className="opacity-30 text-body-sm font-mono">TX: {txId}</p>
          )}
        </div>
      </div>
    );
  }

  // ─── Main view ──────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{'\u2714'}</div>
        <h1 className="text-title-md font-bold font-title mb-2">
          Paiement confirmé
        </h1>
        <p className="opacity-60 text-base">
          Votre achat a été traité avec succès
        </p>
        {txId && (
          <p className="opacity-30 text-body-sm font-mono mt-2">
            Réf: {txId}
          </p>
        )}
      </div>

      {/* Backup status */}
      <div className="glass-panel p-6 mb-6">
        <h2 className="text-title-sm font-bold mb-4 flex items-center gap-2">
          {'\u26BF'} Protection de vos oeuvres
        </h2>

        {/* Backup progress indicator */}
        <div className="flex items-center gap-3 mb-4">
          {backupStep === 'checking' && (
            <div className="animate-pulse text-base opacity-60">Vérification en cours...</div>
          )}
          {backupStep === 'syncing' && (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-base opacity-80">{backupMessage}</span>
            </>
          )}
          {backupStep === 'done' && (
            <span className="text-base" style={{ color: '#4ade80' }}>
              {'\u2713'} {backupMessage}
            </span>
          )}
          {backupStep === 'error' && (
            <span className="text-base" style={{ color: '#f87171' }}>
              {'\u26A0'} {backupMessage}
            </span>
          )}
        </div>

        {/* Multi-layer protection explainer */}
        <div className="space-y-3 text-body-sm">
          <h3 className="font-bold opacity-80 text-base">Vos oeuvres sont protégées sur 4 niveaux :</h3>

          <div className="flex items-start gap-3 opacity-70">
            <span className="text-lg mt-[-2px]">{'\u2601'}</span>
            <div>
              <p className="font-semibold">Cloud Supabase</p>
              <p className="opacity-60">
                Média et métadonnées synchronisés automatiquement.
                Accessible depuis n'importe quel appareil avec vos identifiants.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 opacity-70">
            <span className="text-lg mt-[-2px]">{'\u26BF'}</span>
            <div>
              <p className="font-semibold">CosmoVault chiffré</p>
              <p className="opacity-60">
                Backup AES-256-GCM dérivé de votre StrangrzID.
                Même mot de passe = même vault sur tout appareil.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 opacity-70">
            <span className="text-lg mt-[-2px]">{'\u26D3'}</span>
            <div>
              <p className="font-semibold">On-Chain (StrangrzCode)</p>
              <p className="opacity-60">
                Empreinte et certificat inscrit dans la blockchain.
                Preuve de propriété immuable et récupération permanente.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 opacity-70">
            <span className="text-lg mt-[-2px]">{'\u{1F4BE}'}</span>
            <div>
              <p className="font-semibold">Recovery Kit (hors-ligne)</p>
              <p className="opacity-60">
                Kit téléchargeable, doublement chiffré.
                Fonctionne sans internet — votre filet de sécurité ultime.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Vault stats */}
      {vaultStats && (
        <div className="glass-panel p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-title-sm font-bold">{vaultStats.totalArtworks}</p>
              <p className="text-body-sm opacity-50">Dans le vault</p>
            </div>
            <div>
              <p className="text-title-sm font-bold">{myCollection.length}</p>
              <p className="text-body-sm opacity-50">Collection</p>
            </div>
            <div>
              <p className="text-title-sm font-bold" style={{
                color: vaultStats.vaultHealth === 'healthy' ? '#4ade80'
                  : vaultStats.vaultHealth === 'partial' ? '#facc15'
                  : '#f87171'
              }}>
                {vaultStats.vaultHealth === 'healthy' ? '\u2713 Sûr'
                  : vaultStats.vaultHealth === 'partial' ? '\u26A0 Partiel'
                  : '\u26A0 Risque'}
              </p>
              <p className="text-body-sm opacity-50">Santé</p>
            </div>
          </div>
        </div>
      )}

      {/* Scenario: device stolen/hacked */}
      <div className="glass-panel p-5 mb-6" style={{ borderLeft: '3px solid #60a5fa' }}>
        <h3 className="font-bold text-base mb-2">
          {'\u{1F6E1}'} Si votre appareil est volé ou piraté ?
        </h3>
        <ol className="text-body-sm opacity-70 space-y-2 list-decimal list-inside">
          <li>
            <strong>Connectez-vous</strong> sur un autre appareil avec votre StrangrzID
            (même identifiant + mot de passe)
          </li>
          <li>
            Vos oeuvres sont <strong>re-téléchargées automatiquement</strong> depuis le cloud Supabase
          </li>
          <li>
            Le CosmoVault <strong>re-dérive la même clé de chiffrement</strong> et décrypte vos backups
          </li>
          <li>
            En dernier recours : importez votre <strong>Recovery Kit</strong> (fichier téléchargé)
          </li>
        </ol>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <button
          onClick={() => onNavigate('profile')}
          className="warp-button w-full py-3 text-base cursor-pointer"
        >
          {'\u{1F3A8}'} Voir Ma Collection
        </button>

        <button
          onClick={() => onNavigate('vault')}
          className="w-full py-3 text-base cursor-pointer rounded-lg border border-current opacity-60 hover:opacity-100 transition-opacity"
          style={{ background: 'transparent' }}
        >
          {'\u26BF'} Gérer mon CosmoVault
        </button>

        <button
          onClick={() => onNavigate('gallery')}
          className="w-full py-3 text-base cursor-pointer rounded-lg opacity-40 hover:opacity-70 transition-opacity"
          style={{ background: 'transparent' }}
        >
          {'\u2190'} Retour à la Galerie
        </button>
      </div>
    </div>
  );
}
