/**
 * Strangrz — Sync Engine
 *
 * Bridges localStorage (fast local cache) with Supabase (persistent cloud storage).
 * Strategy:
 *   - Writes go to BOTH localStorage and Supabase (write-through)
 *   - Reads prefer localStorage, with Supabase as fallback/source of truth
 *   - On login, pull latest data from Supabase into localStorage
 *   - Realtime subscriptions keep data fresh across devices
 */

import { isBackendAvailable } from './supabase';
import * as db from './supabase-db';
import * as media from './supabase-storage';
import type { WarpWallet, Transaction } from '../engine/wallet';
import type { Wart, WartCertificate, WartComment, WartTransfer } from '../engine/warts';
import type { UserProfile } from '../engine/social';

// ─── Sync Status ─────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

let syncStatus: SyncStatus = 'idle';
const syncListeners: Set<(status: SyncStatus) => void> = new Set();

function setSyncStatus(s: SyncStatus) {
  syncStatus = s;
  syncListeners.forEach(fn => fn(s));
}

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

export function onSyncStatusChange(fn: (status: SyncStatus) => void): () => void {
  syncListeners.add(fn);
  return () => syncListeners.delete(fn);
}

// ─── Profile Sync ────────────────────────────────────────────

/**
 * Sync a wallet profile to Supabase (after create, update, or transaction).
 */
export async function syncProfile(wallet: WarpWallet): Promise<void> {
  if (!isBackendAvailable()) return;
  setSyncStatus('syncing');
  try {
    await db.upsertProfile(wallet);
    setSyncStatus('idle');
  } catch {
    setSyncStatus('error');
  }
}

/**
 * Pull profile from Supabase (on login, to get cloud balance/state).
 * Returns the cloud version if it exists and is newer.
 */
export async function pullProfile(address: string): Promise<WarpWallet | null> {
  if (!isBackendAvailable()) return null;
  return db.fetchProfile(address);
}

// ─── Wart Sync ───────────────────────────────────────────────

/**
 * Sync a newly minted or updated wart to Supabase + upload media.
 * Retries once on failure to ensure global visibility.
 */
export async function syncWart(wart: Wart): Promise<void> {
  if (!isBackendAvailable()) {
    // Queue for later sync when backend becomes available
    queuePendingSync('wart', wart.id);
    return;
  }
  setSyncStatus('syncing');
  try {
    // Upload media to Supabase Storage
    const mediaPath = await media.uploadMedia(wart.imageData, wart.id, 'main');
    const audioCoverPath = wart.audioCover
      ? await media.uploadMedia(wart.audioCover, wart.id, 'cover')
      : undefined;

    // Upsert wart metadata to database
    await db.upsertWart(wart, mediaPath || undefined, audioCoverPath || undefined);

    if (!mediaPath) {
      console.warn('[Sync] Media upload failed for wart', wart.id, '— metadata saved without remote media');
    }
    setSyncStatus('idle');
  } catch (err) {
    console.error('[Sync] syncWart failed:', err instanceof Error ? err.message : err);
    setSyncStatus('error');
    // Retry once after 2 seconds
    setTimeout(async () => {
      if (!isBackendAvailable()) return;
      try {
        const mediaPath = await media.uploadMedia(wart.imageData, wart.id, 'main');
        const audioCoverPath = wart.audioCover
          ? await media.uploadMedia(wart.audioCover, wart.id, 'cover')
          : undefined;
        await db.upsertWart(wart, mediaPath || undefined, audioCoverPath || undefined);
        setSyncStatus('idle');
      } catch {
        // Silent retry failure — will sync on next full sync
      }
    }, 2000);
  }
}

// ─── Pending Sync Queue ─────────────────────────────────────

const PENDING_SYNC_KEY = 'strangrz_pending_syncs';

function queuePendingSync(type: string, id: string): void {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY) || '[]';
    const queue: Array<{ type: string; id: string; ts: number }> = JSON.parse(raw);
    if (!queue.some(q => q.type === type && q.id === id)) {
      queue.push({ type, id, ts: Date.now() });
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue.slice(-50)));
    }
  } catch { /* ignore */ }
}

/**
 * Sync wart state update (list, delist, transfer) — metadata only.
 */
export async function syncWartMetadata(wart: Wart): Promise<void> {
  if (!isBackendAvailable()) return;
  try {
    await db.upsertWart(wart);
  } catch {
    // Non-critical — will re-sync next time
  }
}

/**
 * Delete a wart from Supabase.
 */
export async function syncWartDelete(wartId: string): Promise<void> {
  if (!isBackendAvailable()) return;
  try {
    await db.deleteWartRemote(wartId);
    // Delete known media paths (Supabase Storage doesn't support glob patterns)
    await Promise.allSettled([
      media.deleteMedia(`warts/${wartId}/main`),
      media.deleteMedia(`warts/${wartId}/cover`),
    ]);
  } catch (err) {
    console.error('[Sync] syncWartDelete failed:', err instanceof Error ? err.message : err);
  }
}

/**
 * Pull all warts from Supabase (marketplace sync).
 * Returns wart metadata rows — media must be fetched separately.
 */
export async function pullWarts(filters?: {
  listed?: boolean;
  owner?: string;
  creator?: string;
}): Promise<Record<string, unknown>[]> {
  if (!isBackendAvailable()) return [];
  return db.fetchWarts(filters);
}

/**
 * Pull a single wart with its media data.
 */
