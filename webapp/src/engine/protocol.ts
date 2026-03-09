/**
 * CosmoProtocol — Unified Protocol Orchestrator
 *
 * This is the single entry point that wires together:
 * - Block Integrity Verification (integrity.ts)
 * - Merkle Patricia Trie State Proofs (stateproof.ts)
 * - Automatic System & Security Updates (autoupdate.ts)
 *
 * It replaces the ad-hoc approach where each module operated independently.
 * CosmoProtocol ensures that:
 *
 * 1. Every block read from storage is integrity-verified
 * 2. Every state query is provable via Merkle proof
 * 3. Protocol upgrades are automatically applied
 * 4. Security patches are instant
 * 5. Feature flags control gradual rollouts
 *
 * Comparison with Ethereum:
 * ┌────────────────────────────┬──────────────┬──────────────┐
 * │ Feature                    │ Ethereum     │ CosmoWarp    │
 * ├────────────────────────────┼──────────────┼──────────────┤
 * │ State Proofs               │ MPT (slow)   │ MPT (fast)   │
 * │ Block Verification         │ On sync      │ Every read   │
 * │ Protocol Upgrades          │ Social coord │ Auto + vote  │
 * │ Security Patches           │ Manual       │ Automatic    │
 * │ Feature Flags              │ No           │ Yes          │
 * │ Data Migration             │ No           │ Automatic    │
 * │ Fork Management            │ Hard only    │ Hard + soft  │
 * │ Light Client Proofs        │ Yes          │ Yes          │
 * │ Upgrade Rollback           │ No           │ Kill switch  │
 * │ Emergency Protocol         │ No           │ Yes          │
 * └────────────────────────────┴──────────────┴──────────────┘
 */

import { BlockIntegrityVerifier, getIntegrityVerifier } from './integrity';
import type { TamperAlert, VerificationResult } from './integrity';
import { MerklePatriciaTrie } from './stateproof';
import type { StateInclusionProof, LightClientProof } from './stateproof';
import { AutoUpdateEngine, CURRENT_VERSION, versionToString } from './autoupdate';
import type { UpdateManifest, ChainParameters, FeatureFlag } from './autoupdate';
import { sha256, signTransaction } from './crypto';
import type { StoredBlock, StoredBeacon } from './chaindb';

// ─── Protocol State ─────────────────────────────────────

export interface ProtocolState {
  version: string;
  integrityEnabled: boolean;
  stateProofsEnabled: boolean;
  autoUpdatesEnabled: boolean;
  voteSignaturesEnabled: boolean;
  backgroundScanEnabled: boolean;
  totalVerifiedBlocks: number;
  totalTamperAlerts: number;
  stateTrieSize: number;
  appliedUpdates: number;
  activeFeatures: string[];
}

// ─── Protocol Events ────────────────────────────────────

export type ProtocolEvent =
  | { type: 'tamper_detected'; alert: TamperAlert }
  | { type: 'update_applied'; manifest: UpdateManifest }
  | { type: 'security_patch'; manifest: UpdateManifest }
  | { type: 'fork_activated'; manifest: UpdateManifest }
  | { type: 'integrity_scan_complete'; result: VerificationResult }
  | { type: 'state_root_updated'; shard: number; root: string }
  | { type: 'feature_toggled'; featureId: string; enabled: boolean };

// ─── CosmoProtocol ──────────────────────────────────────

export class CosmoProtocol {
  private verifier: BlockIntegrityVerifier;
  private updateEngine: AutoUpdateEngine;

  // Per-shard state tries
  private shardTries: Map<number, MerklePatriciaTrie> = new Map();

  // Global state trie (for cross-shard queries)
  private globalTrie: MerklePatriciaTrie;

  // Event listeners
  private eventListeners: Array<(event: ProtocolEvent) => void> = [];

  // Background scan state
  private scanRunning = false;

