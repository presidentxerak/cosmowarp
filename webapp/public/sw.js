/**
 * Cosmorare Service Worker — Offline + Online Support & Auto-Update
 *
 * Strategy: Network-first with cache fallback.
 * - On install: pre-cache critical app shell assets
 * - On fetch: try network first, cache the response, fall back to cache if offline
 * - On activate: clean up old caches
 * - Auto-update: checks for new version every hour
 */

const CACHE_NAME = 'cosmorare-v3';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './logo.svg',
  './logo.png',
  './profile.svg',
  './manifest.json',
];

// ─── Install: pre-cache app shell ────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: clean old caches ──────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: network-first, cache fallback ────────────────

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (fonts, CDN, etc.)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response before caching
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Return offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

// ─── Auto-update: check every hour ───────────────────────

setInterval(() => {
  self.registration.update();
}, 60 * 60 * 1000);

// ─── Message handler for manual update check ────────────

self.addEventListener('message', (event) => {
  if (event.data === 'CHECK_UPDATE') {
    self.registration.update();
  }
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
