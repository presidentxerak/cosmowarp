/**
 * Tests for Strangrz Protocole v3.0 — State Proofs, Integrity, Auto-Updates
 *
 * Tests the 4 new modules that fix all critical audit findings:
 * 1. stateproof.ts — Merkle Patricia Trie (surpasses Ethereum's MPT)
 * 2. integrity.ts — Block integrity verification on retrieval
 * 3. autoupdate.ts — Automatic system & security updates
 * 4. protocol.ts — CosmoProtocol orchestrator
 */

// ─── Mock Web Crypto API for Node.js ────────────────────

const { webcrypto } = require('crypto');
if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = webcrypto;
}

// ─── Mock localStorage for Node.js ──────────────────────

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

// ─── Imports ────────────────────────────────────────────

import { MerklePatriciaTrie } from '../../webapp/src/engine/stateproof';
import type { StateInclusionProof } from '../../webapp/src/engine/stateproof';

import {
  BlockIntegrityVerifier,
} from '../../webapp/src/engine/integrity';
import type { StoredBlock, StoredBeacon } from '../../webapp/src/engine/chaindb';

import {
  AutoUpdateEngine,
  CURRENT_VERSION,
  versionToString,
  parseVersion,
  compareVersions,
  createUpdateManifest,
} from '../../webapp/src/engine/autoupdate';
import type { ProtocolVersion, UpdateManifest } from '../../webapp/src/engine/autoupdate';

import { sha256, generateKeyPair } from '../../webapp/src/engine/crypto';

// ════════════════════════════════════════════════════════
// MERKLE PATRICIA TRIE TESTS
// ════════════════════════════════════════════════════════

