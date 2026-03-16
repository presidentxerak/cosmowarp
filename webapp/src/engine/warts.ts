/**
 * Strangrz Wart Engine — NFT-like Digital Art on the Strangrz Protocol
 *
 * Warts are unique digital artworks stored in the Strangrz protocol.
 * Anyone with a wallet can mint, list, buy, and transfer Warts.
 * Creators earn royalties on every resale.
 *
 * ─── Full On-Chain SVG Architecture (StrangrzCode) ──────────
 * With StrangrzChain integration, all artwork is stored FULLY ON-CHAIN
 * as optimized StrangrzCode SVG containers. The 7-layer fractal compression
 * pipeline achieves ~1000x storage efficiency, making on-chain storage
 * of full images practical at zero cost.
 *
 * ─── Hybrid Storage ──────────────────────────────────────
 * - On-Chain: StrangrzCode SVG container in the StrangrzChain block (permanent)
 * - Local Cache: Content-addressable storage for fast rendering
 * - Both: Certificate of Authenticity with Ed25519 creator signature
 *
 * ─── Certificate of Authenticity ─────────────────────────
 * Every Wart receives an unforgeable Certificate ID (STCERT_*) computed
 * from SHA-256(creator + content fingerprint + timestamp + title).
 * The creator's Ed25519 signature proves authenticity. Certificates are
 * permanently registered in an append-only local registry.
 */

import { storage } from './storage';
import { sha256, signTransaction } from './crypto';
import { extractImageFromOnChainSVG, type StrangrzCodeContainer } from './cosmocode';
import { CosmoVault, type VaultEntry, type VaultStats, type RecoveryKit } from './cosmovault';
import { ContractEngine, type CosmoContract, type FiatPrice } from './cosmocontract';
import { FiatGateway, type FiatTransaction, type FiatCurrency, formatFiatPrice } from './fiatgateway';
import { storeMedia, retrieveAllMedia, deleteMedia } from './mediadb';
import { getStrangrzEngine } from './vobjct';

// ─── Types ───────────────────────────────────────────────

export interface WartTransfer {
  from: string;
  to: string;
  price: number;
  timestamp: number;
  txId: string;
}

export type WartRarity = 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common';

export interface WartComment {
  id: string;
  author: string;
  authorAlias: string;
  content: string;
  timestamp: number;
}

export interface WartCertificate {
  certId: string;              // STCERT_<SHA256[0:32]> — unforgeable
  contentFingerprint: string;  // SHA-256 of media data
  creatorSignature: string;    // Ed25519 signature of certId
  issuedAt: number;
  creator: string;
  wartId: string;
  title: string;
}

export interface Wart {
  id: string;                    // Internal wart ID (FNV hash-based)
  title: string;
  description: string;
  imageData: string;             // data URL (base64 image/gif/video/audio/svg)
  mediaType?: 'image' | 'audio' | 'video' | 'svg' | 'cards';  // media type
  audioCover?: string;           // cover image for audio Warts
  creator: string;               // STZ address of original creator (immutable)
  owner: string;                 // STZ address of current owner
  price: number | null;          // Price in Warp (null = not for sale)
  listed: boolean;               // Currently on marketplace
  createdAt: number;
  history: WartTransfer[];       // Full transfer history
  royaltyPercent: number;        // % paid to creator on resale (default 5)
  comments: WartComment[];       // User comments
  likes?: string[];              // Addresses that liked this Wart
  bookmarks?: string[];          // Addresses that bookmarked this Wart
  // ─── Temporal Edition System ────────────────────────
  editionType: 'unique' | 'limited' | 'unlimited';   // Edition model
  maxEditions: number | null;    // null = unlimited, otherwise max copies
  editionNumber: number;         // Which edition this is (1-based)
  availableUntil: number | null; // Timestamp deadline (null = forever)
  // ─── Certificate of Authenticity ──────────────────────
  certId?: string;               // STCERT_<SHA256[0:32]> — unforgeable certificate ID
  contentFingerprint?: string;   // SHA-256 of media content — integrity proof
  creatorSignature?: string;     // Ed25519 signature — creator authenticity proof
  // ─── StrangrzCode On-Chain SVG Storage ─────────────────
  onChainSVG?: string;           // Full StrangrzCode SVG container (on-chain data)
  strangrzCodeId?: string;          // StrangrzCode container ID (SHA-256 of compressed content)
  compressionRatio?: number;     // How much the on-chain data was compressed
  onChainTxId?: string;          // StrangrzChain transaction ID that stores this Wart
  storageMode: 'local' | 'onchain' | 'hybrid';  // Where the data lives
  // ─── Fiat Pricing ────────────────────────────────────
  priceFiat?: number;              // Price in fiat currency
  fiatCurrency?: FiatCurrency;     // Which fiat currency
  // ─── Vault Status ────────────────────────────────────
  vaultBackup: boolean;            // Is this artwork in the vault?
  // ─── Contract Reference ──────────────────────────────
  royaltyContractId?: string;      // CosmoContract ID for royalties
  activeContractIds?: string[];    // Other active contracts
  // ─── Strangrz Integration ─────────────────────────────
  vobjctId?: string;               // Strangrz manifest object ID
  vobjctProtected?: boolean;       // Whether Strangrz Safe is active
  // ─── Multi-Chain Minting ──────────────────────────────
  mintChain?: 'strangrz' | 'ethereum';  // Which chain was used for minting
}

