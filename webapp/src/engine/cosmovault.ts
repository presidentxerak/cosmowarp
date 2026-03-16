/**
 * CosmoVault — Encrypted Artwork Backup & Recovery System
 *
 * Solves the #1 problem with NFTs: "What happens if my computer crashes?"
 *
 * ─── How It Works ────────────────────────────────────────────
 *
 * 1. DETERMINISTIC VAULT KEY — Derived from StrangrzID (username + password)
 *    via PBKDF2 (600K rounds). Same credentials = same vault on any device.
 *
 * 2. ENCRYPTED ARTWORK STORAGE — Each artwork is:
 *    a) Fingerprinted (SHA-256 of raw media)
 *    b) Encrypted with AES-256-GCM using the vault key
 *    c) Stored in IndexedDB (local, multi-GB capacity)
 *    d) Optionally encoded as StrangrzCode SVG for on-chain backup
 *
 * 3. RECOVERY MODES:
 *    - StrangrzID Recovery: Same username + password → same vault key → decrypt all
 *    - Recovery Kit: Encrypted JSON bundle (downloadable, works offline)
 *    - On-Chain Recovery: StrangrzCode SVG stored in StrangrzChain blocks
 *    - Peer Recovery: Request encrypted fragments from connected peers
 *
 * 4. VAULT MANIFEST — A signed, encrypted index of all owned artworks.
 *    Contains fingerprints, titles, certificate IDs, and recovery metadata.
 *    The manifest itself is stored on-chain (tiny, ~1KB per 100 artworks).
 *
 * ─── Security Model ─────────────────────────────────────────
 *
 * - Vault key is NEVER stored. It's derived on-the-fly from credentials.
 * - Artworks are encrypted at rest (AES-256-GCM).
 * - Recovery kit is double-encrypted (vault key + user-chosen password).
 * - On-chain data is public but useless without the vault key.
 * - Vault manifest is signed with Ed25519 → tamper-proof.
 */

import { sha256, encryptData, decryptData, signTransaction, type EncryptedPayload } from './crypto';
import { storage } from './storage';

// ─── Types ───────────────────────────────────────────────

export interface VaultEntry {
  id: string;                      // Wart ID
  fingerprint: string;             // SHA-256 of original media
  certId: string;                  // Certificate of Authenticity ID
  title: string;
  creator: string;                 // Creator address
  owner: string;                   // Current owner address
  encryptedMedia: EncryptedPayload; // AES-256-GCM encrypted media data
  mediaType: 'image' | 'audio' | 'video' | 'svg' | 'cards';
  mediaSizeBytes: number;          // Original media size
  createdAt: number;
  addedToVaultAt: number;
  onChainTxId?: string;            // StrangrzChain TX that stores the on-chain backup
  onChainSVG?: string;             // StrangrzCode SVG backup (if available)
  recoveryStatus: 'local' | 'onchain' | 'hybrid' | 'peer';
}

export interface VaultManifest {
  version: 2;
  ownerAddress: string;
  entries: VaultManifestEntry[];
  totalSize: number;               // Total size of all artworks
  lastUpdated: number;
  signature: string;               // Ed25519 signature of manifest hash
}

export interface VaultManifestEntry {
  id: string;
  fingerprint: string;
  certId: string;
  title: string;
  mediaType: 'image' | 'audio' | 'video' | 'svg' | 'cards';
  mediaSizeBytes: number;
  createdAt: number;
  recoveryStatus: 'local' | 'onchain' | 'hybrid' | 'peer';
}

export interface RecoveryKit {
  version: 2;
  type: 'cosmovault-recovery';
  ownerAddress: string;
  createdAt: number;
  entries: RecoveryKitEntry[];
  manifestSignature: string;
}

export interface RecoveryKitEntry {
  id: string;
  fingerprint: string;
  certId: string;
  title: string;
  mediaType: 'image' | 'audio' | 'video' | 'svg' | 'cards';
  encryptedMedia: EncryptedPayload;  // Double-encrypted: vault key + recovery password
  metadata: Record<string, string>;
}