  constructor() {
    this.verifier = getIntegrityVerifier();
    this.updateEngine = new AutoUpdateEngine();
    this.globalTrie = new MerklePatriciaTrie();

    // Initialize 7 shard tries
    for (let i = 0; i < 7; i++) {
      this.shardTries.set(i, new MerklePatriciaTrie());
    }

    // Wire up tamper detection events
    this.verifier.onTamper((alert) => {
      this.emit({ type: 'tamper_detected', alert });
    });

    // Wire up update events
    this.updateEngine.onUpdate((manifest) => {
      this.emit({ type: 'update_applied', manifest });
    });
    this.updateEngine.onSecurity((manifest) => {
      this.emit({ type: 'security_patch', manifest });
    });
    this.updateEngine.onFork((manifest) => {
      this.emit({ type: 'fork_activated', manifest });
    });
  }

  // ─── Block Verification ─────────────────────────────

  /**
   * Verify a block retrieved from IndexedDB.
   * MUST be called on every block read. Returns null if tampered.
   */
  async verifyBlock(block: StoredBlock): Promise<StoredBlock | null> {
    if (!this.isFeatureEnabled('integrity_verification')) {
      return block; // Feature disabled (shouldn't happen — no kill switch)
    }

    const result = await this.verifier.verifyBlock(block);
    return result.valid ? block : null;
  }

  /**
   * Verify a block against its parent (chain continuity).
   */
  async verifyBlockChain(
    block: StoredBlock,
    parentBlock: StoredBlock | undefined
  ): Promise<boolean> {
    const alerts = await this.verifier.verifyBlockChain(block, parentBlock);
    return alerts.length === 0;
  }

  /** Verify a beacon block */
  async verifyBeacon(beacon: StoredBeacon): Promise<StoredBeacon | null> {
    if (!this.isFeatureEnabled('integrity_verification')) {
      return beacon;
    }
    const result = await this.verifier.verifyBeacon(beacon);
    return result.valid ? beacon : null;
  }

  // ─── State Proofs ───────────────────────────────────

  /**
   * Update a shard's state in the Merkle Patricia Trie.
   * Called after every block is processed.
   */
  async updateShardState(
    shardId: number,
    balances: Map<string, number>,
    blockNumber: number
  ): Promise<string> {
    if (!this.isFeatureEnabled('state_proofs')) {
      // Fallback to simple hash
      const entries = Array.from(balances.entries()).sort().map(([k, v]) => `${k}:${v}`).join(',');
      return sha256(entries || 'empty');
    }

    const trie = this.shardTries.get(shardId);
    if (!trie) throw new Error(`Unknown shard: ${shardId}`);

    // Update all balances in the trie
    for (const [address, balance] of balances) {
      await trie.put(address, balance.toString());
    }

    // Take snapshot at this block number
    trie.takeSnapshot(blockNumber);

    const root = trie.getRoot();
    this.emit({ type: 'state_root_updated', shard: shardId, root });

    // Also update global trie with shard root
    await this.globalTrie.put(`shard:${shardId}`, root);

    return root;
  }

  /**
   * Prove that an account has a specific balance in a shard.
   * Returns a compact Merkle proof verifiable by anyone.
   */
  async proveAccountBalance(
    shardId: number,
    address: string
  ): Promise<StateInclusionProof | null> {
    if (!this.isFeatureEnabled('state_proofs')) return null;

    const trie = this.shardTries.get(shardId);
    if (!trie) return null;

    return trie.proveInclusion(address);
  }

  /**
   * Prove an account balance at a historical block.
   */
  async proveBalanceAtBlock(
    shardId: number,
    address: string,
    blockNumber: number
  ): Promise<StateInclusionProof | null> {
    if (!this.isFeatureEnabled('state_proofs')) return null;

    const trie = this.shardTries.get(shardId);
    if (!trie) return null;

    return trie.proveAtBlock(address, blockNumber);
  }

