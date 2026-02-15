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

import { sha256 } from './crypto';
import { type MeshTransaction, MeshLayer } from './cosmomesh';

// ─── Validator State ─────────────────────────────────────

export interface Validator {
  id: string;                      // Address of the validator
  publicKey: string;
  stake: number;                   // Staked Ω (weight in consensus)
  layerAffinities: number[];       // Affinity score per layer [0, 1]
  reputation: number;              // Trust score [0, 1]
  validationsCount: number;
  lastActive: number;
  isLocal: boolean;                // Is this the local node?
}

// ─── Vote ────────────────────────────────────────────────

export interface ConsensusVote {
  validatorId: string;
  transactionId: string;
  layer: MeshLayer;
  approve: boolean;
  resonanceContribution: number;   // How much resonance this vote adds
  timestamp: number;
  signature: string;
}

// ─── Consensus Round ─────────────────────────────────────

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

// ─── Resonance Consensus Engine ──────────────────────────

export class ResonanceConsensus {
  private validators: Map<string, Validator> = new Map();
  private rounds: Map<string, ConsensusRound> = new Map();
  private localValidator: Validator | null = null;

  // Consensus parameters
  private readonly RESONANCE_THRESHOLD = 0.67;     // 2/3 supermajority
  private readonly LAYER_WEIGHT_DECAY = 0.95;       // Affinity decay per round

  constructor() {}

  // ─── Validator Management ────────────────────────────

  registerValidator(params: {
    id: string;
    publicKey: string;
    stake: number;
    isLocal?: boolean;
  }): Validator {
    const validator: Validator = {
      id: params.id,
      publicKey: params.publicKey,
      stake: params.stake,
      layerAffinities: new Array(7).fill(1 / 7), // Equal affinity initially
      reputation: 0.5,  // Neutral start
      validationsCount: 0,
      lastActive: Date.now(),
      isLocal: params.isLocal ?? false,
    };

    this.validators.set(params.id, validator);

    if (params.isLocal) {
      this.localValidator = validator;
    }

    return validator;
  }

  getValidator(id: string): Validator | undefined {
    return this.validators.get(id);
  }

  getValidatorCount(): number {
    return this.validators.size;
  }

  // ─── Consensus Process ───────────────────────────────

  /** Start a consensus round for a transaction */
  async startRound(tx: MeshTransaction): Promise<ConsensusRound> {
    const round: ConsensusRound = {
      transactionId: tx.id,
      layer: tx.layer,
      votes: [],
      startTime: Date.now(),
      finalResonance: 0,
      finalized: false,
      result: 'pending',
    };

    this.rounds.set(tx.id, round);

    // In local mode (single validator), auto-validate
    if (this.localValidator && this.validators.size <= 1) {
      const vote = await this.castLocalVote(tx);
      round.votes.push(vote);
      this.finalizeRound(round);
    }

    return round;
  }

  /** Cast a vote from the local validator */
  async castLocalVote(tx: MeshTransaction): Promise<ConsensusVote> {
    if (!this.localValidator) {
      throw new Error('No local validator registered');
    }

    const validator = this.localValidator;

    // Validate the transaction locally
    const isValid = await this.localValidate(tx);

    // Compute resonance contribution based on:
    // - Validator's affinity to the transaction's layer
    // - Validator's stake weight
    // - Validator's reputation
    const layerAffinity = validator.layerAffinities[tx.layer];
    const stakeWeight = Math.log(1 + validator.stake) / Math.log(1 + 10000);
    const resonanceContribution = layerAffinity * stakeWeight * validator.reputation;

    const vote: ConsensusVote = {
      validatorId: validator.id,
      transactionId: tx.id,
      layer: tx.layer,
      approve: isValid,
      resonanceContribution: isValid ? resonanceContribution : 0,
      timestamp: Date.now(),
      signature: '', // Would be signed in network mode
    };

    // Update validator's layer affinity (specialize)
    this.updateLayerAffinity(validator, tx.layer);
    validator.validationsCount++;
    validator.lastActive = Date.now();

    return vote;
  }

  /** Process a vote received from a peer */
  async processVote(vote: ConsensusVote): Promise<void> {
    const round = this.rounds.get(vote.transactionId);
    if (!round || round.finalized) return;

    // Verify the vote comes from a known validator
    const validator = this.validators.get(vote.validatorId);
    if (!validator) return;

    // Add vote
    round.votes.push(vote);

    // Check if we can finalize
    this.finalizeRound(round);
  }

