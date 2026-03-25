import { describe, it, expect, beforeEach } from 'vitest';
import {
  getPayoutHistory, addPayoutRecord, getPayoutSettings, setPayoutSettings,
  getSellerEarnings, type PayoutRecord,
} from './payouts';

function makePayout(overrides: Partial<PayoutRecord> = {}): PayoutRecord {
  return {
    id: `PAY_${Math.random().toString(36).slice(2)}`,
    sellerAddress: 'STZ_seller',
    amount: 50,
    currency: 'EUR',
    stzAmount: 500,
    status: 'completed',
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('Payout Engine', () => {
  beforeEach(() => localStorage.clear());

  describe('Payout History', () => {
    it('starts empty', () => {
      expect(getPayoutHistory('STZ_seller')).toEqual([]);
    });

    it('adds and retrieves records', () => {
      addPayoutRecord(makePayout({ sellerAddress: 'STZ_alice', amount: 100 }));
      addPayoutRecord(makePayout({ sellerAddress: 'STZ_alice', amount: 200 }));
      addPayoutRecord(makePayout({ sellerAddress: 'STZ_bob', amount: 50 }));

      expect(getPayoutHistory('STZ_alice')).toHaveLength(2);
      expect(getPayoutHistory('STZ_bob')).toHaveLength(1);
    });

    it('sorts newest first', () => {
      addPayoutRecord(makePayout({ createdAt: 1000 }));
      addPayoutRecord(makePayout({ createdAt: 3000 }));
      addPayoutRecord(makePayout({ createdAt: 2000 }));

      const history = getPayoutHistory('STZ_seller');
      expect(history[0].createdAt).toBe(3000);
      expect(history[2].createdAt).toBe(1000);
    });
  });

  describe('Payout Settings', () => {
    it('returns defaults', () => {
      const settings = getPayoutSettings('STZ_seller');
      expect(settings.schedule).toBe('auto');
      expect(settings.minimumPayout).toBe(10);
      expect(settings.currency).toBe('EUR');
    });

    it('persists custom settings', () => {
      setPayoutSettings('STZ_seller', { schedule: 'weekly', minimumPayout: 50 });
      const settings = getPayoutSettings('STZ_seller');
      expect(settings.schedule).toBe('weekly');
      expect(settings.minimumPayout).toBe(50);
      expect(settings.currency).toBe('EUR'); // default preserved
    });
  });

  describe('Seller Earnings', () => {
    it('calculates correct earnings', () => {
      addPayoutRecord(makePayout({ amount: 100, status: 'completed' }));
      addPayoutRecord(makePayout({ amount: 200, status: 'completed' }));
      addPayoutRecord(makePayout({ amount: 50, status: 'pending' }));

      const earnings = getSellerEarnings('STZ_seller');
      expect(earnings.totalEarned).toBe(350);
      expect(earnings.totalPaid).toBe(300);
      expect(earnings.pendingBalance).toBe(50);
      expect(earnings.payoutCount).toBe(2);
    });

    it('handles no payouts', () => {
      const earnings = getSellerEarnings('STZ_new');
      expect(earnings.totalEarned).toBe(0);
      expect(earnings.pendingBalance).toBe(0);
      expect(earnings.lastPayout).toBeNull();
    });
  });
});
