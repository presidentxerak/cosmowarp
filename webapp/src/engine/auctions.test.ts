import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuctionEngine } from './auctions';

describe('AuctionEngine', () => {
  beforeEach(() => localStorage.clear());

  it('creates an auction', () => {
    const engine = AuctionEngine.load();
    const auction = engine.create('wart_1', 'STZ_seller', 100, 24);
    expect(auction.id).toMatch(/^AUC_/);
    expect(auction.status).toBe('active');
    expect(auction.startPrice).toBe(100);
    expect(auction.bids).toEqual([]);
  });

  it('prevents duplicate auctions for same wart', () => {
    const engine = AuctionEngine.load();
    engine.create('wart_1', 'STZ_seller', 100, 24);
    expect(() => engine.create('wart_1', 'STZ_seller2', 50, 12)).toThrow('already has an active auction');
  });

  it('places valid bids', () => {
    const engine = AuctionEngine.load();
    const auction = engine.create('wart_1', 'STZ_seller', 100, 24);

    const r1 = engine.placeBid(auction.id, 'STZ_bidder1', 150);
    expect(r1.success).toBe(true);

    const r2 = engine.placeBid(auction.id, 'STZ_bidder2', 200);
    expect(r2.success).toBe(true);

    const updated = engine.get(auction.id)!;
    expect(updated.highestBid).toBe(200);
    expect(updated.highestBidder).toBe('STZ_bidder2');
    expect(updated.bids).toHaveLength(2);
  });

  it('rejects bid below start price', () => {
    const engine = AuctionEngine.load();
    const auction = engine.create('wart_1', 'STZ_seller', 100, 24);
    const result = engine.placeBid(auction.id, 'STZ_bidder1', 50);
    expect(result.success).toBe(false);
    expect(result.error).toContain('at least');
  });

  it('rejects bid below current highest', () => {
    const engine = AuctionEngine.load();
    const auction = engine.create('wart_1', 'STZ_seller', 100, 24);
    engine.placeBid(auction.id, 'STZ_bidder1', 200);
    const result = engine.placeBid(auction.id, 'STZ_bidder2', 150);
    expect(result.success).toBe(false);
    expect(result.error).toContain('exceed');
  });

  it('prevents seller from bidding', () => {
    const engine = AuctionEngine.load();
    const auction = engine.create('wart_1', 'STZ_seller', 100, 24);
    const result = engine.placeBid(auction.id, 'STZ_seller', 200);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Seller');
  });

  it('anti-sniping extends end time', () => {
    const engine = AuctionEngine.load();
    // Create auction ending in 3 minutes (within anti-snipe window)
    const auction = engine.create('wart_1', 'STZ_seller', 100, 24);
    const nearEnd = auction.endTime - 2 * 60 * 1000; // 2 min before end
    vi.setSystemTime(nearEnd);

    engine.placeBid(auction.id, 'STZ_bidder1', 150);
    const updated = engine.get(auction.id)!;
    expect(updated.endTime).toBeGreaterThan(auction.originalEndTime);

    vi.useRealTimers();
  });

  it('settles auction to highest bidder', () => {
    const engine = AuctionEngine.load();
    // Create short auction
    const auction = engine.create('wart_1', 'STZ_seller', 100, 0.001); // ~3.6s
    engine.placeBid(auction.id, 'STZ_bidder1', 150);
    engine.placeBid(auction.id, 'STZ_bidder2', 300);

    // Fast-forward past end
    vi.setSystemTime(auction.endTime + 1000);

    const result = engine.settle(auction.id);
    expect(result.success).toBe(true);
    expect(result.winner).toBe('STZ_bidder2');
    expect(result.amount).toBe(300);

    const settled = engine.get(auction.id)!;
    expect(settled.status).toBe('settled');

    vi.useRealTimers();
  });

  it('fails settlement if reserve not met', () => {
    const engine = AuctionEngine.load();
    const auction = engine.create('wart_1', 'STZ_seller', 100, 0.001, 500);
    engine.placeBid(auction.id, 'STZ_bidder1', 200);

    vi.setSystemTime(auction.endTime + 1000);

    const result = engine.settle(auction.id);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Reserve');

    vi.useRealTimers();
  });

  it('cancels auction with no bids', () => {
    const engine = AuctionEngine.load();
    const auction = engine.create('wart_1', 'STZ_seller', 100, 24);
    expect(engine.cancel(auction.id, 'STZ_seller')).toBe(true);
    expect(engine.get(auction.id)!.status).toBe('cancelled');
  });

  it('cannot cancel auction with bids', () => {
    const engine = AuctionEngine.load();
    const auction = engine.create('wart_1', 'STZ_seller', 100, 24);
    engine.placeBid(auction.id, 'STZ_bidder1', 150);
    expect(engine.cancel(auction.id, 'STZ_seller')).toBe(false);
  });

  it('getActive returns only active auctions', () => {
    const engine = AuctionEngine.load();
    engine.create('wart_1', 'STZ_seller', 100, 24);
    engine.create('wart_2', 'STZ_seller', 50, 24);
    const a3 = engine.create('wart_3', 'STZ_seller', 200, 0.001);
    vi.setSystemTime(a3.endTime + 1000);

    const active = engine.getActive();
    expect(active).toHaveLength(2);

    vi.useRealTimers();
  });

  it('persists across loads', () => {
    const e1 = AuctionEngine.load();
    const auction = e1.create('wart_1', 'STZ_seller', 100, 24);
    e1.placeBid(auction.id, 'STZ_bidder1', 200);

    const e2 = AuctionEngine.load();
    const loaded = e2.get(auction.id)!;
    expect(loaded.highestBid).toBe(200);
    expect(loaded.bids).toHaveLength(1);
  });
});