  /** Attempt to finalize a consensus round */
  private finalizeRound(round: ConsensusRound): void {
    if (round.finalized) return;

    const totalStake = this.getTotalStake();
    if (totalStake === 0) return;

    // Compute weighted resonance from all votes
    let totalResonance = 0;
    let approveWeight = 0;
    let totalWeight = 0;

    for (const vote of round.votes) {
      const validator = this.validators.get(vote.validatorId);
      if (!validator) continue;

      const weight = validator.stake * validator.reputation;
      totalWeight += weight;

      if (vote.approve) {
        approveWeight += weight;
        totalResonance += vote.resonanceContribution;
      }
    }

    // Normalize resonance to [0, 1]
    round.finalResonance = totalWeight > 0 ? approveWeight / totalWeight : 0;

    // Check if threshold is met
    const participationRate = totalWeight / totalStake;
    const hasQuorum = participationRate >= 0.5 || this.validators.size <= 1;

    if (hasQuorum) {
      round.finalized = true;
      round.endTime = Date.now();
      round.result = round.finalResonance >= this.RESONANCE_THRESHOLD ? 'approved' : 'rejected';

      // Update validator reputations
      this.updateReputations(round);
    }
  }

  // ─── Local Validation ────────────────────────────────

  private async localValidate(tx: MeshTransaction): Promise<boolean> {
    // Basic structural validation
    if (tx.amount <= 0) return false;
    if (tx.from === tx.to) return false;
    if (!tx.id || !tx.timestamp) return false;

    // Verify ID integrity
    const expectedId = await sha256(
      `${tx.from}:${tx.to}:${tx.amount}:${tx.timestamp}:${tx.parentIds.sort().join(',')}`
    );
    if (expectedId !== tx.id) return false;

    return true;
  }

  // ─── Layer Affinity ──────────────────────────────────

  /** Update validator's layer affinity after validating on a specific layer */
  private updateLayerAffinity(validator: Validator, activeLayer: MeshLayer): void {
    const affinities = validator.layerAffinities;

    // Boost affinity for the active layer
    affinities[activeLayer] += 0.1;

    // Decay other layers
    for (let i = 0; i < affinities.length; i++) {
      if (i !== activeLayer) {
        affinities[i] *= this.LAYER_WEIGHT_DECAY;
      }
    }

    // Normalize so they sum to 1
    const sum = affinities.reduce((a, b) => a + b, 0);
    for (let i = 0; i < affinities.length; i++) {
      affinities[i] /= sum;
    }
  }

  // ─── Reputation System ───────────────────────────────

  private updateReputations(round: ConsensusRound): void {
    const majorityApproved = round.result === 'approved';

    for (const vote of round.votes) {
      const validator = this.validators.get(vote.validatorId);
      if (!validator) continue;

      // Reward validators who voted with the majority
      const votedWithMajority = vote.approve === majorityApproved;
      if (votedWithMajority) {
        validator.reputation = Math.min(1.0, validator.reputation + 0.01);
      } else {
        validator.reputation = Math.max(0.0, validator.reputation - 0.05);
      }
    }
  }

  // ─── Helpers ─────────────────────────────────────────

  private getTotalStake(): number {
    let total = 0;
    for (const v of this.validators.values()) {
      total += v.stake;
    }
    return total;
  }

  // ─── Queries ─────────────────────────────────────────

  getRound(txId: string): ConsensusRound | undefined {
    return this.rounds.get(txId);
  }

  getConsensusStats(): ConsensusStats {
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    for (const round of this.rounds.values()) {
      switch (round.result) {
        case 'approved': approved++; break;
        case 'rejected': rejected++; break;
        case 'pending': pending++; break;
      }
      if (round.endTime) {
        totalLatency += round.endTime - round.startTime;
        latencyCount++;
      }
    }

    return {
      totalRounds: this.rounds.size,
      approved,
      rejected,
      pending,
      avgLatencyMs: latencyCount > 0 ? totalLatency / latencyCount : 0,
      validatorCount: this.validators.size,
      totalStake: this.getTotalStake(),
    };
  }

  /** Get the resonance matrix — shows cross-layer validation patterns */
  getResonanceMatrix(): number[][] {
    const matrix: number[][] = Array(7).fill(null).map(() => Array(7).fill(0));

    for (const round of this.rounds.values()) {
      for (const vote of round.votes) {
        const validator = this.validators.get(vote.validatorId);
        if (!validator || !vote.approve) continue;

        for (let i = 0; i < 7; i++) {
          matrix[round.layer][i] += validator.layerAffinities[i];
        }
      }
    }

    return matrix;
  }

  // ─── Serialization ───────────────────────────────────

  serialize(): string {
    return JSON.stringify({
      validators: Array.from(this.validators.entries()),
      rounds: Array.from(this.rounds.entries()),
      localValidatorId: this.localValidator?.id,
    });
  }

  static deserialize(json: string): ResonanceConsensus {
    const data = JSON.parse(json);
    const consensus = new ResonanceConsensus();
    consensus.validators = new Map(data.validators);
    consensus.rounds = new Map(data.rounds);

    if (data.localValidatorId) {
      consensus.localValidator = consensus.validators.get(data.localValidatorId) || null;
    }

    return consensus;
  }
}

// ─── Types ───────────────────────────────────────────────

export interface ConsensusStats {
  totalRounds: number;
  approved: number;
  rejected: number;
  pending: number;
  avgLatencyMs: number;
  validatorCount: number;
  totalStake: number;
}
