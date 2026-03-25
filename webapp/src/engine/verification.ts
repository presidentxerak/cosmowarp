/**
 * Strangrz Creator Verification — Badge system and creator stats
 *
 * Verification levels:
 *   - unverified: default state
 *   - verified: admin-approved badge
 *   - featured: highlighted on Discover page
 *
 * Creator stats computed from wart data for portfolio page.
 */

import { storage } from './storage';
import { supabase, isBackendAvailable } from '../lib/supabase';
import type { Wart } from './warts';

// ─── Types ────────────────────────────────────────────────

export type VerificationStatus = 'unverified' | 'verified' | 'featured';

export interface VerifiedCreator {
  address: string;
  status: VerificationStatus;
  verifiedAt: number;
  verifiedBy: string;  // admin address
  reason: string;      // why they were verified
}

export interface CreatorStats {
  address: string;
  totalArtworks: number;
  totalSales: number;
  totalVolume: number;
  totalCollectors: number;  // unique buyers
  avgSalePrice: number;
  topSalePrice: number;
  followerCount: number;
}

// ─── Storage ──────────────────────────────────────────────

const VERIFIED_KEY = 'strangrz_verified_creators';

function loadVerified(): Map<string, VerifiedCreator> {
  try {
    const raw = storage.getItem(VERIFIED_KEY);
    if (!raw) return new Map();
    const arr: VerifiedCreator[] = JSON.parse(raw);
    return new Map(arr.map(v => [v.address, v]));
  } catch { return new Map(); }
}

function saveVerified(verified: Map<string, VerifiedCreator>): void {
  storage.setItem(VERIFIED_KEY, JSON.stringify([...verified.values()]));
}

// ─── Verification Engine ──────────────────────────────────

/** Check if a creator is verified */
export function isVerified(address: string): boolean {
  return loadVerified().has(address);
}

/** Get verification status for a creator */
export function getVerification(address: string): VerifiedCreator | null {
  return loadVerified().get(address) || null;
}

/** Get all verified creators */
export function getAllVerified(): VerifiedCreator[] {
  return [...loadVerified().values()];
}

/**
 * Verify a creator (admin-only action).
 * Syncs to Supabase profiles table.
 */
export async function verifyCreator(
  address: string,
  adminAddress: string,
  status: VerificationStatus = 'verified',
  reason = '',
): Promise<boolean> {
  const verified = loadVerified();
  verified.set(address, {
    address,
    status,
    verifiedAt: Date.now(),
    verifiedBy: adminAddress,
    reason,
  });
  saveVerified(verified);

  // Sync to Supabase
  if (isBackendAvailable() && supabase) {
    try {
      await supabase.from('profiles').update({
        is_verified: true,
        verification_status: status,
        verified_at: Date.now(),
        verified_by: adminAddress,
      }).eq('address', address);
    } catch { /* non-critical */ }
  }

  return true;
}

/** Revoke verification (admin-only) */
export async function revokeVerification(address: string): Promise<boolean> {
  const verified = loadVerified();
  if (!verified.has(address)) return false;
  verified.delete(address);
  saveVerified(verified);

  if (isBackendAvailable() && supabase) {
    try {
      await supabase.from('profiles').update({
        is_verified: false,
        verification_status: 'unverified',
        verified_at: null,
        verified_by: null,
      }).eq('address', address);
    } catch { /* non-critical */ }
  }

  return true;
}

// ─── Creator Stats ────────────────────────────────────────

/** Compute creator stats from their artworks */
export function computeCreatorStats(address: string, allWarts: Wart[], followerCount = 0): CreatorStats {
  const myWarts = allWarts.filter(w => w.creator === address);
  const collectors = new Set<string>();
  let totalSales = 0;
  let totalVolume = 0;
  let topSale = 0;

  for (const wart of myWarts) {
    for (const transfer of wart.history || []) {
      if (transfer.price > 0 && transfer.from === address) {
        totalSales++;
        totalVolume += transfer.price;
        topSale = Math.max(topSale, transfer.price);
        collectors.add(transfer.to);
      }
    }
    // Also count current owner if different from creator
    if (wart.owner !== address) {
      collectors.add(wart.owner);
    }
  }

  return {
    address,
    totalArtworks: myWarts.length,
    totalSales,
    totalVolume,
    totalCollectors: collectors.size,
    avgSalePrice: totalSales > 0 ? Math.round(totalVolume / totalSales) : 0,
    topSalePrice: topSale,
    followerCount,
  };
}

/** Get featured creators (for Discover page spotlight) */
export function getFeatured(): VerifiedCreator[] {
  return getAllVerified().filter(v => v.status === 'featured');
}
