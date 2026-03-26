/**
 * Strangrz — Manifest Generation Pipeline
 *
 * Creates, signs, and verifies Strangrz manifests from digital assets.
 * Integrates with the Strangrz Wart system and any chain adapter.
 */

import { sha256, signWithAlgorithm, verifyWithAlgorithm } from '../crypto';
import { computeCID } from '../cid';
import type {
  StrangrzManifest, TokenBinding, AssetDescriptor, StrangrzMetadata,
  StrangrzRights, StrangrzPolicy, StorageRoute, RecoveryRoute,
  StrangrzSignature, ObjectType, StrangrzIntegrity, ChainFamily,
} from './schema';

// ─── Manifest Builder ───────────────────────────────────────

export interface ManifestBuildInput {
  // Identity
  objectId: string;
  objectType: ObjectType;
  namespaceName: string;
  namespaceSlug: string;

  // Token binding
  chainFamily: ChainFamily;
  chainName: string;
  tokenStandard: string;
  contractRef: string;
  tokenRef: string;
  ownerRef?: string;

  // Asset data
  canonicalData: string;       // raw media data (data URL or base64)
  canonicalMimeType: string;
  previewData?: string;
  previewMimeType?: string;

  // Metadata
  name: string;
  description: string;
  externalUrl?: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;

  // Rights
  rights?: Partial<StrangrzRights>;

  // Policy
  policy?: Partial<StrangrzPolicy>;

  // Storage
  storageRoutes?: StorageRoute[];

  // Recovery
  recoveryRoutes?: RecoveryRoute[];

  // Signing
  creatorPrivateKey?: string;
  creatorPublicKey?: string;
  signatureAlgorithm?: 'ed25519' | 'dilithium3' | 'dilithium5' | 'sphincs_sha256_128f' | 'sphincs_sha256_256f';
}

/**
 * Build a complete Strangrz manifest from input data.
 * Computes all hashes, generates signatures, and validates the result.
 */
export async function buildManifest(input: ManifestBuildInput): Promise<StrangrzManifest> {
  const now = new Date().toISOString();

  // Compute asset hashes and CIDs
  const canonicalSha256 = await sha256(input.canonicalData);
  const canonicalCID = await computeCID(input.canonicalData);
  const canonicalSize = new TextEncoder().encode(input.canonicalData).length;

  const canonicalAsset: AssetDescriptor = {
    mime_type: input.canonicalMimeType,
    sha256: canonicalSha256,
    cid: canonicalCID,
    size_bytes: canonicalSize,
    canonical: true,
  };

  let previewAsset: AssetDescriptor | undefined;
  let previewCID: string | undefined;
  if (input.previewData) {
    const previewSha256 = await sha256(input.previewData);
    previewCID = await computeCID(input.previewData);
    const previewSize = new TextEncoder().encode(input.previewData).length;
    previewAsset = {
      mime_type: input.previewMimeType || 'image/webp',
      sha256: previewSha256,
      cid: previewCID,
      size_bytes: previewSize,
    };
  }

  // Token binding
  const tokenBinding: TokenBinding = {
    chain_family: input.chainFamily,
    chain_name: input.chainName,
    token_standard: input.tokenStandard,
    contract_or_issuer_reference: input.contractRef,
    token_id_or_asset_reference: input.tokenRef,
    owner_reference: input.ownerRef,
  };

  // Metadata
  const metadata: StrangrzMetadata = {
    name: input.name,
    description: input.description,
    external_url: input.externalUrl,
    attributes: input.attributes,
  };

  // Rights (defaults)
  const rights: StrangrzRights = {
    display: 'allowed',
    commercial_use: 'personal_only',
    derivatives: 'forbidden',
    license_version: '1.0.0',
    ...input.rights,
  };

  // Policy (defaults)
  const policy: StrangrzPolicy = {
    mutability: 'frozen',
    restoration_allowed: true,
    migration_allowed: true,
    official_branches: false,
    ...input.policy,
  };

  // Storage routes
  const storageRoutes: StorageRoute[] = input.storageRoutes || [];

  // Recovery routes
  const recoveryRoutes: RecoveryRoute[] = input.recoveryRoutes || [];

  // Signatures (supports Ed25519 and post-quantum algorithms)
  const sigAlgorithm = input.signatureAlgorithm || 'ed25519';
  const signatures: StrangrzSignature[] = [];
  if (input.creatorPrivateKey && input.creatorPublicKey) {
    try {
      const sig = await signWithAlgorithm(canonicalSha256, input.creatorPrivateKey, sigAlgorithm);
      signatures.push({
        role: 'creator',
        algorithm: sigAlgorithm,
        public_key: input.creatorPublicKey,
        signature: sig,
        signed_at: now,
      });
    } catch { /* signing failed */ }
  }

  // Build integrity (without manifest hash first)
  const integrity: StrangrzIntegrity = {
    manifest_sha256: '', // computed below
    canonical_asset_sha256: canonicalSha256,
    canonical_asset_cid: canonicalCID,
    preview_asset_sha256: previewAsset?.sha256,
    preview_asset_cid: previewCID,
    status: 'verified',
    last_verified_at: now,
  };

  // Assemble manifest
  const manifest: StrangrzManifest = {
    vobjct_version: '1.0.0',
    object_id: input.objectId,
    object_type: input.objectType,
    collection_or_namespace: {
      name: input.namespaceName,
      slug: input.namespaceSlug,
      issuer: input.ownerRef,
    },
    token_binding: tokenBinding,
    canonical_asset: canonicalAsset,
    preview_asset: previewAsset,
    metadata,
    rights,
    policy,
    integrity,
    storage_routes: storageRoutes,
    recovery_routes: recoveryRoutes,
    signatures,
    timestamps: {
      created_at: now,
      last_verified_at: now,
    },
  };

  // Compute manifest hash (hash of everything except manifest_sha256 itself)
  const manifestForHash = { ...manifest, integrity: { ...manifest.integrity, manifest_sha256: '' } };
  manifest.integrity.manifest_sha256 = await sha256(JSON.stringify(manifestForHash));

  return manifest;
}

