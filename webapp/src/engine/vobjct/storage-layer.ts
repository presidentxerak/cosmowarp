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
import { computeCID, verifyCID } from '../cid';
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

// ─── IPFS Provider ──────────────────────────────────────────

export interface IPFSConfig {
  gatewayUrl: string;           // e.g. "https://ipfs.io/ipfs/" or "https://dweb.link/ipfs/"
  pinningApiUrl?: string;       // e.g. "https://api.pinata.cloud" or "https://api.web3.storage"
  pinningApiToken?: string;
}

export class IPFSStorageProvider implements StorageProvider {
  readonly network: StorageNetwork = 'ipfs';
  readonly name = 'IPFS (Content-Addressed)';

  private config: IPFSConfig;

  constructor(config: IPFSConfig) {
    this.config = config;
  }

  /**
   * Upload data to IPFS via a pinning service API.
   * Returns the CID as locator: "ipfs://<cid>"
   */
  async upload(data: string, _path: string): Promise<string | null> {
    if (!this.config.pinningApiUrl || !this.config.pinningApiToken) {
      return null; // No pinning service configured — read-only gateway mode
    }

    try {
      // Convert data to blob for upload
      const blob = dataToBlob(data);

      const formData = new FormData();
      formData.append('file', blob);

      const response = await fetch(`${this.config.pinningApiUrl}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.pinningApiToken}`,
        },
        body: formData,
      });

      if (!response.ok) return null;

      const result = await response.json();
      const cid = result.IpfsHash || result.cid;
      if (!cid) return null;

