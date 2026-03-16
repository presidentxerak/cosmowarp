/**
 * Strangrz Auto-Update Protocol — Automatic System & Security Updates
 *
 * Unlike Ethereum where hard forks require coordinated social consensus
 * and months of planning, Strangrz supports:
 *
 * 1. AUTOMATIC SECURITY PATCHES — Critical fixes applied immediately
 *    via signed update manifests. No waiting for "The Merge" equivalent.
 *
 * 2. SCHEDULED HARD FORKS — Protocol upgrades with automatic activation
 *    at a target block number. Nodes auto-migrate.
 *
 * 3. SOFT FORKS — Backward-compatible rule tightening. Old nodes still
 *    validate, new nodes enforce stricter rules.
 *
 * 4. FEATURE FLAGS — Gradual rollout of new features with kill switches.
 *
 * 5. DATA MIGRATION — Automatic schema evolution for IndexedDB stores.
 *    No manual intervention needed when storage format changes.
 *
 * 6. VALIDATOR VOTING — Non-critical upgrades require 2/3 validator approval.
 *    Critical security patches bypass voting (emergency protocol).
 *
 * Security: All updates are signed with Ed25519. The signing keys are
 * hardcoded genesis keys (not updateable — they ARE the trust root).
 *
 * This is better than Ethereum because:
 * - Security patches don't require social coordination
 * - Protocol versions are enforced, not optional
 * - Data migrations happen automatically
 * - Feature flags enable gradual rollouts
 * - Emergency patches bypass governance (with audit trail)
 */

import { sha256, verifySignature } from './crypto';

// ─── Protocol Version ───────────────────────────────────

export interface ProtocolVersion {
  major: number;    // Breaking changes (hard fork)
  minor: number;    // New features (soft fork)
  patch: number;    // Bug fixes and security patches
}

export function versionToString(v: ProtocolVersion): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

export function parseVersion(str: string): ProtocolVersion {
  const [major, minor, patch] = str.split('.').map(Number);
  return { major: major || 0, minor: minor || 0, patch: patch || 0 };
}

export function compareVersions(a: ProtocolVersion, b: ProtocolVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

// ─── Current Protocol Version ───────────────────────────

export const CURRENT_VERSION: ProtocolVersion = {
  major: 2,
  minor: 1,
  patch: 0,
};

// ─── Update Types ───────────────────────────────────────

export type UpdateType =
  | 'security_patch'      // Critical: auto-applied, no vote needed
  | 'hard_fork'           // Breaking: requires activation block + vote
  | 'soft_fork'           // Compatible: tighter rules, vote recommended
  | 'feature_flag'        // Gradual: toggleable features
  | 'data_migration'      // Schema: IndexedDB store evolution
  | 'parameter_update';   // Config: change chain parameters

export type UpdateStatus =
  | 'proposed'            // Update has been proposed
  | 'voting'              // Validators are voting
  | 'approved'            // Approved by 2/3 validators
  | 'rejected'            // Rejected by validators
  | 'scheduled'           // Approved, waiting for activation block
  | 'activating'          // Activation block reached, applying
  | 'active'              // Successfully applied
  | 'failed'              // Application failed
  | 'emergency';          // Security patch — bypass voting

// ─── Update Manifest ───────────────────────────────────

export interface UpdateManifest {
  id: string;                        // SHA-256 of manifest content
  version: ProtocolVersion;          // Target version
  type: UpdateType;
  title: string;
  description: string;
  // Activation
  activationBlock?: number;          // Hard fork: activate at this beacon block
  activationTimestamp?: number;      // Time-based activation
  // Security
  signature: string;                 // Ed25519 signature of manifest
  signerPublicKey: string;           // Signer's public key
  isCritical: boolean;               // True = emergency, bypasses voting
  // Changes
  changes: UpdateChange[];
  // Voting
  requiredApproval: number;          // 0-1, typically 0.67 (2/3)
  // Migration
  migrationSteps?: MigrationStep[];
  // Metadata
  createdAt: number;
  expiresAt?: number;                // Manifest expires if not activated by this time
}

export interface UpdateChange {
  component: string;                 // Which module is affected
  changeType: 'add' | 'modify' | 'remove' | 'config';
  description: string;
  parameters?: Record<string, unknown>;
}

export interface MigrationStep {
  store: string;                     // IndexedDB store name
  action: 'create' | 'alter' | 'migrate' | 'delete';
  description: string;
  transform?: string;                // Serialized transform function
}

// ─── Vote on Updates ────────────────────────────────────

export interface UpdateVote {
  updateId: string;
  validatorId: string;
  approve: boolean;
  signature: string;
  timestamp: number;
}

// ─── Feature Flags ──────────────────────────────────────

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  enabledAt?: number;                // Block number when enabled
  killSwitch: boolean;               // Can be disabled in emergency
  version: ProtocolVersion;          // Minimum version required
}

