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
    // 1. Upsert metadata FIRST (ensures DB record exists even if media upload fails)
    await db.upsertWart(wart, undefined, undefined);

    // 2. Upload media to Supabase Storage (primary CDN)
    const mediaPath = await media.uploadMedia(wart.imageData, wart.id, 'main');
    const audioCoverPath = wart.audioCover
      ? await media.uploadMedia(wart.audioCover, wart.id, 'cover')
      : undefined;

    // 3. Replicate to IPFS + Arweave (non-blocking, best-effort)
    // These provide decentralized (IPFS) and permanent (Arweave) storage.
    replicateToDecentralizedStorage(wart).catch(() => {});

    // 4. Update DB row with media paths if upload succeeded
    if (mediaPath) {
      await db.upsertWart(wart, mediaPath, audioCoverPath || undefined);
    } else {
      console.warn('[Sync] Media upload failed for wart', wart.id, '— metadata saved without remote media');
      // Queue for re-upload on next sync
      queuePendingSync('wart', wart.id);
    }
    setSyncStatus('idle');
  } catch (err) {
    console.error('[Sync] syncWart failed:', err instanceof Error ? err.message : err);
    setSyncStatus('error');
    queuePendingSync('wart', wart.id);
    // Retry once after 3 seconds with exponential backoff
    setTimeout(async () => {
      if (!isBackendAvailable()) return;
      try {
        await db.upsertWart(wart, undefined, undefined);
        const mediaPath = await media.uploadMedia(wart.imageData, wart.id, 'main');
        const audioCoverPath = wart.audioCover
          ? await media.uploadMedia(wart.audioCover, wart.id, 'cover')
          : undefined;
        if (mediaPath) await db.upsertWart(wart, mediaPath, audioCoverPath || undefined);
        setSyncStatus('idle');
      } catch (retryErr) {
        console.error('[Sync] syncWart retry failed:', retryErr instanceof Error ? retryErr.message : retryErr);
      }
    }, 3000);
  }
}

// ─── Decentralized Storage Replication ───────────────────────

/**
 * Replicate artwork media to IPFS and Arweave for permanent decentralized storage.
 * Called after a sale — the buyer's fees cover the storage costs.
 *
 * Model C (hybrid):
 *   - IPFS: pinned via configured pinning service (platform-side)
 *   - Arweave: uploaded via server API (platform wallet pays, ~€0.02/5MB)
 *     OR via browser Irys SDK if buyer has wallet connected
 *
 * Best-effort: failures don't block the sale flow.
 */
async function replicateToDecentralizedStorage(wart: Wart): Promise<void> {
  if (!wart.imageData) return;

  // IPFS replication (via storage layer provider)
  try {
    const { getStrangrzEngine } = await import('../engine/vobjct');
    const engine = getStrangrzEngine();
    const storageLayer = engine.getStorageLayer();
    const path = `warts/${wart.id}/main`;

    const ipfsProvider = storageLayer.getProvider('ipfs');
    if (ipfsProvider) {
      try {
        const locator = await ipfsProvider.upload(wart.imageData, path);
        if (locator) {
          console.log(`[Sync] Replicated wart ${wart.id} to IPFS: ${locator}`);
        }
      } catch (err) {
        console.warn(`[Sync] IPFS replication failed for wart ${wart.id}:`, err);
      }
    }
  } catch {
    // Strangrz engine not available — skip IPFS replication
  }

  // Arweave replication via server API (platform wallet pays)
  try {
    const { uploadViaServer } = await import('./irys');
    const result = await uploadViaServer(wart.imageData, wart.id);
    console.log(`[Sync] Replicated wart ${wart.id} to Arweave: ${result.locator} (${result.sizeBytes} bytes)`);
  } catch (err) {
    console.warn(`[Sync] Arweave server replication failed for wart ${wart.id}:`, err);
  }
}

/**
 * Upload artwork to Arweave via browser Irys SDK (buyer pays directly).
 * Used for crypto purchases where the buyer has a wallet connected.
 * Returns the ar:// locator on success, null on failure.
 */
