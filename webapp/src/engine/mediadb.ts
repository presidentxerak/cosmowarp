/**
 * IndexedDB-based media storage for Strangrz artworks.
 *
 * localStorage has a ~5MB limit which is too small for base64 images/videos.
 * IndexedDB supports hundreds of MB, making it suitable for media storage.
 *
 * API is async but uses a simple key-value pattern (wartId → imageData).
 */

const DB_NAME = 'strangrz_media';
const DB_VERSION = 1;
const STORE_NAME = 'media';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/** Store media data for a wart (imageData + optional audioCover) */
export async function storeMedia(wartId: string, imageData: string, audioCover?: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ imageData, audioCover }, wartId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB unavailable — media stays in memory only
  }
}

/** Retrieve media data for a wart */
export async function retrieveMedia(wartId: string): Promise<{ imageData: string; audioCover?: string } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(wartId);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Retrieve media for multiple warts at once */
export async function retrieveAllMedia(): Promise<Map<string, { imageData: string; audioCover?: string }>> {
  const result = new Map<string, { imageData: string; audioCover?: string }>();
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.openCursor();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          result.set(cursor.key as string, cursor.value);
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return result;
  }
}

/** Delete media for a wart */
export async function deleteMedia(wartId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(wartId);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}