export async function pullWartWithMedia(wartId: string): Promise<Wart | null> {
  if (!isBackendAvailable()) return null;

  const row = await db.fetchWartById(wartId);
  if (!row) return null;

  // Download media
  let imageData = '';
  if (row.media_path) {
    imageData = await media.downloadMediaAsDataUrl(row.media_path as string) || '';
  }

  let audioCover: string | undefined;
  if (row.audio_cover_path) {
    audioCover = await media.downloadMediaAsDataUrl(row.audio_cover_path as string) || undefined;
  }

  const wart = db.rowToWart(row, imageData, audioCover);

  // Fetch history and comments
  wart.history = await db.fetchWartHistory(wartId);
  wart.comments = await db.fetchComments(wartId);

  return wart;
}

// ─── Transaction Sync ────────────────────────────────────────

/**
 * Sync a transaction to Supabase.
 */
export async function syncTransaction(tx: Transaction): Promise<void> {
  if (!isBackendAvailable()) return;
  try {
    await db.insertTransaction(tx);
  } catch {
    // Non-critical
  }
}

/**
 * Pull global transaction feed from Supabase.
 */
export async function pullTransactions(limit = 200): Promise<Transaction[]> {
  if (!isBackendAvailable()) return [];
  return db.fetchTransactions(limit);
}

/**
 * Pull transactions for a specific address.
 */
export async function pullUserTransactions(address: string, limit = 100): Promise<Transaction[]> {
  if (!isBackendAvailable()) return [];
  return db.fetchTransactionsForAddress(address, limit);
}

// ─── Certificate Sync ────────────────────────────────────────

export async function syncCertificate(cert: WartCertificate): Promise<void> {
  if (!isBackendAvailable()) return;
  try {
    await db.insertCertificate(cert);
  } catch {
    // Non-critical
  }
}

// ─── Comment Sync ────────────────────────────────────────────

export async function syncComment(wartId: string, comment: WartComment): Promise<void> {
  if (!isBackendAvailable()) return;
  try {
    await db.insertComment(wartId, comment);
  } catch {
    // Non-critical
  }
}

// ─── Transfer History Sync ───────────────────────────────────

export async function syncTransferHistory(wartId: string, transfer: WartTransfer): Promise<void> {
  if (!isBackendAvailable()) return;
  try {
    await db.insertWartHistory(wartId, transfer);
  } catch {
    // Non-critical
  }
}

// ─── Social Sync ─────────────────────────────────────────────

export async function syncSocialProfile(profile: UserProfile): Promise<void> {
  if (!isBackendAvailable()) return;
  try {
    await db.upsertSocialProfile(profile);
  } catch {
    // Non-critical
  }
}

export async function syncFollow(follower: string, following: string): Promise<void> {
  if (!isBackendAvailable()) return;
  try {
    await db.insertFollow(follower, following);
    // Notify the followed user
    await db.insertNotification({
      recipient: following,
      sender: follower,
      notif_type: 'follow',
      title: 'New follower',
      body: `${follower.slice(0, 10)}... started following you`,
      ref_id: null,
    });
  } catch {
    // Non-critical
  }
}

export async function syncUnfollow(follower: string, following: string): Promise<void> {
  if (!isBackendAvailable()) return;
  try {
    await db.deleteFollow(follower, following);
  } catch {
    // Non-critical
  }
}

// ─── Notification Sync ───────────────────────────────────────

export async function syncNotification(params: {
  recipient: string;
  sender: string | null;
  type: string;
  title: string;
  body?: string;
  refId?: string;
}): Promise<void> {
  if (!isBackendAvailable()) return;
  try {
    await db.insertNotification({
      recipient: params.recipient,
      sender: params.sender,
      notif_type: params.type,
      title: params.title,
      body: params.body || '',
      ref_id: params.refId || null,
    });
  } catch {
    // Non-critical
  }
}

export async function pullNotifications(address: string): Promise<db.Notification[]> {
  if (!isBackendAvailable()) return [];
  return db.fetchNotifications(address);
}

export async function markNotifRead(notifId: number): Promise<void> {
  if (!isBackendAvailable()) return;
  await db.markNotificationRead(notifId);
}

// ─── Atomic Operations ───────────────────────────────────────

/**
 * Atomic balance transfer via Supabase RPC.
 * This ensures consistency across concurrent users.
 */
export async function atomicTransfer(from: string, to: string, amount: number): Promise<boolean> {
  return db.atomicTransfer(from, to, amount);
}

/**
 * Atomic wart purchase via Supabase RPC.
 */
export async function atomicPurchaseWart(params: {
  wartId: string;
  buyer: string;
  price: number;
  royaltyAmount: number;
  creator: string;
  seller: string;
  txId: string;
}): Promise<boolean> {
  return db.atomicPurchaseWart(params);
}

// ─── Full Sync (on login) ────────────────────────────────────

/**
 * Perform a full sync on login:
 * 1. Pull cloud profile (balance, level, etc.)
 * 2. Pull user's transactions
 * 3. Pull user's warts
 * Returns the cloud profile if found.
 */
export async function fullSync(address: string): Promise<{
  profile: WarpWallet | null;
  transactions: Transaction[];
  warts: Record<string, unknown>[];
} | null> {
  if (!isBackendAvailable()) return null;
  setSyncStatus('syncing');

  try {
    const [profile, transactions, ownedWarts, createdWarts] = await Promise.all([
      db.fetchProfile(address),
      db.fetchTransactionsForAddress(address, 200),
      db.fetchWarts({ owner: address }),
      db.fetchWarts({ creator: address }),
    ]);

    // Merge owned + created (deduplicate by ID)
    const wartMap = new Map<string, Record<string, unknown>>();
    for (const w of [...ownedWarts, ...createdWarts]) {
      wartMap.set(w.id as string, w);
    }

    setSyncStatus('idle');
    return {
      profile,
      transactions,
      warts: Array.from(wartMap.values()),
    };
  } catch {
    setSyncStatus('error');
    return null;
  }
}
