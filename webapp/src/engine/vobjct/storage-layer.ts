/**
 * Strangrz — Storage Abstraction Layer
 *
 * Modular storage architecture supporting multiple providers:
 * - Supabase Storage (HTTPS)
 * - IndexedDB (local cache)
 * - On-chain StrangrzCode SVG
 * - IPFS (via gateway)
 * - Arweave (via gateway)
 *
 * Provides a unified interface for upload, download, validation,
 * and route management across all storage providers.
 */

import { sha256 } from '../crypto';
import type { StorageRoute, StorageNetwork } from './schema';

// ─── Storage Provider Interface ─────────────────────────────

export interface StorageProvider {
  readonly network: StorageNetwork;
  readonly name: string;

  /** Upload data, returns locator string */
  upload(data: string, path: string): Promise<string | null>;

  /** Download data by locator */
  download(locator: string): Promise<string | null>;

  /** Check if a locator is still available */
  checkAvailability(locator: string): Promise<boolean>;

  /** Delete data at locator */
  remove(locator: string): Promise<boolean>;
}

// ─── Supabase Provider ──────────────────────────────────────

export class SupabaseStorageProvider implements StorageProvider {
  readonly network: StorageNetwork = 'supabase';
  readonly name = 'Supabase Storage';

  private uploadFn: (data: string, wartId: string, type: 'main' | 'cover') => Promise<string | null>;
  private downloadFn: (path: string) => Promise<string | null>;
  private getUrlFn: (path: string) => string;

  constructor(
    upload: (data: string, wartId: string, type: 'main' | 'cover') => Promise<string | null>,
    download: (path: string) => Promise<string | null>,
    getUrl: (path: string) => string,
  ) {
    this.uploadFn = upload;
    this.downloadFn = download;
    this.getUrlFn = getUrl;
  }

  async upload(data: string, path: string): Promise<string | null> {
    const parts = path.split('/');
    const wartId = parts[parts.length - 2] || path;
    const result = await this.uploadFn(data, wartId, 'main');
    return result ? this.getUrlFn(result) : null;
  }

  async download(locator: string): Promise<string | null> {
    // Extract path from URL if needed
    const path = locator.includes('/storage/') ? locator.split('/storage/v1/object/public/media/')[1] || locator : locator;
    return this.downloadFn(path);
  }

