/**
 * Strangrz — Main Module
 *
 * Integrates Strangrz manifests, Safe monitoring, chain adapters,
 * and storage layer into the Strangrz application.
 */

import { storage } from '../storage';
import { sha256 } from '../crypto';
import type { StrangrzManifest, StorageRoute, RecoveryRoute } from './schema';
import { validateManifest, getTrustSignals, isSafeProtected, getActiveStorageRoutes } from './schema';
import { buildManifest, verifyManifest, type ManifestBuildInput, type VerificationResult } from './manifest';
import { StrangrzSafeEngine, getSafeBadges, type StrangrzSafeConfig, type RouteCheckResult } from './safe';
import { StrangrzAdapter, EVMAdapter, registerAdapter, type ChainAdapter } from './adapters';
import { StrangrzStorageLayer, SupabaseStorageProvider, IndexedDBStorageProvider, OnChainStorageProvider, HTTPSMirrorProvider } from './storage-layer';

// Re-exports
export type { StrangrzManifest, StorageRoute, RecoveryRoute, StrangrzSafeConfig, ManifestBuildInput, VerificationResult, RouteCheckResult };
export { validateManifest, getTrustSignals, isSafeProtected, getSafeBadges, getActiveStorageRoutes };
export { buildManifest, verifyManifest };
export type { ChainAdapter };

// ─── Storage Keys ───────────────────────────────────────────

const VOBJCT_STORAGE_KEY = 'strangrz_vobjcts';

// ─── Main Strangrz Engine ─────────────────────────────────────

export class StrangrzEngine {
  private manifests: Map<string, StrangrzManifest> = new Map();
  private safeEngine: StrangrzSafeEngine;
  private storageLayer: StrangrzStorageLayer;
  private adapter: StrangrzAdapter | null = null;

  constructor() {
    this.safeEngine = new StrangrzSafeEngine();
    this.storageLayer = new StrangrzStorageLayer();
    this.loadManifests();
  }

  private loadManifests(): void {
    const raw = storage.getItem(VOBJCT_STORAGE_KEY);
    if (!raw) return;
    try {
      const data: Record<string, StrangrzManifest> = JSON.parse(raw);
      for (const [id, manifest] of Object.entries(data)) {
        this.manifests.set(id, manifest);
      }
    } catch { /* corrupt */ }
  }

  private saveManifests(): void {
    const data: Record<string, StrangrzManifest> = {};
    for (const [id, manifest] of this.manifests) {
      data[id] = manifest;
    }
    storage.setItem(VOBJCT_STORAGE_KEY, JSON.stringify(data));
  }

  // ─── Initialization ─────────────────────────────────────

  /**
   * Initialize the Strangrz engine with the Strangrz adapter and storage providers.
   */
  initStrangrz(
    wartLookup: (id: string) => { owner: string; certId?: string; onChainTxId?: string } | null,
    supabaseUpload?: (data: string, wartId: string, type: 'main' | 'cover') => Promise<string | null>,
    supabaseDownload?: (path: string) => Promise<string | null>,
    supabaseGetUrl?: (path: string) => string,
    indexedDBStore?: (wartId: string, data: string, cover?: string) => Promise<void>,
    indexedDBRetrieve?: (wartId: string) => Promise<{ imageData: string; audioCover?: string } | null>,
    getOnChainSVG?: (wartId: string) => string | undefined,
  ): void {
    // Register Strangrz adapter
    this.adapter = new StrangrzAdapter(wartLookup);
    registerAdapter('strangrz', this.adapter);

    // Register storage providers
    if (supabaseUpload && supabaseDownload && supabaseGetUrl) {
      this.storageLayer.registerProvider(
        new SupabaseStorageProvider(supabaseUpload, supabaseDownload, supabaseGetUrl)
      );
    }

    if (indexedDBStore && indexedDBRetrieve) {
      this.storageLayer.registerProvider(
        new IndexedDBStorageProvider(indexedDBStore, indexedDBRetrieve)
      );
    }

    if (getOnChainSVG) {
      this.storageLayer.registerProvider(
        new OnChainStorageProvider(getOnChainSVG)
      );
    }

    // Always register HTTPS mirror support
    this.storageLayer.registerProvider(new HTTPSMirrorProvider());
  }