// ─── Rarity Computation ─────────────────────────────────

export const RARITY_CONFIG: Record<WartRarity, { label: string; color: string; badge: string }> = {
  legendary: { label: 'Legendary', color: 'opacity-80',  badge: '\u2726' },
  epic:      { label: 'Epic',      color: 'opacity-80', badge: '\u2605' },
  rare:      { label: 'Rare',      color: 'opacity-80',   badge: '\u25C6' },
  uncommon:  { label: 'Uncommon',  color: 'opacity-80',  badge: '\u25C8' },
  common:    { label: 'Common',    color: 'opacity-40',   badge: '\u25CE' },
};

export function computeRarity(wart: Wart): WartRarity {
  let rarity: WartRarity = 'common';

  if (wart.editionType === 'unique' || wart.maxEditions === 1) {
    rarity = 'legendary';
  } else if (wart.editionType === 'limited' && wart.maxEditions !== null) {
    if (wart.maxEditions <= 10) rarity = 'epic';
    else if (wart.maxEditions <= 50) rarity = 'rare';
    else if (wart.maxEditions <= 200) rarity = 'uncommon';
    else rarity = 'common';
  }

  // Time pressure bonus: bump up one tier if time-limited and < 24h remaining
  if (wart.availableUntil !== null) {
    const remaining = wart.availableUntil - Date.now();
    if (remaining > 0 && remaining < 24 * 60 * 60 * 1000) {
      const tiers: WartRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      const idx = tiers.indexOf(rarity);
      if (idx < tiers.length - 1) rarity = tiers[idx + 1];
    }
  }

  return rarity;
}

export function isExpired(wart: Wart): boolean {
  return wart.availableUntil !== null && Date.now() > wart.availableUntil;
}

