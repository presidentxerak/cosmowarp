/**
 * Strangrz Artwork Detail — Provenance, price history, and related artworks
 *
 * Utilities for the enhanced artwork detail page.
 */

import type { Wart, WartTransfer } from './warts';
import { computeTrendScore, getWartTags } from './search';

// ─── Provenance Chain ─────────────────────────────────────

export interface ProvenanceEntry {
  type: 'mint' | 'transfer' | 'sale';
  from: string;
  to: string;
  price: number | null;
  timestamp: number;
  txId: string;
}

/** Build a provenance chain from a wart's history */
export function buildProvenance(wart: Wart): ProvenanceEntry[] {
  const chain: ProvenanceEntry[] = [];

  // First entry: mint
  chain.push({
    type: 'mint',
    from: '',
    to: wart.creator,
    price: null,
    timestamp: wart.createdAt,
    txId: wart.id,
  });

  // Transfer history
  for (const transfer of wart.history || []) {
    chain.push({
      type: transfer.price > 0 ? 'sale' : 'transfer',
      from: transfer.from,
      to: transfer.to,
      price: transfer.price > 0 ? transfer.price : null,
      timestamp: transfer.timestamp,
      txId: transfer.txId,
    });
  }

  return chain.sort((a, b) => a.timestamp - b.timestamp);
}

// ─── Price History ────────────────────────────────────────

export interface PricePoint {
  price: number;
  timestamp: number;
  buyer: string;
}

/** Extract price history from transfer records */
export function getPriceHistory(wart: Wart): PricePoint[] {
  return (wart.history || [])
    .filter((t: WartTransfer) => t.price > 0)
    .map((t: WartTransfer) => ({
      price: t.price,
      timestamp: t.timestamp,
      buyer: t.to,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

/** Calculate price statistics */
export function getPriceStats(wart: Wart): {
  lastSalePrice: number | null;
  highestSalePrice: number | null;
  lowestSalePrice: number | null;
  totalSalesVolume: number;
  totalSales: number;
} {
  const history = getPriceHistory(wart);
  if (history.length === 0) {
    return { lastSalePrice: null, highestSalePrice: null, lowestSalePrice: null, totalSalesVolume: 0, totalSales: 0 };
  }
  const prices = history.map(h => h.price);
  return {
    lastSalePrice: prices[prices.length - 1],
    highestSalePrice: Math.max(...prices),
    lowestSalePrice: Math.min(...prices),
    totalSalesVolume: prices.reduce((sum, p) => sum + p, 0),
    totalSales: prices.length,
  };
}

// ─── Related Artworks ─────────────────────────────────────

/** Find related warts by same creator or shared tags */
export function findRelated(wart: Wart, allWarts: Wart[], limit = 6): Wart[] {
  const wartTags = getWartTags(wart.id);
  const scored: Array<{ wart: Wart; score: number }> = [];

  for (const candidate of allWarts) {
    if (candidate.id === wart.id) continue;
    let score = 0;

    // Same creator: strong signal
    if (candidate.creator === wart.creator) score += 10;

    // Same media type
    if (candidate.mediaType === wart.mediaType) score += 3;

    // Same edition type
    if (candidate.editionType === wart.editionType) score += 1;

    // Shared tags
    const candidateTags = getWartTags(candidate.id);
    const sharedTags = wartTags.filter(t => candidateTags.includes(t));
    score += sharedTags.length * 5;

    // Similar price range (within 50%)
    if (wart.price && candidate.price) {
      const ratio = candidate.price / wart.price;
      if (ratio >= 0.5 && ratio <= 2.0) score += 2;
    }

    // Trending boost
    score += computeTrendScore(candidate) * 0.1;

    if (score > 0) scored.push({ wart: candidate, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.wart);
}

// ─── Share Metadata ───────────────────────────────────────

/** Generate Open Graph-style metadata for sharing */
export function getShareMetadata(wart: Wart): {
  title: string;
  description: string;
  url: string;
} {
  const priceText = wart.price ? `${wart.price} STZ` : 'Not for sale';
  return {
    title: `${wart.title} | Strangrz`,
    description: `${wart.description || 'Digital artwork'} — ${priceText} by ${wart.creator.slice(0, 10)}...`,
    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/gallery?detail=${wart.id}`,
  };
}