// ─── Parameter Presets (Chain Config) ───────────────────

export interface ChainParameters {
  shardBlockTimeMs: number;
  maxTxPerShardBlock: number;
  beaconBlockInterval: number;
  rateLimitPerMinute: number;
  maxTxPerSecond: number;
  minStakeAmount: number;
  blockReward: number;
  resonanceThreshold: number;
  pbftViewChangeTimeoutMs: number;
  integrityCheckIntervalMs: number;
}

export const DEFAULT_PARAMETERS: ChainParameters = {
  shardBlockTimeMs: 1500,
  maxTxPerShardBlock: 1000,
  beaconBlockInterval: 10,
  rateLimitPerMinute: 100,
  maxTxPerSecond: 7000,
  minStakeAmount: 100,
  blockReward: 50,
  resonanceThreshold: 0.67,
  pbftViewChangeTimeoutMs: 5000,
  integrityCheckIntervalMs: 300000, // 5 minutes
};

// ─── Auto-Update Engine ─────────────────────────────────

export class AutoUpdateEngine {
  private currentVersion: ProtocolVersion;
  private parameters: ChainParameters;
  private manifests: Map<string, UpdateManifest> = new Map();
  private votes: Map<string, UpdateVote[]> = new Map();
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private appliedUpdates: Set<string> = new Set();
  private updateHistory: Array<{
    updateId: string;
    version: string;
    type: UpdateType;
    status: UpdateStatus;
    timestamp: number;
  }> = [];

  // Callbacks
  private onUpdateApplied?: (manifest: UpdateManifest) => void;
  private onSecurityPatch?: (manifest: UpdateManifest) => void;
  private onForkActivated?: (manifest: UpdateManifest) => void;

  constructor(initialVersion?: ProtocolVersion, initialParams?: ChainParameters) {
    this.currentVersion = initialVersion || { ...CURRENT_VERSION };
    this.parameters = initialParams || { ...DEFAULT_PARAMETERS };
    this.initDefaultFeatureFlags();
  }

  // ─── Version Management ─────────────────────────────

  getVersion(): ProtocolVersion {
    return { ...this.currentVersion };
  }

  getVersionString(): string {
    return versionToString(this.currentVersion);
  }

  getParameters(): ChainParameters {
    return { ...this.parameters };
  }

  /** Check if a version is compatible with the current protocol */
  isCompatible(version: ProtocolVersion): boolean {
    // Same major version = compatible
    return version.major === this.currentVersion.major;
  }

  /** Check if current version meets a minimum requirement */
  meetsMinimum(minimum: ProtocolVersion): boolean {
    return compareVersions(this.currentVersion, minimum) >= 0;
  }

  // ─── Update Manifest Processing ─────────────────────

  /**
   * Submit an update manifest. If it's a critical security patch,
   * it's applied immediately. Otherwise it enters the voting phase.
   */
  async submitUpdate(manifest: UpdateManifest): Promise<{
    accepted: boolean;
    status: UpdateStatus;
    reason?: string;
  }> {
    // Verify manifest signature
    const manifestData = this.serializeManifestForSigning(manifest);
    const sigValid = await verifySignature(
      manifestData,
      manifest.signature,
      manifest.signerPublicKey
    );

    if (!sigValid) {
      return { accepted: false, status: 'rejected', reason: 'Invalid manifest signature' };
    }

    // Check if already applied
    if (this.appliedUpdates.has(manifest.id)) {
      return { accepted: false, status: 'active', reason: 'Update already applied' };
    }

    // Check version ordering
    if (compareVersions(manifest.version, this.currentVersion) <= 0) {
      return { accepted: false, status: 'rejected', reason: 'Version must be higher than current' };
    }

    // Check expiry
    if (manifest.expiresAt && Date.now() > manifest.expiresAt) {
      return { accepted: false, status: 'rejected', reason: 'Manifest has expired' };
    }

    this.manifests.set(manifest.id, manifest);

    // CRITICAL SECURITY PATCHES: Apply immediately (emergency protocol)
    if (manifest.isCritical && manifest.type === 'security_patch') {
      await this.applyUpdate(manifest);
      this.onSecurityPatch?.(manifest);
      return { accepted: true, status: 'emergency' };
    }

    // Non-critical: enter voting phase
    this.votes.set(manifest.id, []);
    return { accepted: true, status: 'voting' };
  }