      return `ipfs://${cid}`;
    } catch {
      return null;
    }
  }

  /**
   * Download data from IPFS via the configured gateway.
   */
  async download(locator: string): Promise<string | null> {
    try {
      const cid = extractCID(locator);
      if (!cid) return null;

      const gatewayUrl = this.config.gatewayUrl.replace(/\/$/, '');
      const response = await fetch(`${gatewayUrl}/${cid}`);
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

  /**
   * Check if content is available on IPFS via the gateway.
   */
  async checkAvailability(locator: string): Promise<boolean> {
    try {
      const cid = extractCID(locator);
      if (!cid) return false;

      const gatewayUrl = this.config.gatewayUrl.replace(/\/$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`${gatewayUrl}/${cid}`, {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  async remove(_locator: string): Promise<boolean> {
    // IPFS content is immutable — unpinning only removes local pin
    if (!this.config.pinningApiUrl || !this.config.pinningApiToken) return false;

    try {
      const cid = extractCID(_locator);
      if (!cid) return false;

      const response = await fetch(`${this.config.pinningApiUrl}/pinning/unpin/${cid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.pinningApiToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Verify content integrity using the CID.
   * IPFS CIDs are content-addressed — the hash IS the identifier.
   */
  async verifyContentIntegrity(locator: string, data: string): Promise<boolean> {
    const cid = extractCID(locator);
    if (!cid) return false;
    return verifyCID(data, cid);
  }
}

// ─── Arweave Provider ───────────────────────────────────────

export interface ArweaveConfig {
  gatewayUrl: string;           // e.g. "https://arweave.net"
  walletJWK?: object;           // Arweave wallet JWK for uploads
  bundlerUrl?: string;          // e.g. "https://node1.bundlr.network" for Bundlr/Irys
  bundlerToken?: string;
}

export class ArweaveStorageProvider implements StorageProvider {
  readonly network: StorageNetwork = 'arweave';
  readonly name = 'Arweave (Permanent Storage)';

  private config: ArweaveConfig;

  constructor(config: ArweaveConfig) {
    this.config = config;
  }

  /**
   * Upload data to Arweave via a bundler/upload service.
   * Returns locator: "ar://<txId>"
   */
  async upload(data: string, _path: string): Promise<string | null> {
    if (!this.config.bundlerUrl || !this.config.bundlerToken) {
      return null; // No upload service configured — read-only gateway mode
    }

    try {
      const blob = dataToBlob(data);
      const buffer = await blob.arrayBuffer();

      const response = await fetch(`${this.config.bundlerUrl}/tx`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.bundlerToken}`,
          'Content-Type': 'application/octet-stream',
        },
        body: buffer,
      });

      if (!response.ok) return null;

      const result = await response.json();
      const txId = result.id;
      if (!txId) return null;

      return `ar://${txId}`;
    } catch {
      return null;
    }
  }

  /**
   * Download data from Arweave via the gateway.
   */
  async download(locator: string): Promise<string | null> {
    try {
      const txId = extractArweaveTxId(locator);
      if (!txId) return null;

      const gatewayUrl = this.config.gatewayUrl.replace(/\/$/, '');
      const response = await fetch(`${gatewayUrl}/${txId}`);
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

  /**
   * Check if content is available on Arweave.
   * Arweave data is permanent — this checks gateway accessibility.
   */
  async checkAvailability(locator: string): Promise<boolean> {
    try {
      const txId = extractArweaveTxId(locator);
      if (!txId) return false;

      const gatewayUrl = this.config.gatewayUrl.replace(/\/$/, '');
      const response = await fetch(`${gatewayUrl}/${txId}`, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  async remove(_locator: string): Promise<boolean> {
    return false; // Arweave data is permanent and immutable
  }
}

// ─── Helpers ────────────────────────────────────────────────

/** Extract CID from various IPFS locator formats */
function extractCID(locator: string): string | null {
  if (locator.startsWith('ipfs://')) return locator.slice(7);
  if (locator.startsWith('/ipfs/')) return locator.slice(6);
  // Gateway URL: https://ipfs.io/ipfs/Qm...
  const match = locator.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  // Bare CID (starts with Qm or bafy)
  if (/^(Qm[a-zA-Z0-9]{44}|bafy[a-zA-Z0-9]+)$/.test(locator)) return locator;
  return null;
}

/** Extract Arweave transaction ID from locator */
function extractArweaveTxId(locator: string): string | null {
  if (locator.startsWith('ar://')) return locator.slice(5);
  // Gateway URL: https://arweave.net/<txId>
  const match = locator.match(/arweave\.net\/([a-zA-Z0-9_-]{43})/);
  if (match) return match[1];
  // Bare 43-char base64url transaction ID
  if (/^[a-zA-Z0-9_-]{43}$/.test(locator)) return locator;
  return null;
}

/** Convert data string (data URL or raw) to Blob */
function dataToBlob(data: string): Blob {
  if (data.startsWith('data:')) {
    const [header, b64] = data.split(',');
    const mime = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([data], { type: 'application/octet-stream' });
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
   * Upload data to all providers, using the IPFS CID as the canonical
   * content identifier when an IPFS provider is registered.
   * Falls back to SHA-256 hash for non-CID providers.
   */
  async uploadWithCID(data: string, path: string): Promise<{
    cid: string | null;
    sha256: string;
    routes: StorageRoute[];
  }> {
    const hash = await sha256(data);
    const cid = await computeCID(data);
    const routes = await this.uploadToAll(data, path);

    return { cid, sha256: hash, routes };
  }

  /**
   * Resolve a CID to a downloadable route. Checks IPFS first, then
   * falls back to other providers that may hold the same content.
   */
  async downloadByCID(cid: string, routes: StorageRoute[]): Promise<{ data: string; route: StorageRoute } | null> {
    // Prefer IPFS route matching this CID
    const ipfsRoute = routes.find(r => r.network === 'ipfs' && r.locator === `ipfs://${cid}`);
    if (ipfsRoute) {
      const provider = this.providers.get('ipfs');
      if (provider) {
        const data = await provider.download(ipfsRoute.locator);
        if (data) return { data, route: ipfsRoute };
      }
    }

    // Fall back to best available route
    return this.downloadFromBest(routes);
  }

  /**
   * Verify data integrity against expected hash.
   */
  async verifyIntegrity(data: string, expectedSha256: string): Promise<boolean> {
    const hash = await sha256(data);
    return hash === expectedSha256;
  }

  /**
   * Verify data integrity using CID (content-addressed verification).
   * This is the preferred verification method when CIDs are available.
   */
  async verifyIntegrityByCID(data: string, expectedCID: string): Promise<boolean> {
    return verifyCID(data, expectedCID);
  }
}
