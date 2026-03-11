/**
 * Strangrz Merkle-DAG — Cryptographic Integrity Layer
 *
 * Implements a Merkle Directed Acyclic Graph for transaction verification.
 * Each node in the DAG contains the SHA-256 hash of its content + parent hashes.
 * This provides tamper-proof verification of the entire transaction history.
 */

import { sha256 } from './crypto';

// ─── Merkle Node ─────────────────────────────────────────

export interface MerkleNode {
  hash: string;           // SHA-256 of (content + parentHashes)
  content: string;        // Serialized data
  parentHashes: string[]; // References to parent nodes (DAG structure)
  depth: number;          // Distance from genesis (longest path)
  timestamp: number;
}

// ─── Merkle-DAG ──────────────────────────────────────────

export class MerkleDAG {
  private nodes: Map<string, MerkleNode> = new Map();
  private tips: Set<string> = new Set(); // Unreferenced leaf nodes
  private genesisHash: string | null = null;

  get size(): number { return this.nodes.size; }
  get tipCount(): number { return this.tips.size; }

  /** Compute the Merkle hash for a node */
  static async computeHash(content: string, parentHashes: string[]): Promise<string> {
    const canonical = content + '|' + parentHashes.sort().join(',');
    return sha256(canonical);
  }

  /** Add a genesis node (no parents) */
  async addGenesis(content: string): Promise<MerkleNode> {
    const hash = await MerkleDAG.computeHash(content, []);
    const node: MerkleNode = {
      hash,
      content,
      parentHashes: [],
      depth: 0,
      timestamp: Date.now(),
    };
    this.nodes.set(hash, node);
    this.tips.add(hash);
    this.genesisHash = hash;
    return node;
  }

  /** Add a node that references parent nodes */
  async addNode(content: string, parentHashes: string[]): Promise<MerkleNode> {
    // Validate parents exist
    for (const ph of parentHashes) {
      if (!this.nodes.has(ph)) {
        throw new Error(`Parent node not found: ${ph.slice(0, 8)}...`);
      }
    }

    const hash = await MerkleDAG.computeHash(content, parentHashes);

    // Compute depth as max(parent depths) + 1
    let maxDepth = 0;
    for (const ph of parentHashes) {
      const parent = this.nodes.get(ph)!;
      maxDepth = Math.max(maxDepth, parent.depth);
    }

    const node: MerkleNode = {
      hash,
      content,
      parentHashes,
      depth: maxDepth + 1,
      timestamp: Date.now(),
    };

    this.nodes.set(hash, node);

    // Update tips: remove parents from tips, add new node
    for (const ph of parentHashes) {
      this.tips.delete(ph);
    }
    this.tips.add(hash);

    return node;
  }

  /** Get a node by hash */
  getNode(hash: string): MerkleNode | undefined {
    return this.nodes.get(hash);
  }

  /** Get current tip hashes (unreferenced leaves) */
  getTips(): string[] {
    return Array.from(this.tips);
  }

  /** Verify the integrity of a node and its ancestry */
  async verifyNode(hash: string): Promise<boolean> {
    const node = this.nodes.get(hash);
    if (!node) return false;

    // Verify hash matches content
    const computed = await MerkleDAG.computeHash(node.content, node.parentHashes);
    if (computed !== node.hash) return false;

    // Recursively verify parents
    for (const ph of node.parentHashes) {
      if (!await this.verifyNode(ph)) return false;
    }

    return true;
  }

  /** Verify the entire DAG integrity */
  async verifyAll(): Promise<{ valid: boolean; invalidNodes: string[] }> {
    const invalidNodes: string[] = [];
    for (const [hash, node] of this.nodes) {
      const computed = await MerkleDAG.computeHash(node.content, node.parentHashes);
      if (computed !== hash) {
        invalidNodes.push(hash);
      }
    }
    return { valid: invalidNodes.length === 0, invalidNodes };
  }

  /** Get the path from a node back to genesis */
  getAncestry(hash: string): MerkleNode[] {
    const path: MerkleNode[] = [];
    const visited = new Set<string>();
    const queue = [hash];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = this.nodes.get(current);
      if (!node) continue;

      path.push(node);
      queue.push(...node.parentHashes);
    }

    return path.sort((a, b) => a.depth - b.depth);
  }

  /** Compute a Merkle root from current tips */
  async computeRoot(): Promise<string> {
    const tipHashes = this.getTips().sort();
    if (tipHashes.length === 0) return sha256('EMPTY_DAG');
    if (tipHashes.length === 1) return tipHashes[0];

    // Binary Merkle tree over tips
    let level = tipHashes;
    while (level.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        if (i + 1 < level.length) {
          next.push(await sha256(level[i] + level[i + 1]));
        } else {
          next.push(await sha256(level[i] + level[i])); // Duplicate odd element
        }
      }
      level = next;
    }
    return level[0];
  }

  /** Get DAG statistics */
  getStats(): DAGStats {
    let maxDepth = 0;
    let totalParents = 0;
    for (const node of this.nodes.values()) {
      maxDepth = Math.max(maxDepth, node.depth);
      totalParents += node.parentHashes.length;
    }
    return {
      totalNodes: this.nodes.size,
      tipCount: this.tips.size,
      maxDepth,
      avgParents: this.nodes.size > 0 ? totalParents / this.nodes.size : 0,
      genesisHash: this.genesisHash,
    };
  }

  /** Serialize DAG for persistence */
  serialize(): string {
    const data = {
      nodes: Array.from(this.nodes.entries()),
      tips: Array.from(this.tips),
      genesisHash: this.genesisHash,
    };
    return JSON.stringify(data);
  }

  /** Deserialize DAG from persistence */
  static deserialize(json: string): MerkleDAG {
    const data = JSON.parse(json);
    const dag = new MerkleDAG();
    dag.nodes = new Map(data.nodes);
    dag.tips = new Set(data.tips);
    dag.genesisHash = data.genesisHash;
    return dag;
  }
}

// ─── Types ───────────────────────────────────────────────

export interface DAGStats {
  totalNodes: number;
  tipCount: number;
  maxDepth: number;
  avgParents: number;
  genesisHash: string | null;
}

// ─── Merkle Proof ────────────────────────────────────────

export interface MerkleProof {
  targetHash: string;
  path: Array<{ hash: string; position: 'left' | 'right' }>;
  root: string;
}

/** Generate a Merkle inclusion proof for a node */
export async function generateProof(dag: MerkleDAG, nodeHash: string): Promise<MerkleProof | null> {
  const node = dag.getNode(nodeHash);
  if (!node) return null;

  const ancestry = dag.getAncestry(nodeHash);
  const path = ancestry.map(n => ({
    hash: n.hash,
    position: 'left' as const,
  }));

  const root = await dag.computeRoot();
  return { targetHash: nodeHash, path, root };
}

/** Verify a Merkle inclusion proof */
export async function verifyProof(proof: MerkleProof): Promise<boolean> {
  if (proof.path.length === 0) return false;
  // Verify the chain of hashes leads to the root
  let current = proof.targetHash;
  for (const step of proof.path) {
    if (step.position === 'left') {
      current = await sha256(step.hash + current);
    } else {
      current = await sha256(current + step.hash);
    }
  }
  return current === proof.root;
}