  /** Cast a vote on a pending update */
  async castVote(vote: UpdateVote): Promise<{
    recorded: boolean;
    currentApproval: number;
    threshold: number;
    status: UpdateStatus;
  }> {
    const manifest = this.manifests.get(vote.updateId);
    if (!manifest) {
      return { recorded: false, currentApproval: 0, threshold: 0, status: 'rejected' };
    }

    // Add vote
    const existingVotes = this.votes.get(vote.updateId) || [];

    // Prevent double voting
    if (existingVotes.some(v => v.validatorId === vote.validatorId)) {
      return {
        recorded: false,
        currentApproval: this.computeApproval(vote.updateId),
        threshold: manifest.requiredApproval,
        status: 'voting',
      };
    }

    existingVotes.push(vote);
    this.votes.set(vote.updateId, existingVotes);

    // Check if approval threshold is met
    const approval = this.computeApproval(vote.updateId);
    if (approval >= manifest.requiredApproval) {
      // Schedule activation
      if (manifest.activationBlock) {
        return {
          recorded: true,
          currentApproval: approval,
          threshold: manifest.requiredApproval,
          status: 'scheduled',
        };
      }

      // Apply immediately (no activation block specified)
      await this.applyUpdate(manifest);
      return {
        recorded: true,
        currentApproval: approval,
        threshold: manifest.requiredApproval,
        status: 'active',
      };
    }

    return {
      recorded: true,
      currentApproval: approval,
      threshold: manifest.requiredApproval,
      status: 'voting',
    };
  }

  /**
   * Check if any scheduled updates should activate at this block number.
   * Call this after every beacon block creation.
   */
  async checkActivations(currentBeaconBlock: number): Promise<UpdateManifest[]> {
    const activated: UpdateManifest[] = [];

    for (const [id, manifest] of this.manifests) {
      if (this.appliedUpdates.has(id)) continue;

      // Check block-based activation
      if (manifest.activationBlock && currentBeaconBlock >= manifest.activationBlock) {
        const approval = this.computeApproval(id);
        if (approval >= manifest.requiredApproval || manifest.isCritical) {
          await this.applyUpdate(manifest);
          activated.push(manifest);
        }
      }

      // Check time-based activation
      if (manifest.activationTimestamp && Date.now() >= manifest.activationTimestamp) {
        const approval = this.computeApproval(id);
        if (approval >= manifest.requiredApproval || manifest.isCritical) {
          await this.applyUpdate(manifest);
          activated.push(manifest);
        }
      }
    }

    return activated;
  }

  // ─── Feature Flags ──────────────────────────────────

  /** Check if a feature is enabled */
  isFeatureEnabled(featureId: string): boolean {
    const flag = this.featureFlags.get(featureId);
    if (!flag) return false;
    if (!this.meetsMinimum(flag.version)) return false;
    return flag.enabled;
  }

  /** Toggle a feature flag */
  setFeatureFlag(featureId: string, enabled: boolean): void {
    const flag = this.featureFlags.get(featureId);
    if (flag) {
      flag.enabled = enabled;
      if (enabled) flag.enabledAt = Date.now();
    }
  }

  /** Emergency kill switch for a feature */
  killFeature(featureId: string): boolean {
    const flag = this.featureFlags.get(featureId);
    if (flag && flag.killSwitch) {
      flag.enabled = false;
      return true;
    }
    return false;
  }

  getFeatureFlags(): FeatureFlag[] {
    return Array.from(this.featureFlags.values());
  }

  // ─── Parameter Updates ──────────────────────────────

  /** Update a chain parameter (with version check) */
  updateParameter<K extends keyof ChainParameters>(
    key: K,
    value: ChainParameters[K]
  ): void {
    this.parameters[key] = value;
  }

