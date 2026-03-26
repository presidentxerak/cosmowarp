import { describe, it, expect } from 'vitest';
import { computePlatformMetrics, computeCreatorAnalytics, exportCSV } from './analytics';
import type { Wart } from './warts';
import type { Transaction } from './wallet';

function makeWart(overrides: Partial<Wart> = {}): Wart {
  return {
    id: `w_${Math.random().toString(36).slice(2)}`, title: 'Art', description: '',
    imageData: '', mediaType: 'image', creator: 'STZ_creator', owner: 'STZ_owner',
    price: 100, listed: true, createdAt: Date.now(), history: [],
    royaltyPercent: 5, comments: [], editionType: 'unique', maxEditions: null,
    editionNumber: 1, availableUntil: null, storageMode: 'local', vaultBackup: false,
    ...overrides,
  };
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: `tx_${Math.random().toString(36).slice(2)}`,
    from: 'STZ_a', to: 'STZ_b', amount: 100,
    timestamp: Date.now(), signature: 'sig', type: 'send',
    ...overrides,
  };
}

describe('Analytics', () => {
  describe('computePlatformMetrics', () => {
    it('computes basic platform metrics', () => {
      const warts = [makeWart({ listed: true }), makeWart({ listed: false }), makeWart({ listed: true })];
      const txs = [makeTx({ amount: 100 }), makeTx({ amount: 200 })];
      const metrics = computePlatformMetrics(warts, txs, 42);
      expect(metrics.totalUsers).toBe(42);
      expect(metrics.totalWarts).toBe(3);
      expect(metrics.totalListedWarts).toBe(2);
      expect(metrics.totalTransactions).toBe(2);
      expect(metrics.totalVolume).toBe(300);
    });

    it('counts daily active users from recent transactions', () => {
      const txs = [
        makeTx({ from: 'STZ_a', to: 'STZ_b', timestamp: Date.now() }),
        makeTx({ from: 'STZ_c', to: 'STZ_a', timestamp: Date.now() }),
      ];
      const metrics = computePlatformMetrics([], txs, 10);
      expect(metrics.dailyActiveUsers).toBe(3); // a, b, c
    });
  });

  describe('computeCreatorAnalytics', () => {
    it('computes creator sales and revenue', () => {
      const warts = [
        makeWart({
          creator: 'STZ_alice',
          history: [
            { from: 'STZ_alice', to: 'STZ_bob', price: 200, timestamp: Date.now() - 86400000, txId: 't1' },
            { from: 'STZ_bob', to: 'STZ_carol', price: 300, timestamp: Date.now(), txId: 't2' },
          ],
        }),
        makeWart({ creator: 'STZ_alice' }),
      ];
      const analytics = computeCreatorAnalytics('STZ_alice', warts, []);
      expect(analytics.totalSales).toBe(2);
      expect(analytics.totalRevenue).toBe(500);
      expect(analytics.topArtworks).toHaveLength(1);
    });

    it('handles creator with no sales', () => {
      const warts = [makeWart({ creator: 'STZ_new' })];
      const analytics = computeCreatorAnalytics('STZ_new', warts, []);
      expect(analytics.totalSales).toBe(0);
      expect(analytics.totalRevenue).toBe(0);
      expect(analytics.topArtworks).toEqual([]);
    });
  });

  describe('exportCSV', () => {
    it('generates valid CSV', () => {
      const data = [
        { date: '2026-01-01', value: 10 },
        { date: '2026-01-02', value: 20 },
      ];
      const csv = exportCSV(data, 'sales');
      expect(csv).toBe('date,sales\n2026-01-01,10\n2026-01-02,20');
    });
  });
});
