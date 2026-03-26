import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateRoyaltySplit, validateRoyaltyPercent,
  recordRoyaltyEarning, getCreatorRoyalties, getTotalRoyalties,
  MIN_ROYALTY_PERCENT, MAX_ROYALTY_PERCENT,
} from './royalties';

describe('Royalty Engine', () => {
  beforeEach(() => localStorage.clear());

  describe('calculateRoyaltySplit', () => {
    it('primary sale: no royalty, 10% platform fee', () => {
      const split = calculateRoyaltySplit(100, 10, false, 'STZ_creator', 'STZ_creator');
      expect(split.isResale).toBe(false);
      expect(split.platformFeePercent).toBe(10);
      expect(split.platformFee).toBe(10);
      expect(split.royaltyAmount).toBe(0); // no royalty on primary
      expect(split.sellerReceives).toBe(100);
      expect(split.buyerPays).toBe(110); // 100 + 10% fee
    });

    it('resale: royalty + 5% platform fee', () => {
      const split = calculateRoyaltySplit(100, 10, true, 'STZ_seller', 'STZ_creator');
      expect(split.isResale).toBe(true);
      expect(split.platformFeePercent).toBe(5);
      expect(split.platformFee).toBe(5);
      expect(split.royaltyPercent).toBe(10);
      expect(split.royaltyAmount).toBe(10);
      expect(split.sellerReceives).toBe(90); // 100 - 10% royalty
      expect(split.creatorReceives).toBe(10);
      expect(split.buyerPays).toBe(105); // 100 + 5% fee
    });

    it('resale by creator: no royalty to self', () => {
      const split = calculateRoyaltySplit(100, 10, true, 'STZ_creator', 'STZ_creator');
      expect(split.royaltyAmount).toBe(0); // creator selling own work = no royalty
      expect(split.sellerReceives).toBe(100);
    });

    it('zero royalty resale', () => {
      const split = calculateRoyaltySplit(200, 0, true, 'STZ_seller', 'STZ_creator');
      expect(split.royaltyAmount).toBe(0);
      expect(split.sellerReceives).toBe(200);
      expect(split.buyerPays).toBe(210); // 200 + 5%
    });

    it('max royalty (15%)', () => {
      const split = calculateRoyaltySplit(1000, 15, true, 'STZ_seller', 'STZ_creator');
      expect(split.royaltyAmount).toBe(150);
      expect(split.sellerReceives).toBe(850);
      expect(split.creatorReceives).toBe(150);
    });
  });

  describe('validateRoyaltyPercent', () => {
    it('accepts valid range', () => {
      expect(validateRoyaltyPercent(0).valid).toBe(true);
      expect(validateRoyaltyPercent(5).valid).toBe(true);
      expect(validateRoyaltyPercent(15).valid).toBe(true);
    });

    it('rejects out of range', () => {
      expect(validateRoyaltyPercent(-1).valid).toBe(false);
      expect(validateRoyaltyPercent(16).valid).toBe(false);
      expect(validateRoyaltyPercent(NaN).valid).toBe(false);
      expect(validateRoyaltyPercent(Infinity).valid).toBe(false);
    });

    it('provides error messages', () => {
      expect(validateRoyaltyPercent(-1).error).toContain(`${MIN_ROYALTY_PERCENT}`);
      expect(validateRoyaltyPercent(20).error).toContain(`${MAX_ROYALTY_PERCENT}`);
    });
  });

  describe('Royalty Tracking', () => {
    it('records and retrieves earnings', () => {
      recordRoyaltyEarning({
        wartId: 'w1', wartTitle: 'Art 1',
        fromSeller: 'STZ_reseller', toBuyer: 'STZ_buyer',
        salePrice: 500, royaltyAmount: 50, royaltyPercent: 10,
        timestamp: Date.now(), txId: 'tx1',
      });
      recordRoyaltyEarning({
        wartId: 'w2', wartTitle: 'Art 2',
        fromSeller: 'STZ_reseller2', toBuyer: 'STZ_buyer2',
        salePrice: 1000, royaltyAmount: 100, royaltyPercent: 10,
        timestamp: Date.now(), txId: 'tx2',
      });

      const earnings = getCreatorRoyalties('STZ_creator');
      expect(earnings).toHaveLength(2);
    });

    it('calculates total royalties', () => {
      recordRoyaltyEarning({
        wartId: 'w1', wartTitle: 'Art',
        fromSeller: 'STZ_a', toBuyer: 'STZ_b',
        salePrice: 100, royaltyAmount: 10, royaltyPercent: 10,
        timestamp: Date.now(), txId: 'tx1',
      });
      recordRoyaltyEarning({
        wartId: 'w2', wartTitle: 'Art 2',
        fromSeller: 'STZ_c', toBuyer: 'STZ_d',
        salePrice: 200, royaltyAmount: 20, royaltyPercent: 10,
        timestamp: Date.now(), txId: 'tx2',
      });

      expect(getTotalRoyalties('STZ_creator')).toBe(30);
    });
  });
});