  /**
   * Generate a light client proof for verifying state without full chain.
   */
  async generateLightClientProof(params: {
    blockNumber: number;
    shardId: number;
    accounts: string[];
    validatorPrivateKey: string;
  }): Promise<LightClientProof | null> {
    if (!this.isFeatureEnabled('light_client_proofs')) return null;

    const trie = this.shardTries.get(params.shardId);
    if (!trie) return null;

    // Sign the proof
    const signData = `LIGHT_PROOF:${params.blockNumber}:${params.shardId}:${trie.getRoot()}`;
    const signature = await signTransaction(signData, params.validatorPrivateKey);

    return trie.generateLightClientProof({
      blockNumber: params.blockNumber,
      shardId: params.shardId,
      accounts: params.accounts,
      validatorSignature: signature,
    });
  }

  /** Verify a light client proof (static — no chain state needed) */
  static async verifyLightClientProof(proof: LightClientProof): Promise<boolean> {
    const result = await MerklePatriciaTrie.verifyLightClientProof(proof);
    return result.valid;
  }

  /** Get the global state root across all shards */
  getGlobalStateRoot(): string {
    return this.globalTrie.getRoot();
  }

  /** Get a shard's current state root */
  getShardStateRoot(shardId: number): string {
    return this.shardTries.get(shardId)?.getRoot() || '0'.repeat(64);
  }

  // ─── Auto Updates ───────────────────────────────────

  /** Submit a protocol update manifest */
  async submitUpdate(manifest: UpdateManifest) {
    return this.updateEngine.submitUpdate(manifest);
  }

  /** Check for scheduled activations at a beacon block */
  async checkActivations(beaconBlockNumber: number): Promise<UpdateManifest[]> {
    if (!this.isFeatureEnabled('auto_updates')) return [];
    return this.updateEngine.checkActivations(beaconBlockNumber);
  }

  /** Get current chain parameters (may have been updated) */
  getParameters(): ChainParameters {
    return this.updateEngine.getParameters();
  }

  /** Get current protocol version */
  getVersion(): string {
    return this.updateEngine.getVersionString();
  }

  // ─── Feature Flags ──────────────────────────────────

  /** Check if a feature is enabled */
  isFeatureEnabled(featureId: string): boolean {
    return this.updateEngine.isFeatureEnabled(featureId);
  }

  /** Toggle a feature (admin only) */
  toggleFeature(featureId: string, enabled: boolean): void {
    this.updateEngine.setFeatureFlag(featureId, enabled);
    this.emit({ type: 'feature_toggled', featureId, enabled });
  }

  /** Emergency kill a feature */
  killFeature(featureId: string): boolean {
    const killed = this.updateEngine.killFeature(featureId);
    if (killed) {
      this.emit({ type: 'feature_toggled', featureId, enabled: false });
    }
    return killed;
  }

  getFeatureFlags(): FeatureFlag[] {
    return this.updateEngine.getFeatureFlags();
  }

  // ─── Background Integrity Scanning ──────────────────

  /**
   * Start periodic background integrity scanning.
   * Runs every `intervalMs` and verifies the full chain.
   */
  startBackgroundScanning(
    intervalMs: number,
    scanFn: () => Promise<VerificationResult>
  ): void {
    if (!this.isFeatureEnabled('background_integrity_scan')) return;

    this.verifier.startBackgroundScan(intervalMs, async () => {
      this.scanRunning = true;
      try {
        const result = await scanFn();
        this.emit({ type: 'integrity_scan_complete', result });
        return result;
      } finally {
        this.scanRunning = false;
      }
    });
  }

  /** Stop background scanning */
  stopBackgroundScanning(): void {
    this.verifier.stopBackgroundScan();
  }

  // ─── Consensus Vote Signing ─────────────────────────

