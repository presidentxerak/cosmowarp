/**
 * Strangrz — Core Schema & Types
 *
 * Chain-agnostic asset integrity and resilience standard.
 * Defines the canonical Strangrz manifest structure for token-bound
 * digital assets with integrity verification, storage routing,
 * recovery paths, rights management, and mutation policy.
 *
 * Version: 1.0.0
 */

// ─── Core Types ─────────────────────────────────────────────

export type ChainFamily = 'evm' | 'xrpl' | 'solana' | 'utxo' | 'strangrz' | 'custom';

export type ObjectType =
  | 'digital_collectible'
  | 'digital_art'
  | 'music'
  | 'video'
  | 'document'
  | 'certificate'
  | 'ticket'
  | 'license'
  | 'phygital'
  | 'pfp'
  | 'custom';

export type MutabilityPolicy = 'frozen' | 'creator_only' | 'governance' | 'open';
export type IntegrityStatus = 'verified' | 'unverified' | 'mismatch' | 'pending';
export type StorageNetwork = 'arweave' | 'ipfs' | 'https' | 'supabase' | 'indexeddb' | 'onchain' | 'custom';
export type RecoveryType = 'mirror_pool' | 'vault_backup' | 'onchain_recovery' | 'peer_recovery' | 'archive_operator';
export type RightsLevel = 'allowed' | 'personal_only' | 'commercial' | 'forbidden' | 'custom';
export type SignatureAlgorithm =
  | 'ed25519'
  | 'ecdsa_secp256k1'
  | 'ecdsa_secp256r1'
  | 'dilithium3'          // CRYSTALS-Dilithium (ML-DSA-65) — NIST PQC standard
  | 'dilithium5'          // CRYSTALS-Dilithium (ML-DSA-87) — highest security level
  | 'sphincs_sha256_128f' // SPHINCS+ (SLH-DSA) — stateless hash-based, fast signing
  | 'sphincs_sha256_256f' // SPHINCS+ (SLH-DSA) — highest security level
  | 'custom';
export type SignatureRole = 'issuer' | 'creator' | 'owner' | 'archive_operator' | 'safe_operator' | 'auditor';

// ─── Token Binding ──────────────────────────────────────────

export interface TokenBinding {
  chain_family: ChainFamily;
  chain_name: string;
  token_standard: string;
  contract_or_issuer_reference: string;
  token_id_or_asset_reference: string;
  owner_reference?: string;
}

// ─── Asset Descriptor ───────────────────────────────────────

export interface AssetDescriptor {
  mime_type: string;
  sha256: string;
  cid?: string;            // IPFS CIDv1 — content-addressed identifier (preferred over URLs)
  size_bytes: number;
  canonical?: boolean;
  encoding?: string;
}

// ─── Metadata ───────────────────────────────────────────────

export interface StrangrzMetadata {
  name: string;
  description: string;
  external_url?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  tags?: string[];
}

// ─── Rights ─────────────────────────────────────────────────

export interface StrangrzRights {
  display: RightsLevel;
  commercial_use: RightsLevel;
  derivatives: RightsLevel;
  license_version: string;
  license_url?: string;
  custom_terms?: string;
}

// ─── Policy ─────────────────────────────────────────────────

export interface StrangrzPolicy {
  mutability: MutabilityPolicy;
  restoration_allowed: boolean;
  migration_allowed: boolean;
  migration_rule?: string;
  official_branches: boolean;
}

// ─── Integrity ──────────────────────────────────────────────

export interface StrangrzIntegrity {
  manifest_sha256: string;
  canonical_asset_sha256: string;
  canonical_asset_cid?: string;   // IPFS CIDv1 of canonical asset
  preview_asset_sha256?: string;
  preview_asset_cid?: string;     // IPFS CIDv1 of preview asset
  status: IntegrityStatus;
  last_verified_at?: string;
}

// ─── Storage Route ──────────────────────────────────────────

export interface StorageRoute {
  network: StorageNetwork;
  locator: string;
  priority: number;
  status?: 'active' | 'degraded' | 'unavailable' | 'unknown';
  last_checked_at?: string;
}

// ─── Recovery Route ─────────────────────────────────────────

export interface RecoveryRoute {
  type: RecoveryType;
  locator: string;
  status?: 'active' | 'unavailable' | 'unknown';
}

// ─── Signature ──────────────────────────────────────────────

export interface StrangrzSignature {
  role: SignatureRole;
  algorithm: SignatureAlgorithm;
  public_key: string;
  signature: string;
  signed_at?: string;
}

// ─── Timestamps ─────────────────────────────────────────────

