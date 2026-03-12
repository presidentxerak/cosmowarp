/**
 * Safe localStorage wrapper that never throws.
 *
 * iOS Safari throws "The operation is insecure" (SecurityError) when
 * localStorage is accessed in private browsing mode, restricted WebViews,
 * or when cookies/storage are disabled. This wrapper catches all errors
 * and falls back to an in-memory store so the app remains functional.
 */

const memoryStore: Record<string, string> = {};
let storageAvailable: boolean | null = null;

function isAvailable(): boolean {
  if (storageAvailable !== null) return storageAvailable;
  try {
    const key = '__cw_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    storageAvailable = true;
  } catch {
    storageAvailable = false;
  }
  return storageAvailable;
}

export const storage = {
  getItem(key: string): string | null {
    try {
      if (isAvailable()) return localStorage.getItem(key);
      return memoryStore[key] ?? null;
    } catch {
      return memoryStore[key] ?? null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      if (isAvailable()) {
        localStorage.setItem(key, value);
      } else {
        memoryStore[key] = value;
      }
    } catch {
      memoryStore[key] = value;
    }
  },

  removeItem(key: string): void {
    try {
      if (isAvailable()) {
        localStorage.removeItem(key);
      } else {
        delete memoryStore[key];
      }
    } catch {
      delete memoryStore[key];
    }
  },
};
