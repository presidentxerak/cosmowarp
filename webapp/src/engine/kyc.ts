/**
 * Strangrz KYC/AML Compliance Layer
 *
 * Tiered verification:
 *   - none:  unverified, max €500 transactions
 *   - basic: email + name verified, max €5,000
 *   - full:  ID document verified, unlimited
 *
 * Integrates with Stripe Identity (or Onfido/Jumio) for ID verification.
 * The actual verification is done server-side; this module manages
 * the client-side state and enforcement.
 */

import { storage } from './storage';
import { supabase, isBackendAvailable } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────

export type KYCLevel = 'none' | 'basic' | 'full';
export type KYCStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

export interface KYCState {
  address: string;
  level: KYCLevel;
  status: KYCStatus;
  submittedAt: number | null;
  approvedAt: number | null;
  rejectedReason: string | null;
  /** Email verified (basic KYC) */
  emailVerified: boolean;
  /** ID document verified (full KYC) */
  idVerified: boolean;
}

// ─── Limits by KYC Level ──────────────────────────────────

export const KYC_LIMITS: Record<KYCLevel, { maxSingleTx: number; maxMonthlyVolume: number; label: string }> = {
  none:  { maxSingleTx: 500,    maxMonthlyVolume: 500,    label: 'Unverified (max €500)' },
  basic: { maxSingleTx: 5000,   maxMonthlyVolume: 5000,   label: 'Basic KYC (max €5,000)' },
  full:  { maxSingleTx: Infinity, maxMonthlyVolume: Infinity, label: 'Fully Verified (unlimited)' },
};

// ─── Storage ──────────────────────────────────────────────

const KYC_KEY = 'strangrz_kyc_state';

function loadKYC(address: string): KYCState {
  try {
    const raw = storage.getItem(`${KYC_KEY}_${address}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    address,
    level: 'none',
    status: 'not_started',
    submittedAt: null,
    approvedAt: null,
    rejectedReason: null,
    emailVerified: false,
    idVerified: false,
  };
}

function saveKYC(state: KYCState): void {
  storage.setItem(`${KYC_KEY}_${state.address}`, JSON.stringify(state));
}

// ─── Public API ───────────────────────────────────────────

/** Get KYC state for an address */
export function getKYCState(address: string): KYCState {
  return loadKYC(address);
}

/** Get the transaction limits for an address based on KYC level */
export function getTransactionLimits(address: string): { maxSingleTx: number; maxMonthlyVolume: number } {
  const state = loadKYC(address);
  return KYC_LIMITS[state.level];
}

/**
 * Check if a transaction is allowed under KYC limits.
 * Returns { allowed: true } or { allowed: false, reason: '...' }
 */
export function checkTransactionAllowed(
  address: string,
  amountEUR: number,
  monthlyVolumeEUR = 0,
): { allowed: boolean; reason?: string; requiredLevel?: KYCLevel } {
  const state = loadKYC(address);
  const limits = KYC_LIMITS[state.level];

  if (amountEUR > limits.maxSingleTx) {
    const requiredLevel: KYCLevel = amountEUR > KYC_LIMITS.basic.maxSingleTx ? 'full' : 'basic';
    return {
      allowed: false,
      reason: `Transaction of €${amountEUR} exceeds your ${limits.label} limit of €${limits.maxSingleTx}. Upgrade to ${requiredLevel} verification.`,
      requiredLevel,
    };
  }

  if (monthlyVolumeEUR + amountEUR > limits.maxMonthlyVolume) {
    const requiredLevel: KYCLevel = (monthlyVolumeEUR + amountEUR) > KYC_LIMITS.basic.maxMonthlyVolume ? 'full' : 'basic';
    return {
      allowed: false,
      reason: `Monthly volume would exceed your ${limits.label} limit of €${limits.maxMonthlyVolume}. Upgrade to ${requiredLevel} verification.`,
      requiredLevel,
    };
  }

  return { allowed: true };
}

/** Complete basic KYC (email verification) */
export function completeBasicKYC(address: string): KYCState {
  const state = loadKYC(address);
  state.emailVerified = true;
  state.level = 'basic';
  state.status = 'approved';
  state.approvedAt = Date.now();
  saveKYC(state);
  syncKYCToCloud(state);
  return state;
}

/** Submit full KYC (ID verification request) */
export function submitFullKYC(address: string): KYCState {
  const state = loadKYC(address);
  state.status = 'pending';
  state.submittedAt = Date.now();
  saveKYC(state);
  syncKYCToCloud(state);
  return state;
}

/** Approve full KYC (admin action) */
export function approveFullKYC(address: string): KYCState {
  const state = loadKYC(address);
  state.idVerified = true;
  state.level = 'full';
  state.status = 'approved';
  state.approvedAt = Date.now();
  state.rejectedReason = null;
  saveKYC(state);
  syncKYCToCloud(state);
  return state;
}

/** Reject full KYC (admin action) */
export function rejectFullKYC(address: string, reason: string): KYCState {
  const state = loadKYC(address);
  state.status = 'rejected';
  state.rejectedReason = reason;
  saveKYC(state);
  syncKYCToCloud(state);
  return state;
}

// ─── Supabase Sync ────────────────────────────────────────

function syncKYCToCloud(state: KYCState): void {
  if (!isBackendAvailable() || !supabase) return;
  supabase.from('profiles').update({
    kyc_level: state.level,
    kyc_status: state.status,
    kyc_submitted_at: state.submittedAt,
    kyc_approved_at: state.approvedAt,
  }).eq('address', state.address).then(() => {}, () => {});
}

/** Pull KYC state from Supabase (for cross-device sync) */
export async function pullKYCState(address: string): Promise<KYCState | null> {
  if (!isBackendAvailable() || !supabase) return null;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('kyc_level, kyc_status, kyc_submitted_at, kyc_approved_at')
      .eq('address', address)
      .single();
    if (!data) return null;
    const state = loadKYC(address);
    if (data.kyc_level) state.level = data.kyc_level as KYCLevel;
    if (data.kyc_status) state.status = data.kyc_status as KYCStatus;
    if (data.kyc_submitted_at) state.submittedAt = data.kyc_submitted_at;
    if (data.kyc_approved_at) state.approvedAt = data.kyc_approved_at;
    state.emailVerified = state.level !== 'none';
    state.idVerified = state.level === 'full';
    saveKYC(state);
    return state;
  } catch { return null; }
}
