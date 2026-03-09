/**
 * CosmoMesh — DAG-Based Transactional Fabric
 *
 * NOT a blockchain. A Directed Acyclic Graph of transactions where:
 * - Each transaction references 2+ parent transactions (validates them)
 * - 7 parallel validation lanes (fractal layers) for massive throughput
 * - Instant settlement via Resonance Consensus
 * - No blocks, no miners, no chain — just a living mesh of transactions
 *
 * Key innovations over blockchain:
 * - Parallel validation across 7 layers = 7x throughput potential
 * - Each new TX validates 2 previous = natural spam prevention
 * - DAG structure = no orphan blocks, no forks
 * - Resonance scoring = probabilistic finality in <1 second
 *
 * Key innovations over fiat:
 * - P2P = no intermediary, no bank
 * - Ed25519 signatures = unforgeable
 * - Merkle-DAG = fully auditable
 * - CosmoASM programmable = smart contracts via VM
 */
export declare const MeshLayer: {
    readonly GRID: 0;
    readonly HELIX: 1;
    readonly GLYPH: 2;
    readonly COSMO: 3;
    readonly CHRONOS: 4;
    readonly NEXUS: 5;
    readonly LUMINA: 6;
};
export type MeshLayer = (typeof MeshLayer)[keyof typeof MeshLayer];
export declare const LAYER_NAMES: string[];
/** Determine which layer a transaction belongs to based on amount and type */
export declare function assignLayer(amount: number, type: MeshTransaction['type']): MeshLayer;
export interface MeshTransaction {
    id: string;
    from: string;
    to: string;
    amount: number;
    timestamp: number;
    signature: string;
    publicKey: string;
    parentIds: string[];
    layer: MeshLayer;
    type: TransactionType;
    memo?: string;
    resonanceScore: number;
    confirmations: number;
    meshDepth: number;
}
export type TransactionType = 'transfer' | 'mine' | 'genesis' | 'epoch' | 'bridge' | 'timelock' | 'governance';
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    resonanceScore: number;
    layer: MeshLayer;
}
export declare class CosmoMesh {
    private transactions;
    private merkleDAG;
    private balances;
    private tipsByLayer;
    private childIndex;
    private genesisId;
    private layerTps;
    constructor();
    get size(): number;
    createGenesis(address: string, amount?: number): Promise<MeshTransaction>;
    createTransaction(params: {
        from: string;
        to: string;
        amount: number;
        privateKey: string;
        publicKey: string;
        memo?: string;
        type?: TransactionType;
    }): Promise<{
        tx: MeshTransaction;
        validation: ValidationResult;
    }>;
    createMiningReward(params: {
        to: string;
        energyUsed: number;
        cycles: number;
        publicKey: string;
        privateKey: string;
    }): Promise<{
        tx: MeshTransaction;
        validation: ValidationResult;
    }>;
    validateTransaction(tx: MeshTransaction): Promise<ValidationResult>;
    private selectParents;
    /** Weighted random tip selection — favors newer tips */
    private weightedTipSelection;
    /** Compute resonance score for a transaction based on:
     * - Parent validation depth (deeper = more trusted)
     * - Cross-layer references (more layers = more secure)
     * - Network participation (more confirmations = more final)
     */
    private computeResonance;
    private applyTransaction;
    private propagateConfirmation;
    private computeDepth;
    private trackTps;
    getTransaction(id: string): MeshTransaction | undefined;
    getBalance(address: string): number;
    getTransactionsByAddress(address: string): MeshTransaction[];
    getRecentTransactions(limit?: number): MeshTransaction[];
    getAllTips(): string[];
    getLayerTips(layer: MeshLayer): string[];
    /** Get transactions per second for a layer (last 60s) */
    getLayerTps(layer: MeshLayer): number;
    /** Get total TPS across all layers */
    getTotalTps(): number;
    /** Is a transaction considered final? (resonance > 0.7 and 3+ confirmations) */
    isFinalized(txId: string): boolean;
    /** Get mesh statistics */
    getStats(): MeshStats;
    serialize(): string;
    static deserialize(json: string): CosmoMesh;
}
export interface MeshStats {
    totalTransactions: number;
    totalTips: number;
    avgResonance: number;
    finalizedCount: number;
    layerDistribution: Record<number, number>;
    totalTps: number;
    maxDepth: number;
}
//# sourceMappingURL=cosmomesh.d.ts.map