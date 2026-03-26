/**
 * Tests for CosmoMesh Protocol — Crypto, Merkle-DAG, Mesh, Consensus
 *
 * Tests the new real cryptography and transactional fabric.
 * Runs in Node.js 22+ which has native Web Crypto support.
 */

// ─── Mock localStorage for Node.js ──────────────────────

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

// Import after mocking
import { sha256, doubleSha256, generateKeyPair, signTransaction, verifySignature, isValidAddress, randomHex, computeTxId } from '../../webapp/src/engine/crypto';
import { MerkleDAG } from '../../webapp/src/engine/merkle';
import { StrangrzMesh as CosmoMesh, MeshLayer, assignLayer, LAYER_NAMES } from '../../webapp/src/engine/strangrmesh';
import { ResonanceConsensus } from '../../webapp/src/engine/consensus';

// ─── SHA-256 Hashing ─────────────────────────────────────

describe('SHA-256 Hashing', () => {
  test('produces 64-char hex string', async () => {
    const hash = await sha256('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  test('is deterministic', async () => {
    const h1 = await sha256('test data');
    const h2 = await sha256('test data');
    expect(h1).toBe(h2);
  });

  test('different inputs produce different hashes', async () => {
    const h1 = await sha256('input1');
    const h2 = await sha256('input2');
    expect(h1).not.toBe(h2);
  });

  test('doubleSha256 differs from single', async () => {
    const single = await sha256('test');
    const double = await doubleSha256('test');
    expect(single).not.toBe(double);
  });
});

// ─── Ed25519 Key Generation ──────────────────────────────

describe('Ed25519 Key Generation', () => {
  test('generates valid keypair', async () => {
    const kp = await generateKeyPair();
    expect(kp.publicKey).toBeTruthy();
    expect(kp.privateKey).toBeTruthy();
    expect(kp.address).toMatch(/^STZ[a-f0-9]{40}$/);
  });

  test('two keypairs are different', async () => {
    const kp1 = await generateKeyPair();
    const kp2 = await generateKeyPair();
    expect(kp1.publicKey).not.toBe(kp2.publicKey);
    expect(kp1.address).not.toBe(kp2.address);
  });

  test('address passes validation', async () => {
    const kp = await generateKeyPair();
    expect(isValidAddress(kp.address)).toBe(true);
  });
});

// ─── Ed25519 Signing & Verification ─────────────────────

describe('Ed25519 Signing & Verification', () => {
  test('sign and verify roundtrip', async () => {
    const kp = await generateKeyPair();
    const data = 'transaction data to sign';
    const sig = await signTransaction(data, kp.privateKey);

    expect(sig).toBeTruthy();
    expect(sig.length).toBeGreaterThan(0);

    const valid = await verifySignature(data, sig, kp.publicKey);
    expect(valid).toBe(true);
  });

  test('wrong data fails verification', async () => {
    const kp = await generateKeyPair();
    const sig = await signTransaction('original data', kp.privateKey);
    const valid = await verifySignature('tampered data', sig, kp.publicKey);
    expect(valid).toBe(false);
  });

  test('wrong key fails verification', async () => {
    const kp1 = await generateKeyPair();
    const kp2 = await generateKeyPair();
    const sig = await signTransaction('test', kp1.privateKey);
    const valid = await verifySignature('test', sig, kp2.publicKey);
    expect(valid).toBe(false);
  });
});

// ─── Deterministic TX ID ─────────────────────────────────

describe('Transaction ID', () => {
  test('is deterministic', async () => {
    const id1 = await computeTxId('from', 'to', 100, 1234567890, ['parent1']);
    const id2 = await computeTxId('from', 'to', 100, 1234567890, ['parent1']);
    expect(id1).toBe(id2);
  });

  test('different params produce different IDs', async () => {
    const id1 = await computeTxId('from', 'to', 100, 1234567890, ['parent1']);
    const id2 = await computeTxId('from', 'to', 200, 1234567890, ['parent1']);
    expect(id1).not.toBe(id2);
  });
});

// ─── Utility Functions ───────────────────────────────────

describe('Utility Functions', () => {
  test('isValidAddress accepts valid addresses', () => {
    expect(isValidAddress('STZ' + 'a'.repeat(40))).toBe(true);
    expect(isValidAddress('STZ' + '0123456789abcdef'.repeat(2) + '01234567')).toBe(true);
  });

  test('isValidAddress rejects invalid addresses', () => {
    expect(isValidAddress('invalid')).toBe(false);
    expect(isValidAddress('STZ' + 'a'.repeat(39))).toBe(false);
    expect(isValidAddress('XX' + 'a'.repeat(40))).toBe(false);
  });

  test('randomHex generates correct length', () => {
    const hex = randomHex(16);
    expect(hex).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(hex).toMatch(/^[a-f0-9]+$/);
  });
});

// ─── Merkle-DAG ──────────────────────────────────────────

describe('Merkle-DAG', () => {
  test('creates genesis node', async () => {
    const dag = new MerkleDAG();
    const node = await dag.addGenesis('genesis data');
    expect(node.hash).toHaveLength(64);
    expect(node.depth).toBe(0);
    expect(node.parentHashes).toHaveLength(0);
    expect(dag.size).toBe(1);
  });

  test('adds child nodes referencing parents', async () => {
    const dag = new MerkleDAG();
    const genesis = await dag.addGenesis('genesis');
    const child = await dag.addNode('child', [genesis.hash]);
    expect(child.depth).toBe(1);
    expect(child.parentHashes).toContain(genesis.hash);
    expect(dag.size).toBe(2);
  });

  test('tips track unreferenced leaves', async () => {
    const dag = new MerkleDAG();
    const g = await dag.addGenesis('genesis');
    expect(dag.tipCount).toBe(1);

    const c1 = await dag.addNode('child1', [g.hash]);
    expect(dag.tipCount).toBe(1); // genesis is no longer a tip

    const c2 = await dag.addNode('child2', [g.hash]);
    // Now both c1 and c2 are tips (genesis removed when c1 was added, but c2 also refs genesis)
    // c1 is still a tip, c2 is a tip
    expect(dag.tipCount).toBe(2);
  });

  test('verifies node integrity', async () => {
    const dag = new MerkleDAG();
    const g = await dag.addGenesis('genesis');
    const valid = await dag.verifyNode(g.hash);
    expect(valid).toBe(true);
  });

  test('verifyAll passes for valid DAG', async () => {
    const dag = new MerkleDAG();
    const g = await dag.addGenesis('genesis');
    await dag.addNode('child', [g.hash]);
    const result = await dag.verifyAll();
    expect(result.valid).toBe(true);
    expect(result.invalidNodes).toHaveLength(0);
  });

  test('computes Merkle root', async () => {
    const dag = new MerkleDAG();
    await dag.addGenesis('genesis');
    const root = await dag.computeRoot();
    expect(root).toHaveLength(64);
  });

  test('rejects missing parent', async () => {
    const dag = new MerkleDAG();
    await expect(dag.addNode('orphan', ['nonexistent_hash'])).rejects.toThrow();
  });

  test('serialization roundtrip', async () => {
    const dag = new MerkleDAG();
    const g = await dag.addGenesis('genesis');
    await dag.addNode('child', [g.hash]);

    const json = dag.serialize();
    const restored = MerkleDAG.deserialize(json);
    expect(restored.size).toBe(2);
    expect(restored.getNode(g.hash)).toBeTruthy();
  });

  test('getStats returns correct info', async () => {
    const dag = new MerkleDAG();
    const g = await dag.addGenesis('genesis');
    await dag.addNode('c1', [g.hash]);
    await dag.addNode('c2', [g.hash]);

    const stats = dag.getStats();
    expect(stats.totalNodes).toBe(3);
    expect(stats.maxDepth).toBe(1);
    expect(stats.genesisHash).toBe(g.hash);
  });
});

// ─── Layer Assignment ────────────────────────────────────

describe('Layer Assignment', () => {
  test('micro-transactions go to GRID', () => {
    expect(assignLayer(5, 'transfer')).toBe(MeshLayer.GRID);
  });

  test('standard transfers go to HELIX', () => {
    expect(assignLayer(50, 'transfer')).toBe(MeshLayer.HELIX);
  });

  test('large transfers go to GLYPH', () => {
    expect(assignLayer(5000, 'transfer')).toBe(MeshLayer.GLYPH);
  });

  test('genesis goes to LUMINA', () => {
    expect(assignLayer(100, 'genesis')).toBe(MeshLayer.LUMINA);
  });

  test('7 layer names exist', () => {
    expect(LAYER_NAMES).toHaveLength(7);
  });
});

// ─── CosmoMesh ───────────────────────────────────────────

describe('CosmoMesh', () => {
  beforeEach(() => {
    storage.clear();
  });

  test('creates genesis transaction', async () => {
    const mesh = new CosmoMesh();
    const kp = await generateKeyPair();
    const tx = await mesh.createGenesis(kp.address, 100);

    expect(tx.from).toBe('COSMO_GENESIS');
    expect(tx.to).toBe(kp.address);
    expect(tx.amount).toBe(100);
    expect(tx.layer).toBe(MeshLayer.LUMINA);
    expect(tx.resonanceScore).toBe(1.0);
    expect(mesh.getBalance(kp.address)).toBe(100);
  });

  test('creates and validates transfer', async () => {
    const mesh = new CosmoMesh();
    const sender = await generateKeyPair();
    const receiver = await generateKeyPair();

    await mesh.createGenesis(sender.address, 100);

    const { tx, validation } = await mesh.createTransaction({
      from: sender.address,
      to: receiver.address,
      amount: 25,
      privateKey: sender.privateKey,
      publicKey: sender.publicKey,
      memo: 'test transfer',
    });

    expect(validation.valid).toBe(true);
    expect(mesh.getBalance(sender.address)).toBe(75);
    expect(mesh.getBalance(receiver.address)).toBe(25);
    expect(tx.layer).toBe(MeshLayer.HELIX); // 25 Ω = HELIX layer
  });

  test('rejects overdraft', async () => {
    const mesh = new CosmoMesh();
    const sender = await generateKeyPair();
    const receiver = await generateKeyPair();

    await mesh.createGenesis(sender.address, 100);

    const { validation } = await mesh.createTransaction({
      from: sender.address,
      to: receiver.address,
      amount: 200,
      privateKey: sender.privateKey,
      publicKey: sender.publicKey,
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e: string) => e.includes('Insufficient'))).toBe(true);
  });

  test('tracks mesh statistics', async () => {
    const mesh = new CosmoMesh();
    const kp = await generateKeyPair();
    await mesh.createGenesis(kp.address, 100);

    const stats = mesh.getStats();
    expect(stats.totalTransactions).toBe(1);
    expect(stats.maxDepth).toBe(0);
  });

  test('mining creates rewards', async () => {
    const mesh = new CosmoMesh();
    const kp = await generateKeyPair();
    await mesh.createGenesis(kp.address, 100);

    const { tx } = await mesh.createMiningReward({
      to: kp.address,
      energyUsed: 50,
      cycles: 100,
      publicKey: kp.publicKey,
      privateKey: kp.privateKey,
    });

    expect(tx.type).toBe('mine');
    expect(tx.amount).toBe(5); // 50/10 = 5
    expect(mesh.getBalance(kp.address)).toBe(105);
  });

  test('serialization roundtrip preserves state', async () => {
    const mesh = new CosmoMesh();
    const kp = await generateKeyPair();
    await mesh.createGenesis(kp.address, 100);

    const json = mesh.serialize();
    const restored = CosmoMesh.deserialize(json);
    expect(restored.size).toBe(1);
    expect(restored.getBalance(kp.address)).toBe(100);
  });

  test('DAG depth increases with transactions', async () => {
    const mesh = new CosmoMesh();
    const s = await generateKeyPair();
    const r = await generateKeyPair();

    await mesh.createGenesis(s.address, 1000);
    await mesh.createGenesis(r.address, 0);

    for (let i = 0; i < 3; i++) {
      await mesh.createTransaction({
        from: s.address,
        to: r.address,
        amount: 1,
        privateKey: s.privateKey,
        publicKey: s.publicKey,
      });
    }

    const stats = mesh.getStats();
    expect(stats.totalTransactions).toBeGreaterThanOrEqual(4);
    expect(stats.maxDepth).toBeGreaterThanOrEqual(1);
  });

  test('recent transactions ordered by time', async () => {
    const mesh = new CosmoMesh();
    const kp = await generateKeyPair();
    await mesh.createGenesis(kp.address, 100);

    const recent = mesh.getRecentTransactions(10);
    expect(recent.length).toBeGreaterThanOrEqual(1);
    // Should be sorted newest first
    for (let i = 1; i < recent.length; i++) {
      expect(recent[i - 1].timestamp).toBeGreaterThanOrEqual(recent[i].timestamp);
    }
  });
});