  /** Initialize Ethereum (EVM) adapter for ERC-721 minting */
  initEthereum(): void {
    const evmAdapter = new EVMAdapter('ethereum_mainnet', 'ERC-721');
    registerAdapter('ethereum', evmAdapter);
  }

  // ─── Manifest CRUD ──────────────────────────────────────

  /**
   * Create a Strangrz manifest for a Wart (artwork).
   * Called automatically during the mint process.
   */
  async createForWart(params: {
    wartId: string;
    title: string;
    description: string;
    imageData: string;
    mediaType: 'image' | 'audio' | 'video' | 'svg' | 'cards';
    creator: string;
    creatorPublicKey: string;
    creatorPrivateKey?: string;
    certId?: string;
    onChainTxId?: string;
    editionType: string;
    editionNumber: number;
    maxEditions: number | null;
    royaltyPercent: number;
    storageRoutes?: StorageRoute[];
  }): Promise<StrangrzManifest> {
    const mimeMap: Record<string, string> = {
      image: 'image/png',
      audio: 'audio/mpeg',
      video: 'video/mp4',
      svg: 'image/svg+xml',
      cards: 'image/png',
    };

    // Determine object type
    const objectType = params.mediaType === 'audio' ? 'music' :
      params.mediaType === 'video' ? 'video' : 'digital_art';

    // Build storage routes from current state
    const routes: StorageRoute[] = params.storageRoutes || [];

    // Add on-chain route if available
    if (params.onChainTxId) {
      routes.push({
        network: 'onchain',
        locator: `onchain://${params.wartId}`,
        priority: 1,
        status: 'active',
        last_checked_at: new Date().toISOString(),
      });
    }

    // Build recovery routes
    const recoveryRoutes: RecoveryRoute[] = [
      { type: 'vault_backup', locator: `cosmovault://${params.wartId}`, status: 'active' },
    ];
    if (params.onChainTxId) {
      recoveryRoutes.push({ type: 'onchain_recovery', locator: `onchain://${params.wartId}`, status: 'active' });
    }

    const input: ManifestBuildInput = {
      objectId: `strangrz:wart:${params.wartId}`,
      objectType,
      namespaceName: 'Strangrz',
      namespaceSlug: 'strangrz',
      chainFamily: 'strangrz',
      chainName: 'strangrzchain',
      tokenStandard: 'SZ-721',
      contractRef: params.certId || 'strangrz_protocol',
      tokenRef: params.wartId,
      ownerRef: params.creator,
      canonicalData: params.imageData,
      canonicalMimeType: mimeMap[params.mediaType] || 'application/octet-stream',
      name: params.title,
      description: params.description,
      externalUrl: `strangrz://wart/${params.wartId}`,
      attributes: [
        { trait_type: 'Edition Type', value: params.editionType },
        { trait_type: 'Edition Number', value: params.editionNumber },
        ...(params.maxEditions ? [{ trait_type: 'Max Editions', value: params.maxEditions }] : []),
        { trait_type: 'Royalty %', value: params.royaltyPercent },
      ],
      rights: {
        display: 'allowed',
        commercial_use: 'personal_only',
        derivatives: 'forbidden',
        license_version: '1.0.0',
      },
      policy: {
        mutability: 'frozen',
        restoration_allowed: true,
        migration_allowed: true,
        official_branches: false,
      },
      storageRoutes: routes,
      recoveryRoutes,
      creatorPrivateKey: params.creatorPrivateKey,
      creatorPublicKey: params.creatorPublicKey,
    };

    const manifest = await buildManifest(input);
    this.manifests.set(params.wartId, manifest);
    this.saveManifests();

    // Create Safe for this Strangrz
    this.safeEngine.createSafe(params.wartId, params.creator);

    return manifest;
  }

