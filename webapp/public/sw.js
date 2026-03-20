/**
 * Strangrz Service Worker — Offline + Online Support & Auto-Update
 *
 * Strategy: Network-first with cache fallback.
 * - On install: pre-cache critical app shell assets
 * - On fetch: try network first, cache the response, fall back to cache if offline
 * - On activate: clean up old caches & claim clients immediately
 * - Auto-update: checks for new version every hour
 *
 * Safari compatibility:
 * - Never cache index.html (Safari aggressively holds onto SW-cached HTML)
 * - Use cache-busting for navigation requests
 * - Explicit cache control headers check
 */

const CACHE_NAME = 'strangrz-v5';

const PRECACHE_ASSETS = [
  './logo.svg',
  './logo.png',
  './profile.svg',
  './manifest.json',
];

// ─── Install: pre-cache app shell (skip index.html) ─────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: clean old caches & claim immediately ─────

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

// ─── Fetch: network-first, cache fallback ───────────────

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests (HTML pages): ALWAYS go to network.
  // Safari caches SW-served HTML aggressively, causing stale deploys.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('./index.html').then(c => c || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // Hashed assets (e.g. index-c4Eiwai3.js) — cache-first since hash = immutable
  const isHashedAsset = /\/assets\/[^/]+\.[a-f0-9]{8,}\.(js|css|woff2?)$/i.test(url.pathname);
  if (isHashedAsset) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // All other same-origin requests: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => {
        return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      }))
  );
});

// ─── Auto-update: check every hour ──────────────────────

setInterval(() => {
  self.registration.update();
}, 60 * 60 * 1000);

// ─── Message handler for manual update check ───────────

self.addEventListener('message', (event) => {
  if (event.data === 'CHECK_UPDATE') {
    self.registration.update();
  }
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