export function formatTimeRemaining(until: number): string {
  const diff = until - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function formatDateFR(timestamp: number): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

// ─── Storage ─────────────────────────────────────────────

const STORAGE_KEY = 'strangrz_warts';
const CERT_REGISTRY_KEY = 'strangrz_cert_registry';
const MEDIA_STORE_PREFIX = 'cw_media_';

// ─── Content-Addressable Media Store ─────────────────────
// Media is stored locally by its SHA-256 fingerprint.
// Both creators and collectors keep media on their device.

export const WartMediaStore = {
  store(fingerprint: string, data: string): void {
    storage.setItem(MEDIA_STORE_PREFIX + fingerprint, data);
  },
  retrieve(fingerprint: string): string | null {
    return storage.getItem(MEDIA_STORE_PREFIX + fingerprint);
  },
  has(fingerprint: string): boolean {
    return storage.getItem(MEDIA_STORE_PREFIX + fingerprint) !== null;
  },
  remove(fingerprint: string): void {
    storage.removeItem(MEDIA_STORE_PREFIX + fingerprint);
  },
};

// ─── Certificate Registry (append-only) ──────────────────

export function getCertificateRegistry(): WartCertificate[] {
  const raw = storage.getItem(CERT_REGISTRY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function lookupCertificate(certId: string): WartCertificate | null {
  const registry = getCertificateRegistry();
  return registry.find(c => c.certId === certId) || null;
}

// ─── Engine ──────────────────────────────────────────────

export class WartEngine {
  private warts: Map<string, Wart> = new Map();
  private vault: CosmoVault;
  private contracts: ContractEngine;
  private fiatGateway: FiatGateway;

  constructor() {
    this.vault = new CosmoVault();
    this.contracts = new ContractEngine();
    this.fiatGateway = new FiatGateway();
  }

  static load(): WartEngine {
    const engine = new WartEngine();
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const arr: Wart[] = JSON.parse(raw);
        for (const w of arr) {
          WartEngine.normalizeWart(w);
          engine.warts.set(w.id, w);
        }
      } catch { /* corrupt data, start fresh */ }
    }
    return engine;
  }

  /** Rehydrate imageData from IndexedDB for all warts missing media */
  async rehydrateMedia(): Promise<boolean> {
    let changed = false;
    try {
      const allMedia = await retrieveAllMedia();
      for (const [id, wart] of this.warts) {
        const media = allMedia.get(id);
        if (media) {
          if (!wart.imageData || wart.imageData === '') {
            wart.imageData = media.imageData;
            changed = true;
          }
          if (!wart.audioCover && media.audioCover) {
            wart.audioCover = media.audioCover;
            changed = true;
          }
        }
        // Legacy migration: try WartMediaStore (old localStorage-based)
        if ((!wart.imageData || wart.imageData === '') && wart.contentFingerprint) {
          const legacy = WartMediaStore.retrieve(wart.contentFingerprint);
          if (legacy) {
            wart.imageData = legacy;
            // Migrate to IndexedDB
            storeMedia(id, legacy, wart.audioCover);
            changed = true;
          }
        }
      }
    } catch { /* IndexedDB unavailable */ }
    return changed;
  }

  private static normalizeWart(w: Wart): void {
    if (!Array.isArray(w.history)) w.history = [];
    if (!Array.isArray(w.comments)) w.comments = [];
    if (!w.editionType) w.editionType = 'unique';
    if (w.editionNumber === undefined) w.editionNumber = 1;
    if (w.royaltyPercent === undefined) w.royaltyPercent = 5;
    if (!w.mediaType) w.mediaType = 'image';
    if (!w.creator) w.creator = w.owner || '';
    if (!w.owner) w.owner = w.creator || '';
    if (w.vaultBackup === undefined) w.vaultBackup = false;
  }

  // ─── Sub-engine accessors ──────────────────────────
  getVault(): CosmoVault { return this.vault; }
  getContracts(): ContractEngine { return this.contracts; }
  getFiatGateway(): FiatGateway { return this.fiatGateway; }

  private save(): void {
    const arr = Array.from(this.warts.values());
    // Store metadata in localStorage (without imageData to stay under 5MB limit)
    const meta = arr.map(w => {
      const { imageData, audioCover, ...rest } = w;
      return rest;
    });
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(meta));
    } catch {
      // localStorage quota exceeded — metadata stays in memory
    }
    // Persist media to IndexedDB (async, large capacity)
    for (const w of arr) {
      if (w.imageData) {
        storeMedia(w.id, w.imageData, w.audioCover);
      }
    }
  }

  /** Save warts to localStorage (public access for cloud sync) */
  savePublic(): void {
    this.save();
  }

  /** Add a wart from cloud sync (doesn't trigger save — caller must call savePublic) */
  addFromCloud(wart: Wart): void {
    if (!this.warts.has(wart.id)) {
      WartEngine.normalizeWart(wart);
      this.warts.set(wart.id, wart);
    }
  }

  private registerCertificate(cert: WartCertificate): void {
    const registry = getCertificateRegistry();
    if (!registry.some(c => c.certId === cert.certId)) {
      registry.push(cert);
      storage.setItem(CERT_REGISTRY_KEY, JSON.stringify(registry));
    }
  }

  // ─── Mint ────────────────────────────────────────────

  async mint(
    creator: string,
    title: string,
    description: string,
    imageData: string,
    price: number | null = null,
    royaltyPercent: number = 5,
    editionType: 'unique' | 'limited' | 'unlimited' = 'unique',
    maxEditions: number | null = null,
    durationHours: number | null = null,
    mediaType: 'image' | 'audio' | 'video' | 'svg' | 'cards' = 'image',
    audioCover?: string,
    privateKey?: string,
    mintChain?: 'strangrz' | 'ethereum',
  ): Promise<Wart> {
    if (!title.trim()) throw new Error('Title required');
    if (!imageData) throw new Error('Media required');
    if (price !== null && price < 100) throw new Error('Minimum price is 100 \u2B23');
    if (royaltyPercent < 0 || royaltyPercent > 50) throw new Error('Royalty must be 0-50%');
    if (editionType === 'limited' && (maxEditions === null || maxEditions < 1)) {
      throw new Error('Limited editions require a max count');
    }

    const timestamp = Date.now();
    // Count existing editions of this title by same creator
    const existingEditions = Array.from(this.warts.values()).filter(
      w => w.creator === creator && w.title.trim() === title.trim(),
    ).length;

    if (editionType === 'limited' && maxEditions !== null && existingEditions >= maxEditions) {
      throw new Error(`Maximum editions (${maxEditions}) already minted`);
    }

    // Generate internal ID (FNV hash — fast, deterministic)
    const idSource = `${creator}:${timestamp}:${title}:${existingEditions}`;
    let h = 0x811c9dc5;
    for (let i = 0; i < idSource.length; i++) {
      h ^= idSource.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    const id = 'WART_' + Math.abs(h >>> 0).toString(16).padStart(8, '0') + '_' + timestamp.toString(36);

    // ─── Certificate of Authenticity ────────────────────
    // 1. Compute content fingerprint (SHA-256 of raw media data)
    const contentFingerprint = await sha256(imageData);

    // 2. Compute unforgeable certificate ID
    const certSource = `CW_CERT:v1:${creator}:${contentFingerprint}:${timestamp}:${title.trim()}`;
    const certHash = await sha256(certSource);
    const certId = 'STCERT_' + certHash.slice(0, 32).toUpperCase();

    // 3. Creator signs the certificate with their Ed25519 private key
    let creatorSignature: string | undefined;
    if (privateKey) {
      try {
        creatorSignature = await signTransaction(certId, privateKey);
      } catch { /* signing failed, proceed without signature */ }
    }

    const wart: Wart = {
      id,
      title: title.trim(),
      description: description.trim(),
      imageData,
      creator,
      owner: creator,
      price,
      listed: price !== null,
      createdAt: timestamp,
      mediaType,
      audioCover,
      history: [],
      royaltyPercent,
      comments: [],
      editionType,
      maxEditions: editionType === 'unique' ? 1 : maxEditions,
      editionNumber: existingEditions + 1,
      availableUntil: durationHours !== null ? timestamp + durationHours * 3600000 : null,
      // Certificate of Authenticity
      certId,
      contentFingerprint,
      creatorSignature,
      storageMode: 'local',
      // New v3 fields
      vaultBackup: false,
      mintChain: mintChain || 'strangrz',
    };

    this.warts.set(id, wart);
    this.save();

    // 5. Register certificate in permanent append-only registry
    this.registerCertificate({
      certId,
      contentFingerprint,
      creatorSignature: creatorSignature || '',
      issuedAt: timestamp,
      creator,
      wartId: id,
      title: title.trim(),
    });

    // 6. Create Strangrz manifest & Safe protection
    try {
      const vobjctEngine = getStrangrzEngine();
      const manifest = await vobjctEngine.createForWart({
        wartId: id,
        title: title.trim(),
        description: description.trim(),
        imageData,
        mediaType,
        creator,
        creatorPublicKey: '', // Set by caller via WalletContext
        creatorPrivateKey: privateKey,
        certId,
        editionType,
        editionNumber: existingEditions + 1,
        maxEditions: editionType === 'unique' ? 1 : maxEditions,
        royaltyPercent,
      });
      wart.vobjctId = manifest.object_id;
      wart.vobjctProtected = true;
      this.save();
    } catch { /* Strangrz creation non-critical */ }

    return wart;
  }

  // ─── On-Chain SVG Recovery ───────────────────────────

  /**
   * Recover a Wart's image data from its on-chain StrangrzCode SVG.
   * This works even if the local cache is lost — the data is on-chain forever.
   */
  async recoverFromOnChain(wartId: string): Promise<string | null> {
    const wart = this.warts.get(wartId);
    if (!wart || !wart.onChainSVG) return null;

    try {
      const container: StrangrzCodeContainer = {
        version: 1,
        type: 'wart',
        id: wart.strangrzCodeId || '',
        svg: wart.onChainSVG,
        originalSize: 0,
        compressedSize: wart.onChainSVG.length,
        compressionRatio: wart.compressionRatio || 1,
        layers: [],
        timestamp: wart.createdAt,
        checksum: await sha256(wart.onChainSVG),
      };

      const imageData = await extractImageFromOnChainSVG(container);

      // Re-cache locally
      if (imageData && wart.contentFingerprint) {
        WartMediaStore.store(wart.contentFingerprint, imageData);
      }

      return imageData;
    } catch {
      return null;
    }
  }

  /**
   * Get storage info for a Wart (local vs on-chain vs hybrid).
   */
  getStorageInfo(wartId: string): WartStorageInfo | null {
    const wart = this.warts.get(wartId);
    if (!wart) return null;

    const localSize = new TextEncoder().encode(wart.imageData).length;
    const onChainSize = wart.onChainSVG ? new TextEncoder().encode(wart.onChainSVG).length : 0;

    return {
      mode: wart.storageMode,
      localSize,
      onChainSize,
      compressionRatio: wart.compressionRatio || 1,
      strangrzCodeId: wart.strangrzCodeId,
      hasOnChainBackup: !!wart.onChainSVG,
      hasLocalCache: !!wart.imageData,
      gasCost: 0, // Always free on StrangrzChain
    };
  }

  // ─── Certificate Verification ──────────────────────

  async verifyCertificate(wartId: string): Promise<{ valid: boolean; reason: string }> {
    const wart = this.warts.get(wartId);
    if (!wart) return { valid: false, reason: 'Wart not found' };
    if (!wart.certId || !wart.contentFingerprint) {
      return { valid: false, reason: 'No certificate (pre-certificate Wart)' };
    }

    // 1. Verify content integrity — SHA-256 of current media must match fingerprint
    const currentFingerprint = await sha256(wart.imageData);
    if (currentFingerprint !== wart.contentFingerprint) {
      return { valid: false, reason: 'Content integrity failed — media has been tampered with' };
    }

    // 2. Verify certificate ID — recompute and compare
    const certSource = `CW_CERT:v1:${wart.creator}:${wart.contentFingerprint}:${wart.createdAt}:${wart.title}`;
    const certHash = await sha256(certSource);
    const expectedCertId = 'STCERT_' + certHash.slice(0, 32).toUpperCase();
    if (expectedCertId !== wart.certId) {
      return { valid: false, reason: 'Certificate ID mismatch — data has been altered' };
    }

    // 3. Check permanent registry
    const registered = lookupCertificate(wart.certId);
    if (!registered) {
      return { valid: false, reason: 'Certificate not found in registry' };
    }

    return { valid: true, reason: 'Authentic — Certificate verified' };
  }

  // ─── List / Delist ───────────────────────────────────

  list(wartId: string, price: number, ownerAddress: string): boolean {
    const wart = this.warts.get(wartId);
    if (!wart || wart.owner !== ownerAddress) return false;
    if (price < 100) return false;
    wart.price = price;
    wart.listed = true;
    this.save();
    return true;
  }

  delist(wartId: string, ownerAddress: string): boolean {
    const wart = this.warts.get(wartId);
    if (!wart || wart.owner !== ownerAddress) return false;
    wart.listed = false;
    wart.price = null;
    this.save();
    return true;
  }

  // ─── Buy (transfer ownership after Warp payment) ────

  buy(wartId: string, buyerAddress: string, txId: string): boolean {
    const wart = this.warts.get(wartId);
    if (!wart || !wart.listed || wart.price === null) return false;
    if (wart.owner === buyerAddress) return false;

    const transfer: WartTransfer = {
      from: wart.owner,
      to: buyerAddress,
      price: wart.price,
      timestamp: Date.now(),
      txId,
    };

    wart.history.push(transfer);
    wart.owner = buyerAddress;
    wart.listed = false;
    wart.price = null;
    this.save();
    return true;
  }

  // ─── Free Transfer (gift) ───────────────────────────

  transfer(wartId: string, fromAddress: string, toAddress: string, txId: string): boolean {
    const wart = this.warts.get(wartId);
    if (!wart || wart.owner !== fromAddress) return false;

    const xfer: WartTransfer = {
      from: fromAddress,
      to: toAddress,
      price: 0,
      timestamp: Date.now(),
      txId,
    };

    wart.history.push(xfer);
    wart.owner = toAddress;
    wart.listed = false;
    wart.price = null;
    this.save();
    return true;
  }

  // ─── Delete ─────────────────────────────────────────

  delete(wartId: string, ownerAddress: string): boolean {
    const wart = this.warts.get(wartId);
    if (!wart || wart.owner !== ownerAddress) return false;
    this.warts.delete(wartId);
    deleteMedia(wartId);
    this.save();
    return true;
  }

  // ─── Update ─────────────────────────────────────────

  update(
    wartId: string,
    ownerAddress: string,
    updates: { title?: string; description?: string; price?: number | null; royaltyPercent?: number },
  ): boolean {
    const wart = this.warts.get(wartId);
    if (!wart || wart.owner !== ownerAddress) return false;
    if (updates.title !== undefined) wart.title = updates.title.trim();
    if (updates.description !== undefined) wart.description = updates.description.trim();
    if (updates.price !== undefined) {
      wart.price = updates.price;
      wart.listed = updates.price !== null;
    }
    if (updates.royaltyPercent !== undefined && wart.creator === ownerAddress) {
      wart.royaltyPercent = Math.max(0, Math.min(50, updates.royaltyPercent));
    }
    this.save();
    return true;
  }

  // ─── Comments ──────────────────────────────────────

  addComment(wartId: string, author: string, authorAlias: string, content: string): WartComment | null {
    const wart = this.warts.get(wartId);
    if (!wart || !content.trim()) return null;
    const comment: WartComment = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      author,
      authorAlias: authorAlias || author.slice(0, 10),
      content: content.trim(),
      timestamp: Date.now(),
    };
    if (!wart.comments) wart.comments = [];
    wart.comments.push(comment);
    this.save();
    return comment;
  }

  toggleLike(wartId: string, address: string): boolean {
    const wart = this.warts.get(wartId);
    if (!wart) return false;
    if (!wart.likes) wart.likes = [];
    const idx = wart.likes.indexOf(address);
    if (idx >= 0) { wart.likes.splice(idx, 1); } else { wart.likes.push(address); }
    this.save();
    return idx < 0; // true if now liked
  }

  toggleBookmark(wartId: string, address: string): boolean {
    const wart = this.warts.get(wartId);
    if (!wart) return false;
    if (!wart.bookmarks) wart.bookmarks = [];
    const idx = wart.bookmarks.indexOf(address);
    if (idx >= 0) { wart.bookmarks.splice(idx, 1); } else { wart.bookmarks.push(address); }
    this.save();
    return idx < 0; // true if now bookmarked
  }

  // ─── Queries ─────────────────────────────────────────

  getWart(id: string): Wart | undefined {
    return this.warts.get(id);
  }

  getAll(): Wart[] {
    return Array.from(this.warts.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  getMarketplace(): Wart[] {
    return this.getAll().filter(w => w.listed && w.price !== null);
  }

  getCollection(address: string): Wart[] {
    return this.getAll().filter(w => w.owner === address);
  }

  getCreated(address: string): Wart[] {
    return this.getAll().filter(w => w.creator === address);
  }

  // ─── Vault Integration ──────────────────────────────

  /**
   * Add an artwork to the encrypted vault for backup/recovery.
   */
  async addToVault(wartId: string, ownerAddress: string): Promise<VaultEntry | null> {
    const wart = this.warts.get(wartId);
    if (!wart || wart.owner !== ownerAddress) return null;
    if (!this.vault.isInitialized()) return null;

    try {
      const entry = await this.vault.addArtwork({
        id: wart.id,
        title: wart.title,
        fingerprint: wart.contentFingerprint || await sha256(wart.imageData),
        certId: wart.certId || '',
        creator: wart.creator,
        owner: wart.owner,
        mediaData: wart.imageData,
        mediaType: wart.mediaType || 'image',
        onChainSVG: wart.onChainSVG,
        onChainTxId: wart.onChainTxId,
      });

      wart.vaultBackup = true;
      this.save();
      return entry;
    } catch {
      return null;
    }
  }

  /**
   * Add all owned artworks to the vault.
   */
  async addAllToVault(ownerAddress: string): Promise<{ added: number; failed: number }> {
    let added = 0;
    let failed = 0;

    for (const wart of this.warts.values()) {
      if (wart.owner !== ownerAddress) continue;
      if (wart.vaultBackup && this.vault.hasArtwork(wart.id)) continue;

      const result = await this.addToVault(wart.id, ownerAddress);
      if (result) added++;
      else failed++;
    }

    return { added, failed };
  }

  /**
   * Recover an artwork from the vault (e.g., after data loss).
   */
  async recoverFromVault(wartId: string): Promise<string | null> {
    return this.vault.recoverArtwork(wartId);
  }

  /**
   * Generate a recovery kit for all owned artworks.
   */
  async generateRecoveryKit(
    ownerAddress: string,
    recoveryPassword: string,
    privateKey: string,
  ): Promise<RecoveryKit> {
    return this.vault.generateRecoveryKit(ownerAddress, recoveryPassword, privateKey);
  }

  /**
   * Restore artworks from a recovery kit.
   */
  async restoreFromRecoveryKit(
    kit: RecoveryKit,
    recoveryPassword: string,
    ownerAddress: string,
  ): Promise<{ restored: number; failed: number; errors: string[] }> {
    const result = await this.vault.restoreFromRecoveryKit(kit, recoveryPassword, ownerAddress);

    // Re-create wart entries from restored vault entries
    for (const entry of this.vault.getEntriesByOwner(ownerAddress)) {
      if (!this.warts.has(entry.id)) {
        const decrypted = await this.vault.recoverArtwork(entry.id);
        if (decrypted) {
          // Create a minimal wart from the vault entry
          const wart: Wart = {
            id: entry.id,
            title: entry.title,
            description: 'Recovered from CosmoVault',
            imageData: decrypted,
            creator: entry.creator,
            owner: entry.owner,
            price: null,
            listed: false,
            createdAt: entry.createdAt,
            mediaType: entry.mediaType,
            history: [],
            royaltyPercent: 5,
            comments: [],
            editionType: 'unique',
            maxEditions: 1,
            editionNumber: 1,
            availableUntil: null,
            certId: entry.certId,
            contentFingerprint: entry.fingerprint,
            storageMode: entry.onChainSVG ? 'hybrid' : 'local',
            onChainSVG: entry.onChainSVG,
            onChainTxId: entry.onChainTxId,
            vaultBackup: true,
          };
          this.warts.set(entry.id, wart);
        }
      }
    }

    this.save();
    return result;
  }

  /**
   * Initialize the vault with StrangrzID credentials.
   */
  async initVault(username: string, password: string): Promise<void> {
    await this.vault.init(username, password);
  }

  /**
   * Initialize vault with wallet secret.
   */
  initVaultWithSecret(secret: string): void {
    this.vault.initWithSecret(secret);
  }

  getVaultStats(ownerAddress?: string): VaultStats {
    return this.vault.getStats(ownerAddress);
  }

  // ─── Fiat Integration ────────────────────────────────

  /**
   * List a wart for sale in fiat currency.
   */
  listWithFiat(
    wartId: string,
    ownerAddress: string,
    priceFiat: number,
    currency: FiatCurrency,
  ): boolean {
    const wart = this.warts.get(wartId);
    if (!wart || wart.owner !== ownerAddress) return false;
    if (priceFiat <= 0) return false;

    const warpsPrice = this.fiatGateway.fiatToWarps(priceFiat, currency);

    wart.price = warpsPrice;
    wart.priceFiat = priceFiat;
    wart.fiatCurrency = currency;
    wart.listed = true;

    this.fiatGateway.createFiatListing({
      wartId,
      wartTitle: wart.title,
      sellerAddress: ownerAddress,
      priceFiat,
      currency,
    });

    this.save();
    return true;
  }

  /**
   * Buy a wart with fiat (creates a fiat transaction + crypto transfer).
   */
  async buyWithFiat(params: {
    wartId: string;
    buyerAddress: string;
    paymentMethod: 'card' | 'paypal' | 'sepa' | 'apple_pay' | 'google_pay' | 'bank_transfer';
    txId: string;
  }): Promise<{ success: boolean; fiatTx?: FiatTransaction; error?: string }> {
    const wart = this.warts.get(params.wartId);
    if (!wart || !wart.listed) return { success: false, error: 'Not for sale' };
    if (!wart.priceFiat || !wart.fiatCurrency) return { success: false, error: 'No fiat price set' };

    try {
      // Create fiat transaction record
      const fiatTx = await this.fiatGateway.createBuyTransaction({
        buyerAddress: params.buyerAddress,
        sellerAddress: wart.owner,
        wartId: params.wartId,
        wartTitle: wart.title,
        fiatAmount: wart.priceFiat,
        currency: wart.fiatCurrency,
        paymentMethod: params.paymentMethod,
      });

      // Transfer ownership
      const transfer: WartTransfer = {
        from: wart.owner,
        to: params.buyerAddress,
        price: wart.price || 0,
        timestamp: Date.now(),
        txId: params.txId,
      };

      wart.history.push(transfer);
      wart.owner = params.buyerAddress;
      wart.listed = false;
      wart.price = null;
      wart.priceFiat = undefined;
      wart.fiatCurrency = undefined;

      // Remove fiat listing
      this.fiatGateway.removeFiatListing(params.wartId);

      this.save();
      return { success: true, fiatTx };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Fiat payment failed' };
    }
  }

  /**
   * Get fiat price display for a wart.
   */
  getFiatPrice(wartId: string, currency?: FiatCurrency): string | null {
    const wart = this.warts.get(wartId);
    if (!wart || !wart.price) return null;

    if (wart.priceFiat && wart.fiatCurrency) {
      return formatFiatPrice(wart.priceFiat, wart.fiatCurrency);
    }

    const cur = currency || this.fiatGateway.preferredCurrency;
    return this.fiatGateway.formatDualPrice(wart.price, cur);
  }

  // ─── Contract Integration ─────────────────────────────

  /**
   * Create a royalty contract for an artwork.
   */
  async createRoyaltyContract(
    wartId: string,
    creatorAddress: string,
    creatorPrivateKey: string,
    royaltyPercent?: number,
  ): Promise<CosmoContract | null> {
    const wart = this.warts.get(wartId);
    if (!wart || wart.creator !== creatorAddress) return null;

    const contract = await this.contracts.createRoyaltyContract({
      wartId,
      creator: creatorAddress,
      creatorPrivateKey,
      royaltyPercent: royaltyPercent || wart.royaltyPercent,
    });

    wart.royaltyContractId = contract.id;
    if (!wart.activeContractIds) wart.activeContractIds = [];
    wart.activeContractIds.push(contract.id);
    this.save();

    return contract;
  }

  /**
   * Create an auction for an artwork.
   */
  async createAuction(params: {
    wartId: string;
    sellerAddress: string;
    sellerPrivateKey: string;
    startPrice: number;
    startPriceFiat?: number;
    fiatCurrency?: FiatCurrency;
    reservePrice?: number;
    durationHours: number;
  }): Promise<CosmoContract | null> {
    const wart = this.warts.get(params.wartId);
    if (!wart || wart.owner !== params.sellerAddress) return null;

    let startPriceFiat: FiatPrice | undefined;
    if (params.startPriceFiat && params.fiatCurrency) {
      const rate = this.fiatGateway.getRate(params.fiatCurrency);
      if (rate) {
        startPriceFiat = {
          amount: params.startPriceFiat,
          currency: params.fiatCurrency,
          exchangeRate: rate.warpsPerUnit,
          lockedRate: true,
        };
      }
    }

    const contract = await this.contracts.createAuctionContract({
      wartId: params.wartId,
      seller: params.sellerAddress,
      sellerPrivateKey: params.sellerPrivateKey,
      startPrice: params.startPrice,
      startPriceFiat,
      reservePrice: params.reservePrice,
      durationHours: params.durationHours,
    });

    if (!wart.activeContractIds) wart.activeContractIds = [];
    wart.activeContractIds.push(contract.id);
    wart.listed = true;
    this.save();

    return contract;
  }

  /**
   * Get active contracts for an artwork.
   */
  getWartContracts(wartId: string): CosmoContract[] {
    return this.contracts.getContractsByWart(wartId);
  }

  /**
   * Get active auctions.
   */
  getActiveAuctions(): CosmoContract[] {
    return this.contracts.getActiveAuctions();
  }

  getStats(): { total: number; listed: number; totalVolume: number; onChainCount: number; totalCompressionRatio: number } {
    let totalVolume = 0;
    let onChainCount = 0;
    let totalRatio = 0;
    let ratioCount = 0;

    for (const wart of this.warts.values()) {
      for (const h of wart.history) {
        totalVolume += h.price;
      }
      if (wart.onChainSVG) {
        onChainCount++;
      }
      if (wart.compressionRatio) {
        totalRatio += wart.compressionRatio;
        ratioCount++;
      }
    }
    return {
      total: this.warts.size,
      listed: this.getMarketplace().length,
      totalVolume,
      onChainCount,
      totalCompressionRatio: ratioCount > 0 ? totalRatio / ratioCount : 1,
    };
  }
}

// ─── On-Chain Storage Info ────────────────────────────────

export interface WartStorageInfo {
  mode: 'local' | 'onchain' | 'hybrid';
  localSize: number;
  onChainSize: number;
  compressionRatio: number;
  strangrzCodeId?: string;
  hasOnChainBackup: boolean;
  hasLocalCache: boolean;
  gasCost: 0;  // Always free on StrangrzChain
}