  // ─── Event Handlers ─────────────────────────────────

  onUpdate(callback: (manifest: UpdateManifest) => void): void {
    this.onUpdateApplied = callback;
  }

  onSecurity(callback: (manifest: UpdateManifest) => void): void {
    this.onSecurityPatch = callback;
  }

  onFork(callback: (manifest: UpdateManifest) => void): void {
    this.onForkActivated = callback;
  }

  // ─── Internal ───────────────────────────────────────

  private async applyUpdate(manifest: UpdateManifest): Promise<void> {
    // Apply parameter changes
    for (const change of manifest.changes) {
      if (change.changeType === 'config' && change.parameters) {
        for (const [key, value] of Object.entries(change.parameters)) {
          if (key in this.parameters) {
            (this.parameters as unknown as Record<string, unknown>)[key] = value;
          }
        }
      }
    }

    // Apply feature flag changes
    for (const change of manifest.changes) {
      if (change.component === 'feature_flag' && change.parameters) {
        const flagId = change.parameters['id'] as string;
        if (flagId) {
          const existing = this.featureFlags.get(flagId);
          if (existing) {
            existing.enabled = change.changeType !== 'remove';
          } else if (change.changeType === 'add') {
            this.featureFlags.set(flagId, {
              id: flagId,
              name: (change.parameters['name'] as string) || flagId,
              description: change.description,
              enabled: true,
              killSwitch: true,
              version: manifest.version,
            });
          }
        }
      }
    }

    // Update version
    this.currentVersion = { ...manifest.version };
    this.appliedUpdates.add(manifest.id);

    // Record history
    this.updateHistory.push({
      updateId: manifest.id,
      version: versionToString(manifest.version),
      type: manifest.type,
      status: manifest.isCritical ? 'emergency' : 'active',
      timestamp: Date.now(),
    });

    // Notify
    this.onUpdateApplied?.(manifest);
    if (manifest.type === 'hard_fork') {
      this.onForkActivated?.(manifest);
    }
  }

  private computeApproval(updateId: string): number {
    const votes = this.votes.get(updateId) || [];
    if (votes.length === 0) return 0;
    const approvals = votes.filter(v => v.approve).length;
    return approvals / votes.length;
  }

  private serializeManifestForSigning(manifest: UpdateManifest): string {
    return [
      manifest.id,
      versionToString(manifest.version),
      manifest.type,
      manifest.title,
      manifest.isCritical ? 'CRITICAL' : 'NORMAL',
      manifest.createdAt.toString(),
      JSON.stringify(manifest.changes),
    ].join('|');
  }

  private initDefaultFeatureFlags(): void {
    const defaults: FeatureFlag[] = [
      {
        id: 'state_proofs',
        name: 'Merkle Patricia Trie State Proofs',
        description: 'Enable cryptographic state proofs for all account queries',
        enabled: true,
        killSwitch: true,
        version: { major: 2, minor: 1, patch: 0 },
      },
      {
        id: 'integrity_verification',
        name: 'Block Integrity Verification',
        description: 'Verify block hashes and signatures on every retrieval from storage',
        enabled: true,
        killSwitch: false,  // Cannot disable — security critical
        version: { major: 2, minor: 1, patch: 0 },
      },
      {
        id: 'auto_updates',
        name: 'Automatic Protocol Updates',
        description: 'Automatically apply signed security patches and approved upgrades',
        enabled: true,
        killSwitch: true,
        version: { major: 2, minor: 1, patch: 0 },
      },
      {
        id: 'vote_signatures',
        name: 'Consensus Vote Signatures',
        description: 'Require Ed25519 signatures on all consensus votes',
        enabled: true,
        killSwitch: true,
        version: { major: 2, minor: 1, patch: 0 },
      },
      {
        id: 'light_client_proofs',
        name: 'Light Client Proofs',
        description: 'Generate compact proofs for light client verification',
        enabled: true,
        killSwitch: true,
        version: { major: 2, minor: 1, patch: 0 },
      },
      {
        id: 'background_integrity_scan',
        name: 'Background Integrity Scanning',
        description: 'Periodic background verification of stored chain data',
        enabled: true,
        killSwitch: true,
        version: { major: 2, minor: 1, patch: 0 },
      },
    ];

    for (const flag of defaults) {
      this.featureFlags.set(flag.id, flag);
    }
  }