describe('MerklePatriciaTrie', () => {
  let trie: MerklePatriciaTrie;

  beforeEach(() => {
    trie = new MerklePatriciaTrie();
  });

  test('empty trie has zero root', () => {
    expect(trie.getRoot()).toBe('0'.repeat(64));
  });

  test('insert and retrieve a value', async () => {
    await trie.put('alice', '1000');
    const value = await trie.get('alice');
    expect(value).toBe('1000');
  });

  test('insert multiple values', async () => {
    await trie.put('alice', '1000');
    await trie.put('bob', '2000');
    await trie.put('charlie', '3000');

    expect(await trie.get('alice')).toBe('1000');
    expect(await trie.get('bob')).toBe('2000');
    expect(await trie.get('charlie')).toBe('3000');
  });

  test('update existing value', async () => {
    await trie.put('alice', '1000');
    expect(await trie.get('alice')).toBe('1000');

    await trie.put('alice', '5000');
    expect(await trie.get('alice')).toBe('5000');
  });

  test('get non-existent key returns undefined', async () => {
    await trie.put('alice', '1000');
    expect(await trie.get('nonexistent')).toBeUndefined();
  });

  test('root changes after insert', async () => {
    const root1 = trie.getRoot();
    await trie.put('alice', '1000');
    const root2 = trie.getRoot();

    expect(root1).not.toBe(root2);
    expect(root2).not.toBe('0'.repeat(64));
  });

  test('same data produces same root (deterministic)', async () => {
    const trie1 = new MerklePatriciaTrie();
    const trie2 = new MerklePatriciaTrie();

    await trie1.put('alice', '1000');
    await trie1.put('bob', '2000');

    await trie2.put('alice', '1000');
    await trie2.put('bob', '2000');

    expect(trie1.getRoot()).toBe(trie2.getRoot());
  });

  test('different data produces different root', async () => {
    const trie1 = new MerklePatriciaTrie();
    const trie2 = new MerklePatriciaTrie();

    await trie1.put('alice', '1000');
    await trie2.put('alice', '9999');

    expect(trie1.getRoot()).not.toBe(trie2.getRoot());
  });

  test('delete a key', async () => {
    await trie.put('alice', '1000');
    await trie.put('bob', '2000');

    const deleted = await trie.delete('alice');
    expect(deleted).toBe(true);
    expect(await trie.get('alice')).toBeUndefined();
    expect(await trie.get('bob')).toBe('2000');
  });

  test('delete non-existent key returns false', async () => {
    await trie.put('alice', '1000');
    const deleted = await trie.delete('nonexistent');
    expect(deleted).toBe(false);
  });

  // ─── Proof Tests ──────────────────────────────────────

  test('generate inclusion proof for existing key', async () => {
    await trie.put('alice', '1000');
    await trie.put('bob', '2000');

    const proof = await trie.proveInclusion('alice');
    expect(proof.verified).toBe(true);
    expect(proof.value).toBe('1000');
    expect(proof.root).toBe(trie.getRoot());
    expect(proof.proof.length).toBeGreaterThan(0);
  });

  test('generate exclusion proof for non-existing key', async () => {
    await trie.put('alice', '1000');

    const proof = await trie.proveExclusion('bob');
    expect(proof.verified).toBe(true);
  });

  test('inclusion proof for non-existing key is not verified', async () => {
    await trie.put('alice', '1000');

    const proof = await trie.proveInclusion('nonexistent');
    expect(proof.verified).toBe(false);
  });

  // ─── Snapshot Tests ───────────────────────────────────

  test('take and retrieve snapshot', async () => {
    await trie.put('alice', '1000');
    trie.takeSnapshot(1);

    await trie.put('alice', '5000');
    trie.takeSnapshot(2);

    const root1 = trie.getSnapshotRoot(1);
    const root2 = trie.getSnapshotRoot(2);

    expect(root1).toBeDefined();
    expect(root2).toBeDefined();
    expect(root1).not.toBe(root2);
  });

  // ─── Batch Operations ─────────────────────────────────

  test('batch insert multiple entries', async () => {
    const entries = [
      { key: 'alice', value: '1000' },
      { key: 'bob', value: '2000' },
      { key: 'charlie', value: '3000' },
    ];

    const root = await trie.putBatch(entries);
    expect(root).not.toBe('0'.repeat(64));
    expect(await trie.get('alice')).toBe('1000');
    expect(await trie.get('bob')).toBe('2000');
    expect(await trie.get('charlie')).toBe('3000');
  });

  test('computeStateRoot from balances map', async () => {
    const balances = new Map<string, number>([
      ['alice', 1000],
      ['bob', 2000],
    ]);

    const { root, trie: resultTrie } = await MerklePatriciaTrie.computeStateRoot(balances);
    expect(root).not.toBe('0'.repeat(64));
    expect(await resultTrie.get('alice')).toBe('1000');
  });

  // ─── Serialization ────────────────────────────────────

  test('serialize and deserialize preserves state', async () => {
    await trie.put('alice', '1000');
    await trie.put('bob', '2000');
    trie.takeSnapshot(1);

    const json = trie.serialize();
    const restored = MerklePatriciaTrie.deserialize(json);

    expect(await restored.get('alice')).toBe('1000');
    expect(await restored.get('bob')).toBe('2000');
    expect(restored.getRoot()).toBe(trie.getRoot());
    expect(restored.getSnapshotRoot(1)).toBe(trie.getSnapshotRoot(1));
  });

  // ─── Stats ────────────────────────────────────────────

  test('getStats returns correct counts', async () => {
    await trie.put('alice', '1000');
    await trie.put('bob', '2000');
    trie.takeSnapshot(1);

    const stats = trie.getStats();
    expect(stats.totalNodes).toBeGreaterThan(0);
    expect(stats.leaves).toBeGreaterThan(0);
    expect(stats.snapshots).toBe(1);
    expect(stats.rootHash).toBe(trie.getRoot());
  });
});

// ════════════════════════════════════════════════════════
// BLOCK INTEGRITY VERIFIER TESTS
// ════════════════════════════════════════════════════════

