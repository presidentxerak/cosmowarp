/**
 * CosmoWarp Resonance Consensus — Fractal Layer Consensus Protocol
 *
 * A novel consensus mechanism that doesn't rely on:
 * - Proof of Work (energy waste)
 * - Traditional PBFT (leader election overhead)
 * - Nakamoto Consensus (probabilistic, slow)
 *
 * Instead, Resonance Consensus uses the 7 fractal layers as parallel
 * validation channels. Each validator has a "harmonic affinity" to certain
 * layers based on its participation history. Consensus emerges from
 * cross-layer resonance patterns.
 *
 * Properties:
 * - Byzantine fault tolerant (up to f < n/3 malicious validators)
 * - Instant finality (no waiting for block confirmations)
 * - Parallel validation (7 independent validation lanes)
 * - Energy efficient (no mining, just validation work)
 * - Self-organizing (validators naturally specialize)
 */
import { type MeshTransaction, MeshLayer } from './cosmomesh';
export interface Validator {
    id: string;
    publicKey: string;
    stake: number;
    layerAffinities: number[];
    reputation: number;
    validationsCount: number;
    lastActive: number;
    isLocal: boolean;
}
export interface ConsensusVote {
    validatorId: string;
    transactionId: string;
    layer: MeshLayer;
    approve: boolean;
    resonanceContribution: number;
    timestamp: number;
    signature: string;
}
export interface ConsensusRound {
    transactionId: string;
    layer: MeshLayer;
    votes: ConsensusVote[];
    startTime: number;
    endTime?: number;
    finalResonance: number;
    finalized: boolean;
    result: 'approved' | 'rejected' | 'pending';
}
export declare class ResonanceConsensus {
    private validators;
    private rounds;
    private localValidator;
    private readonly RESONANCE_THRESHOLD;
    private readonly LAYER_WEIGHT_DECAY;
    constructor();
    registerValidator(params: {
        id: string;
        publicKey: string;
        stake: number;
        isLocal?: boolean;
    }): Validator;
    getValidator(id: string): Validator | undefined;
    getValidatorCount(): number;
    /** Start a consensus round for a transaction */
    startRound(tx: MeshTransaction): Promise<ConsensusRound>;
    /** Cast a vote from the local validator */
    castLocalVote(tx: MeshTransaction): Promise<ConsensusVote>;
    /** Process a vote received from a peer */
    processVote(vote: ConsensusVote): Promise<void>;
    /** Attempt to finalize a consensus round */
    private finalizeRound;
    private localValidate;
    /** Update validator's layer affinity after validating on a specific layer */
    private updateLayerAffinity;
    private updateReputations;
    private getTotalStake;
    getRound(txId: string): ConsensusRound | undefined;
    getConsensusStats(): ConsensusStats;
    /** Get the resonance matrix — shows cross-layer validation patterns */
    getResonanceMatrix(): number[][];
    serialize(): string;
    static deserialize(json: string): ResonanceConsensus;
}
export interface ConsensusStats {
    totalRounds: number;
    approved: number;
    rejected: number;
    pending: number;
    avgLatencyMs: number;
    validatorCount: number;
    totalStake: number;
}
//# sourceMappingURL=consensus.d.ts.map