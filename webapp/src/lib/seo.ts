/**
 * Strangrz SEO — Open Graph, meta tags, structured data, sitemap
 *
 * Since Strangrz is a SPA, meta tags are set dynamically via DOM manipulation.
 * For full SSR-level SEO, a pre-rendering service (e.g. Prerender.io) is needed.
 */

import type { Wart } from '../engine/warts';

// ─── Types ────────────────────────────────────────────────

export interface MetaTags {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
}

// ─── Default Meta ─────────────────────────────────────────

const SITE_NAME = 'Strangrz';
const DEFAULT_DESCRIPTION = 'Decentralized marketplace for certified digital artworks. Mint, collect, and trade unique Strangrz.';
const DEFAULT_IMAGE = '/logo.png';

// ─── Set Meta Tags ────────────────────────────────────────

/** Update document meta tags for SEO and social sharing */
export function setMetaTags(meta: MetaTags): void {
  if (typeof document === 'undefined') return;

  const { title, description, image, url, type } = meta;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const fullUrl = url || window.location.href;
  const fullImage = image || DEFAULT_IMAGE;

  // Title
  document.title = fullTitle;

  // Standard meta
  setMeta('description', description);

  // Open Graph
  setMeta('og:title', fullTitle, 'property');
  setMeta('og:description', description, 'property');
  setMeta('og:image', fullImage, 'property');
  setMeta('og:url', fullUrl, 'property');
  setMeta('og:type', type || 'website', 'property');
  setMeta('og:site_name', SITE_NAME, 'property');

  // Twitter Card
  setMeta('twitter:card', image ? 'summary_large_image' : 'summary');
  setMeta('twitter:title', fullTitle);
  setMeta('twitter:description', description);
  setMeta('twitter:image', fullImage);
}

/** Reset to default meta tags */
export function resetMetaTags(): void {
  setMetaTags({
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
  });
}

// ─── Page-Specific Meta ───────────────────────────────────

/** Set meta tags for an artwork detail page */
export function setArtworkMeta(wart: Wart): void {
  const priceText = wart.price ? `${wart.price} STZ` : 'Not for sale';
  setMetaTags({
    title: wart.title,
    description: `${wart.description || 'Digital artwork'} — ${priceText}`,
    image: wart.imageData?.startsWith('http') ? wart.imageData : undefined,
    url: `${window.location.origin}/gallery?detail=${wart.id}`,
    type: 'article',
  });
}

/** Set meta tags for a user profile page */
export function setProfileMeta(alias: string, address: string, artworkCount: number): void {
  setMetaTags({
    title: `${alias} — Creator Profile`,
    description: `${alias} has ${artworkCount} artworks on Strangrz. View their collection and portfolio.`,
    url: `${window.location.origin}/user-profile?address=${address}`,
    type: 'profile',
  });
}

/** Set meta tags for the gallery/marketplace */
export function setGalleryMeta(): void {
  setMetaTags({
    title: 'Gallery',
    description: 'Browse and collect certified digital artworks from creators worldwide on Strangrz.',
    url: `${window.location.origin}/gallery`,
  });
}

// ─── JSON-LD Structured Data ──────────────────────────────

/** Inject JSON-LD structured data for an artwork */
export function setArtworkStructuredData(wart: Wart): void {
  if (typeof document === 'undefined') return;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: wart.title,
    description: wart.description || '',
    creator: {
      '@type': 'Person',
      identifier: wart.creator,
    },
    dateCreated: new Date(wart.createdAt).toISOString(),
    artMedium: 'Digital',
    ...(wart.price ? {
      offers: {
        '@type': 'Offer',
        price: wart.price,
        priceCurrency: 'STZ',
        availability: wart.listed ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      },
    } : {}),
  };

  removeStructuredData();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = 'strangrz-jsonld';
  script.textContent = JSON.stringify(jsonLd);
  document.head.appendChild(script);
}

/** Remove structured data script tag */
export function removeStructuredData(): void {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('strangrz-jsonld');
  if (existing) existing.remove();
}

// ─── Sitemap Generation ───────────────────────────────────

/** Generate a sitemap XML string from wart data */
export function generateSitemap(baseUrl: string, warts: Wart[]): string {
  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/gallery', priority: '0.9', changefreq: 'daily' },
    { path: '/discover', priority: '0.8', changefreq: 'daily' },
    { path: '/whitepaper', priority: '0.5', changefreq: 'monthly' },
  ];

  const urls = staticPages.map(p =>
    `  <url><loc>${baseUrl}${p.path}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`
  );

  // Add listed warts
  for (const wart of warts.filter(w => w.listed).slice(0, 500)) {
    const lastmod = new Date(wart.createdAt).toISOString().slice(0, 10);
    urls.push(`  <url><loc>${baseUrl}/gallery?detail=${wart.id}</loc><lastmod>${lastmod}</lastmod><priority>0.7</priority></url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}

// ─── Helpers ──────────────────────────────────────────────

function setMeta(name: string, content: string, attr: 'name' | 'property' = 'name'): void {
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
