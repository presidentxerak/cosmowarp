/**
 * Strangrz Royalty Engine — Enforce and track creator royalties
 *
 * Royalties are set at mint time (0–15%) and enforced on every resale.
 * The platform splits secondary sales automatically:
 *   buyer pays: price + 5% platform fee
 *   seller receives: price - royalty
 *   creator receives: royalty
 *   platform receives: 5% fee
 */

import { storage } from './storage';
import { PRIMARY_MARKET_FEE_PERCENT, SECONDARY_MARKET_FEE_PERCENT } from '../config/constants';

// ─── Constants ────────────────────────────────────────────

export const MIN_ROYALTY_PERCENT = 0;
export const MAX_ROYALTY_PERCENT = 15;
export const DEFAULT_ROYALTY_PERCENT = 5;

// ─── Types ────────────────────────────────────────────────

export interface RoyaltySplit {
  price: number;
  isResale: boolean;
  platformFeePercent: number;
  platformFee: number;
  royaltyPercent: number;
  royaltyAmount: number;
  sellerReceives: number;
  creatorReceives: number;
  buyerPays: number;
}

export interface RoyaltyEarning {
  wartId: string;
  wartTitle: string;
  fromSeller: string;
  toBuyer: string;
  salePrice: number;
  royaltyAmount: number;
  royaltyPercent: number;
  timestamp: number;
  txId: string;
}

// ─── Calculation ──────────────────────────────────────────

/** Calculate the full fee/royalty split for a sale */
export function calculateRoyaltySplit(
  price: number,
  royaltyPercent: number,
  isResale: boolean,
  seller: string,
  creator: string,
): RoyaltySplit {
  const feePercent = isResale ? SECONDARY_MARKET_FEE_PERCENT : PRIMARY_MARKET_FEE_PERCENT;
  const platformFee = Math.round(price * feePercent / 100 * 100) / 100;

  // Royalty only applies on resale (seller !== creator)
  const effectiveRoyalty = (isResale && seller !== creator) ? royaltyPercent : 0;
  const royaltyAmount = Math.round(price * effectiveRoyalty / 100 * 100) / 100;

  const sellerReceives = Math.round((price - royaltyAmount) * 100) / 100;
  const buyerPays = Math.round((price + platformFee) * 100) / 100;

  return {
    price,
    isResale,
    platformFeePercent: feePercent,
    platformFee,
    royaltyPercent: effectiveRoyalty,
    royaltyAmount,
    sellerReceives,
    creatorReceives: royaltyAmount,
    buyerPays,
  };
}

/** Validate royalty percentage at mint time */
export function validateRoyaltyPercent(percent: number): { valid: boolean; error?: string } {
  if (!Number.isFinite(percent)) return { valid: false, error: 'Royalty must be a number' };
  if (percent < MIN_ROYALTY_PERCENT) return { valid: false, error: `Minimum royalty is ${MIN_ROYALTY_PERCENT}%` };
  if (percent > MAX_ROYALTY_PERCENT) return { valid: false, error: `Maximum royalty is ${MAX_ROYALTY_PERCENT}%` };
  return { valid: true };
}

// ─── Royalty Tracking ─────────────────────────────────────

const ROYALTY_EARNINGS_KEY = 'strangrz_royalty_earnings';

/** Record a royalty earning */
export function recordRoyaltyEarning(earning: RoyaltyEarning): void {
  try {
    const raw = storage.getItem(ROYALTY_EARNINGS_KEY);
    const all: RoyaltyEarning[] = raw ? JSON.parse(raw) : [];
    all.unshift(earning);
    storage.setItem(ROYALTY_EARNINGS_KEY, JSON.stringify(all.slice(0, 1000)));
  } catch { /* ignore */ }
}

/** Get royalty earnings for a creator */
export function getCreatorRoyalties(creatorAddress: string): RoyaltyEarning[] {
  try {
    const raw = storage.getItem(ROYALTY_EARNINGS_KEY);
    const all: RoyaltyEarning[] = raw ? JSON.parse(raw) : [];
    return all.filter(e => e.fromSeller !== creatorAddress); // only resale royalties
  } catch { return []; }
}

/** Get total royalty earnings for a creator */
export function getTotalRoyalties(creatorAddress: string): number {
  const earnings = getCreatorRoyalties(creatorAddress);
  return earnings.reduce((sum, e) => sum + e.royaltyAmount, 0);
}

/** Get royalty summary by wart */
export function getRoyaltiesByWart(creatorAddress: string): Map<string, { total: number; count: number }> {
  const earnings = getCreatorRoyalties(creatorAddress);
  const byWart = new Map<string, { total: number; count: number }>();
  for (const e of earnings) {
    const existing = byWart.get(e.wartId) || { total: 0, count: 0 };
    existing.total += e.royaltyAmount;
    existing.count++;
    byWart.set(e.wartId, existing);
  }
  return byWart;
}