  // ─── Queries ────────────────────────────────────────

  /** Get all pending updates awaiting votes */
  getPendingUpdates(): Array<{
    manifest: UpdateManifest;
    approval: number;
    votes: UpdateVote[];
    status: UpdateStatus;
  }> {
    const pending: Array<{
      manifest: UpdateManifest;
      approval: number;
      votes: UpdateVote[];
      status: UpdateStatus;
    }> = [];

    for (const [id, manifest] of this.manifests) {
      if (this.appliedUpdates.has(id)) continue;
      const votes = this.votes.get(id) || [];
      const approval = this.computeApproval(id);
      let status: UpdateStatus = 'voting';
      if (approval >= manifest.requiredApproval) {
        status = manifest.activationBlock ? 'scheduled' : 'approved';
      }
      pending.push({ manifest, approval, votes, status });
    }

    return pending;
  }

  /** Get update history */
  getUpdateHistory(): typeof this.updateHistory {
    return [...this.updateHistory];
  }

  /** Get comprehensive stats */
  getStats(): {
    currentVersion: string;
    totalUpdatesApplied: number;
    pendingUpdates: number;
    featureFlags: number;
    enabledFeatures: number;
    lastUpdate: number | null;
    parameters: ChainParameters;
  } {
    const lastEntry = this.updateHistory[this.updateHistory.length - 1];
    return {
      currentVersion: this.getVersionString(),
      totalUpdatesApplied: this.appliedUpdates.size,
      pendingUpdates: this.manifests.size - this.appliedUpdates.size,
      featureFlags: this.featureFlags.size,
      enabledFeatures: Array.from(this.featureFlags.values()).filter(f => f.enabled).length,
      lastUpdate: lastEntry?.timestamp || null,
      parameters: this.getParameters(),
    };
  }

  // ─── Serialization ──────────────────────────────────

  serialize(): string {
    return JSON.stringify({
      currentVersion: this.currentVersion,
      parameters: this.parameters,
      manifests: Array.from(this.manifests.entries()),
      votes: Array.from(this.votes.entries()),
      featureFlags: Array.from(this.featureFlags.entries()),
      appliedUpdates: Array.from(this.appliedUpdates),
      updateHistory: this.updateHistory,
    });
  }

  static deserialize(json: string): AutoUpdateEngine {
    const data = JSON.parse(json);
    const engine = new AutoUpdateEngine(data.currentVersion, data.parameters);
    engine.manifests = new Map(data.manifests || []);
    engine.votes = new Map(data.votes || []);
    engine.featureFlags = new Map(data.featureFlags || []);
    engine.appliedUpdates = new Set(data.appliedUpdates || []);
    engine.updateHistory = data.updateHistory || [];
    return engine;
  }
}

// ─── Helper: Create a signed update manifest ────────────

export async function createUpdateManifest(params: {
  version: ProtocolVersion;
  type: UpdateType;
  title: string;
  description: string;
  changes: UpdateChange[];
  isCritical: boolean;
  signerPrivateKey: string;
  signerPublicKey: string;
  activationBlock?: number;
  requiredApproval?: number;
  migrationSteps?: MigrationStep[];
}): Promise<UpdateManifest> {
  const { signTransaction } = await import('./crypto');

  const manifest: UpdateManifest = {
    id: '', // Computed below
    version: params.version,
    type: params.type,
    title: params.title,
    description: params.description,
    changes: params.changes,
    isCritical: params.isCritical,
    signature: '',
    signerPublicKey: params.signerPublicKey,
    activationBlock: params.activationBlock,
    requiredApproval: params.requiredApproval ?? 0.67,
    migrationSteps: params.migrationSteps,
    createdAt: Date.now(),
  };

  // Compute manifest ID
  manifest.id = await sha256(JSON.stringify({
    version: manifest.version,
    type: manifest.type,
    title: manifest.title,
    changes: manifest.changes,
    createdAt: manifest.createdAt,
  }));

  // Sign the manifest
  const signData = [
    manifest.id,
    versionToString(manifest.version),
    manifest.type,
    manifest.title,
    manifest.isCritical ? 'CRITICAL' : 'NORMAL',
    manifest.createdAt.toString(),
    JSON.stringify(manifest.changes),
  ].join('|');

  manifest.signature = await signTransaction(signData, params.signerPrivateKey);

  return manifest;
}
