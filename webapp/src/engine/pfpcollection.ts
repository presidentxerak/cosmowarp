import { storage } from './storage';

// ─── Types ─────────────────────────────────────────────

export interface TraitLayer {
  id: string;
  name: string;       // e.g. "Background", "Body", "Eyes", "Mouth", "Hat"
  variants: TraitVariant[];
}

export interface TraitVariant {
  id: string;
  name: string;       // e.g. "Blue", "Red", "Laser eyes"
  imageData: string;   // base64 PNG with transparency
  rarity: number;      // 0-100 weight (higher = more common)
}

export interface PFPItem {
  id: string;
  collectionId: string;
  traits: { layerName: string; variantName: string; variantId: string }[];
  compositeImage: string;  // final combined image
  tokenIndex: number;
  owner: string;
  mintedAt: number;
  signature: string;       // creator signature for authenticity
}

export interface PFPCollection {
  id: string;
  name: string;
  description: string;
  creator: string;
  createdAt: number;
  maxSupply: number;
  layers: TraitLayer[];
  items: PFPItem[];
  basePrice: number | null;  // in Warps
  fingerprint: string;       // collection content hash
}

// ─── Storage ───────────────────────────────────────────

const STORAGE_KEY = 'strangrz_pfp_collections';

function loadCollections(): PFPCollection[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCollections(collections: PFPCollection[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(collections));
}

// ─── Utility ───────────────────────────────────────────

function generateId(): string {
  return 'pfp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/** Simple weighted random selection */
function weightedRandom(variants: TraitVariant[]): TraitVariant {
  const totalWeight = variants.reduce((sum, v) => sum + v.rarity, 0);
  let random = Math.random() * totalWeight;
  for (const v of variants) {
    random -= v.rarity;
    if (random <= 0) return v;
  }
  return variants[variants.length - 1];
}

// ─── PFP Collection Engine ────────────────────────────

export class PFPCollectionEngine {
  private collections: PFPCollection[];

  private constructor(collections: PFPCollection[]) {
    this.collections = collections;
  }

  static load(): PFPCollectionEngine {
    return new PFPCollectionEngine(loadCollections());
  }

  public save(): void {
    saveCollections(this.collections);
  }

  // ─── Collection CRUD ────────────────────────────────

  createCollection(
    creator: string,
    name: string,
    description: string,
    maxSupply: number,
    basePrice: number | null,
  ): PFPCollection {
    const collection: PFPCollection = {
      id: generateId(),
      name,
      description,
      creator,
      createdAt: Date.now(),
      maxSupply,
      layers: [],
      items: [],
      basePrice,
      fingerprint: hashString(name + creator + Date.now()),
    };
    this.collections.push(collection);
    this.save();
    return collection;
  }

  getCollection(id: string): PFPCollection | null {
    return this.collections.find(c => c.id === id) || null;
  }

  getCollectionsByCreator(creator: string): PFPCollection[] {
    return this.collections.filter(c => c.creator === creator);
  }

  getAllCollections(): PFPCollection[] {
    return [...this.collections];
  }

  // ─── Layer Management ────────────────────────────────

  addLayer(collectionId: string, name: string): TraitLayer | null {
    const collection = this.collections.find(c => c.id === collectionId);
    if (!collection) return null;
    const layer: TraitLayer = {
      id: generateId(),
      name,
      variants: [],
    };
    collection.layers.push(layer);
    this.save();
    return layer;
  }

  removeLayer(collectionId: string, layerId: string): boolean {
    const collection = this.collections.find(c => c.id === collectionId);
    if (!collection) return false;
    const idx = collection.layers.findIndex(l => l.id === layerId);
    if (idx < 0) return false;
    collection.layers.splice(idx, 1);
    this.save();
    return true;
  }

  reorderLayers(collectionId: string, layerIds: string[]): boolean {
    const collection = this.collections.find(c => c.id === collectionId);
    if (!collection) return false;
    const reordered: TraitLayer[] = [];
    for (const id of layerIds) {
      const layer = collection.layers.find(l => l.id === id);
      if (layer) reordered.push(layer);
    }
    collection.layers = reordered;
    this.save();
    return true;
  }

  // ─── Variant Management ──────────────────────────────

  addVariant(collectionId: string, layerId: string, name: string, imageData: string, rarity: number): TraitVariant | null {
    const collection = this.collections.find(c => c.id === collectionId);
    if (!collection) return null;
    const layer = collection.layers.find(l => l.id === layerId);
    if (!layer) return null;
    const variant: TraitVariant = {
      id: generateId(),
      name,
      imageData,
      rarity: Math.max(1, Math.min(100, rarity)),
    };
    layer.variants.push(variant);
    this.save();
    return variant;
  }

  removeVariant(collectionId: string, layerId: string, variantId: string): boolean {
    const collection = this.collections.find(c => c.id === collectionId);
    if (!collection) return false;
    const layer = collection.layers.find(l => l.id === layerId);
    if (!layer) return false;
    const idx = layer.variants.findIndex(v => v.id === variantId);
    if (idx < 0) return false;
    layer.variants.splice(idx, 1);
    this.save();
    return true;
  }

  // ─── Generation ──────────────────────────────────────

  /** Generate a unique combination of traits */
  generateTraits(collection: PFPCollection): { layerName: string; variantName: string; variantId: string }[] {
    return collection.layers
      .filter(layer => layer.variants.length > 0)
      .map(layer => {
        const variant = weightedRandom(layer.variants);
        return {
          layerName: layer.name,
          variantName: variant.name,
          variantId: variant.id,
        };
      });
  }

  /** Combine layer images into a composite (returns canvas data URL) */
  async compositeImage(collection: PFPCollection, traits: { layerName: string; variantId: string }[]): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    for (const trait of traits) {
      const layer = collection.layers.find(l => l.name === trait.layerName);
      if (!layer) continue;
      const variant = layer.variants.find(v => v.id === trait.variantId);
      if (!variant || !variant.imageData) continue;

      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, 256, 256);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = variant.imageData;
      });
    }

    return canvas.toDataURL('image/png');
  }

  /** Mint a PFP from a collection */
  async mintPFP(collectionId: string, owner: string): Promise<PFPItem | null> {
    const collection = this.collections.find(c => c.id === collectionId);
    if (!collection) return null;
    if (collection.items.length >= collection.maxSupply) return null;
    if (collection.layers.length === 0) return null;

    const traits = this.generateTraits(collection);
    const compositeImg = await this.compositeImage(collection, traits);
    const tokenIndex = collection.items.length + 1;
    const signature = hashString(
      collectionId + owner + tokenIndex + traits.map(t => t.variantId).join('') + Date.now()
    );

    const item: PFPItem = {
      id: generateId(),
      collectionId,
      traits,
      compositeImage: compositeImg,
      tokenIndex,
      owner,
      mintedAt: Date.now(),
      signature,
    };

    collection.items.push(item);
    collection.fingerprint = hashString(
      collection.fingerprint + item.signature
    );
    this.save();
    return item;
  }

  /** Verify a PFP's authenticity */
  verifyPFP(itemId: string): { valid: boolean; reason: string } {
    for (const collection of this.collections) {
      const item = collection.items.find(i => i.id === itemId);
      if (item) {
        if (item.signature && item.signature.length === 8) {
          return { valid: true, reason: `Authentic PFP #${item.tokenIndex} from "${collection.name}" (sig: ${item.signature})` };
        }
        return { valid: false, reason: 'Invalid signature format' };
      }
    }
    return { valid: false, reason: 'PFP not found in any collection' };
  }
}
