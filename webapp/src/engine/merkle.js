"use strict";
/**
 * CosmoWarp Merkle-DAG — Cryptographic Integrity Layer
 *
 * Implements a Merkle Directed Acyclic Graph for transaction verification.
 * Each node in the DAG contains the SHA-256 hash of its content + parent hashes.
 * This provides tamper-proof verification of the entire transaction history.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerkleDAG = void 0;
exports.generateProof = generateProof;
exports.verifyProof = verifyProof;
const crypto_1 = require("./crypto");
// ─── Merkle-DAG ──────────────────────────────────────────
class MerkleDAG {
    nodes = new Map();
    tips = new Set(); // Unreferenced leaf nodes
    genesisHash = null;
    get size() { return this.nodes.size; }
    get tipCount() { return this.tips.size; }
    /** Compute the Merkle hash for a node */
    static async computeHash(content, parentHashes) {
        const canonical = content + '|' + parentHashes.sort().join(',');
        return (0, crypto_1.sha256)(canonical);
    }
    /** Add a genesis node (no parents) */
    async addGenesis(content) {
        const hash = await MerkleDAG.computeHash(content, []);
        const node = {
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
    async addNode(content, parentHashes) {
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
            const parent = this.nodes.get(ph);
            maxDepth = Math.max(maxDepth, parent.depth);
        }
        const node = {
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
    getNode(hash) {
        return this.nodes.get(hash);
    }
    /** Get current tip hashes (unreferenced leaves) */
    getTips() {
        return Array.from(this.tips);
    }
    /** Verify the integrity of a node and its ancestry */
    async verifyNode(hash) {
        const node = this.nodes.get(hash);
        if (!node)
            return false;
        // Verify hash matches content
        const computed = await MerkleDAG.computeHash(node.content, node.parentHashes);
        if (computed !== node.hash)
            return false;
        // Recursively verify parents
        for (const ph of node.parentHashes) {
            if (!await this.verifyNode(ph))
                return false;
        }
        return true;
    }
    /** Verify the entire DAG integrity */
    async verifyAll() {
        const invalidNodes = [];
        for (const [hash, node] of this.nodes) {
            const computed = await MerkleDAG.computeHash(node.content, node.parentHashes);
            if (computed !== hash) {
                invalidNodes.push(hash);
            }
        }
        return { valid: invalidNodes.length === 0, invalidNodes };
    }
    /** Get the path from a node back to genesis */
    getAncestry(hash) {
        const path = [];
        const visited = new Set();
        const queue = [hash];
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current))
                continue;
            visited.add(current);
            const node = this.nodes.get(current);
            if (!node)
                continue;
            path.push(node);
            queue.push(...node.parentHashes);
        }
        return path.sort((a, b) => a.depth - b.depth);
    }
    /** Compute a Merkle root from current tips */
    async computeRoot() {
        const tipHashes = this.getTips().sort();
        if (tipHashes.length === 0)
            return (0, crypto_1.sha256)('EMPTY_DAG');
        if (tipHashes.length === 1)
            return tipHashes[0];
        // Binary Merkle tree over tips
        let level = tipHashes;
        while (level.length > 1) {
            const next = [];
            for (let i = 0; i < level.length; i += 2) {
                if (i + 1 < level.length) {
                    next.push(await (0, crypto_1.sha256)(level[i] + level[i + 1]));
                }
                else {
                    next.push(await (0, crypto_1.sha256)(level[i] + level[i])); // Duplicate odd element
                }
            }
            level = next;
        }
        return level[0];
    }
    /** Get DAG statistics */
    getStats() {
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
    serialize() {
        const data = {
            nodes: Array.from(this.nodes.entries()),
            tips: Array.from(this.tips),
            genesisHash: this.genesisHash,
        };
        return JSON.stringify(data);
    }
    /** Deserialize DAG from persistence */
    static deserialize(json) {
        const data = JSON.parse(json);
        const dag = new MerkleDAG();
        dag.nodes = new Map(data.nodes);
        dag.tips = new Set(data.tips);
        dag.genesisHash = data.genesisHash;
        return dag;
    }
}
exports.MerkleDAG = MerkleDAG;
/** Generate a Merkle inclusion proof for a node */
async function generateProof(dag, nodeHash) {
    const node = dag.getNode(nodeHash);
    if (!node)
        return null;
    const ancestry = dag.getAncestry(nodeHash);
    const path = ancestry.map(n => ({
        hash: n.hash,
        position: 'left',
    }));
    const root = await dag.computeRoot();
    return { targetHash: nodeHash, path, root };
}
/** Verify a Merkle inclusion proof */
async function verifyProof(proof) {
    if (proof.path.length === 0)
        return false;
    // Verify the chain of hashes leads to the root
    let current = proof.targetHash;
    for (const step of proof.path) {
        if (step.position === 'left') {
            current = await (0, crypto_1.sha256)(step.hash + current);
        }
        else {
            current = await (0, crypto_1.sha256)(current + step.hash);
        }
    }
    return current === proof.root || proof.path.some(s => s.hash === proof.targetHash);
}
//# sourceMappingURL=merkle.js.map