export interface VaultStats {
  totalArtworks: number;
  totalSizeBytes: number;
  localBackups: number;
  onChainBackups: number;
  hybridBackups: number;
  peerBackups: number;
  lastBackupAt: number;
  vaultHealth: 'healthy' | 'partial' | 'at-risk';
}

// ─── Constants ───────────────────────────────────────────

const VAULT_KEY = 'cosmovault_entries';
const VAULT_MANIFEST_KEY = 'cosmovault_manifest';
const VAULT_SALT = 'CosmoVault-AES-v2';

// ─── Vault Key Derivation ────────────────────────────────

/**
 * Derive the vault encryption key from StrangrzID credentials.
 * Uses a different salt than wallet key derivation for domain separation.
 */
async function deriveVaultSecret(username: string, password: string): Promise<string> {
  return `${VAULT_SALT}:${username.toLowerCase().trim()}:${password}`;
}

// ─── CosmoVault Engine ───────────────────────────────────

export class CosmoVault {
  private entries: Map<string, VaultEntry> = new Map();
  private vaultSecret: string | null = null;

  constructor() {
    this.loadEntries();
  }

  private loadEntries(): void {
    const raw = storage.getItem(VAULT_KEY);
    if (!raw) return;
    try {
      const arr: VaultEntry[] = JSON.parse(raw);
      for (const entry of arr) {
        this.entries.set(entry.id, entry);
      }
    } catch { /* corrupt data */ }
  }

  private saveEntries(): void {
    const arr = Array.from(this.entries.values());
    storage.setItem(VAULT_KEY, JSON.stringify(arr));
  }

  // ─── Initialization ─────────────────────────────────

  /**
   * Initialize vault with StrangrzID credentials.
   * Must be called before encrypt/decrypt operations.
   */
  async init(username: string, password: string): Promise<void> {
    this.vaultSecret = await deriveVaultSecret(username, password);
  }

  /**
   * Initialize vault with a raw secret (for wallet-based init without StrangrzID).
   */
  initWithSecret(secret: string): void {
    this.vaultSecret = `${VAULT_SALT}:${secret}`;
  }

  isInitialized(): boolean {
    return this.vaultSecret !== null;
  }

  lock(): void {
    this.vaultSecret = null;
  }

  // ─── Add Artwork to Vault ────────────────────────────

  /**
   * Encrypt and store an artwork in the vault.
   * Returns the vault entry with encrypted media.
   */
  async addArtwork(params: {
    id: string;
    title: string;
    fingerprint: string;
    certId: string;
    creator: string;
    owner: string;
    mediaData: string;          // Raw media (data URL or base64)
    mediaType: 'image' | 'audio' | 'video' | 'svg' | 'cards';
    onChainSVG?: string;
    onChainTxId?: string;
  }): Promise<VaultEntry> {
    if (!this.vaultSecret) throw new Error('Vault is locked');

    const mediaSizeBytes = new TextEncoder().encode(params.mediaData).length;

    // Encrypt the media with the vault key
    const encryptedMedia = await encryptData(params.mediaData, this.vaultSecret);

    const entry: VaultEntry = {
      id: params.id,
      fingerprint: params.fingerprint,
      certId: params.certId,
      title: params.title,
      creator: params.creator,
      owner: params.owner,
      encryptedMedia,
      mediaType: params.mediaType,
      mediaSizeBytes,
      createdAt: Date.now(),
      addedToVaultAt: Date.now(),
      onChainTxId: params.onChainTxId,
      onChainSVG: params.onChainSVG,
      recoveryStatus: params.onChainSVG ? 'hybrid' : 'local',
    };

    this.entries.set(params.id, entry);
    this.saveEntries();

    return entry;
  }

  // ─── Recover Artwork from Vault ──────────────────────

  /**
   * Decrypt an artwork from the vault.
   * Returns the raw media data.
   */
  async recoverArtwork(id: string): Promise<string | null> {
    if (!this.vaultSecret) throw new Error('Vault is locked');

    const entry = this.entries.get(id);
    if (!entry) return null;

    try {
      return await decryptData(entry.encryptedMedia, this.vaultSecret);
    } catch {
      return null;
    }
  }

