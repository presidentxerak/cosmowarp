/**
 * Strangrz PWA — Progressive Web App utilities
 *
 * Features:
 * - Install prompt (A2HS) with custom UI
 * - Background sync for offline actions
 * - Web Vitals tracking (LCP, FID, CLS)
 * - Update notification management
 */

// ─── Install Prompt (A2HS) ───────────────────────────────

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(available: boolean) => void>();

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Listen for the install prompt event */
export function initInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installListeners.forEach(fn => fn(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installListeners.forEach(fn => fn(false));
  });
}

/** Check if install is available */
export function isInstallAvailable(): boolean {
  return deferredPrompt !== null;
}

/** Subscribe to install availability changes */
export function onInstallAvailable(fn: (available: boolean) => void): () => void {
  installListeners.add(fn);
  return () => installListeners.delete(fn);
}

/** Trigger the install prompt */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installListeners.forEach(fn => fn(false));
  return outcome;
}

// ─── Background Sync Queue ───────────────────────────────

interface SyncAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

const SYNC_QUEUE_KEY = 'strangrz_sync_queue';

/** Add an action to the background sync queue */
export function queueSyncAction(type: string, payload: unknown): void {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    const queue: SyncAction[] = raw ? JSON.parse(raw) : [];
    queue.push({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      payload,
      timestamp: Date.now(),
    });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue.slice(-100)));
  } catch { /* storage full */ }
}

/** Get pending sync actions */
export function getPendingSyncActions(): SyncAction[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** Clear processed sync actions */
export function clearSyncActions(ids: string[]): void {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    const queue: SyncAction[] = raw ? JSON.parse(raw) : [];
    const remaining = queue.filter(a => !ids.includes(a.id));
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));
  } catch { /* ignore */ }
}

/** Process pending sync actions when back online */
export async function processSyncQueue(
  handler: (action: SyncAction) => Promise<boolean>,
): Promise<{ processed: number; failed: number }> {
  const actions = getPendingSyncActions();
  if (actions.length === 0) return { processed: 0, failed: 0 };

  const processed: string[] = [];
  let failed = 0;

  for (const action of actions) {
    try {
      const ok = await handler(action);
      if (ok) processed.push(action.id);
      else failed++;
    } catch {
      failed++;
    }
  }

  clearSyncActions(processed);
  return { processed: processed.length, failed };
}

// ─── Web Vitals Tracking ──────────────────────────────────

export interface WebVitals {
  lcp: number | null;  // Largest Contentful Paint (ms)
  fid: number | null;  // First Input Delay (ms)
  cls: number | null;  // Cumulative Layout Shift (score)
  ttfb: number | null; // Time to First Byte (ms)
}

/** Observe Web Vitals using PerformanceObserver */
export function observeWebVitals(callback: (vitals: WebVitals) => void): void {
  const vitals: WebVitals = { lcp: null, fid: null, cls: null, ttfb: null };

  // TTFB
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (nav) vitals.ttfb = Math.round(nav.responseStart - nav.requestStart);
  } catch { /* not supported */ }

  // LCP
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        vitals.lcp = Math.round(last.startTime);
        callback({ ...vitals });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch { /* not supported */ }

  // FID
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entry = list.getEntries()[0] as PerformanceEventTiming;
      if (entry) {
        vitals.fid = Math.round(entry.processingStart - entry.startTime);
        callback({ ...vitals });
      }
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch { /* not supported */ }

  // CLS
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const le = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!le.hadRecentInput && le.value) {
          clsValue += le.value;
          vitals.cls = Math.round(clsValue * 1000) / 1000;
          callback({ ...vitals });
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch { /* not supported */ }

  // Initial callback with TTFB
  if (vitals.ttfb !== null) callback({ ...vitals });
}

// ─── Online/Offline Detection ─────────────────────────────

/** Register online/offline event handlers */
export function onConnectivityChange(callback: (online: boolean) => void): () => void {
  const onOnline = () => callback(true);
  const onOffline = () => callback(false);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/** Check if currently online */
export function isOnline(): boolean {
  return navigator.onLine;
}
