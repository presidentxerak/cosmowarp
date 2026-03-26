import { describe, it, expect, beforeEach } from 'vitest';
import {
  filterWarts, computeTrendScore, setWartTags, getWartTags, getAllTags,
  filtersToParams, paramsToFilters, DEFAULT_FILTERS,
  type SearchFilters,
} from './search';
import type { Wart } from './warts';

function makeWart(overrides: Partial<Wart> = {}): Wart {
  return {
    id: `wart_${Math.random().toString(36).slice(2)}`,
    title: 'Test Artwork',
    description: 'A beautiful piece',
    imageData: 'data:image/png;base64,abc',
    mediaType: 'image',
    creator: 'STZ_creator1',
    owner: 'STZ_owner1',
    price: 100,
    listed: true,
    createdAt: Date.now() - 3600_000,
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

describe('Search Engine', () => {
  beforeEach(() => localStorage.clear());

  describe('filterWarts', () => {
    it('filters by text query (title)', () => {
      const warts = [
        makeWart({ title: 'Cosmic Sunset' }),
        makeWart({ title: 'Ocean Wave' }),
        makeWart({ title: 'Cosmic Dawn' }),
      ];
      const result = filterWarts(warts, { ...DEFAULT_FILTERS, query: 'cosmic' });
      expect(result).toHaveLength(2);
    });

    it('filters by media type', () => {
      const warts = [
        makeWart({ mediaType: 'image' }),
        makeWart({ mediaType: 'audio' }),
        makeWart({ mediaType: 'video' }),
      ];
      const result = filterWarts(warts, { ...DEFAULT_FILTERS, mediaType: 'audio' });
      expect(result).toHaveLength(1);
      expect(result[0].mediaType).toBe('audio');
    });

    it('filters by edition type', () => {
      const warts = [
        makeWart({ editionType: 'unique' }),
        makeWart({ editionType: 'limited' }),
        makeWart({ editionType: 'unique' }),
      ];
      const result = filterWarts(warts, { ...DEFAULT_FILTERS, editionType: 'limited' });
      expect(result).toHaveLength(1);
    });

    it('filters by price range', () => {
      const warts = [
        makeWart({ price: 50 }),
        makeWart({ price: 150 }),
        makeWart({ price: 300 }),
      ];
      const result = filterWarts(warts, {
        ...DEFAULT_FILTERS,
        priceRange: { min: 100, max: 200 },
      });
      expect(result).toHaveLength(1);
      expect(result[0].price).toBe(150);
    });

    it('filters by creator', () => {
      const warts = [
        makeWart({ creator: 'STZ_alice' }),
        makeWart({ creator: 'STZ_bob' }),
      ];
      const result = filterWarts(warts, { ...DEFAULT_FILTERS, creator: 'STZ_alice' });
      expect(result).toHaveLength(1);
    });

    it('filters by tags', () => {
      const w1 = makeWart({ title: 'Tagged Art' });
      const w2 = makeWart({ title: 'Untagged Art' });
      setWartTags(w1.id, ['abstract', 'colorful']);
      const result = filterWarts([w1, w2], { ...DEFAULT_FILTERS, tags: ['abstract'] });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(w1.id);
    });

    it('sorts by price-low', () => {
      const warts = [
        makeWart({ price: 300 }),
        makeWart({ price: 50 }),
        makeWart({ price: 150 }),
      ];
      const result = filterWarts(warts, { ...DEFAULT_FILTERS, sort: 'price-low' });
      expect(result[0].price).toBe(50);
      expect(result[2].price).toBe(300);
    });

    it('sorts by most-liked', () => {
      const warts = [
        makeWart({ likes: ['a'] }),
        makeWart({ likes: ['a', 'b', 'c'] }),
        makeWart({ likes: [] }),
      ];
      const result = filterWarts(warts, { ...DEFAULT_FILTERS, sort: 'most-liked' });
      expect(result[0].likes).toHaveLength(3);
    });

    it('only shows listed warts by default', () => {
      const warts = [
        makeWart({ listed: true, price: 100 }),
        makeWart({ listed: false, price: 50 }),
      ];
      const result = filterWarts(warts, DEFAULT_FILTERS);
      expect(result).toHaveLength(1);
    });
  });

  describe('Tag System', () => {
    it('sets and gets tags', () => {
      setWartTags('w1', ['abstract', 'COLORFUL', '  space  ']);
      expect(getWartTags('w1')).toEqual(['abstract', 'colorful', 'space']);
    });

    it('limits to 5 tags', () => {
      setWartTags('w1', ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
      expect(getWartTags('w1')).toHaveLength(5);
    });

    it('getAllTags returns unique sorted tags', () => {
      setWartTags('w1', ['alpha', 'beta']);
      setWartTags('w2', ['beta', 'gamma']);
      expect(getAllTags()).toEqual(['alpha', 'beta', 'gamma']);
    });
  });

  describe('Trending Score', () => {
    it('recent warts score higher', () => {
      const recent = makeWart({ createdAt: Date.now() - 3600_000, likes: ['a', 'b'] });
      const old = makeWart({ createdAt: Date.now() - 7 * 86400_000, likes: ['a', 'b'] });
      expect(computeTrendScore(recent)).toBeGreaterThan(computeTrendScore(old));
    });

    it('more engagement = higher score', () => {
      const now = Date.now();
      const popular = makeWart({ createdAt: now, likes: ['a', 'b', 'c'], comments: [{} as any, {} as any] });
      const quiet = makeWart({ createdAt: now, likes: [] });
      expect(computeTrendScore(popular)).toBeGreaterThan(computeTrendScore(quiet));
    });
  });

  describe('URL Params', () => {
    it('roundtrips filters to/from URL params', () => {
      const filters: SearchFilters = {
        ...DEFAULT_FILTERS,
        query: 'cosmic',
        mediaType: 'video',
        sort: 'price-high',
        tags: ['abstract', 'space'],
      };
      const params = filtersToParams(filters);
      const restored = paramsToFilters(params);
      expect(restored.query).toBe('cosmic');
      expect(restored.mediaType).toBe('video');
      expect(restored.sort).toBe('price-high');
      expect(restored.tags).toEqual(['abstract', 'space']);
    });
  });
});
