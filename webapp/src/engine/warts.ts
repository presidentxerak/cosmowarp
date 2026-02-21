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
  ): Wart {
    if (!title.trim()) throw new Error('Title required');
    if (!imageData) throw new Error('Image required');
    if (royaltyPercent < 0 || royaltyPercent > 50) throw new Error('Royalty must be 0-50%');

    const timestamp = Date.now();
    // Generate deterministic ID (sync for simplicity; collision risk negligible)
    const idSource = `${creator}:${timestamp}:${title}`;
    // Use a simple hash since we need sync
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