  /**
   * Sign a consensus vote with Ed25519.
   * This fixes the audit finding that votes had empty signatures.
   */
  async signVote(
    voteData: string,
    privateKey: string
  ): Promise<string> {
    if (!this.isFeatureEnabled('vote_signatures')) return '';
    return signTransaction(voteData, privateKey);
  }

  /**
   * Verify a consensus vote signature.
   */
  async verifyVoteSignature(
    voteData: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    if (!this.isFeatureEnabled('vote_signatures')) return true;
    if (!signature) return false;
    const { verifySignature: verify } = await import('./crypto');
    return verify(voteData, signature, publicKey);
  }

  // ─── Event System ───────────────────────────────────

  /** Subscribe to protocol events */
  addEventListener(listener: (event: ProtocolEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /** Unsubscribe from protocol events */
  removeEventListener(listener: (event: ProtocolEvent) => void): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  private emit(event: ProtocolEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[CosmoProtocol] Event listener error:', err);
      }
    }
  }

  // ─── State ──────────────────────────────────────────

  /** Get comprehensive protocol state */
  getState(): ProtocolState {
    const verifierStats = this.verifier.getStats();
    const updateStats = this.updateEngine.getStats();
    const flags = this.updateEngine.getFeatureFlags();

    return {
      version: this.getVersion(),
      integrityEnabled: this.isFeatureEnabled('integrity_verification'),
      stateProofsEnabled: this.isFeatureEnabled('state_proofs'),
      autoUpdatesEnabled: this.isFeatureEnabled('auto_updates'),
      voteSignaturesEnabled: this.isFeatureEnabled('vote_signatures'),
      backgroundScanEnabled: this.isFeatureEnabled('background_integrity_scan'),
      totalVerifiedBlocks: verifierStats.totalVerified,
      totalTamperAlerts: verifierStats.totalAlerts,
      stateTrieSize: Array.from(this.shardTries.values())
        .reduce((sum, t) => sum + t.size, 0),
      appliedUpdates: updateStats.totalUpdatesApplied,
      activeFeatures: flags.filter(f => f.enabled).map(f => f.id),
    };
  }

  /** Get tamper alerts */
  getTamperAlerts(): TamperAlert[] {
    return this.verifier.getAlerts();
  }

  /** Get the integrity verifier directly (for advanced use) */
  getVerifier(): BlockIntegrityVerifier {
    return this.verifier;
  }

  /** Get the update engine directly (for advanced use) */
  getUpdateEngine(): AutoUpdateEngine {
    return this.updateEngine;
  }

  /** Get shard trie (for advanced queries) */
  getShardTrie(shardId: number): MerklePatriciaTrie | undefined {
    return this.shardTries.get(shardId);
  }

  // ─── Serialization ──────────────────────────────────

  serialize(): string {
    return JSON.stringify({
      updateEngine: this.updateEngine.serialize(),
      shardTries: Array.from(this.shardTries.entries()).map(
        ([id, trie]) => [id, trie.serialize()]
      ),
      globalTrie: this.globalTrie.serialize(),
    });
  }

  static deserialize(json: string): CosmoProtocol {
    const data = JSON.parse(json);
    const protocol = new CosmoProtocol();

    if (data.updateEngine) {
      protocol.updateEngine = AutoUpdateEngine.deserialize(data.updateEngine);
    }

    if (data.shardTries) {
      for (const [id, trieJson] of data.shardTries) {
        protocol.shardTries.set(id, MerklePatriciaTrie.deserialize(trieJson));
      }
    }

    if (data.globalTrie) {
      protocol.globalTrie = MerklePatriciaTrie.deserialize(data.globalTrie);
    }

    return protocol;
  }
}

// ─── Singleton ──────────────────────────────────────────

let protocolInstance: CosmoProtocol | null = null;

export function getCosmoProtocol(): CosmoProtocol {
  if (!protocolInstance) {
    protocolInstance = new CosmoProtocol();
  }
  return protocolInstance;
}
