import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSentry } from './lib/sentry'

// ─── Initialize error reporting ──────────────────────────
initSentry();

// ─── Migrate old cosmorare_* storage keys to strangrz_* ─────
// The rebrand changed all localStorage keys, orphaning existing data.
const MIGRATION_MAP: Record<string, string> = {
  'cosmorare_social': 'strangrz_social',
  'cosmorare_wallet': 'strangrz_wallet',
  'cosmorare_global_tx': 'strangrz_global_tx',
  'cosmorare_mesh': 'strangrz_mesh',
  'cosmorare_consensus': 'strangrz_consensus',
  'cosmorare_admin_address': 'strangrz_admin_address',
  'cosmorare_daily_totals': 'strangrz_daily_totals',
  'cosmorare_warts': 'strangrz_warts',
  'cosmorare_cert_registry': 'strangrz_cert_registry',
  'cosmorare_tokenomics': 'strangrz_tokenomics',
  'cosmorare_hierarchy': 'strangrz_hierarchy',
};

for (const [oldKey, newKey] of Object.entries(MIGRATION_MAP)) {
  const oldData = localStorage.getItem(oldKey);
  if (oldData && !localStorage.getItem(newKey)) {
    localStorage.setItem(newKey, oldData);
    localStorage.removeItem(oldKey);
  }
}

// Cap existing wallets that had the old 1,000,000 admin bonus to 300
const walletKey = 'strangrz_wallet';
const walletRaw = localStorage.getItem(walletKey);
if (walletRaw) {
  try {
    const w = JSON.parse(walletRaw);
    if (w.balance >= 1_000_000) {
      w.balance = 300;
      // Remove the admin grant transaction and fix airdrop amount
      if (Array.isArray(w.transactions)) {
        w.transactions = w.transactions.filter((tx: { type?: string }) => tx && tx.type !== 'genesis');
        w.transactions = w.transactions.map((tx: { type?: string; amount?: number }) => {
          if (tx.type === 'airdrop' && tx.amount && tx.amount > 300) {
            return { ...tx, amount: 300 };
          }
          return tx;
        });
      }
      localStorage.setItem(walletKey, JSON.stringify(w));
    }
  } catch { /* ignore */ }
}

// Migrate IndexedDB: cosmorare_media → strangrz_media
// Wrapped in try/catch for Safari Private Browsing where IndexedDB can throw
try {
  if (typeof indexedDB !== 'undefined') {
    const oldDbReq = indexedDB.open('cosmorare_media', 1);
    oldDbReq.onerror = () => { /* Old DB doesn't exist — nothing to migrate */ };
    oldDbReq.onsuccess = () => {
      const oldDb = oldDbReq.result;
      try {
        const tx = oldDb.transaction('media', 'readonly');
        const store = tx.objectStore('media');
        const getAll = store.getAll();
        const getAllKeys = store.getAllKeys();
        getAll.onerror = () => { oldDb.close(); };
        getAllKeys.onerror = () => { oldDb.close(); };
        getAll.onsuccess = () => {
          getAllKeys.onsuccess = () => {
            if (getAll.result.length === 0 || getAllKeys.result.length === 0) { oldDb.close(); return; }
            const newDbReq = indexedDB.open('strangrz_media', 1);
            newDbReq.onerror = () => { oldDb.close(); };
            newDbReq.onupgradeneeded = () => {
              const db = newDbReq.result;
              if (!db.objectStoreNames.contains('media')) db.createObjectStore('media');
            };
            newDbReq.onsuccess = () => {
              const newDb = newDbReq.result;
              const writeTx = newDb.transaction('media', 'readwrite');
              const writeStore = writeTx.objectStore('media');
              for (let i = 0; i < getAll.result.length; i++) {
                writeStore.put(getAll.result[i], getAllKeys.result[i]);
              }
              writeTx.oncomplete = () => {
                newDb.close();
                oldDb.close();
                indexedDB.deleteDatabase('cosmorare_media');
              };
              writeTx.onerror = () => { newDb.close(); oldDb.close(); };
            };
          };
        };
      } catch {
        oldDb.close();
      }
    };
  }
} catch { /* IndexedDB unavailable (Safari Private Browsing) */ }

createRoot(document.getElementById('root')!).render(<App />)

// ─── Service Worker Registration (offline + auto-update) ─────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
      .then(reg => {
        // Check for updates every hour
        setInterval(() => reg.update(), 60 * 60 * 1000);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              // New version installed — notify user
              const banner = document.createElement('div');
              banner.setAttribute('style',
                'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;' +
                'background:#111111;border:1px solid rgba(255,255,255,0.15);padding:12px 20px;' +
                'color:#cccccc;font-size:13px;font-family:Inter,sans-serif;display:flex;gap:12px;align-items:center;'
              );
              const label = document.createElement('span');
              label.textContent = '\u2B21 Strangrz update available';
              const reloadBtn = document.createElement('button');
              reloadBtn.textContent = 'Reload';
              reloadBtn.setAttribute('style',
                'background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);' +
                'color:#ffffff;padding:4px 12px;cursor:pointer;font-size:12px');
              reloadBtn.addEventListener('click', () => window.location.reload());
              const closeBtn = document.createElement('button');
              closeBtn.textContent = '\u2715';
              closeBtn.setAttribute('style',
                'background:none;border:none;color:#666666;cursor:pointer;font-size:14px');
              closeBtn.addEventListener('click', () => banner.remove());
              banner.append(label, reloadBtn, closeBtn);
              document.body.appendChild(banner);
            }
          });
        });
      })
      .catch(() => { /* SW registration failed — app still works */ });
  });
}