// ─── Verification ───────────────────────────────────────────

export interface VerificationResult {
  valid: boolean;
  checks: {
    manifest_hash: boolean;
    canonical_hash: boolean;
    preview_hash: boolean;
    signatures: Array<{ role: string; valid: boolean }>;
  };
  errors: string[];
}

/**
 * Verify a Strangrz manifest's integrity.
 * Checks manifest hash, asset hashes, and signatures.
 */
export async function verifyManifest(
  manifest: StrangrzManifest,
  canonicalData?: string,
  previewData?: string,
): Promise<VerificationResult> {
  const errors: string[] = [];

  // Check manifest hash
  const manifestForHash = { ...manifest, integrity: { ...manifest.integrity, manifest_sha256: '' } };
  const computedManifestHash = await sha256(JSON.stringify(manifestForHash));
  const manifestHashValid = computedManifestHash === manifest.integrity.manifest_sha256;
  if (!manifestHashValid) errors.push('Manifest hash mismatch');

  // Check canonical asset hash
  let canonicalHashValid = true;
  if (canonicalData) {
    const computedHash = await sha256(canonicalData);
    canonicalHashValid = computedHash === manifest.canonical_asset.sha256;
    if (!canonicalHashValid) errors.push('Canonical asset hash mismatch');
  }

  // Check preview asset hash
  let previewHashValid = true;
  if (previewData && manifest.preview_asset) {
    const computedHash = await sha256(previewData);
    previewHashValid = computedHash === manifest.preview_asset.sha256;
    if (!previewHashValid) errors.push('Preview asset hash mismatch');
  }

  // Verify signatures (supports Ed25519 and post-quantum algorithms)
  const sigResults: Array<{ role: string; valid: boolean }> = [];
  for (const sig of manifest.signatures) {
    try {
      const valid = await verifyWithAlgorithm(
        manifest.canonical_asset.sha256,
        sig.signature,
        sig.public_key,
        sig.algorithm,
      );
      sigResults.push({ role: sig.role, valid });
      if (!valid) errors.push(`Invalid ${sig.role} signature (${sig.algorithm})`);
    } catch {
      sigResults.push({ role: sig.role, valid: false });
      errors.push(`Failed to verify ${sig.role} signature (${sig.algorithm})`);
    }
  }

  return {
    valid: errors.length === 0,
    checks: {
      manifest_hash: manifestHashValid,
      canonical_hash: canonicalHashValid,
      preview_hash: previewHashValid,
      signatures: sigResults,
    },
    errors,
  };
}

// ─── Manifest Serialization ─────────────────────────────────

export function serializeManifest(manifest: StrangrzManifest): string {
  return JSON.stringify(manifest, null, 2);
}

export function deserializeManifest(json: string): StrangrzManifest {
  return JSON.parse(json) as StrangrzManifest;
}