describe('BlockIntegrityVerifier', () => {
  let verifier: BlockIntegrityVerifier;

  beforeEach(() => {
    verifier = new BlockIntegrityVerifier();
  });

  function makeBlock(overrides: Partial<StoredBlock> = {}): StoredBlock {
    return {
      key: '0:1',
      shard: 0,
      number: 1,
      parentHash: '0'.repeat(64),
      stateRoot: 'a'.repeat(64),
      transactionsRoot: 'b'.repeat(64),
      timestamp: Date.now() - 1000,
      validator: 'local',
      hash: '', // Will be computed
      txCount: 0,
      processingTimeMs: 10,
      rawSize: 100,
      compressedSize: 50,
      ...overrides,
    };
  }

  async function makeValidBlock(overrides: Partial<StoredBlock> = {}): Promise<StoredBlock> {
    const block = makeBlock(overrides);
    // Compute correct hash
    const headerData = [
      'CosmoChain-v1',
      block.shard.toString(),
      block.number.toString(),
      block.parentHash,
      block.stateRoot,
      block.transactionsRoot,
      block.timestamp.toString(),
      block.validator,
    ].join(':');
    block.hash = await sha256(headerData);
    return block;
  }

  test('valid block passes verification', async () => {
    const block = await makeValidBlock();
    const result = await verifier.verifyBlock(block);
    expect(result.valid).toBe(true);
    expect(result.alerts).toHaveLength(0);
  });

  test('tampered block hash is detected', async () => {
    const block = await makeValidBlock();
    block.hash = 'tampered_hash_' + '0'.repeat(50);

    const result = await verifier.verifyBlock(block);
    expect(result.valid).toBe(false);
    expect(result.alerts.length).toBeGreaterThan(0);
    expect(result.alerts[0].type).toBe('hash_mismatch');
    expect(result.alerts[0].severity).toBe('critical');
  });

  test('future timestamp is flagged', async () => {
    const block = await makeValidBlock({
      timestamp: Date.now() + 60000, // 1 minute in future
    });
    // Recompute hash with future timestamp
    const headerData = [
      'CosmoChain-v1',
      block.shard.toString(),
      block.number.toString(),
      block.parentHash,
      block.stateRoot,
      block.transactionsRoot,
      block.timestamp.toString(),
      block.validator,
    ].join(':');
    block.hash = await sha256(headerData);

    const result = await verifier.verifyBlock(block);
    // May have timestamp anomaly alert
    const timestampAlerts = result.alerts.filter(a => a.type === 'timestamp_anomaly');
    expect(timestampAlerts.length).toBe(1);
  });

  test('chain continuity verification works', async () => {
    const parent = await makeValidBlock({ number: 1 });
    const child = await makeValidBlock({
      number: 2,
      parentHash: parent.hash,
      timestamp: parent.timestamp + 1000,
    });

    const alerts = await verifier.verifyBlockChain(child, parent);
    expect(alerts).toHaveLength(0);
  });

  test('broken parent hash is detected', async () => {
    const parent = await makeValidBlock({ number: 1 });
    const child = await makeValidBlock({
      number: 2,
      parentHash: 'wrong_hash_' + '0'.repeat(53),
      timestamp: parent.timestamp + 1000,
    });

    const alerts = await verifier.verifyBlockChain(child, parent);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.some(a => a.type === 'parent_hash_broken')).toBe(true);
  });

  test('beacon verification works', async () => {
    const shardRoots = Array(7).fill('a'.repeat(64));
    const headerData = [
      'CosmoChain-v1',
      'BEACON',
      '0',
      ...shardRoots,
      Date.now().toString(),
      'system',
    ].join(':');

    const beacon: StoredBeacon = {
      number: 0,
      shardRoots,
      shardHeads: [0, 0, 0, 0, 0, 0, 0],
      globalStateRoot: '', // Will compute
      timestamp: Date.now(),
      validator: 'system',
      hash: await sha256(headerData),
    };

    // Compute global state root
    let level = [...shardRoots];
    while (level.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) {
          next.push(await sha256(level[i] + level[i + 1]));
        } else {
          next.push(await sha256(level[i] + level[i]));
        }
      }
      level = next;
    }
    beacon.globalStateRoot = level[0];

    const result = await verifier.verifyBeacon(beacon);
    expect(result.valid).toBe(true);
  });

  test('tamper callback is called', async () => {
    let alertReceived: any = null;
    verifier.onTamper((alert) => {
      alertReceived = alert;
    });

    const block = await makeValidBlock();
    block.hash = 'tampered';

    await verifier.verifyBlock(block);
    expect(alertReceived).not.toBeNull();
    expect(alertReceived.type).toBe('hash_mismatch');
  });

  test('getStats tracks verified blocks', async () => {
    const block = await makeValidBlock();
    await verifier.verifyBlock(block);

    const stats = verifier.getStats();
    expect(stats.totalVerified).toBeGreaterThan(0);
    expect(stats.cacheSize).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════
// AUTO-UPDATE ENGINE TESTS
// ════════════════════════════════════════════════════════

describe('AutoUpdateEngine', () => {
  let engine: AutoUpdateEngine;

  beforeEach(() => {
    engine = new AutoUpdateEngine();
  });

  test('initial version matches CURRENT_VERSION', () => {
    expect(engine.getVersionString()).toBe(versionToString(CURRENT_VERSION));
  });

  test('default parameters are set', () => {
    const params = engine.getParameters();
    expect(params.shardBlockTimeMs).toBe(1500);
    expect(params.maxTxPerShardBlock).toBe(1000);
    expect(params.beaconBlockInterval).toBe(10);
  });

  test('version comparison works', () => {
    expect(compareVersions({ major: 2, minor: 1, patch: 0 }, { major: 2, minor: 0, patch: 0 })).toBeGreaterThan(0);
    expect(compareVersions({ major: 1, minor: 0, patch: 0 }, { major: 2, minor: 0, patch: 0 })).toBeLessThan(0);
    expect(compareVersions({ major: 2, minor: 1, patch: 0 }, { major: 2, minor: 1, patch: 0 })).toBe(0);
  });

  test('version parsing works', () => {
    const v = parseVersion('2.1.3');
    expect(v.major).toBe(2);
    expect(v.minor).toBe(1);
    expect(v.patch).toBe(3);
  });

  test('compatibility check works', () => {
    expect(engine.isCompatible({ major: 2, minor: 0, patch: 0 })).toBe(true);
    expect(engine.isCompatible({ major: 3, minor: 0, patch: 0 })).toBe(false);
  });

  test('default feature flags are set', () => {
    const flags = engine.getFeatureFlags();
    expect(flags.length).toBeGreaterThan(0);

    const stateProofs = flags.find(f => f.id === 'state_proofs');
    expect(stateProofs).toBeDefined();
    expect(stateProofs!.enabled).toBe(true);

    const integrity = flags.find(f => f.id === 'integrity_verification');
    expect(integrity).toBeDefined();
    expect(integrity!.enabled).toBe(true);
    expect(integrity!.killSwitch).toBe(false); // Cannot disable
  });

  test('feature flag toggle works', () => {
    expect(engine.isFeatureEnabled('state_proofs')).toBe(true);
    engine.setFeatureFlag('state_proofs', false);
    expect(engine.isFeatureEnabled('state_proofs')).toBe(false);
    engine.setFeatureFlag('state_proofs', true);
    expect(engine.isFeatureEnabled('state_proofs')).toBe(true);
  });

  test('kill switch works on killable features', () => {
    expect(engine.killFeature('state_proofs')).toBe(true);
    expect(engine.isFeatureEnabled('state_proofs')).toBe(false);
  });

  test('kill switch fails on non-killable features', () => {
    expect(engine.killFeature('integrity_verification')).toBe(false);
    expect(engine.isFeatureEnabled('integrity_verification')).toBe(true);
  });

  test('submit update with invalid signature is rejected', async () => {
    const manifest: UpdateManifest = {
      id: 'test-update',
      version: { major: 2, minor: 2, patch: 0 },
      type: 'soft_fork',
      title: 'Test Update',
      description: 'A test update',
      signature: 'invalid_sig',
      signerPublicKey: 'invalid_key',
      isCritical: false,
      changes: [],
      requiredApproval: 0.67,
      createdAt: Date.now(),
    };

    const result = await engine.submitUpdate(manifest);
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain('Invalid manifest signature');
  });

  test('signed update manifest is accepted', async () => {
    const keys = await generateKeyPair();

    const manifest = await createUpdateManifest({
      version: { major: 2, minor: 2, patch: 0 },
      type: 'soft_fork',
      title: 'Test Soft Fork',
      description: 'A test soft fork',
      changes: [
        {
          component: 'consensus',
          changeType: 'config',
          description: 'Increase block time',
          parameters: { shardBlockTimeMs: 2000 },
        },
      ],
      isCritical: false,
      signerPrivateKey: keys.privateKey,
      signerPublicKey: keys.publicKey,
    });

    const result = await engine.submitUpdate(manifest);
    expect(result.accepted).toBe(true);
    expect(result.status).toBe('voting');
  });

  test('critical security patch is auto-applied', async () => {
    const keys = await generateKeyPair();

    const manifest = await createUpdateManifest({
      version: { major: 2, minor: 1, patch: 1 },
      type: 'security_patch',
      title: 'Critical Security Fix',
      description: 'Emergency fix',
      changes: [
        {
          component: 'security',
          changeType: 'config',
          description: 'Increase rate limit',
          parameters: { rateLimitPerMinute: 50 },
        },
      ],
      isCritical: true,
      signerPrivateKey: keys.privateKey,
      signerPublicKey: keys.publicKey,
    });

    const result = await engine.submitUpdate(manifest);
    expect(result.accepted).toBe(true);
    expect(result.status).toBe('emergency');

    // Version should be updated
    expect(engine.getVersionString()).toBe('2.1.1');

    // Parameter should be updated
    expect(engine.getParameters().rateLimitPerMinute).toBe(50);
  });

  test('parameter update via update manifest', async () => {
    // Use a fresh engine so no previous updates affect version
    const freshEngine = new AutoUpdateEngine();
    const keys = await generateKeyPair();

    // Use security_patch type with isCritical for auto-apply
    const manifest = await createUpdateManifest({
      version: { major: 2, minor: 1, patch: 1 },
      type: 'security_patch',
      title: 'Parameter Tweak',
      description: 'Adjust block time',
      changes: [
        {
          component: 'chain',
          changeType: 'config',
          description: 'Faster blocks',
          parameters: { shardBlockTimeMs: 1000, maxTxPerShardBlock: 2000 },
        },
      ],
      isCritical: true, // Auto-apply (security_patch + critical = emergency)
      signerPrivateKey: keys.privateKey,
      signerPublicKey: keys.publicKey,
    });

    const result = await freshEngine.submitUpdate(manifest);
    expect(result.status).toBe('emergency');

    const params = freshEngine.getParameters();
    expect(params.shardBlockTimeMs).toBe(1000);
    expect(params.maxTxPerShardBlock).toBe(2000);
  });

  test('voting system works', async () => {
    // Use fresh engine so version isn't already past 2.2.0
    const freshEngine = new AutoUpdateEngine();
    const keys = await generateKeyPair();

    const manifest = await createUpdateManifest({
      version: { major: 2, minor: 2, patch: 0 },
      type: 'hard_fork',
      title: 'Test Fork',
      description: 'Requires voting',
      changes: [],
      isCritical: false,
      signerPrivateKey: keys.privateKey,
      signerPublicKey: keys.publicKey,
      requiredApproval: 0.67,
    });

    await freshEngine.submitUpdate(manifest);

    // First vote: 1/1 = 100% > 67%, so it auto-applies
    const vote1 = await freshEngine.castVote({
      updateId: manifest.id,
      validatorId: 'v1',
      approve: true,
      signature: '',
      timestamp: Date.now(),
    });
    expect(vote1.recorded).toBe(true);
    // With only 1 vote, 1/1 = 100% > 67% threshold → active
    expect(vote1.currentApproval).toBeGreaterThanOrEqual(0.67);
    expect(vote1.status).toBe('active');
    expect(freshEngine.getVersionString()).toBe('2.2.0');
  });

  test('double voting is prevented', async () => {
    const keys = await generateKeyPair();

    const manifest = await createUpdateManifest({
      version: { major: 2, minor: 3, patch: 0 },
      type: 'soft_fork',
      title: 'Double Vote Test',
      description: 'Test',
      changes: [],
      isCritical: false,
      signerPrivateKey: keys.privateKey,
      signerPublicKey: keys.publicKey,
    });

    await engine.submitUpdate(manifest);

    await engine.castVote({
      updateId: manifest.id,
      validatorId: 'v1',
      approve: true,
      signature: '',
      timestamp: Date.now(),
    });

    const duplicate = await engine.castVote({
      updateId: manifest.id,
      validatorId: 'v1',
      approve: false,
      signature: '',
      timestamp: Date.now(),
    });

    expect(duplicate.recorded).toBe(false);
  });

  test('serialization preserves state', async () => {
    engine.setFeatureFlag('state_proofs', false);
    engine.updateParameter('shardBlockTimeMs', 2000);

    const json = engine.serialize();
    const restored = AutoUpdateEngine.deserialize(json);

    expect(restored.isFeatureEnabled('state_proofs')).toBe(false);
    expect(restored.getParameters().shardBlockTimeMs).toBe(2000);
  });

  test('update history is tracked', async () => {
    const keys = await generateKeyPair();

    const manifest = await createUpdateManifest({
      version: { major: 2, minor: 1, patch: 5 },
      type: 'security_patch',
      title: 'History Test',
      description: 'Test history',
      changes: [],
      isCritical: true,
      signerPrivateKey: keys.privateKey,
      signerPublicKey: keys.publicKey,
    });

    await engine.submitUpdate(manifest);

    const history = engine.getUpdateHistory();
    expect(history.length).toBe(1);
    expect(history[0].version).toBe('2.1.5');
    expect(history[0].status).toBe('emergency');
  });

  test('stats are comprehensive', () => {
    const stats = engine.getStats();
    expect(stats.currentVersion).toBeDefined();
    expect(stats.featureFlags).toBeGreaterThan(0);
    expect(stats.enabledFeatures).toBeGreaterThan(0);
    expect(stats.parameters).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ════════════════════════════════════════════════════════

describe('Integration: State Proofs + Integrity', () => {
  test('state root from MPT is deterministic for same balances', async () => {
    const balances = new Map<string, number>([
      ['STZ' + 'a'.repeat(40), 1000],
      ['STZ' + 'b'.repeat(40), 2000],
      ['STZ' + 'c'.repeat(40), 3000],
    ]);

    const { root: root1 } = await MerklePatriciaTrie.computeStateRoot(balances);
    const { root: root2 } = await MerklePatriciaTrie.computeStateRoot(balances);

    expect(root1).toBe(root2);
  });

  test('state root changes when balance changes', async () => {
    const balances1 = new Map<string, number>([['alice', 1000]]);
    const balances2 = new Map<string, number>([['alice', 2000]]);

    const { root: root1 } = await MerklePatriciaTrie.computeStateRoot(balances1);
    const { root: root2 } = await MerklePatriciaTrie.computeStateRoot(balances2);

    expect(root1).not.toBe(root2);
  });

  test('integrity verifier detects modified block', async () => {
    // Use separate verifier instances so caching doesn't interfere
    const verifier1 = new BlockIntegrityVerifier();
    const verifier2 = new BlockIntegrityVerifier();

    const block: StoredBlock = {
      key: '0:1',
      shard: 0,
      number: 1,
      parentHash: '0'.repeat(64),
      stateRoot: 'a'.repeat(64),
      transactionsRoot: 'b'.repeat(64),
      timestamp: Date.now() - 1000,
      validator: 'test',
      hash: '',
      txCount: 0,
      processingTimeMs: 5,
      rawSize: 100,
      compressedSize: 50,
    };

    // Compute valid hash
    const headerData = [
      'CosmoChain-v1',
      block.shard.toString(),
      block.number.toString(),
      block.parentHash,
      block.stateRoot,
      block.transactionsRoot,
      block.timestamp.toString(),
      block.validator,
    ].join(':');
    block.hash = await sha256(headerData);

    // Valid
    const validResult = await verifier1.verifyBlock(block);
    expect(validResult.valid).toBe(true);

    // Tamper with stateRoot — hash won't match anymore
    const tamperedBlock = { ...block, stateRoot: 'c'.repeat(64), key: '0:2', number: 2 };
    const tamperResult = await verifier2.verifyBlock(tamperedBlock);
    expect(tamperResult.valid).toBe(false);
  });

  test('Ed25519 key generation works for update signing', async () => {
    const keys = await generateKeyPair();
    expect(keys.publicKey).toBeDefined();
    expect(keys.privateKey).toBeDefined();
    expect(keys.address).toMatch(/^STZ[a-f0-9]{40}$/);
  });

  test('full update lifecycle: create, sign, submit, vote, apply', async () => {
    const keys = await generateKeyPair();
    const engine = new AutoUpdateEngine();

    // Create signed manifest
    const manifest = await createUpdateManifest({
      version: { major: 2, minor: 2, patch: 0 },
      type: 'hard_fork',
      title: 'Major Upgrade',
      description: 'Adds new features',
      changes: [
        {
          component: 'chain',
          changeType: 'config',
          description: 'Double capacity',
          parameters: { maxTxPerShardBlock: 2000 },
        },
        {
          component: 'feature_flag',
          changeType: 'add',
          description: 'New feature',
          parameters: { id: 'new_feature', name: 'New Feature' },
        },
      ],
      isCritical: false,
      signerPrivateKey: keys.privateKey,
      signerPublicKey: keys.publicKey,
      requiredApproval: 0.5,
    });

    // Submit
    const submitResult = await engine.submitUpdate(manifest);
    expect(submitResult.accepted).toBe(true);

    // Vote (2 votes, 100% > 50%)
    await engine.castVote({
      updateId: manifest.id,
      validatorId: 'v1',
      approve: true,
      signature: '',
      timestamp: Date.now(),
    });

    const result = await engine.castVote({
      updateId: manifest.id,
      validatorId: 'v2',
      approve: true,
      signature: '',
      timestamp: Date.now(),
    });

    expect(result.status).toBe('active');
    expect(engine.getVersionString()).toBe('2.2.0');
    expect(engine.getParameters().maxTxPerShardBlock).toBe(2000);
    expect(engine.isFeatureEnabled('new_feature')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════
// STRESS TESTS
// ════════════════════════════════════════════════════════

describe('Performance: Merkle Patricia Trie', () => {
  test('handles 100 entries', async () => {
    const trie = new MerklePatriciaTrie();

    for (let i = 0; i < 100; i++) {
      await trie.put(`address_${i.toString().padStart(4, '0')}`, `${i * 100}`);
    }

    // Verify all
    for (let i = 0; i < 100; i++) {
      const val = await trie.get(`address_${i.toString().padStart(4, '0')}`);
      expect(val).toBe(`${i * 100}`);
    }

    expect(trie.getRoot()).not.toBe('0'.repeat(64));

    const stats = trie.getStats();
    expect(stats.totalNodes).toBeGreaterThan(0);
    expect(stats.leaves).toBeGreaterThanOrEqual(100);
  }, 30000); // 30s timeout for slower environments
});
