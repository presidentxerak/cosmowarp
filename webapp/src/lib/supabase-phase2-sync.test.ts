/**
 * Tests for Phase 2 Supabase sync layer.
 *
 * Since Supabase is not available in test env, we verify:
 * - Functions gracefully return fallback values when offline
 * - Type exports are correct
 * - No crashes on null/undefined supabase client
 */

import { describe, it, expect } from 'vitest';
import {
  syncCollection,
  syncCollectionDelete,
  pullCollections,
  syncAuction,
  syncBid,
  pullActiveAuctions,
  pullAuction,
  syncWartTags,
  pullWartTags,
  pullAllTags,
  pullPhase2Data,
} from './supabase-phase2-sync';
import type { Collection } from '../engine/collections';
import type { Auction, Bid } from '../engine/auctions';

const mockCollection: Collection = {
  id: 'COL_test',
  creator: 'STZ_alice',
  title: 'Test Collection',
  description: 'A test',
  coverWartId: null,
  wartIds: ['w1', 'w2'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockAuction: Auction = {
  id: 'AUC_test',
  wartId: 'wart_1',
  seller: 'STZ_seller',
  startPrice: 100,
  reservePrice: 0,
  startTime: Date.now(),
  endTime: Date.now() + 86400_000,
  originalEndTime: Date.now() + 86400_000,
  status: 'active',
  bids: [],
  highestBid: 0,
  highestBidder: null,
  createdAt: Date.now(),
  settledAt: null,
};

const mockBid: Bid = {
  bidder: 'STZ_bidder',
  amount: 150,
  timestamp: Date.now(),
};

describe('Phase 2 Supabase Sync (offline mode)', () => {
  // All functions should gracefully return false/empty when Supabase is unavailable

  describe('Collections sync', () => {
    it('syncCollection returns false when offline', async () => {
      expect(await syncCollection(mockCollection)).toBe(false);
    });

    it('syncCollectionDelete returns false when offline', async () => {
      expect(await syncCollectionDelete('COL_test')).toBe(false);
    });

    it('pullCollections returns empty array when offline', async () => {
      expect(await pullCollections()).toEqual([]);
    });

    it('pullCollections with creator filter returns empty when offline', async () => {
      expect(await pullCollections('STZ_alice')).toEqual([]);
    });
  });

  describe('Auctions sync', () => {
    it('syncAuction returns false when offline', async () => {
      expect(await syncAuction(mockAuction)).toBe(false);
    });

    it('syncBid returns false when offline', async () => {
      expect(await syncBid('AUC_test', mockBid)).toBe(false);
    });

    it('pullActiveAuctions returns empty array when offline', async () => {
      expect(await pullActiveAuctions()).toEqual([]);
    });

    it('pullAuction returns null when offline', async () => {
      expect(await pullAuction('AUC_test')).toBeNull();
    });
  });

  describe('Tags sync', () => {
    it('syncWartTags returns false when offline', async () => {
      expect(await syncWartTags('wart_1', ['abstract', 'colorful'])).toBe(false);
    });

    it('pullWartTags returns empty array when offline', async () => {
      expect(await pullWartTags('wart_1')).toEqual([]);
    });

    it('pullAllTags returns empty array when offline', async () => {
      expect(await pullAllTags()).toEqual([]);
    });
  });

  describe('Full Phase 2 sync', () => {
    it('pullPhase2Data returns empty structures when offline', async () => {
      const data = await pullPhase2Data('STZ_alice');
      expect(data.collections).toEqual([]);
      expect(data.auctions).toEqual([]);
      expect(data.tagMap.size).toBe(0);
    });
  });

  describe('Module exports', () => {
    it('exports all expected functions', async () => {
      const mod = await import('./supabase-phase2-sync');
      const expected = [
        'syncCollection', 'syncCollectionDelete', 'pullCollections',
        'syncAuction', 'syncBid', 'pullActiveAuctions', 'pullAuction',
        'syncWartTags', 'pullWartTags', 'pullAllTags',
        'pullPhase2Data',
      ];
      for (const fn of expected) {
        expect(typeof (mod as Record<string, unknown>)[fn]).toBe('function');
      }
    });
  });
});