// ─── Resonance Consensus ─────────────────────────────────

describe('Resonance Consensus', () => {
  test('registers validator', () => {
    const consensus = new ResonanceConsensus();
    const v = consensus.registerValidator({
      id: 'test-validator',
      publicKey: 'abc123',
      stake: 100,
      isLocal: true,
    });

    expect(v.stake).toBe(100);
    expect(v.reputation).toBe(0.5);
    expect(v.layerAffinities).toHaveLength(7);
    expect(consensus.getValidatorCount()).toBe(1);
  });

  test('runs consensus round for transaction', async () => {
    const consensus = new ResonanceConsensus();
    const mesh = new CosmoMesh();
    const kp = await generateKeyPair();

    consensus.registerValidator({
      id: kp.address,
      publicKey: kp.publicKey,
      stake: 100,
      isLocal: true,
    });

    const genesisTx = await mesh.createGenesis(kp.address, 100);
    const round = await consensus.startRound(genesisTx);

    expect(round.finalized).toBe(true);
    expect(round.result).toBe('approved');
    expect(round.finalResonance).toBeGreaterThan(0);
  });

  test('consensus stats are tracked', async () => {
    const consensus = new ResonanceConsensus();
    const mesh = new CosmoMesh();
    const kp = await generateKeyPair();

    consensus.registerValidator({
      id: kp.address,
      publicKey: kp.publicKey,
      stake: 100,
      isLocal: true,
    });

    await mesh.createGenesis(kp.address, 100);
    const tx = await mesh.createGenesis(kp.address, 50);
    await consensus.startRound(tx);

    const stats = consensus.getConsensusStats();
    expect(stats.totalRounds).toBeGreaterThanOrEqual(1);
    expect(stats.approved).toBeGreaterThanOrEqual(1);
    expect(stats.validatorCount).toBe(1);
  });

  test('layer affinities specialize over time', async () => {
    const consensus = new ResonanceConsensus();
    const mesh = new CosmoMesh();
    const kp = await generateKeyPair();

    const v = consensus.registerValidator({
      id: kp.address,
      publicKey: kp.publicKey,
      stake: 100,
      isLocal: true,
    });

    // Initial affinities should be equal
    const initialAffinity = v.layerAffinities[MeshLayer.LUMINA];

    // Validate several LUMINA transactions
    for (let i = 0; i < 5; i++) {
      const tx = await mesh.createGenesis(kp.address, 10);
      await consensus.startRound(tx);
    }

    // LUMINA affinity should have increased
    expect(v.layerAffinities[MeshLayer.LUMINA]).toBeGreaterThan(initialAffinity);
  });

  test('serialization roundtrip', async () => {
    const consensus = new ResonanceConsensus();
    consensus.registerValidator({
      id: 'test',
      publicKey: 'key',
      stake: 100,
    });

    const json = consensus.serialize();
    const restored = ResonanceConsensus.deserialize(json);
    expect(restored.getValidatorCount()).toBe(1);
    expect(restored.getValidator('test')?.stake).toBe(100);
  });
});