export async function replicateToArweaveViaBrowser(wart: Wart): Promise<string | null> {
  if (!wart.imageData) return null;

  try {
    const { createBrowserUploader, uploadDataUrlFromBrowser } = await import('./irys');
    const uploader = await createBrowserUploader();

    // Check price first
    const { dataUrlToBytes } = await import('./irys');
    const { bytes } = dataUrlToBytes(wart.imageData);

    // Files < 100KB are free on Irys
    if (bytes.length >= 100 * 1024) {
      const { estimatePrice, fundFromBrowser, getBrowserBalance } = await import('./irys');
      const price = await estimatePrice(uploader, bytes.length);
      const balance = await getBrowserBalance(uploader);

      // Fund if needed
      if (parseFloat(balance.standard) < parseFloat(price.standard)) {
        await fundFromBrowser(uploader, price.standard);
      }
    }

    const result = await uploadDataUrlFromBrowser(uploader, wart.imageData, wart.id);
    console.log(`[Sync] Buyer uploaded wart ${wart.id} to Arweave: ${result.locator} (${result.sizeBytes} bytes)`);
    return result.locator;
  } catch (err) {
    console.warn(`[Sync] Browser Arweave upload failed for wart ${wart.id}:`, err);
    return null;
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
 * Process pending syncs queued while offline.
 * Called on fullSync to retry any operations that failed due to connectivity.
 * @param getWart - callback to retrieve a wart from the local WartEngine
 */
export async function processPendingSync(
  getWart?: (id: string) => Wart | undefined,
): Promise<number> {
  if (!isBackendAvailable()) return 0;
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return 0;
    const queue: Array<{ type: string; id: string; ts: number }> = JSON.parse(raw);
    if (queue.length === 0) return 0;

    let processed = 0;
    const remaining: typeof queue = [];

    for (const item of queue) {
      try {
        if (item.type === 'wart') {
          // Check if already synced to cloud
          const existing = await db.fetchWartById(item.id);
          if (existing?.media_path) {
            // Already in cloud with media — skip
            processed++;
            continue;
          }
          // Get local wart data (with imageData) and re-sync
          const localWart = getWart?.(item.id);
          if (localWart) {
            const mediaPath = localWart.imageData
              ? await media.uploadMedia(localWart.imageData, localWart.id, 'main')
              : null;
            const audioCoverPath = localWart.audioCover
              ? await media.uploadMedia(localWart.audioCover, localWart.id, 'cover')
              : undefined;
            await db.upsertWart(localWart, mediaPath || undefined, audioCoverPath || undefined);
            processed++;
          } else {
            // Wart no longer exists locally — discard from queue
            processed++;
          }
        }
        // Add more types here as needed
      } catch {
        remaining.push(item); // Keep for next retry
      }
    }

    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
    return processed;
  } catch { return 0; }
}

/**
 * Sync a lazy listing template — metadata only, NO media upload.
 * Media stays local until a buyer purchases and pays the storage fee.
 * This ensures the platform never pays for storage — the collector does.
 */
/**
 * Sync a newly minted wart with only a compressed preview thumbnail.
 * Full media stays on the creator's device and is only uploaded when sold.
 * This dramatically reduces storage costs for unsold artworks (~99% savings).
 */
export async function syncWartWithPreview(wart: Wart): Promise<void> {
  if (!isBackendAvailable()) {
    queuePendingSync('wart', wart.id);
    return;
  }
  setSyncStatus('syncing');
  try {
    // 1. Generate a compressed thumbnail preview (~30-100 KB vs up to 50 MB)
    const { generatePreview, uploadPreview } = await import('./supabase-storage');
    const preview = await generatePreview(wart.imageData, wart.audioCover);
    let previewPath: string | undefined;

    if (preview) {
      previewPath = await uploadPreview(preview, wart.id) || undefined;
    }

    // 2. Upsert metadata with preview path only — NO full media upload
    await db.upsertWart(wart, undefined, undefined, previewPath);
    setSyncStatus('idle');
  } catch (err) {
    console.error('[Sync] syncWartWithPreview failed:', err instanceof Error ? err.message : err);
    setSyncStatus('error');
    queuePendingSync('wart', wart.id);
  }
}

export async function syncLazyTemplate(wart: Wart): Promise<void> {
  if (!isBackendAvailable()) {
    queuePendingSync('wart', wart.id);
    return;
  }
  try {
    // Upsert metadata WITHOUT uploading media to Supabase Storage.
    // The media_path will be null — indicating no cloud media yet.
    await db.upsertWart(wart, undefined, undefined);
  } catch {
    // Non-critical — will re-sync on next visit
  }
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
 * Verifies SHA-256 integrity if contentFingerprint is available.
 */
export async function pullWartWithMedia(wartId: string): Promise<Wart | null> {
  if (!isBackendAvailable()) return null;

  const row = await db.fetchWartById(wartId);
  if (!row) return null;

  // Download media — prefer full quality, fall back to preview thumbnail
  let imageData = '';
  if (row.media_path) {
    imageData = await media.downloadMediaAsDataUrl(row.media_path as string) || '';
  }
  if (!imageData && row.preview_path) {
    imageData = await media.downloadMediaAsDataUrl(row.preview_path as string) || '';
  }

  let audioCover: string | undefined;
  if (row.audio_cover_path) {
    audioCover = await media.downloadMediaAsDataUrl(row.audio_cover_path as string) || undefined;
  }

  // Verify media integrity via SHA-256 if fingerprint exists
  if (imageData && row.content_fingerprint) {
    try {
      const { sha256 } = await import('../engine/crypto');
      const downloadedHash = await sha256(imageData);
      if (downloadedHash !== row.content_fingerprint) {
        console.error(
          `[Sync] Integrity check FAILED for wart ${wartId}: ` +
          `expected ${(row.content_fingerprint as string).slice(0, 16)}..., ` +
          `got ${downloadedHash.slice(0, 16)}...`
        );
        // Return wart without media — don't trust corrupted data
        imageData = '';
      }
    } catch {
      // Crypto unavailable — skip verification (non-blocking)
    }
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
export async function fullSync(address: string, getWart?: (id: string) => Wart | undefined): Promise<{
  profile: WarpWallet | null;
  transactions: Transaction[];
  warts: Record<string, unknown>[];
  playlists: Array<{
    id: string; owner: string; title: string; description: string;
    type: string; wartIds: string[]; createdAt: number; coverWartId?: string;
  }>;
  articles: Array<{
    id: string; authorAddress: string; authorAlias: string; title: string;
    subtitle: string; coverWartId: string; body: string; embeddedBlocks: unknown[];
    featuredWartIds: string[]; featuredArtists: string[]; tags: string[];
    createdAt: number; updatedAt: number; likes: string[]; views: number;
  }>;
} | null> {
  if (!isBackendAvailable()) return null;
  setSyncStatus('syncing');

  // Process any pending syncs from previous offline sessions
  processPendingSync(getWart).catch(() => {});

  try {
    const [profile, transactions, ownedWarts, createdWarts, playlists, articles] = await Promise.all([
      db.fetchProfile(address),
      db.fetchTransactionsForAddress(address, 200),
      db.fetchWarts({ owner: address }),
      db.fetchWarts({ creator: address }),
      db.fetchPlaylists(address).catch(() => []),
      db.fetchAllArticles().catch(() => []),
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
      playlists,
      articles,
    };
  } catch {
    setSyncStatus('error');
    return null;
  }
}