export interface StrangrzTimestamps {
  created_at: string;
  last_verified_at?: string;
  last_repaired_at?: string;
  last_migrated_at?: string;
}

// ─── Collection/Namespace ───────────────────────────────────

export interface StrangrzNamespace {
  name: string;
  slug: string;
  issuer?: string;
}

// ─── Full Strangrz Manifest ───────────────────────────────────

export interface StrangrzManifest {
  vobjct_version: '1.0.0';
  object_id: string;
  object_type: ObjectType;
  collection_or_namespace: StrangrzNamespace;
  token_binding: TokenBinding;
  canonical_asset: AssetDescriptor;
  preview_asset?: AssetDescriptor;
  metadata: StrangrzMetadata;
  rights: StrangrzRights;
  policy: StrangrzPolicy;
  integrity: StrangrzIntegrity;
  storage_routes: StorageRoute[];
  recovery_routes: RecoveryRoute[];
  signatures: StrangrzSignature[];
  timestamps: StrangrzTimestamps;
}

// ─── Schema Validation ──────────────────────────────────────

const REQUIRED_FIELDS: (keyof StrangrzManifest)[] = [
  'vobjct_version', 'object_id', 'object_type', 'collection_or_namespace',
  'token_binding', 'canonical_asset', 'metadata', 'rights', 'policy',
  'integrity', 'storage_routes', 'recovery_routes', 'signatures', 'timestamps',
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateManifest(manifest: Partial<StrangrzManifest>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (manifest[field] === undefined || manifest[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (manifest.vobjct_version && manifest.vobjct_version !== '1.0.0') {
    errors.push(`Unsupported version: ${manifest.vobjct_version}`);
  }

  // Validate token binding
  if (manifest.token_binding) {
    const tb = manifest.token_binding;
    if (!tb.chain_family) errors.push('token_binding.chain_family is required');
    if (!tb.chain_name) errors.push('token_binding.chain_name is required');
    if (!tb.contract_or_issuer_reference) errors.push('token_binding.contract_or_issuer_reference is required');
    if (!tb.token_id_or_asset_reference) errors.push('token_binding.token_id_or_asset_reference is required');
  }

  // Validate canonical asset
  if (manifest.canonical_asset) {
    if (!manifest.canonical_asset.sha256) errors.push('canonical_asset.sha256 is required');
    if (!manifest.canonical_asset.mime_type) errors.push('canonical_asset.mime_type is required');
  }

  // Validate integrity
  if (manifest.integrity) {
    if (!manifest.integrity.manifest_sha256) warnings.push('integrity.manifest_sha256 not yet computed');
    if (!manifest.integrity.canonical_asset_sha256) errors.push('integrity.canonical_asset_sha256 is required');
  }

  // Validate storage routes
  if (manifest.storage_routes) {
    if (manifest.storage_routes.length === 0) warnings.push('No storage routes defined');
    const priorities = manifest.storage_routes.map(r => r.priority);
    if (new Set(priorities).size !== priorities.length) warnings.push('Duplicate storage route priorities');
  }

  // Validate signatures
  if (manifest.signatures && manifest.signatures.length === 0) {
    warnings.push('No signatures present — manifest is unsigned');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Helpers ────────────────────────────────────────────────

export function getActiveStorageRoutes(manifest: StrangrzManifest): StorageRoute[] {
  return manifest.storage_routes
    .filter(r => r.status !== 'unavailable')
    .sort((a, b) => a.priority - b.priority);
}

export function getActiveRecoveryRoutes(manifest: StrangrzManifest): RecoveryRoute[] {
  return manifest.recovery_routes.filter(r => r.status !== 'unavailable');
}

export function getTrustSignals(manifest: StrangrzManifest): string[] {
  const signals: string[] = [];

  if (manifest.integrity.status === 'verified') signals.push('Integrity Verified');
  if (manifest.storage_routes.some(r => r.network === 'onchain' || r.network === 'arweave')) signals.push('Permanent Storage');
  if (manifest.storage_routes.some(r => r.network === 'ipfs')) signals.push('Content-Addressed');
  if (manifest.integrity.canonical_asset_cid) signals.push('CID Verified');
  if (manifest.storage_routes.filter(r => r.status === 'active').length >= 2) signals.push('Multi-Network Backup');
  if (manifest.rights.display !== 'forbidden') signals.push('Rights Embedded');
  if (manifest.recovery_routes.length > 0) signals.push('Recovery Active');

  return signals;
}

export function isSafeProtected(manifest: StrangrzManifest): boolean {
  return manifest.recovery_routes.length > 0 &&
    manifest.storage_routes.filter(r => r.status === 'active').length >= 2;
}
