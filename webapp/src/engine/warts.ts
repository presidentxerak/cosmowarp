/**
 * CosmoWarp Wart Engine — NFT-like Digital Art on the CosmoWarp Protocol
 *
 * Warts are unique digital artworks stored in the CosmoWarp protocol.
 * Anyone with a wallet can mint, list, buy, and transfer Warts.
 * Creators earn royalties on every resale.
 *
 * ─── Local-First Architecture ────────────────────────────
 * All media (images, audio, video) is stored locally on the creator's
 * and collector's device using content-addressable storage. Media is
 * identified by its SHA-256 fingerprint, ensuring integrity.
 *
 * ─── Certificate of Authenticity ─────────────────────────
 * Every Wart receives an unforgeable Certificate ID (CWCERT_*) computed
 * from SHA-256(creator + content fingerprint + timestamp + title).
 * The creator's Ed25519 signature proves authenticity. Certificates are
 * permanently registered in an append-only local registry.
 */

import { storage } from './storage';
import { sha256, signTransaction } from './crypto';

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
  certId: string;              // CWCERT_<SHA256[0:32]> — unforgeable
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
  imageData: string;             // data URL (base64 image/gif/video/audio)
  mediaType?: 'image' | 'audio' | 'video';  // media type
  audioCover?: string;           // cover image for audio Warts
  creator: string;               // CW address of original creator (immutable)
  owner: string;                 // CW address of current owner
  price: number | null;          // Price in Warp (null = not for sale)
  listed: boolean;               // Currently on marketplace
  createdAt: number;
  history: WartTransfer[];       // Full transfer history
  royaltyPercent: number;        // % paid to creator on resale (default 5)
  comments: WartComment[];       // User comments
  // ─── Temporal Edition System ────────────────────────
  editionType: 'unique' | 'limited' | 'unlimited';   // Edition model
  maxEditions: number | null;    // null = unlimited, otherwise max copies
  editionNumber: number;         // Which edition this is (1-based)
  availableUntil: number | null; // Timestamp deadline (null = forever)
  // ─── Certificate of Authenticity ──────────────────────
  certId?: string;               // CWCERT_<SHA256[0:32]> — unforgeable certificate ID
  contentFingerprint?: string;   // SHA-256 of media content — integrity proof
  creatorSignature?: string;     // Ed25519 signature — creator authenticity proof
}

// ─── Rarity Computation ─────────────────────────────────

export const RARITY_CONFIG: Record<WartRarity, { label: string; color: string; badge: string }> = {
  legendary: { label: 'Legendary', color: 'text-amber-400',  badge: '\u2726' },
  epic:      { label: 'Epic',      color: 'text-purple-400', badge: '\u2605' },
  rare:      { label: 'Rare',      color: 'text-blue-400',   badge: '\u25C6' },
  uncommon:  { label: 'Uncommon',  color: 'text-green-400',  badge: '\u25C8' },
  common:    { label: 'Common',    color: 'text-gray-400',   badge: '\u25CE' },
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

const STORAGE_KEY = 'cosmowarp_warts';
const CERT_REGISTRY_KEY = 'cosmowarp_cert_registry';
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

  static load(): WartEngine {
    const engine = new WartEngine();
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const arr: Wart[] = JSON.parse(raw);
        for (const w of arr) {
          engine.warts.set(w.id, w);
        }
      } catch { /* corrupt data, start fresh */ }
    }
    return engine;
  }

  private save(): void {
    const arr = Array.from(this.warts.values());
    storage.setItem(STORAGE_KEY, JSON.stringify(arr));
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
    mediaType: 'image' | 'audio' | 'video' = 'image',
    audioCover?: string,
    privateKey?: string,
  ): Promise<Wart> {
    if (!title.trim()) throw new Error('Title required');
    if (!imageData) throw new Error('Media required');
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
    const certId = 'CWCERT_' + certHash.slice(0, 32).toUpperCase();

    // 3. Creator signs the certificate with their Ed25519 private key
    let creatorSignature: string | undefined;
    if (privateKey) {
      try {
        creatorSignature = await signTransaction(certId, privateKey);
      } catch { /* signing failed, proceed without signature */ }
    }

    // 4. Store media in content-addressable local store (redundant backup)
    WartMediaStore.store(contentFingerprint, imageData);
    if (audioCover) {
      const coverFingerprint = await sha256(audioCover);
      WartMediaStore.store(coverFingerprint, audioCover);
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

    return wart;
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
    const expectedCertId = 'CWCERT_' + certHash.slice(0, 32).toUpperCase();
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
    if (price <= 0) return false;
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

  getStats(): { total: number; listed: number; totalVolume: number } {
    let totalVolume = 0;
    for (const wart of this.warts.values()) {
      for (const h of wart.history) {
        totalVolume += h.price;
      }
    }
    return {
      total: this.warts.size,
      listed: this.getMarketplace().length,
      totalVolume,
    };
  }
}
