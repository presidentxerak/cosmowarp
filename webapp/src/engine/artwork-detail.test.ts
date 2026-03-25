import { describe, it, expect } from 'vitest';
import { buildProvenance, getPriceHistory, getPriceStats, findRelated, getShareMetadata } from './artwork-detail';
import type { Wart } from './warts';

function makeWart(overrides: Partial<Wart> = {}): Wart {
  return {
    id: `wart_${Math.random().toString(36).slice(2)}`,
    title: 'Test Art',
    description: 'A test artwork',
    imageData: '',
    mediaType: 'image',
    creator: 'STZ_creator',
    owner: 'STZ_owner',
    price: 100,
    listed: true,
    createdAt: Date.now() - 86400_000,
    history: [],
    royaltyPercent: 5,
    comments: [],
    editionType: 'unique',
    maxEditions: null,
    editionNumber: 1,
    availableUntil: null,
    storageMode: 'local',
    vaultBackup: false,
    ...overrides,
  };
}

describe('Artwork Detail', () => {
  describe('buildProvenance', () => {
    it('starts with mint event', () => {
      const wart = makeWart();
      const chain = buildProvenance(wart);
      expect(chain).toHaveLength(1);
      expect(chain[0].type).toBe('mint');
      expect(chain[0].to).toBe(wart.creator);
    });

    it('includes transfer history', () => {
      const wart = makeWart({
        history: [
          { from: 'STZ_creator', to: 'STZ_buyer1', price: 100, timestamp: Date.now() - 3600_000, txId: 'tx_1' },
          { from: 'STZ_buyer1', to: 'STZ_buyer2', price: 200, timestamp: Date.now() - 1800_000, txId: 'tx_2' },
        ],
      });
      const chain = buildProvenance(wart);
      expect(chain).toHaveLength(3); // mint + 2 sales
      expect(chain[1].type).toBe('sale');
      expect(chain[2].type).toBe('sale');
    });

    it('marks zero-price as transfer', () => {
      const wart = makeWart({
        history: [
          { from: 'STZ_a', to: 'STZ_b', price: 0, timestamp: Date.now(), txId: 'tx_gift' },
        ],
      });
      const chain = buildProvenance(wart);
      expect(chain[1].type).toBe('transfer');
    });
  });

  describe('getPriceHistory', () => {
    it('returns only sales with price > 0', () => {
      const wart = makeWart({
        history: [
          { from: 'a', to: 'b', price: 100, timestamp: 1000, txId: 't1' },
          { from: 'b', to: 'c', price: 0, timestamp: 2000, txId: 't2' }, // gift
          { from: 'c', to: 'd', price: 300, timestamp: 3000, txId: 't3' },
        ],
      });
      const history = getPriceHistory(wart);
      expect(history).toHaveLength(2);
      expect(history[0].price).toBe(100);
      expect(history[1].price).toBe(300);
    });
  });

  describe('getPriceStats', () => {
    it('returns null stats for no sales', () => {
      const stats = getPriceStats(makeWart());
      expect(stats.totalSales).toBe(0);
      expect(stats.lastSalePrice).toBeNull();
    });

    it('calculates correct stats', () => {
      const wart = makeWart({
        history: [
          { from: 'a', to: 'b', price: 100, timestamp: 1000, txId: 't1' },
          { from: 'b', to: 'c', price: 300, timestamp: 2000, txId: 't2' },
          { from: 'c', to: 'd', price: 200, timestamp: 3000, txId: 't3' },
        ],
      });
      const stats = getPriceStats(wart);
      expect(stats.totalSales).toBe(3);
      expect(stats.lastSalePrice).toBe(200);
      expect(stats.highestSalePrice).toBe(300);
      expect(stats.lowestSalePrice).toBe(100);
      expect(stats.totalSalesVolume).toBe(600);
    });
  });

  describe('findRelated', () => {
    it('prioritizes same creator', () => {
      const target = makeWart({ creator: 'STZ_alice' });
      const sameCreator = makeWart({ creator: 'STZ_alice', title: 'Same artist' });
      const different = makeWart({ creator: 'STZ_bob', title: 'Different artist' });
      const related = findRelated(target, [sameCreator, different]);
      expect(related[0].creator).toBe('STZ_alice');
    });

    it('excludes the wart itself', () => {
      const target = makeWart();
      const related = findRelated(target, [target]);
      expect(related).toHaveLength(0);
    });

    it('respects limit', () => {
      const target = makeWart({ creator: 'STZ_alice' });
      const many = Array.from({ length: 20 }, () => makeWart({ creator: 'STZ_alice' }));
      const related = findRelated(target, many, 3);
      expect(related).toHaveLength(3);
    });
  });

  describe('getShareMetadata', () => {
    it('generates correct metadata', () => {
      const wart = makeWart({ title: 'Cosmic Art', price: 500 });
      const meta = getShareMetadata(wart);
      expect(meta.title).toContain('Cosmic Art');
      expect(meta.description).toContain('500 STZ');
    });
  });
});