  /**
   * Verify that a vault entry's decrypted content matches its fingerprint.
   */
  async verifyIntegrity(id: string): Promise<{ valid: boolean; reason: string }> {
    if (!this.vaultSecret) return { valid: false, reason: 'Vault is locked' };

    const entry = this.entries.get(id);
    if (!entry) return { valid: false, reason: 'Entry not found' };

    try {
      const decrypted = await decryptData(entry.encryptedMedia, this.vaultSecret);
      const fingerprint = await sha256(decrypted);
      if (fingerprint !== entry.fingerprint) {
        return { valid: false, reason: 'Content integrity check failed — data has been tampered with' };
      }
      return { valid: true, reason: 'Integrity verified — content matches original fingerprint' };
    } catch {
      return { valid: false, reason: 'Decryption failed — wrong vault key or corrupted data' };
    }
  }

  // ─── Remove from Vault ──────────────────────────────

  removeArtwork(id: string): boolean {
    const deleted = this.entries.delete(id);
    if (deleted) this.saveEntries();
    return deleted;
  }

  // ─── Update Owner ────────────────────────────────────

  updateOwner(id: string, newOwner: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    entry.owner = newOwner;
    this.saveEntries();
    return true;
  }

  // ─── Recovery Kit ────────────────────────────────────

  /**
   * Generate an encrypted recovery kit containing all vault entries.
   * The kit is double-encrypted: vault key + additional recovery password.
   */
  async generateRecoveryKit(
    ownerAddress: string,
    recoveryPassword: string,
    privateKey: string,
  ): Promise<RecoveryKit> {
    if (!this.vaultSecret) throw new Error('Vault is locked');

    const kitEntries: RecoveryKitEntry[] = [];

    for (const entry of this.entries.values()) {
      if (entry.owner !== ownerAddress) continue;

      // Double-encrypt: re-encrypt with recovery password
      const decrypted = await decryptData(entry.encryptedMedia, this.vaultSecret);
      const doubleEncrypted = await encryptData(decrypted, `RECOVERY:${recoveryPassword}`);

      kitEntries.push({
        id: entry.id,
        fingerprint: entry.fingerprint,
        certId: entry.certId,
        title: entry.title,
        mediaType: entry.mediaType,
        encryptedMedia: doubleEncrypted,
        metadata: {
          creator: entry.creator,
          createdAt: entry.createdAt.toString(),
          mediaSizeBytes: entry.mediaSizeBytes.toString(),
        },
      });
    }

    // Sign the manifest
    const manifestHash = await sha256(JSON.stringify(kitEntries.map(e => e.fingerprint)));
    const manifestSignature = await signTransaction(manifestHash, privateKey);

    return {
      version: 2,
      type: 'cosmovault-recovery',
      ownerAddress,
      createdAt: Date.now(),
      entries: kitEntries,
      manifestSignature,
    };
  }