  /**
   * Get a Strangrz manifest by wart ID.
   */
  getManifest(wartId: string): StrangrzManifest | null {
    return this.manifests.get(wartId) || null;
  }

  /**
   * Verify a Strangrz manifest's integrity, optionally checking against the actual data.
   */
  async verify(wartId: string, canonicalData?: string): Promise<VerificationResult | null> {
    const manifest = this.manifests.get(wartId);
    if (!manifest) return null;
    return verifyManifest(manifest, canonicalData);
  }

  /**
   * Update storage routes for a manifest (e.g., after uploading to new provider).
   */
  async updateStorageRoutes(wartId: string, routes: StorageRoute[]): Promise<void> {
    const manifest = this.manifests.get(wartId);
    if (!manifest) return;
    manifest.storage_routes = routes;
    manifest.timestamps.last_verified_at = new Date().toISOString();
    // Recompute manifest hash
    const forHash = { ...manifest, integrity: { ...manifest.integrity, manifest_sha256: '' } };
    manifest.integrity.manifest_sha256 = await sha256(JSON.stringify(forHash));
    this.saveManifests();
  }

  // ─── Safe Operations ────────────────────────────────────

  getSafe(wartId: string): StrangrzSafeConfig | null {
    return this.safeEngine.getSafe(wartId);
  }

  getSafeEngine(): StrangrzSafeEngine {
    return this.safeEngine;
  }

  /**
   * Run a full health check on a Strangrz.
   */
  async runHealthCheck(wartId: string): Promise<{
    manifest: StrangrzManifest;
    routeChecks: RouteCheckResult[];
    evaluation: ReturnType<typeof import('./safe').evaluateHealth> | null;
  } | null> {
    const manifest = this.manifests.get(wartId);
    if (!manifest) return null;

    // Check all storage routes
    const checkedRoutes = await this.storageLayer.checkAllRoutes(manifest.storage_routes);

    // Update manifest routes
    manifest.storage_routes = checkedRoutes;
    this.saveManifests();

    // Build route check results
    const routeChecks: RouteCheckResult[] = checkedRoutes.map(route => ({
      route,
      available: route.status === 'active',
      checked_at: route.last_checked_at || new Date().toISOString(),
    }));

    // Evaluate health via Safe
    const evaluation = await this.safeEngine.runHealthCheck(wartId, manifest, routeChecks);

    return { manifest, routeChecks, evaluation };
  }

  // ─── Trust Signals ──────────────────────────────────────

  /**
   * Get trust signals for display in the UI.
   */
  getTrustBadges(wartId: string): string[] {
    const manifest = this.manifests.get(wartId);
    if (!manifest) return [];

    const signals = getTrustSignals(manifest);
    const safeBadges = getSafeBadges(this.safeEngine.getSafe(wartId));

    return [...new Set([...signals, ...safeBadges])];
  }

  /**
   * Check if a Strangrz is Safe protected.
   */
  isProtected(wartId: string): boolean {
    const manifest = this.manifests.get(wartId);
    return manifest ? isSafeProtected(manifest) : false;
  }

  // ─── Storage Layer Access ───────────────────────────────

  getStorageLayer(): StrangrzStorageLayer {
    return this.storageLayer;
  }

  // ─── Bulk Operations ────────────────────────────────────

  /**
   * Get all manifests.
   */
  getAllManifests(): Array<{ wartId: string; manifest: StrangrzManifest }> {
    return Array.from(this.manifests.entries()).map(([wartId, manifest]) => ({ wartId, manifest }));
  }

  /**
   * Get health summary across all protected Strangrzs.
   */
  getHealthSummary() {
    return this.safeEngine.getHealthSummary();
  }

  /**
   * Get recent incidents.
   */
  getRecentIncidents(limit?: number) {
    return this.safeEngine.getRecentIncidents(limit);
  }
}

// ─── Singleton ──────────────────────────────────────────────

let vobjctInstance: StrangrzEngine | null = null;

export function getStrangrzEngine(): StrangrzEngine {
  if (!vobjctInstance) {
    vobjctInstance = new StrangrzEngine();
  }
  return vobjctInstance;
}
