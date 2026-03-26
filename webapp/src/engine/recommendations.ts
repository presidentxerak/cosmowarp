/**
 * Strangrz Recommendations — Trending, Top Sellers, For You
 *
 * Provides sections for the DiscoverView:
 *   - Trending: time-weighted engagement score
 *   - New: recently minted
 *   - Top Sellers: most sales volume
 *   - For You: personalized based on follows/likes
 */

import type { Wart } from './warts';
import { computeTrendScore, getWartTags } from './search';

// ─── Trending ─────────────────────────────────────────────

/** Get trending warts sorted by engagement score */
export function getTrending(warts: Wart[], limit = 20): Wart[] {
  return [...warts]
    .filter(w => w.listed)
    .sort((a, b) => computeTrendScore(b) - computeTrendScore(a))
    .slice(0, limit);
}

// ─── New ──────────────────────────────────────────────────

/** Get recently minted warts */
export function getNew(warts: Wart[], limit = 20): Wart[] {
  return [...warts]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

// ─── Top Sellers ──────────────────────────────────────────

export interface SellerStats {
  address: string;
  totalSales: number;
  totalVolume: number;
  artworkCount: number;
}

/** Rank sellers by total sales volume */
export function getTopSellers(warts: Wart[], limit = 10): SellerStats[] {
  const stats = new Map<string, SellerStats>();

  for (const wart of warts) {
    // Count artworks per creator
    const existing = stats.get(wart.creator) || {
      address: wart.creator,
      totalSales: 0,
      totalVolume: 0,
      artworkCount: 0,
    };
    existing.artworkCount++;

    // Count sales from history
    for (const transfer of wart.history || []) {
      if (transfer.price > 0 && transfer.from === wart.creator) {
        existing.totalSales++;
        existing.totalVolume += transfer.price;
      }
    }

    stats.set(wart.creator, existing);
  }

  return [...stats.values()]
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, limit);
}

// ─── Top Collectors ───────────────────────────────────────

export interface CollectorStats {
  address: string;
  collectionSize: number;
  totalSpent: number;
}

/** Rank collectors by collection size and spending */
export function getTopCollectors(warts: Wart[], limit = 10): CollectorStats[] {
  const stats = new Map<string, CollectorStats>();

  for (const wart of warts) {
    // Count owned warts
    const existing = stats.get(wart.owner) || {
      address: wart.owner,
      collectionSize: 0,
      totalSpent: 0,
    };
    existing.collectionSize++;

    // Count purchases from history
    for (const transfer of wart.history || []) {
      if (transfer.price > 0 && transfer.to === wart.owner) {
        existing.totalSpent += transfer.price;
      }
    }

    stats.set(wart.owner, existing);
  }

  return [...stats.values()]
    .sort((a, b) => b.collectionSize - a.collectionSize)
    .slice(0, limit);
}

// ─── For You (personalized) ───────────────────────────────

/**
 * Personalized recommendations based on:
 * - Creators the user follows
 * - Tags from warts the user has liked/bookmarked
 * - Media types the user prefers
 */
export function getForYou(
  warts: Wart[],
  userAddress: string,
  followedCreators: string[],
  limit = 20,
): Wart[] {
  // Collect user's preferred tags and media types from liked/bookmarked warts
  const preferredTags = new Map<string, number>();
  const preferredMedia = new Map<string, number>();

  for (const wart of warts) {
    const isLiked = wart.likes?.includes(userAddress);
    const isBookmarked = wart.bookmarks?.includes(userAddress);
    if (!isLiked && !isBookmarked) continue;

    const weight = isBookmarked ? 3 : 1;
    // Track preferred tags
    for (const tag of getWartTags(wart.id)) {
      preferredTags.set(tag, (preferredTags.get(tag) || 0) + weight);
    }
    // Track preferred media type
    const mt = wart.mediaType || 'image';
    preferredMedia.set(mt, (preferredMedia.get(mt) || 0) + weight);
  }

  const followedSet = new Set(followedCreators);

  // Score each candidate
  const scored: Array<{ wart: Wart; score: number }> = [];

  for (const wart of warts) {
    // Skip user's own warts and already owned
    if (wart.creator === userAddress || wart.owner === userAddress) continue;
    if (!wart.listed) continue;

    let score = 0;

    // Followed creator
    if (followedSet.has(wart.creator)) score += 20;

    // Tag affinity
    for (const tag of getWartTags(wart.id)) {
      score += (preferredTags.get(tag) || 0) * 3;
    }

    // Media type affinity
    const mt = wart.mediaType || 'image';
    score += (preferredMedia.get(mt) || 0) * 2;

    // Trending boost
    score += computeTrendScore(wart);

    // Recency boost
    const ageHours = (Date.now() - wart.createdAt) / (1000 * 60 * 60);
    if (ageHours < 24) score += 5;

    if (score > 0) scored.push({ wart, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.wart);
}
