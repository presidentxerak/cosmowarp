/**
 * CosmoWarp Merkle-DAG — Cryptographic Integrity Layer
 *
 * Implements a Merkle Directed Acyclic Graph for transaction verification.
 * Each node in the DAG contains the SHA-256 hash of its content + parent hashes.
 * This provides tamper-proof verification of the entire transaction history.
 */
export interface MerkleNode {
    hash: string;
    content: string;
    parentHashes: string[];
    depth: number;
    timestamp: number;
}
export declare class MerkleDAG {
    private nodes;
    private tips;
    private genesisHash;
    get size(): number;
    get tipCount(): number;
    /** Compute the Merkle hash for a node */
    static computeHash(content: string, parentHashes: string[]): Promise<string>;
    /** Add a genesis node (no parents) */
    addGenesis(content: string): Promise<MerkleNode>;
    /** Add a node that references parent nodes */
    addNode(content: string, parentHashes: string[]): Promise<MerkleNode>;
    /** Get a node by hash */
    getNode(hash: string): MerkleNode | undefined;
    /** Get current tip hashes (unreferenced leaves) */
    getTips(): string[];
    /** Verify the integrity of a node and its ancestry */
    verifyNode(hash: string): Promise<boolean>;
    /** Verify the entire DAG integrity */
    verifyAll(): Promise<{
        valid: boolean;
        invalidNodes: string[];
    }>;
    /** Get the path from a node back to genesis */
    getAncestry(hash: string): MerkleNode[];
    /** Compute a Merkle root from current tips */
    computeRoot(): Promise<string>;
    /** Get DAG statistics */
    getStats(): DAGStats;
    /** Serialize DAG for persistence */
    serialize(): string;
    /** Deserialize DAG from persistence */
    static deserialize(json: string): MerkleDAG;
}
export interface DAGStats {
    totalNodes: number;
    tipCount: number;
    maxDepth: number;
    avgParents: number;
    genesisHash: string | null;
}
export interface MerkleProof {
    targetHash: string;
    path: Array<{
        hash: string;
        position: 'left' | 'right';
    }>;
    root: string;
}
/** Generate a Merkle inclusion proof for a node */
export declare function generateProof(dag: MerkleDAG, nodeHash: string): Promise<MerkleProof | null>;
/** Verify a Merkle inclusion proof */
export declare function verifyProof(proof: MerkleProof): Promise<boolean>;
//# sourceMappingURL=merkle.d.ts.map