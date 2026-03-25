import { describe, it, expect } from 'vitest';
import { getTrending, getNew, getTopSellers, getTopCollectors, getForYou } from './recommendations';
import type { Wart } from './warts';

function makeWart(overrides: Partial<Wart> = {}): Wart {
  return {
    id: `wart_${Math.random().toString(36).slice(2)}`,
    title: 'Test Art',
    description: '',
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

describe('Recommendations', () => {
  describe('getTrending', () => {
    it('returns warts sorted by engagement', () => {
      const popular = makeWart({ likes: ['a', 'b', 'c', 'd', 'e'], createdAt: Date.now() });
      const quiet = makeWart({ likes: [], createdAt: Date.now() });
      const result = getTrending([quiet, popular]);
      expect(result[0].likes).toHaveLength(5);
    });

    it('only returns listed warts', () => {
      const listed = makeWart({ listed: true });
      const unlisted = makeWart({ listed: false });
      const result = getTrending([listed, unlisted]);
      expect(result).toHaveLength(1);
    });

    it('respects limit', () => {
      const warts = Array.from({ length: 30 }, () => makeWart());
      const result = getTrending(warts, 5);
      expect(result).toHaveLength(5);
    });
  });

  describe('getNew', () => {
    it('returns most recently created first', () => {
      const old = makeWart({ createdAt: 1000 });
      const recent = makeWart({ createdAt: 9000 });
      const result = getNew([old, recent]);
      expect(result[0].createdAt).toBe(9000);
    });
  });

  describe('getTopSellers', () => {
    it('ranks by sales volume', () => {
      const warts = [
        makeWart({
          creator: 'STZ_alice',
          history: [
            { from: 'STZ_alice', to: 'STZ_bob', price: 500, timestamp: 1000, txId: 't1' },
          ],
        }),
        makeWart({
          creator: 'STZ_carol',
          history: [
            { from: 'STZ_carol', to: 'STZ_bob', price: 100, timestamp: 1000, txId: 't2' },
          ],
        }),
      ];
      const sellers = getTopSellers(warts);
      expect(sellers[0].address).toBe('STZ_alice');
      expect(sellers[0].totalVolume).toBe(500);
      expect(sellers[1].address).toBe('STZ_carol');
    });
  });

  describe('getTopCollectors', () => {
    it('ranks by collection size', () => {
      const warts = [
        makeWart({ owner: 'STZ_bob' }),
        makeWart({ owner: 'STZ_bob' }),
        makeWart({ owner: 'STZ_alice' }),
      ];
      const collectors = getTopCollectors(warts);
      expect(collectors[0].address).toBe('STZ_bob');
      expect(collectors[0].collectionSize).toBe(2);
    });
  });

  describe('getForYou', () => {
    it('prioritizes followed creators', () => {
      const followed = makeWart({ creator: 'STZ_fav', listed: true, price: 100 });
      const random = makeWart({ creator: 'STZ_random', listed: true, price: 100 });
      const result = getForYou([followed, random], 'STZ_me', ['STZ_fav']);
      expect(result[0].creator).toBe('STZ_fav');
    });

    it('excludes own warts', () => {
      const own = makeWart({ creator: 'STZ_me', listed: true });
      const other = makeWart({ creator: 'STZ_other', listed: true });
      const result = getForYou([own, other], 'STZ_me', []);
      expect(result.every(w => w.creator !== 'STZ_me')).toBe(true);
    });

    it('returns empty for no matches', () => {
      const result = getForYou([], 'STZ_me', []);
      expect(result).toHaveLength(0);
    });
  });
});
