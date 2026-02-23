/**
 * CosmoWarp Wart Engine — NFT-like Digital Art on the CosmoWarp Protocol
 *
 * Warts are unique digital artworks stored in the CosmoWarp protocol.
 * Anyone with a wallet can mint, list, buy, and transfer Warts.
 * Creators earn royalties on every resale.
 */

import { storage } from './storage';

// ─── Types ───────────────────────────────────────────────

export interface WartTransfer {
  from: string;
  to: string;
  price: number;
  timestamp: number;
  txId: string;
}

export type WartRarity = 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common';

export interface Wart {
  id: string;                    // SHA-256(creator + timestamp + title)
  title: string;
  description: string;
  imageData: string;             // data URL (base64 image)
  creator: string;               // CW address of original creator (immutable)
  owner: string;                 // CW address of current owner
  price: number | null;          // Price in Warp (null = not for sale)
  listed: boolean;               // Currently on marketplace
  createdAt: number;
  history: WartTransfer[];       // Full transfer history
  royaltyPercent: number;        // % paid to creator on resale (default 5)
  // ─── Temporal Edition System ────────────────────────
  editionType: 'unique' | 'limited' | 'unlimited';   // Edition model
  maxEditions: number | null;    // null = unlimited, otherwise max copies
  editionNumber: number;         // Which edition this is (1-based)
  availableUntil: number | null; // Timestamp deadline (null = forever)
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

// ─── Storage ─────────────────────────────────────────────

const STORAGE_KEY = 'cosmowarp_warts';

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

  // ─── Mint ────────────────────────────────────────────

  mint(
    creator: string,
    title: string,
    description: string,
    imageData: string,
    price: number | null = null,
    royaltyPercent: number = 5,
    editionType: 'unique' | 'limited' | 'unlimited' = 'unique',
    maxEditions: number | null = null,
    durationHours: number | null = null,
  ): Wart {
    if (!title.trim()) throw new Error('Title required');
    if (!imageData) throw new Error('Image required');
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

    // Generate deterministic ID (sync for simplicity; collision risk negligible)
    const idSource = `${creator}:${timestamp}:${title}:${existingEditions}`;
    let h = 0x811c9dc5;
    for (let i = 0; i < idSource.length; i++) {
      h ^= idSource.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    const id = 'WART_' + Math.abs(h >>> 0).toString(16).padStart(8, '0') + '_' + timestamp.toString(36);

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
      history: [],
      royaltyPercent,
      editionType,
      maxEditions: editionType === 'unique' ? 1 : maxEditions,
      editionNumber: existingEditions + 1,
      availableUntil: durationHours !== null ? timestamp + durationHours * 3600000 : null,
    };

    this.warts.set(id, wart);
    this.save();
    return wart;
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