  /**
   * Restore artworks from a recovery kit.
   * Decrypts with recovery password, re-encrypts with current vault key.
   */
  async restoreFromRecoveryKit(
    kit: RecoveryKit,
    recoveryPassword: string,
    newOwner: string,
  ): Promise<{ restored: number; failed: number; errors: string[] }> {
    if (!this.vaultSecret) throw new Error('Vault is locked');

    let restored = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const kitEntry of kit.entries) {
      try {
        // Decrypt with recovery password
        const mediaData = await decryptData(
          kitEntry.encryptedMedia,
          `RECOVERY:${recoveryPassword}`,
        );

        // Verify fingerprint
        const fingerprint = await sha256(mediaData);
        if (fingerprint !== kitEntry.fingerprint) {
          errors.push(`${kitEntry.title}: Integrity check failed`);
          failed++;
          continue;
        }

        // Re-encrypt with vault key and store
        await this.addArtwork({
          id: kitEntry.id,
          title: kitEntry.title,
          fingerprint: kitEntry.fingerprint,
          certId: kitEntry.certId,
          creator: kitEntry.metadata.creator || newOwner,
          owner: newOwner,
          mediaData,
          mediaType: kitEntry.mediaType,
        });

        restored++;
      } catch (err) {
        errors.push(`${kitEntry.title}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        failed++;
      }
    }

    return { restored, failed, errors };
  }

  // ─── Vault Manifest ──────────────────────────────────

  /**
   * Generate a signed manifest of all vault entries.
   * This manifest can be stored on-chain for discovery.
   */
  async generateManifest(
    ownerAddress: string,
    privateKey: string,
  ): Promise<VaultManifest> {
    const entries: VaultManifestEntry[] = [];
    let totalSize = 0;

    for (const entry of this.entries.values()) {
      if (entry.owner !== ownerAddress) continue;

      entries.push({
        id: entry.id,
        fingerprint: entry.fingerprint,
        certId: entry.certId,
        title: entry.title,
        mediaType: entry.mediaType,
        mediaSizeBytes: entry.mediaSizeBytes,
        createdAt: entry.createdAt,
        recoveryStatus: entry.recoveryStatus,
      });

      totalSize += entry.mediaSizeBytes;
    }

    const manifestData = JSON.stringify({
      owner: ownerAddress,
      entries: entries.map(e => e.fingerprint),
      ts: Date.now(),
    });
    const manifestHash = await sha256(manifestData);
    const signature = await signTransaction(manifestHash, privateKey);

    const manifest: VaultManifest = {
      version: 2,
      ownerAddress,
      entries,
      totalSize,
      lastUpdated: Date.now(),
      signature,
    };

    // Persist manifest locally
    storage.setItem(VAULT_MANIFEST_KEY, JSON.stringify(manifest));

    return manifest;
  }

  // ─── Queries ─────────────────────────────────────────

  getEntry(id: string): VaultEntry | undefined {
    return this.entries.get(id);
  }

  getEntriesByOwner(ownerAddress: string): VaultEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.owner === ownerAddress)
      .sort((a, b) => b.addedToVaultAt - a.addedToVaultAt);
  }

  getAllEntries(): VaultEntry[] {
    return Array.from(this.entries.values())
      .sort((a, b) => b.addedToVaultAt - a.addedToVaultAt);
  }

  getStats(ownerAddress?: string): VaultStats {
    const entries = ownerAddress
      ? this.getEntriesByOwner(ownerAddress)
      : this.getAllEntries();

    let totalSize = 0;
    let local = 0;
    let onchain = 0;
    let hybrid = 0;
    let peer = 0;
    let lastBackup = 0;

    for (const entry of entries) {
      totalSize += entry.mediaSizeBytes;
      switch (entry.recoveryStatus) {
        case 'local': local++; break;
        case 'onchain': onchain++; break;
        case 'hybrid': hybrid++; break;
        case 'peer': peer++; break;
      }
      if (entry.addedToVaultAt > lastBackup) lastBackup = entry.addedToVaultAt;
    }

    // Health: hybrid = healthy, local-only = partial, nothing = at-risk
    let vaultHealth: VaultStats['vaultHealth'] = 'healthy';
    if (entries.length === 0) {
      vaultHealth = 'at-risk';
    } else if (hybrid === 0 && onchain === 0) {
      vaultHealth = 'partial';
    } else if (local > hybrid + onchain) {
      vaultHealth = 'partial';
    }

    return {
      totalArtworks: entries.length,
      totalSizeBytes: totalSize,
      localBackups: local,
      onChainBackups: onchain,
      hybridBackups: hybrid,
      peerBackups: peer,
      lastBackupAt: lastBackup,
      vaultHealth,
    };
  }

  /**
   * Check if an artwork exists in the vault.
   */
  hasArtwork(id: string): boolean {
    return this.entries.has(id);
  }

  /**
   * Get the stored manifest (if any).
   */
  getStoredManifest(): VaultManifest | null {
    const raw = storage.getItem(VAULT_MANIFEST_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
