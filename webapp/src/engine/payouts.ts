/**
 * Strangrz Payout Engine — Payout management, history, and scheduling
 *
 * Tracks payout history, supports auto/manual payout modes,
 * and provides a dashboard for sellers to view their earnings.
 */

import { storage } from './storage';
import { supabase, isBackendAvailable } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type PayoutSchedule = 'auto' | 'daily' | 'weekly' | 'manual';

export interface PayoutRecord {
  id: string;
  sellerAddress: string;
  amount: number;          // fiat amount
  currency: string;
  stzAmount: number;       // STZ equivalent
  status: PayoutStatus;
  stripeTransferId?: string;
  wartId?: string;
  createdAt: number;
  completedAt?: number;
  error?: string;
}

export interface PayoutSettings {
  schedule: PayoutSchedule;
  minimumPayout: number;   // minimum fiat amount to trigger auto-payout
  currency: string;
}

export interface SellerEarnings {
  totalEarned: number;     // total fiat earned (all time)
  totalPaid: number;       // total fiat paid out
  pendingBalance: number;  // fiat waiting for payout
  payoutCount: number;
  lastPayout: PayoutRecord | null;
  history: PayoutRecord[];
}

// ─── Storage ──────────────────────────────────────────────

const PAYOUT_HISTORY_KEY = 'strangrz_payout_history';
const PAYOUT_SETTINGS_KEY = 'strangrz_payout_settings';

const DEFAULT_SETTINGS: PayoutSettings = {
  schedule: 'auto',
  minimumPayout: 10,  // €10 minimum
  currency: 'EUR',
};

// ─── Payout History ───────────────────────────────────────

export function getPayoutHistory(sellerAddress: string): PayoutRecord[] {
  try {
    const raw = storage.getItem(PAYOUT_HISTORY_KEY);
    const all: PayoutRecord[] = raw ? JSON.parse(raw) : [];
    return all
      .filter(p => p.sellerAddress === sellerAddress)
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch { return []; }
}

export function addPayoutRecord(record: PayoutRecord): void {
  try {
    const raw = storage.getItem(PAYOUT_HISTORY_KEY);
    const all: PayoutRecord[] = raw ? JSON.parse(raw) : [];
    all.unshift(record);
    storage.setItem(PAYOUT_HISTORY_KEY, JSON.stringify(all.slice(0, 500)));
  } catch { /* ignore */ }

  // Sync to Supabase
  if (isBackendAvailable() && supabase) {
    supabase.from('fiat_transactions').upsert({
      tx_id: record.id,
      buyer_address: record.sellerAddress,
      seller_address: record.sellerAddress,
      fiat_amount: record.amount,
      fiat_currency: record.currency,
      stz_amount: record.stzAmount,
      status: record.status,
      processor_ref: record.stripeTransferId || null,
      tx_type: 'payout',
      created_at: record.createdAt,
      updated_at: Date.now(),
    }, { onConflict: 'tx_id' }).then(() => {}, () => {});
  }
}

// ─── Payout Settings ──────────────────────────────────────

export function getPayoutSettings(sellerAddress: string): PayoutSettings {
  try {
    const raw = storage.getItem(`${PAYOUT_SETTINGS_KEY}_${sellerAddress}`);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export function setPayoutSettings(sellerAddress: string, settings: Partial<PayoutSettings>): PayoutSettings {
  const current = getPayoutSettings(sellerAddress);
  const updated = { ...current, ...settings };
  storage.setItem(`${PAYOUT_SETTINGS_KEY}_${sellerAddress}`, JSON.stringify(updated));
  return updated;
}

// ─── Seller Earnings ──────────────────────────────────────

export function getSellerEarnings(sellerAddress: string): SellerEarnings {
  const history = getPayoutHistory(sellerAddress);
  const completed = history.filter(p => p.status === 'completed');
  const totalPaid = completed.reduce((sum, p) => sum + p.amount, 0);
  const totalEarned = history.reduce((sum, p) => sum + p.amount, 0);
  const pendingBalance = totalEarned - totalPaid;

  return {
    totalEarned: Math.round(totalEarned * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    pendingBalance: Math.round(pendingBalance * 100) / 100,
    payoutCount: completed.length,
    lastPayout: completed[0] || null,
    history,
  };
}

// ─── Request Manual Payout ────────────────────────────────

/**
 * Request a manual payout via the API.
 * The API endpoint verifies the Stripe Connect account and initiates transfer.
 */
export async function requestPayout(
  sellerAddress: string,
  amount: number,
  currency: string,
): Promise<{ success: boolean; error?: string; payoutId?: string }> {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const payoutSecret = import.meta.env.VITE_PAYOUT_SECRET || '';

  if (!apiUrl) return { success: false, error: 'API not configured' };

  try {
    const resp = await fetch(`${apiUrl}/api/payouts/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${payoutSecret}`,
      },
      body: JSON.stringify({
        warpAmount: amount * 10, // convert fiat to STZ (rough)
        currency,
        sellerAddress,
        paymentMethod: 'bank_transfer',
      }),
    });

    const data = await resp.json();
    if (!resp.ok) return { success: false, error: data.error || 'Payout failed' };

    const record: PayoutRecord = {
      id: data.txId,
      sellerAddress,
      amount: data.fiatAmount || amount,
      currency,
      stzAmount: data.warpAmount || amount * 10,
      status: data.status === 'completed' ? 'completed' : 'processing',
      stripeTransferId: data.payoutId,
      createdAt: Date.now(),
      completedAt: data.status === 'completed' ? Date.now() : undefined,
    };
    addPayoutRecord(record);

    return { success: true, payoutId: data.txId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Request failed' };
  }
}

/** Pull payout history from Supabase */
export async function pullPayoutHistory(sellerAddress: string): Promise<PayoutRecord[]> {
  if (!isBackendAvailable() || !supabase) return [];
  try {
    const { data } = await supabase
      .from('fiat_transactions')
      .select('*')
      .eq('seller_address', sellerAddress)
      .eq('tx_type', 'payout')
      .order('created_at', { ascending: false })
      .limit(100);
    if (!data) return [];
    return data.map((r: Record<string, unknown>) => ({
      id: r.tx_id as string,
      sellerAddress: r.seller_address as string,
      amount: Number(r.fiat_amount),
      currency: r.fiat_currency as string,
      stzAmount: Number(r.stz_amount),
      status: r.status as PayoutStatus,
      stripeTransferId: r.processor_ref as string | undefined,
      createdAt: Number(r.created_at),
      completedAt: r.updated_at ? Number(r.updated_at) : undefined,
    }));
  } catch { return []; }
}
