import { describe, it, expect, beforeEach } from 'vitest';
import { setMetaTags, resetMetaTags, generateSitemap } from './seo';
import type { Wart } from '../engine/warts';

function makeWart(overrides: Partial<Wart> = {}): Wart {
  return {
    id: 'wart_test', title: 'Test Art', description: 'Beautiful artwork',
    imageData: 'https://example.com/image.jpg', mediaType: 'image',
    creator: 'STZ_creator', owner: 'STZ_owner', price: 100, listed: true,
    createdAt: Date.now(), history: [], royaltyPercent: 5, comments: [],
    editionType: 'unique', maxEditions: null, editionNumber: 1,
    availableUntil: null, storageMode: 'local', vaultBackup: false,
    ...overrides,
  };
}

describe('SEO', () => {
  beforeEach(() => {
    // Clean up meta tags
    document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').forEach(el => el.remove());
  });

  describe('setMetaTags', () => {
    it('sets document title', () => {
      setMetaTags({ title: 'Gallery', description: 'Browse art' });
      expect(document.title).toContain('Gallery');
      expect(document.title).toContain('Strangrz');
    });

    it('sets Open Graph tags', () => {
      setMetaTags({ title: 'Test', description: 'Desc', image: 'https://img.com/a.jpg' });
      const ogTitle = document.querySelector('meta[property="og:title"]');
      expect(ogTitle?.getAttribute('content')).toContain('Test');
    });

    it('sets Twitter Card tags', () => {
      setMetaTags({ title: 'Test', description: 'Desc' });
      const card = document.querySelector('meta[name="twitter:card"]');
      expect(card?.getAttribute('content')).toBe('summary');
    });

    it('uses summary_large_image when image provided', () => {
      setMetaTags({ title: 'Test', description: 'Desc', image: 'https://img.com/a.jpg' });
      const card = document.querySelector('meta[name="twitter:card"]');
      expect(card?.getAttribute('content')).toBe('summary_large_image');
    });
  });

  describe('resetMetaTags', () => {
    it('resets to defaults', () => {
      setMetaTags({ title: 'Custom Page', description: 'Custom desc' });
      resetMetaTags();
      expect(document.title).toBe('Strangrz');
    });
  });

  describe('generateSitemap', () => {
    it('generates valid XML', () => {
      const warts = [makeWart({ id: 'w1' }), makeWart({ id: 'w2', listed: false })];
      const xml = generateSitemap('https://strangrz.com', warts);
      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<urlset');
      expect(xml).toContain('https://strangrz.com/gallery');
      expect(xml).toContain('detail=w1'); // listed wart
      expect(xml).not.toContain('detail=w2'); // unlisted excluded
    });

    it('includes static pages', () => {
      const xml = generateSitemap('https://strangrz.com', []);
      expect(xml).toContain('/gallery');
      expect(xml).toContain('/discover');
      expect(xml).toContain('/whitepaper');
    });

    it('limits to 500 warts', () => {
      const manyWarts = Array.from({ length: 600 }, (_, i) => makeWart({ id: `w${i}` }));
      const xml = generateSitemap('https://strangrz.com', manyWarts);
      const detailCount = (xml.match(/detail=/g) || []).length;
      expect(detailCount).toBeLessThanOrEqual(500);
    });
  });
});
