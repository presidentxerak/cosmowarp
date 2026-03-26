/**
 * Strangrz Collections — Group warts into curated collections
 *
 * Collections are stored in localStorage and synced to Supabase.
 * Each collection has an ordered list of wart IDs.
 */

import { storage } from './storage';
import { syncCollection, syncCollectionDelete } from '../lib/supabase-phase2-sync';

// ─── Types ────────────────────────────────────────────────

export interface Collection {
  id: string;
  creator: string;           // wallet address
  title: string;
  description: string;
  coverWartId: string | null; // first wart used as cover if null
  wartIds: string[];          // ordered list of wart IDs
  createdAt: number;
  updatedAt: number;
}

// ─── Storage ──────────────────────────────────────────────

const STORAGE_KEY = 'strangrz_collections';

function loadAll(): Collection[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAll(collections: Collection[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(collections));
}

// ─── Collection Engine ────────────────────────────────────

export class CollectionEngine {
  private collections: Map<string, Collection> = new Map();

  constructor() {
    for (const c of loadAll()) {
      this.collections.set(c.id, c);
    }
  }

  static load(): CollectionEngine {
    return new CollectionEngine();
  }

  private save(): void {
    saveAll([...this.collections.values()]);
  }

  /** Create a new collection */
  create(creator: string, title: string, description = ''): Collection {
    const id = `COL_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const collection: Collection = {
      id,
      creator,
      title,
      description,
      coverWartId: null,
      wartIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.collections.set(id, collection);
    this.save();
    syncCollection(collection).catch(() => {});
    return collection;
  }

  /** Get a collection by ID */
  get(id: string): Collection | null {
    return this.collections.get(id) || null;
  }

  /** Get all collections */
  getAll(): Collection[] {
    return [...this.collections.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /** Get collections by creator */
  getByCreator(creator: string): Collection[] {
    return this.getAll().filter(c => c.creator === creator);
  }

  /** Update collection metadata */
  update(id: string, creator: string, updates: { title?: string; description?: string; coverWartId?: string | null }): boolean {
    const col = this.collections.get(id);
    if (!col || col.creator !== creator) return false;
    if (updates.title !== undefined) col.title = updates.title;
    if (updates.description !== undefined) col.description = updates.description;
    if (updates.coverWartId !== undefined) col.coverWartId = updates.coverWartId;
    col.updatedAt = Date.now();
    this.save();
    syncCollection(col).catch(() => {});
    return true;
  }

  /** Add a wart to a collection */
  addWart(collectionId: string, creator: string, wartId: string): boolean {
    const col = this.collections.get(collectionId);
    if (!col || col.creator !== creator) return false;
    if (col.wartIds.includes(wartId)) return false;
    col.wartIds.push(wartId);
    col.updatedAt = Date.now();
    this.save();
    syncCollection(col).catch(() => {});
    return true;
  }

  /** Remove a wart from a collection */
  removeWart(collectionId: string, creator: string, wartId: string): boolean {
    const col = this.collections.get(collectionId);
    if (!col || col.creator !== creator) return false;
    const idx = col.wartIds.indexOf(wartId);
    if (idx === -1) return false;
    col.wartIds.splice(idx, 1);
    col.updatedAt = Date.now();
    this.save();
    syncCollection(col).catch(() => {});
    return true;
  }

  /** Reorder warts in a collection */
  reorderWarts(collectionId: string, creator: string, wartIds: string[]): boolean {
    const col = this.collections.get(collectionId);
    if (!col || col.creator !== creator) return false;
    const existing = new Set(col.wartIds);
    if (wartIds.length !== existing.size || !wartIds.every(id => existing.has(id))) return false;
    col.wartIds = wartIds;
    col.updatedAt = Date.now();
    this.save();
    syncCollection(col).catch(() => {});
    return true;
  }

  /** Delete a collection */
  delete(id: string, creator: string): boolean {
    const col = this.collections.get(id);
    if (!col || col.creator !== creator) return false;
    this.collections.delete(id);
    this.save();
    syncCollectionDelete(id).catch(() => {});
    return true;
  }

  /** Get collections containing a specific wart */
  getCollectionsForWart(wartId: string): Collection[] {
    return this.getAll().filter(c => c.wartIds.includes(wartId));
  }

  /** Hydrate from cloud data (called during login sync) */
  mergeCloud(cloudCollections: Collection[]): void {
    for (const cloud of cloudCollections) {
      const local = this.collections.get(cloud.id);
      if (!local || cloud.updatedAt > local.updatedAt) {
        this.collections.set(cloud.id, cloud);
      }
    }
    this.save();
  }
}