  async checkAvailability(locator: string): Promise<boolean> {
    try {
      const response = await fetch(locator, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  async remove(_locator: string): Promise<boolean> {
    return false; // Handled by supabase-storage module
  }
}

// ─── IndexedDB Provider ─────────────────────────────────────

export class IndexedDBStorageProvider implements StorageProvider {
  readonly network: StorageNetwork = 'indexeddb';
  readonly name = 'Local Cache (IndexedDB)';

  private storeFn: (wartId: string, imageData: string, audioCover?: string) => Promise<void>;
  private retrieveFn: (wartId: string) => Promise<{ imageData: string; audioCover?: string } | null>;

  constructor(
    store: (wartId: string, imageData: string, audioCover?: string) => Promise<void>,
    retrieve: (wartId: string) => Promise<{ imageData: string; audioCover?: string } | null>,
  ) {
    this.storeFn = store;
    this.retrieveFn = retrieve;
  }

  async upload(data: string, path: string): Promise<string | null> {
    try {
      await this.storeFn(path, data);
      return `indexeddb://${path}`;
    } catch {
      return null;
    }
  }

  async download(locator: string): Promise<string | null> {
    const id = locator.replace('indexeddb://', '');
    const result = await this.retrieveFn(id);
    return result?.imageData || null;
  }

  async checkAvailability(locator: string): Promise<boolean> {
    const id = locator.replace('indexeddb://', '');
    const result = await this.retrieveFn(id);
    return result !== null;
  }

  async remove(_locator: string): Promise<boolean> {
    return false; // Handled by mediadb module
  }
}

// ─── On-Chain Provider ──────────────────────────────────────

export class OnChainStorageProvider implements StorageProvider {
  readonly network: StorageNetwork = 'onchain';
  readonly name = 'StrangrzChain On-Chain SVG';

  private getOnChainSVG: (wartId: string) => string | undefined;

  constructor(getOnChainSVG: (wartId: string) => string | undefined) {
    this.getOnChainSVG = getOnChainSVG;
  }

  async upload(_data: string, _path: string): Promise<string | null> {
    // On-chain storage is handled by the StrangrzCode pipeline
    return null;
  }

  async download(locator: string): Promise<string | null> {
    const id = locator.replace('onchain://', '');
    const svg = this.getOnChainSVG(id);
    return svg || null;
  }

  async checkAvailability(locator: string): Promise<boolean> {
    const id = locator.replace('onchain://', '');
    return !!this.getOnChainSVG(id);
  }

  async remove(_locator: string): Promise<boolean> {
    return false; // Immutable
  }
}

// ─── HTTPS Mirror Provider ──────────────────────────────────

export class HTTPSMirrorProvider implements StorageProvider {
  readonly network: StorageNetwork = 'https';
  readonly name = 'HTTPS Mirror';

  async upload(_data: string, _path: string): Promise<string | null> {
    return null; // Mirrors are configured externally
  }

  async download(locator: string): Promise<string | null> {
    try {
      const response = await fetch(locator);
      if (!response.ok) return null;
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async checkAvailability(locator: string): Promise<boolean> {
    try {
      const response = await fetch(locator, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  async remove(_locator: string): Promise<boolean> {
    return false;
  }
}

// ─── Storage Layer Orchestrator ─────────────────────────────

export class StrangrzStorageLayer {
  private providers = new Map<StorageNetwork, StorageProvider>();

  registerProvider(provider: StorageProvider): void {
    this.providers.set(provider.network, provider);
  }

  getProvider(network: StorageNetwork): StorageProvider | null {
    return this.providers.get(network) || null;
  }

  listProviders(): StorageNetwork[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Upload data to all registered providers.
   * Returns storage routes for each successful upload.
   */
  async uploadToAll(data: string, path: string): Promise<StorageRoute[]> {
    const routes: StorageRoute[] = [];
    let priority = 1;

    for (const [network, provider] of this.providers) {
      try {
        const locator = await provider.upload(data, path);
        if (locator) {
          routes.push({
            network,
            locator,
            priority: priority++,
            status: 'active',
            last_checked_at: new Date().toISOString(),
          });
        }
      } catch { /* provider failed */ }
    }

    return routes;
  }

  /**
   * Download data from the highest priority available route.
   */
  async downloadFromBest(routes: StorageRoute[]): Promise<{ data: string; route: StorageRoute } | null> {
    const sorted = [...routes]
      .filter(r => r.status !== 'unavailable')
      .sort((a, b) => a.priority - b.priority);

    for (const route of sorted) {
      const provider = this.providers.get(route.network);
      if (!provider) continue;

      try {
        const data = await provider.download(route.locator);
        if (data) return { data, route };
      } catch { /* try next */ }
    }

    return null;
  }

  /**
   * Check availability of all routes and return updated routes.
   */
  async checkAllRoutes(routes: StorageRoute[]): Promise<StorageRoute[]> {
    const now = new Date().toISOString();
    return Promise.all(
      routes.map(async (route) => {
        const provider = this.providers.get(route.network);
        if (!provider) return { ...route, status: 'unknown' as const, last_checked_at: now };

        try {
          const available = await provider.checkAvailability(route.locator);
          return {
            ...route,
            status: available ? 'active' as const : 'unavailable' as const,
            last_checked_at: now,
          };
        } catch {
          return { ...route, status: 'unavailable' as const, last_checked_at: now };
        }
      }),
    );
  }

  /**
   * Verify data integrity against expected hash.
   */
  async verifyIntegrity(data: string, expectedSha256: string): Promise<boolean> {
    const hash = await sha256(data);
    return hash === expectedSha256;
  }
}
