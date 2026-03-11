/**
 * Vobjct — Main Module
 *
 * Integrates Vobjct manifests, Safe monitoring, chain adapters,
 * and storage layer into the Cosmorare application.
 */

import { storage } from '../storage';
import { sha256 } from '../crypto';
import type { VobjctManifest, StorageRoute, RecoveryRoute } from './schema';
import { validateManifest, getTrustSignals, isSafeProtected, getActiveStorageRoutes } from './schema';
import { buildManifest, verifyManifest, type ManifestBuildInput, type VerificationResult } from './manifest';
import { VobjctSafeEngine, getSafeBadges, type VobjctSafeConfig, type RouteCheckResult } from './safe';
import { CosmorareAdapter, registerAdapter, type ChainAdapter } from './adapters';
import { VobjctStorageLayer, SupabaseStorageProvider, IndexedDBStorageProvider, OnChainStorageProvider, HTTPSMirrorProvider } from './storage-layer';

// Re-exports
export type { VobjctManifest, StorageRoute, RecoveryRoute, VobjctSafeConfig, ManifestBuildInput, VerificationResult, RouteCheckResult };
export { validateManifest, getTrustSignals, isSafeProtected, getSafeBadges, getActiveStorageRoutes };
export { buildManifest, verifyManifest };
export type { ChainAdapter };

// ─── Storage Keys ───────────────────────────────────────────

const VOBJCT_STORAGE_KEY = 'cosmorare_vobjcts';

// ─── Main Vobjct Engine ─────────────────────────────────────

export class VobjctEngine {
  private manifests: Map<string, VobjctManifest> = new Map();
  private safeEngine: VobjctSafeEngine;
  private storageLayer: VobjctStorageLayer;
  private adapter: CosmorareAdapter | null = null;

  constructor() {
    this.safeEngine = new VobjctSafeEngine();
    this.storageLayer = new VobjctStorageLayer();
    this.loadManifests();
  }

  private loadManifests(): void {
    const raw = storage.getItem(VOBJCT_STORAGE_KEY);
    if (!raw) return;
    try {
      const data: Record<string, VobjctManifest> = JSON.parse(raw);
      for (const [id, manifest] of Object.entries(data)) {
        this.manifests.set(id, manifest);
      }
    } catch { /* corrupt */ }
  }

  private saveManifests(): void {
    const data: Record<string, VobjctManifest> = {};
    for (const [id, manifest] of this.manifests) {
      data[id] = manifest;
    }
    storage.setItem(VOBJCT_STORAGE_KEY, JSON.stringify(data));
  }

  // ─── Initialization ─────────────────────────────────────

  /**
   * Initialize the Vobjct engine with the Cosmorare adapter and storage providers.
   */
  initCosmorare(
    wartLookup: (id: string) => { owner: string; certId?: string; onChainTxId?: string } | null,
    supabaseUpload?: (data: string, wartId: string, type: 'main' | 'cover') => Promise<string | null>,
    supabaseDownload?: (path: string) => Promise<string | null>,
    supabaseGetUrl?: (path: string) => string,
    indexedDBStore?: (wartId: string, data: string, cover?: string) => Promise<void>,
    indexedDBRetrieve?: (wartId: string) => Promise<{ imageData: string; audioCover?: string } | null>,
    getOnChainSVG?: (wartId: string) => string | undefined,
  ): void {
    // Register Cosmorare adapter
    this.adapter = new CosmorareAdapter(wartLookup);
    registerAdapter('cosmorare', this.adapter);

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

  // ─── Manifest CRUD ──────────────────────────────────────

  /**
   * Create a Vobjct manifest for a Wart (artwork).
   * Called automatically during the mint process.
   */
  async createForWart(params: {
    wartId: string;
    title: string;
    description: string;
    imageData: string;
    mediaType: 'image' | 'audio' | 'video' | 'svg';
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
  }): Promise<VobjctManifest> {
    const mimeMap: Record<string, string> = {
      image: 'image/png',
      audio: 'audio/mpeg',
      video: 'video/mp4',
      svg: 'image/svg+xml',
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
      objectId: `cosmorare:wart:${params.wartId}`,
      objectType,
      namespaceName: 'Cosmorare',
      namespaceSlug: 'cosmorare',
      chainFamily: 'cosmorare',
      chainName: 'cosmochain',
      tokenStandard: 'CW-721',
      contractRef: params.certId || 'cosmorare_protocol',
      tokenRef: params.wartId,
      ownerRef: params.creator,
      canonicalData: params.imageData,
      canonicalMimeType: mimeMap[params.mediaType] || 'application/octet-stream',
      name: params.title,
      description: params.description,
      externalUrl: `cosmorare://wart/${params.wartId}`,
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

    // Create Safe for this Vobjct
    this.safeEngine.createSafe(params.wartId, params.creator);

    return manifest;
  }

  /**
   * Get a Vobjct manifest by wart ID.
   */
  getManifest(wartId: string): VobjctManifest | null {
    return this.manifests.get(wartId) || null;
  }

  /**
   * Verify a Vobjct manifest's integrity, optionally checking against the actual data.
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

  getSafe(wartId: string): VobjctSafeConfig | null {
    return this.safeEngine.getSafe(wartId);
  }

  getSafeEngine(): VobjctSafeEngine {
    return this.safeEngine;
  }

  /**
   * Run a full health check on a Vobjct.
   */
  async runHealthCheck(wartId: string): Promise<{
    manifest: VobjctManifest;
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
   * Check if a Vobjct is Safe protected.
   */
  isProtected(wartId: string): boolean {
    const manifest = this.manifests.get(wartId);
    return manifest ? isSafeProtected(manifest) : false;
  }

  // ─── Storage Layer Access ───────────────────────────────

  getStorageLayer(): VobjctStorageLayer {
    return this.storageLayer;
  }

  // ─── Bulk Operations ────────────────────────────────────

  /**
   * Get all manifests.
   */
  getAllManifests(): Array<{ wartId: string; manifest: VobjctManifest }> {
    return Array.from(this.manifests.entries()).map(([wartId, manifest]) => ({ wartId, manifest }));
  }

  /**
   * Get health summary across all protected Vobjcts.
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

let vobjctInstance: VobjctEngine | null = null;

export function getVobjctEngine(): VobjctEngine {
  if (!vobjctInstance) {
    vobjctInstance = new VobjctEngine();
  }
  return vobjctInstance;
}
