/**
 * Strangrz Search Engine — Full-text search and filtering for Warts
 *
 * Provides client-side search with debouncing, multi-criteria filtering,
 * and tag-based discovery. Designed for integration with MarketplaceView.
 */

import type { Wart } from './warts';
import { storage } from './storage';
import { syncWartTags } from '../lib/supabase-phase2-sync';

// ─── Types ────────────────────────────────────────────────

export type SortMode = 'newest' | 'oldest' | 'price-low' | 'price-high' | 'most-liked' | 'trending';
export type MediaFilter = 'all' | 'image' | 'audio' | 'video' | 'svg' | 'cards';
export type EditionFilter = 'all' | 'unique' | 'limited' | 'unlimited';
export type PriceRange = { min: number | null; max: number | null };

export interface SearchFilters {
  query: string;
  mediaType: MediaFilter;
  editionType: EditionFilter;
  priceRange: PriceRange;
  creator: string | null;
  tags: string[];
  sort: SortMode;
  listedOnly: boolean;
}

export const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  mediaType: 'all',
  editionType: 'all',
  priceRange: { min: null, max: null },
  creator: null,
  tags: [],
  sort: 'newest',
  listedOnly: true,
};

// ─── Tag System ───────────────────────────────────────────

const TAGS_STORAGE_KEY = 'strangrz_wart_tags';
const MAX_TAGS_PER_WART = 5;

/** Load tag map from storage (safe for iOS Safari private mode) */
function loadTags(): Map<string, string[]> {
  try {
    const raw = storage.getItem(TAGS_STORAGE_KEY);
    if (!raw) return new Map();
    const obj = JSON.parse(raw) as Record<string, string[]>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

/** Save tag map to storage */
function saveTags(tags: Map<string, string[]>): void {
  const obj = Object.fromEntries(tags);
  storage.setItem(TAGS_STORAGE_KEY, JSON.stringify(obj));
}

/** Set tags for a wart (max 5, lowercase, trimmed) */
export function setWartTags(wartId: string, tags: string[]): string[] {
  const normalized = tags
    .map(t => t.trim().toLowerCase().replace(/[^a-z0-9-_ ]/g, ''))
    .filter(t => t.length > 0)
    .slice(0, MAX_TAGS_PER_WART);
  const allTags = loadTags();
  allTags.set(wartId, normalized);
  saveTags(allTags);
  syncWartTags(wartId, normalized).catch(() => {});
  return normalized;
}

/** Get tags for a wart */
export function getWartTags(wartId: string): string[] {
  return loadTags().get(wartId) || [];
}

/** Get all unique tags used across all warts */
export function getAllTags(): string[] {
  const allTags = loadTags();
  const unique = new Set<string>();
  for (const tags of allTags.values()) {
    for (const tag of tags) unique.add(tag);
  }
  return [...unique].sort();
}

// ─── Full-Text Search ─────────────────────────────────────

/** Simple token-based full-text search (client-side) */
function matchesQuery(wart: Wart, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(t => t.length > 0);

  const searchable = [
    wart.title,
    wart.description,
    wart.creator,
    wart.owner,
    ...(getWartTags(wart.id)),
  ].join(' ').toLowerCase();

  return tokens.every(token => searchable.includes(token));
}

// ─── Filtering ────────────────────────────────────────────

/** Apply all filters to a wart list */
export function filterWarts(warts: Wart[], filters: SearchFilters): Wart[] {
  let result = warts;

  // Listed only
  if (filters.listedOnly) {
    result = result.filter(w => w.listed && w.price !== null);
  }

  // Text search
  if (filters.query) {
    result = result.filter(w => matchesQuery(w, filters.query));
  }

  // Media type
  if (filters.mediaType !== 'all') {
    result = result.filter(w => (w.mediaType || 'image') === filters.mediaType);
  }

  // Edition type
  if (filters.editionType !== 'all') {
    result = result.filter(w => w.editionType === filters.editionType);
  }

  // Price range
  if (filters.priceRange.min !== null) {
    result = result.filter(w => w.price !== null && w.price >= filters.priceRange.min!);
  }
  if (filters.priceRange.max !== null) {
    result = result.filter(w => w.price !== null && w.price <= filters.priceRange.max!);
  }

  // Creator
  if (filters.creator) {
    result = result.filter(w => w.creator === filters.creator);
  }

  // Tags
  if (filters.tags.length > 0) {
    result = result.filter(w => {
      const wartTags = getWartTags(w.id);
      return filters.tags.some(t => wartTags.includes(t));
    });
  }

  // Sort
  result = sortWarts(result, filters.sort);

  return result;
}

// ─── Sorting ──────────────────────────────────────────────

function sortWarts(warts: Wart[], sort: SortMode): Wart[] {
  const sorted = [...warts];
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => b.createdAt - a.createdAt);
    case 'oldest':
      return sorted.sort((a, b) => a.createdAt - b.createdAt);
    case 'price-low':
      return sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case 'price-high':
      return sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case 'most-liked':
      return sorted.sort((a, b) => (b.likes?.length ?? 0) - (a.likes?.length ?? 0));
    case 'trending':
      return sorted.sort((a, b) => computeTrendScore(b) - computeTrendScore(a));
    default:
      return sorted;
  }
}

// ─── Trending Score ───────────────────────────────────────

/** Time-weighted trending score (higher = more trending) */
export function computeTrendScore(wart: Wart): number {
  const now = Date.now();
  const ageHours = (now - wart.createdAt) / (1000 * 60 * 60);
  const decayFactor = Math.max(0.1, 1 / (1 + ageHours / 24)); // halves every 24h

  const likes = wart.likes?.length ?? 0;
  const comments = wart.comments?.length ?? 0;
  const sales = wart.history?.length ?? 0;

  return (likes * 2 + comments * 3 + sales * 10) * decayFactor;
}

// ─── URL Query Params (shareable filters) ─────────────────

export function filtersToParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.mediaType !== 'all') params.set('media', filters.mediaType);
  if (filters.editionType !== 'all') params.set('edition', filters.editionType);
  if (filters.priceRange.min !== null) params.set('min', String(filters.priceRange.min));
  if (filters.priceRange.max !== null) params.set('max', String(filters.priceRange.max));
  if (filters.creator) params.set('creator', filters.creator);
  if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
  return params;
}

export function paramsToFilters(params: URLSearchParams): SearchFilters {
  return {
    query: params.get('q') || '',
    mediaType: (params.get('media') as MediaFilter) || 'all',
    editionType: (params.get('edition') as EditionFilter) || 'all',
    priceRange: {
      min: params.has('min') ? Number(params.get('min')) : null,
      max: params.has('max') ? Number(params.get('max')) : null,
    },
    creator: params.get('creator') || null,
    tags: params.get('tags')?.split(',').filter(Boolean) || [],
    sort: (params.get('sort') as SortMode) || 'newest',
    listedOnly: true,
  };
}
