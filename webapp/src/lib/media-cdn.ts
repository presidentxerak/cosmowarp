/**
 * Strangrz Media CDN — Thumbnail generation, responsive images, CDN caching
 *
 * Features:
 * - Generate thumbnails at upload time (small, medium, large)
 * - Serve responsive images via srcset
 * - CDN URL construction with cache headers
 * - Proxy Arweave content with long TTL
 */

import { getPublicUrl, BUCKETS } from '../lib/supabase';

// ─── Thumbnail Sizes ──────────────────────────────────────

export const THUMB_SIZES = {
  small:  { width: 150, height: 150, suffix: '_sm' },
  medium: { width: 400, height: 400, suffix: '_md' },
  large:  { width: 800, height: 800, suffix: '_lg' },
} as const;

export type ThumbSize = keyof typeof THUMB_SIZES;

// ─── Thumbnail Generation (Client-Side Canvas) ────────────

/**
 * Generate a resized thumbnail from a data URL using canvas.
 * Returns a JPEG data URL at the specified dimensions.
 */
export function generateThumbnail(
  imageDataUrl: string,
  maxWidth: number,
  maxHeight: number,
  quality = 0.8,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate aspect-ratio-preserving dimensions
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/**
 * Generate all thumbnail sizes for an image.
 * Returns { small, medium, large } data URLs.
 */
export async function generateAllThumbnails(imageDataUrl: string): Promise<Record<ThumbSize, string>> {
  const [small, medium, large] = await Promise.all([
    generateThumbnail(imageDataUrl, THUMB_SIZES.small.width, THUMB_SIZES.small.height, 0.7),
    generateThumbnail(imageDataUrl, THUMB_SIZES.medium.width, THUMB_SIZES.medium.height, 0.8),
    generateThumbnail(imageDataUrl, THUMB_SIZES.large.width, THUMB_SIZES.large.height, 0.85),
  ]);
  return { small, medium, large };
}

// ─── CDN URL Construction ─────────────────────────────────

/** Get the public URL for a media file with optional transform */
export function getMediaUrl(mediaPath: string, size?: ThumbSize): string {
  if (!mediaPath) return '';

  // If it's already a full URL (Arweave, IPFS), return as-is
  if (mediaPath.startsWith('http') || mediaPath.startsWith('ar://')) {
    return mediaPath.startsWith('ar://')
      ? `https://arweave.net/${mediaPath.slice(5)}`
      : mediaPath;
  }

  // Supabase Storage public URL
  if (size) {
    const suffix = THUMB_SIZES[size].suffix;
    const ext = mediaPath.split('.').pop() || 'jpg';
    const base = mediaPath.replace(`.${ext}`, '');
    const thumbPath = `${base}${suffix}.jpg`;
    return getPublicUrl(BUCKETS.MEDIA, thumbPath);
  }

  return getPublicUrl(BUCKETS.MEDIA, mediaPath);
}

/** Generate srcset attribute for responsive images */
export function getSrcSet(mediaPath: string): string {
  if (!mediaPath || mediaPath.startsWith('data:')) return '';

  const urls = [
    `${getMediaUrl(mediaPath, 'small')} 150w`,
    `${getMediaUrl(mediaPath, 'medium')} 400w`,
    `${getMediaUrl(mediaPath, 'large')} 800w`,
    `${getMediaUrl(mediaPath)} 1200w`,
  ];
  return urls.join(', ');
}

/** Get sizes attribute for responsive images */
export function getSizes(context: 'grid' | 'detail' | 'thumbnail'): string {
  switch (context) {
    case 'thumbnail': return '150px';
    case 'grid': return '(max-width: 640px) 50vw, 33vw';
    case 'detail': return '(max-width: 640px) 100vw, 800px';
    default: return '100vw';
  }
}

// ─── Cache Control Headers ────────────────────────────────

/** Recommended cache headers for different content types */
export const CACHE_HEADERS = {
  /** Immutable hashed assets (JS/CSS bundles) — 1 year */
  immutable: 'public, max-age=31536000, immutable',
  /** Media thumbnails — 1 week, revalidate */
  thumbnails: 'public, max-age=604800, stale-while-revalidate=86400',
  /** Full-size media — 1 day, revalidate */
  media: 'public, max-age=86400, stale-while-revalidate=3600',
  /** API responses — no cache */
  api: 'no-store, no-cache, must-revalidate',
  /** Arweave content — permanent, 1 year */
  arweave: 'public, max-age=31536000, immutable',
} as const;
