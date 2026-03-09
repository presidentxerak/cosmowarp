/**
 * ChainDB — IndexedDB Storage Engine for CosmoChain
 *
 * Replaces localStorage (5-10MB limit) with IndexedDB (up to browser quota,
 * typically 50-80% of free disk space — often several GB).
 *
 * This is REAL large-scale storage, not a toy wrapper.
 *
 * Object Stores:
 *   blocks      — Shard blocks keyed by `{shard}:{number}`
 *   beacons     — Beacon blocks keyed by number
 *   transactions — All transactions keyed by id, indexed by address & shard
 *   state       — Global state snapshots keyed by shard
 *   media       — On-chain media (CosmoCode SVG containers) keyed by content hash
 *   meta        — Chain metadata (balances, nonces, config)
 */

const DB_NAME = 'cosmowarp_chain';
const DB_VERSION = 1;

const STORES = {
  blocks: 'blocks',
  beacons: 'beacons',
  transactions: 'transactions',
  state: 'state',
  media: 'media',
  meta: 'meta',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

// ─── Database Initialization ──────────────────────────────

let dbInstance: IDBDatabase | null = null;
let dbReady: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbReady) return dbReady;

  dbReady = new Promise<IDBDatabase>((resolve, reject) => {
    // IndexedDB unavailable (e.g. some privacy modes)
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      // Blocks: keyed by "shard:blockNumber"
      if (!db.objectStoreNames.contains(STORES.blocks)) {
        const blockStore = db.createObjectStore(STORES.blocks, { keyPath: 'key' });
        blockStore.createIndex('shard', 'shard', { unique: false });
        blockStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Beacon blocks: keyed by number
      if (!db.objectStoreNames.contains(STORES.beacons)) {
        db.createObjectStore(STORES.beacons, { keyPath: 'number' });
      }

      // Transactions: keyed by id, indexed by from/to/shard
      if (!db.objectStoreNames.contains(STORES.transactions)) {
        const txStore = db.createObjectStore(STORES.transactions, { keyPath: 'id' });
        txStore.createIndex('from', 'from', { unique: false });
        txStore.createIndex('to', 'to', { unique: false });
        txStore.createIndex('shard', 'shard', { unique: false });
        txStore.createIndex('timestamp', 'timestamp', { unique: false });
        txStore.createIndex('type', 'type', { unique: false });
      }

      // State: keyed by shard ID
      if (!db.objectStoreNames.contains(STORES.state)) {
        db.createObjectStore(STORES.state, { keyPath: 'shard' });
      }

      // Media: on-chain CosmoCode SVG containers keyed by content hash
      if (!db.objectStoreNames.contains(STORES.media)) {
        const mediaStore = db.createObjectStore(STORES.media, { keyPath: 'hash' });
        mediaStore.createIndex('type', 'type', { unique: false });
        mediaStore.createIndex('creator', 'creator', { unique: false });
      }

      // Meta: chain config, balances map, nonces map
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbReady;
}

// ─── Generic CRUD Operations ──────────────────────────────

async function put(store: StoreName, data: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const request = tx.objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const request = tx.objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function getAllByIndex<T>(store: StoreName, indexName: string, key: IDBValidKey): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const index = tx.objectStore(store).index(indexName);
    const request = index.getAll(key);
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function del(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function count(store: StoreName): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const request = tx.objectStore(store).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putBatch(store: StoreName, items: unknown[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const objectStore = tx.objectStore(store);
    for (const item of items) {
      objectStore.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Block Operations ─────────────────────────────────────

export interface StoredBlock {
  key: string;              // "{shard}:{number}"
  shard: number;
  number: number;
  parentHash: string;
  stateRoot: string;
  transactionsRoot: string;
  timestamp: number;
  validator: string;
  hash: string;
  txCount: number;
  processingTimeMs: number;
  cosmoCodeSVG?: string;    // CosmoCode SVG encoded block data
  rawSize: number;          // Original data size
  compressedSize: number;   // Compressed size (for real ratio measurement)
}

export const blockDB = {
  async put(block: StoredBlock): Promise<void> {
    block.key = `${block.shard}:${block.number}`;
    await put(STORES.blocks, block);
  },

  async get(shard: number, blockNumber: number): Promise<StoredBlock | undefined> {
    return get<StoredBlock>(STORES.blocks, `${shard}:${blockNumber}`);
  },

  async getByShard(shard: number): Promise<StoredBlock[]> {
    return getAllByIndex<StoredBlock>(STORES.blocks, 'shard', shard);
  },

  async getLatest(shard: number): Promise<StoredBlock | undefined> {
    const blocks = await this.getByShard(shard);
    return blocks.sort((a, b) => b.number - a.number)[0];
  },

  async count(): Promise<number> {
    return count(STORES.blocks);
  },
};

// ─── Transaction Operations ───────────────────────────────

export interface StoredTransaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  signature: string;
  publicKey: string;
  shard: number;
  type: string;
  memo?: string;
  nonce: number;
  blockNumber?: number;
  beaconBlock?: number;
  status: 'pending' | 'confirmed' | 'finalized';
  confirmations: number;
  onChainData?: string;
}

export const txDB = {
  async put(tx: StoredTransaction): Promise<void> {
    await put(STORES.transactions, tx);
  },

  async putBatch(txs: StoredTransaction[]): Promise<void> {
    await putBatch(STORES.transactions, txs);
  },

  async get(id: string): Promise<StoredTransaction | undefined> {
    return get<StoredTransaction>(STORES.transactions, id);
  },

  async getByAddress(address: string): Promise<StoredTransaction[]> {
    const [fromTxs, toTxs] = await Promise.all([
      getAllByIndex<StoredTransaction>(STORES.transactions, 'from', address),
      getAllByIndex<StoredTransaction>(STORES.transactions, 'to', address),
    ]);
    // Deduplicate (a TX where from === to would appear in both)
    const seen = new Set<string>();
    const result: StoredTransaction[] = [];
    for (const tx of [...fromTxs, ...toTxs]) {
      if (!seen.has(tx.id)) {
        seen.add(tx.id);
        result.push(tx);
      }
    }
    return result.sort((a, b) => b.timestamp - a.timestamp);
  },

  async getByShard(shard: number): Promise<StoredTransaction[]> {
    return getAllByIndex<StoredTransaction>(STORES.transactions, 'shard', shard);
  },

  async getRecent(limit: number): Promise<StoredTransaction[]> {
    const all = await getAll<StoredTransaction>(STORES.transactions);
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  },

  async count(): Promise<number> {
    return count(STORES.transactions);
  },
};

// ─── Beacon Operations ────────────────────────────────────

export interface StoredBeacon {
  number: number;
  shardRoots: string[];
  shardHeads: number[];
  globalStateRoot: string;
  timestamp: number;
  validator: string;
  hash: string;
}

export const beaconDB = {
  async put(beacon: StoredBeacon): Promise<void> {
    await put(STORES.beacons, beacon);
  },

  async get(number: number): Promise<StoredBeacon | undefined> {
    return get<StoredBeacon>(STORES.beacons, number);
  },

  async getLatest(): Promise<StoredBeacon | undefined> {
    const all = await getAll<StoredBeacon>(STORES.beacons);
    return all.sort((a, b) => b.number - a.number)[0];
  },

  async count(): Promise<number> {
    return count(STORES.beacons);
  },
};

// ─── Media (On-Chain CosmoCode SVG) ───────────────────────

export interface StoredMedia {
  hash: string;           // SHA-256 content hash
  svg: string;            // CosmoCode SVG container
  type: string;           // 'wart' | 'media' | 'state'
  creator: string;        // Creator address
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;  // REAL measured ratio
  timestamp: number;
}

export const mediaDB = {
  async put(media: StoredMedia): Promise<void> {
    await put(STORES.media, media);
  },

  async get(hash: string): Promise<StoredMedia | undefined> {
    return get<StoredMedia>(STORES.media, hash);
  },

  async getByCreator(creator: string): Promise<StoredMedia[]> {
    return getAllByIndex<StoredMedia>(STORES.media, 'creator', creator);
  },

  async count(): Promise<number> {
    return count(STORES.media);
  },

  /** Calculate real total compression ratio across all stored media */
  async getRealCompressionStats(): Promise<{ totalOriginal: number; totalCompressed: number; ratio: number; count: number }> {
    const all = await getAll<StoredMedia>(STORES.media);
    let totalOriginal = 0;
    let totalCompressed = 0;
    for (const m of all) {
      totalOriginal += m.originalSize;
      totalCompressed += m.compressedSize;
    }
    return {
      totalOriginal,
      totalCompressed,
      ratio: totalCompressed > 0 ? totalOriginal / totalCompressed : 1,
      count: all.length,
    };
  },
};

// ─── Meta (Balances, Nonces, Config) ──────────────────────

export const metaDB = {
  async put(key: string, value: unknown): Promise<void> {
    await put(STORES.meta, { key, value, updatedAt: Date.now() });
  },

  async get<T>(key: string): Promise<T | undefined> {
    const result = await get<{ key: string; value: T }>(STORES.meta, key);
    return result?.value;
  },

  async delete(key: string): Promise<void> {
    await del(STORES.meta, key);
  },
};

// ─── Storage Diagnostics ──────────────────────────────────

export interface StorageDiagnostics {
  available: boolean;
  engine: 'indexeddb' | 'localstorage' | 'memory';
  quota?: number;          // Total quota in bytes
  usage?: number;          // Used bytes
  remaining?: number;      // Remaining bytes
  blocks: number;
  transactions: number;
  beacons: number;
  mediaItems: number;
}

export async function getStorageDiagnostics(): Promise<StorageDiagnostics> {
  let engine: StorageDiagnostics['engine'] = 'memory';
  let quota: number | undefined;
  let usage: number | undefined;

  // Check IndexedDB
  const idbAvailable = typeof indexedDB !== 'undefined';
  if (idbAvailable) {
    engine = 'indexeddb';

    // Check storage quota (StorageManager API)
    if (navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        quota = estimate.quota;
        usage = estimate.usage;
      } catch { /* not available */ }
    }
  } else if (typeof localStorage !== 'undefined') {
    engine = 'localstorage';
  }

  let blocks = 0, transactions = 0, beacons = 0, mediaItems = 0;
  if (idbAvailable) {
    try {
      [blocks, transactions, beacons, mediaItems] = await Promise.all([
        blockDB.count(),
        txDB.count(),
        beaconDB.count(),
        mediaDB.count(),
      ]);
    } catch { /* DB not yet open */ }
  }

  return {
    available: idbAvailable,
    engine,
    quota,
    usage,
    remaining: quota && usage ? quota - usage : undefined,
    blocks,
    transactions,
    beacons,
    mediaItems,
  };
}

/** Check if IndexedDB is usable. Call this at startup. */
export async function initChainDB(): Promise<boolean> {
  try {
    await openDB();
    return true;
  } catch {
    return false;
  }
}
