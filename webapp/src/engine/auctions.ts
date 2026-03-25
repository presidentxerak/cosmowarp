/**
 * Strangrz Auction Engine — Time-limited bidding on Warts
 *
 * Lifecycle: created → active → ended → settled
 * Anti-sniping: bids in the last 5 minutes extend by 5 minutes.
 * Settlement: highest bidder wins, ownership transfers automatically.
 */

import { storage } from './storage';
import { syncAuction, syncBid } from '../lib/supabase-phase2-sync';

// ─── Constants ────────────────────────────────────────────

const STORAGE_KEY = 'strangrz_auctions';
const ANTI_SNIPE_WINDOW_MS = 5 * 60 * 1000;   // 5 minutes
const ANTI_SNIPE_EXTENSION_MS = 5 * 60 * 1000; // extend by 5 minutes

// ─── Types ────────────────────────────────────────────────

export type AuctionStatus = 'created' | 'active' | 'ended' | 'settled' | 'cancelled';

export interface Bid {
  bidder: string;       // wallet address
  amount: number;       // STZ
  timestamp: number;
}

export interface Auction {
  id: string;
  wartId: string;
  seller: string;       // wallet address of the seller
  startPrice: number;   // minimum opening bid (STZ)
  reservePrice: number; // minimum price to settle (0 = no reserve)
  startTime: number;
  endTime: number;      // may be extended by anti-sniping
  originalEndTime: number; // initial end time (before extensions)
  status: AuctionStatus;
  bids: Bid[];
  highestBid: number;
  highestBidder: string | null;
  createdAt: number;
  settledAt: number | null;
}

// ─── Storage ──────────────────────────────────────────────

function loadAll(): Auction[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAll(auctions: Auction[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(auctions));
}

// ─── Auction Engine ───────────────────────────────────────

export class AuctionEngine {
  private auctions: Map<string, Auction> = new Map();

  constructor() {
    for (const a of loadAll()) {
      this.auctions.set(a.id, a);
    }
  }

  static load(): AuctionEngine {
    return new AuctionEngine();
  }

  private save(): void {
    saveAll([...this.auctions.values()]);
  }

  /** Create a new auction */
  create(
    wartId: string,
    seller: string,
    startPrice: number,
    durationHours: number,
    reservePrice = 0,
  ): Auction {
    // Check no active auction for this wart
    const existing = this.getByWart(wartId);
    if (existing && (existing.status === 'active' || existing.status === 'created')) {
      throw new Error('Wart already has an active auction');
    }

    const id = `AUC_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const endTime = now + durationHours * 60 * 60 * 1000;

    const auction: Auction = {
      id,
      wartId,
      seller,
      startPrice,
      reservePrice,
      startTime: now,
      endTime,
      originalEndTime: endTime,
      status: 'active',
      bids: [],
      highestBid: 0,
      highestBidder: null,
      createdAt: now,
      settledAt: null,
    };

    this.auctions.set(id, auction);
    this.save();
    syncAuction(auction).catch(() => {});
    return auction;
  }

  /** Place a bid on an auction */
  placeBid(auctionId: string, bidder: string, amount: number): { success: boolean; error?: string } {
    const auction = this.auctions.get(auctionId);
    if (!auction) return { success: false, error: 'Auction not found' };

    // Auto-update status
    this.updateStatus(auction);
    if (auction.status !== 'active') return { success: false, error: 'Auction is not active' };
    if (bidder === auction.seller) return { success: false, error: 'Seller cannot bid on own auction' };
    if (amount < auction.startPrice) return { success: false, error: `Bid must be at least ${auction.startPrice} STZ` };
    if (amount <= auction.highestBid) return { success: false, error: `Bid must exceed current highest bid of ${auction.highestBid} STZ` };

    const now = Date.now();
    const bid: Bid = { bidder, amount, timestamp: now };
    auction.bids.push(bid);
    auction.highestBid = amount;
    auction.highestBidder = bidder;

    // Anti-sniping: extend if bid placed in last 5 minutes
    const timeLeft = auction.endTime - now;
    if (timeLeft < ANTI_SNIPE_WINDOW_MS && timeLeft > 0) {
      auction.endTime = now + ANTI_SNIPE_EXTENSION_MS;
    }

    this.save();
    syncBid(auctionId, bid).catch(() => {});
    syncAuction(auction).catch(() => {});
    return { success: true };
  }

  /** Settle an ended auction — transfer to highest bidder */
  settle(auctionId: string): { success: boolean; winner?: string; amount?: number; error?: string } {
    const auction = this.auctions.get(auctionId);
    if (!auction) return { success: false, error: 'Auction not found' };

    this.updateStatus(auction);
    if (auction.status !== 'ended') return { success: false, error: 'Auction has not ended' };

    // Check reserve price
    if (auction.reservePrice > 0 && auction.highestBid < auction.reservePrice) {
      auction.status = 'cancelled';
      this.save();
      return { success: false, error: 'Reserve price not met' };
    }

    if (!auction.highestBidder) {
      auction.status = 'cancelled';
      this.save();
      return { success: false, error: 'No bids placed' };
    }

    auction.status = 'settled';
    auction.settledAt = Date.now();
    this.save();
    syncAuction(auction).catch(() => {});

    return {
      success: true,
      winner: auction.highestBidder,
      amount: auction.highestBid,
    };
  }

  /** Cancel an auction (only seller, only if no bids) */
  cancel(auctionId: string, seller: string): boolean {
    const auction = this.auctions.get(auctionId);
    if (!auction || auction.seller !== seller) return false;
    if (auction.bids.length > 0) return false; // can't cancel with bids
    auction.status = 'cancelled';
    this.save();
    syncAuction(auction).catch(() => {});
    return true;
  }

  /** Get auction by ID */
  get(id: string): Auction | null {
    const auction = this.auctions.get(id);
    if (auction) this.updateStatus(auction);
    return auction || null;
  }

  /** Get active auction for a wart */
  getByWart(wartId: string): Auction | null {
    for (const a of this.auctions.values()) {
      if (a.wartId === wartId && (a.status === 'active' || a.status === 'created')) {
        this.updateStatus(a);
        return a;
      }
    }
    return null;
  }

  /** Get all active auctions */
  getActive(): Auction[] {
    return [...this.auctions.values()]
      .filter(a => {
        this.updateStatus(a);
        return a.status === 'active';
      })
      .sort((a, b) => a.endTime - b.endTime); // ending soonest first
  }

  /** Get ended auctions that need settlement */
  getEndedUnsettled(): Auction[] {
    return [...this.auctions.values()]
      .filter(a => {
        this.updateStatus(a);
        return a.status === 'ended';
      });
  }

  /** Hydrate from cloud data (called during login sync) */
  mergeCloud(cloudAuctions: Auction[]): void {
    for (const cloud of cloudAuctions) {
      const local = this.auctions.get(cloud.id);
      if (!local || cloud.endTime > local.endTime || cloud.bids.length > local.bids.length) {
        this.auctions.set(cloud.id, cloud);
      }
    }
    this.save();
  }

  /** Auto-update auction status based on time */
  private updateStatus(auction: Auction): void {
    const now = Date.now();
    if (auction.status === 'active' && now >= auction.endTime) {
      auction.status = 'ended';
    }
    if (auction.status === 'created' && now >= auction.startTime) {
      auction.status = 'active';
    }
  }
}
