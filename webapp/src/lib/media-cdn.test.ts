import { describe, it, expect } from 'vitest';
import {
  THUMB_SIZES, getMediaUrl, getSrcSet, getSizes, CACHE_HEADERS,
} from './media-cdn';

describe('Media CDN', () => {
  describe('THUMB_SIZES', () => {
    it('has three sizes with correct dimensions', () => {
      expect(THUMB_SIZES.small.width).toBe(150);
      expect(THUMB_SIZES.medium.width).toBe(400);
      expect(THUMB_SIZES.large.width).toBe(800);
    });
  });

  describe('getMediaUrl', () => {
    it('passes through full URLs', () => {
      expect(getMediaUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
    });

    it('converts ar:// to arweave gateway URL', () => {
      const url = getMediaUrl('ar://abc123');
      expect(url).toBe('https://arweave.net/abc123');
    });

    it('returns empty string for empty path', () => {
      expect(getMediaUrl('')).toBe('');
    });
  });

  describe('getSrcSet', () => {
    it('returns empty for data URLs', () => {
      expect(getSrcSet('data:image/png;base64,abc')).toBe('');
    });

    it('returns empty for empty path', () => {
      expect(getSrcSet('')).toBe('');
    });
  });

  describe('getSizes', () => {
    it('returns correct sizes for each context', () => {
      expect(getSizes('thumbnail')).toBe('150px');
      expect(getSizes('grid')).toContain('50vw');
      expect(getSizes('detail')).toContain('800px');
    });
  });

  describe('CACHE_HEADERS', () => {
    it('has all required cache policies', () => {
      expect(CACHE_HEADERS.immutable).toContain('immutable');
      expect(CACHE_HEADERS.thumbnails).toContain('604800');
      expect(CACHE_HEADERS.api).toContain('no-store');
      expect(CACHE_HEADERS.arweave).toContain('immutable');
    });
  });
});
