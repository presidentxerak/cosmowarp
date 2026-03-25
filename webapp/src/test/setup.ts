import '@testing-library/jest-dom/vitest';

// ─── Mock localStorage / sessionStorage for jsdom ─────────
const storageMock = (): Storage => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
};

Object.defineProperty(globalThis, 'localStorage', { value: storageMock() });
Object.defineProperty(globalThis, 'sessionStorage', { value: storageMock() });

// ─── Mock indexedDB (noop) ────────────────────────────────
Object.defineProperty(globalThis, 'indexedDB', {
  value: {
    open: () => ({ onerror: null, onsuccess: null, onupgradeneeded: null }),
    deleteDatabase: () => ({}),
  },
});

// ─── Mock matchMedia ──────────────────────────────────────
Object.defineProperty(globalThis, 'matchMedia', {
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ─── Mock navigator.serviceWorker ─────────────────────────
Object.defineProperty(navigator, 'serviceWorker', {
  value: { register: () => Promise.resolve({ addEventListener: () => {}, update: () => {} }) },
  configurable: true,
});

// ─── Mock crypto.subtle for Node/jsdom ────────────────────
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('crypto');
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}
