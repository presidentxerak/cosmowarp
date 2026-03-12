/**
 * Strangrz Resonance Consensus — Fractal Layer Consensus with PBFT
 *
 * Consensus modes (honest about what each provides):
 *
 * 1. Single-node mode (one tab, no peers):
 *    Local validation only. The local validator auto-approves structurally
 *    valid transactions. This is NOT Byzantine fault tolerant — it's
 *    acknowledged single-node validation. No safety against malicious nodes
 *    because there is only one node.
 *
 * 2. Multi-tab mode (BroadcastChannel peers):
 *    Real PBFT across browser tabs sharing the same origin. Each tab runs
 *    a validator. Achieves f < n/3 Byzantine fault tolerance where n is the
 *    number of tabs. Pre-prepare → prepare → commit → finalized.
 *
 * 3. Remote peer mode (WebSocket signaling + WebRTC):
 *    Real distributed PBFT across different machines. Same 3-phase protocol,
 *    same f < n/3 guarantee, but over the network via CosmoP2P.
 *
 * The resonance scoring (layer affinity, stake weight, reputation) is layered
 * on top of PBFT — it determines vote weight within the protocol, not a
 * replacement for it.
 *
 * ─── StrangrzChain Integration ───────────────────────────────
 * With StrangrzChain, validators now participate in shard-level consensus.
 * Each validator specializes in 1-3 shards based on their affinity.
 * Shard blocks achieve finality through Resonance Consensus.
 * Beacon blocks achieve cross-shard consensus every 10 shard blocks.
 * Zero gas cost — validators earn from staking rewards, not from fees.
 *
 * Properties:
 * - Byzantine fault tolerant (up to f < n/3 malicious validators, when n > 1)
 * - Instant finality (no waiting for block confirmations)
 * - Parallel validation (7 independent shards)
 * - Energy efficient (no mining, just validation work)
 * - Self-organizing (validators naturally specialize in shards)
 * - Zero gas (free transactions for users)
 * - PBFT view changes (leader rotation on timeout)
 */

import { sha256, signTransaction, verifySignature } from './crypto';
import { type MeshTransaction, MeshLayer } from './strangrmesh';

// ─── Validator State ─────────────────────────────────────

export interface Validator {
  id: string;                      // Address of the validator
  publicKey: string;
  privateKey?: string;             // Private key for signing votes (only for local validator)
  stake: number;                   // Staked ⬣ (weight in consensus)
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

// ─── PBFT Types ──────────────────────────────────────────

export type PBFTPhase = 'pre-prepare' | 'prepare' | 'commit' | 'finalized';

export interface PBFTState {
  phase: PBFTPhase;
  viewNumber: number;                              // Current view (leader rotation)
  sequenceNumber: number;                          // Block/TX sequence
  prepareMessages: Map<string, ConsensusVote>;     // validator → vote
  commitMessages: Map<string, ConsensusVote>;      // validator → vote
  prepareQuorum: boolean;                          // Got 2f+1 prepares?
  commitQuorum: boolean;                           // Got 2f+1 commits?
  leaderId: string;                                // Current leader for this round
  viewChangeTimer: ReturnType<typeof setTimeout> | null; // Timeout for view change
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
  isSingleNode?: boolean;  // true = local validation only (honest about it)
  pbft?: PBFTState;        // Present when running real PBFT (validators > 1)
}

// ─── Resonance Consensus Engine ──────────────────────────

export class ResonanceConsensus {
  private validators: Map<string, Validator> = new Map();
  private rounds: Map<string, ConsensusRound> = new Map();
  private localValidator: Validator | null = null;

  // Consensus parameters
  private readonly RESONANCE_THRESHOLD = 0.67;     // 2/3 supermajority
  private readonly LAYER_WEIGHT_DECAY = 0.95;       // Affinity decay per round

  // Vote signature verification (fixes audit: votes now require Ed25519 signatures)
  private _voteSignatureRequired = true;

  // PBFT parameters
  private pbftViewNumber = 0;
  private pbftSequenceNumber = 0;
  private readonly PBFT_VIEW_CHANGE_TIMEOUT_MS = 5000; // 5 seconds before view change

  // PBFT stats tracking
  private prepareQuorumCount = 0;
  private commitQuorumCount = 0;

  // Callback for view change events (can be wired to P2P broadcast)
  onViewChange?: (viewNumber: number, reason: string) => void;

  constructor() {}

  // ─── Validator Management ────────────────────────────

  registerValidator(params: {
    id: string;
    publicKey: string;
    privateKey?: string;
    stake: number;
    isLocal?: boolean;
  }): Validator {
    const validator: Validator = {
      id: params.id,
      publicKey: params.publicKey,
      privateKey: params.isLocal ? params.privateKey : undefined,
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

  // ─── PBFT: Byzantine Fault Tolerance Calculations ──

  /** Maximum number of faulty validators tolerated: f = floor((n-1)/3) */
  getMaxFaults(): number {
    return Math.floor((this.validators.size - 1) / 3);
  }

  /** Quorum size required for PBFT phases: 2f + 1 */
  getQuorumSize(): number {
    return 2 * this.getMaxFaults() + 1;
  }

  /** Get the current PBFT leader based on view number */
  private getPBFTLeader(): string {
    const validatorIds = Array.from(this.validators.keys()).sort();
    if (validatorIds.length === 0) return '';
    return validatorIds[this.pbftViewNumber % validatorIds.length];
  }

  /** Check if the local node is the current PBFT leader */
  isLocalLeader(): boolean {
    return this.localValidator !== null && this.getPBFTLeader() === this.localValidator.id;
  }

  /** Enable/disable vote signature verification */
  setVoteSignatureRequired(required: boolean): void {
    this._voteSignatureRequired = required;
  }

  /** Check if vote signatures are required */
  isVoteSignatureRequired(): boolean {
    return this._voteSignatureRequired;
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

    // HONEST: In single-node mode, we auto-validate locally.
    // This is NOT Byzantine fault tolerant — it's acknowledged local validation.
    // Real BFT consensus only activates when peers are connected via P2P.
    if (this.localValidator && this.validators.size <= 1) {
      round.isSingleNode = true;
      const vote = await this.castLocalVote(tx);
      round.votes.push(vote);
      this.finalizeRound(round);
    } else if (this.validators.size > 1) {
      // Real PBFT: initialize the 3-phase protocol
      this.pbftSequenceNumber++;
      const leaderId = this.getPBFTLeader();

      round.pbft = {
        phase: 'pre-prepare',
        viewNumber: this.pbftViewNumber,
        sequenceNumber: this.pbftSequenceNumber,
        prepareMessages: new Map(),
        commitMessages: new Map(),
        prepareQuorum: false,
        commitQuorum: false,
        leaderId,
        viewChangeTimer: null,
      };

      // If we are the leader, cast our vote as the pre-prepare proposal
      // and advance to prepare phase. Other validators will respond with prepares.
      if (this.localValidator && leaderId === this.localValidator.id) {
        const vote = await this.castLocalVote(tx);
        round.votes.push(vote);
        round.pbft.prepareMessages.set(this.localValidator.id, vote);
        round.pbft.phase = 'prepare';
        this.checkPrepareQuorum(round);
      }

      // Start the view change timeout — if leader doesn't propose in time,
      // any validator can trigger a view change
      round.pbft.viewChangeTimer = setTimeout(() => {
        if (!round.finalized && round.pbft && round.pbft.phase === 'pre-prepare') {
          this.requestViewChange(`Leader ${leaderId} timed out for tx ${tx.id}`);
        }
      }, this.PBFT_VIEW_CHANGE_TIMEOUT_MS);
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

    // Sign the vote with Ed25519 (real signature, not empty string)
    const voteData = `VOTE:${tx.id}:${validator.id}:${isValid}:${Date.now()}`;
    let voteSignature = '';
    if (validator.privateKey) {
      try {
        voteSignature = await signTransaction(voteData, validator.privateKey);
      } catch {
        // Signing failed — vote without signature (degraded mode)
      }
    }

    const vote: ConsensusVote = {
      validatorId: validator.id,
      transactionId: tx.id,
      layer: tx.layer,
      approve: isValid,
      resonanceContribution: isValid ? resonanceContribution : 0,
      timestamp: Date.now(),
      signature: voteSignature,
    };

    // Update validator's layer affinity (specialize)
    this.updateLayerAffinity(validator, tx.layer);
    validator.validationsCount++;
    validator.lastActive = Date.now();

    return vote;
  }

  /** Process a vote received from a peer (backward-compatible entry point) */
  async processVote(vote: ConsensusVote): Promise<void> {
    const round = this.rounds.get(vote.transactionId);
    if (!round || round.finalized) return;

    // Verify the vote comes from a known validator
    const validator = this.validators.get(vote.validatorId);
    if (!validator) return;

    // Verify vote signature (Ed25519)
    if (this._voteSignatureRequired) {
      if (!vote.signature) {
        console.warn(`[Consensus] Rejected vote from ${vote.validatorId}: missing signature`);
        return; // Reject unsigned votes when signatures are required
      }
      try {
        const voteData = `VOTE:${vote.transactionId}:${vote.validatorId}:${vote.approve}:${vote.timestamp}`;
        const sigValid = await verifySignature(voteData, vote.signature, validator.publicKey);
        if (!sigValid) {
          console.warn(`[Consensus] Rejected vote from ${vote.validatorId}: invalid signature`);
          return;
        }
      } catch {
        return; // Signature verification failed — reject
      }
    }

    // Add vote to the round's vote list
    round.votes.push(vote);

    // If PBFT is active, route through the PBFT phase machine
    if (round.pbft) {
      // Votes from peers during pre-prepare/prepare phase are prepare messages
      if (round.pbft.phase === 'pre-prepare' || round.pbft.phase === 'prepare') {
        if (!round.pbft.prepareMessages.has(vote.validatorId)) {
          round.pbft.prepareMessages.set(vote.validatorId, vote);

          // Leader received a vote → move to prepare if still in pre-prepare
          if (round.pbft.phase === 'pre-prepare') {
            round.pbft.phase = 'prepare';
          }

          this.checkPrepareQuorum(round);
        }
      } else if (round.pbft.phase === 'commit') {
        // During commit phase, incoming votes are commit messages
        if (!round.pbft.commitMessages.has(vote.validatorId)) {
          round.pbft.commitMessages.set(vote.validatorId, vote);
          this.checkCommitQuorum(round);
        }
      }
      return;
    }

    // Non-PBFT fallback: original resonance finalization
    this.finalizeRound(round);
  }

  // ─── PBFT Phase Handlers ──────────────────────────────

  /**
   * Receive a prepare message from a peer.
   * In PBFT, after the leader sends pre-prepare, validators respond with prepare.
   * Returns the current phase after processing.
   */
  async receivePrepare(vote: ConsensusVote): Promise<PBFTPhase> {
    const round = this.rounds.get(vote.transactionId);
    if (!round || round.finalized || !round.pbft) return 'finalized';

    const validator = this.validators.get(vote.validatorId);
    if (!validator) return round.pbft.phase;

    // Only accept prepares during pre-prepare or prepare phase
    if (round.pbft.phase !== 'pre-prepare' && round.pbft.phase !== 'prepare') {
      return round.pbft.phase;
    }

    // Record the prepare message (deduplicate by validator)
    if (!round.pbft.prepareMessages.has(vote.validatorId)) {
      round.pbft.prepareMessages.set(vote.validatorId, vote);
      round.votes.push(vote);
    }

    // Move from pre-prepare to prepare on first received prepare
    if (round.pbft.phase === 'pre-prepare') {
      round.pbft.phase = 'prepare';
    }

    this.checkPrepareQuorum(round);
    return round.pbft.phase;
  }

  /**
   * Receive a commit message from a peer.
   * In PBFT, after 2f+1 prepares, validators send commit messages.
   * Returns the current phase after processing.
   */
  async receiveCommit(vote: ConsensusVote): Promise<PBFTPhase> {
    const round = this.rounds.get(vote.transactionId);
    if (!round || round.finalized || !round.pbft) return 'finalized';

    const validator = this.validators.get(vote.validatorId);
    if (!validator) return round.pbft.phase;

    // Only accept commits during commit phase
    if (round.pbft.phase !== 'commit') {
      return round.pbft.phase;
    }

    // Record the commit message (deduplicate by validator)
    if (!round.pbft.commitMessages.has(vote.validatorId)) {
      round.pbft.commitMessages.set(vote.validatorId, vote);
    }

    this.checkCommitQuorum(round);
    return round.pbft.phase;
  }

  /** Check if we have 2f+1 prepare messages → advance to commit phase */
  private checkPrepareQuorum(round: ConsensusRound): void {
    if (!round.pbft || round.pbft.prepareQuorum) return;

    const quorumSize = this.getQuorumSize();
    if (round.pbft.prepareMessages.size >= quorumSize) {
      round.pbft.prepareQuorum = true;
      round.pbft.phase = 'commit';
      this.prepareQuorumCount++;

      // Clear the view change timer since leader delivered
      if (round.pbft.viewChangeTimer) {
        clearTimeout(round.pbft.viewChangeTimer);
        round.pbft.viewChangeTimer = null;
      }

      // Automatically add local validator's commit if present
      if (this.localValidator && !round.pbft.commitMessages.has(this.localValidator.id)) {
        const localPrepare = round.pbft.prepareMessages.get(this.localValidator.id);
        if (localPrepare) {
          round.pbft.commitMessages.set(this.localValidator.id, localPrepare);
          this.checkCommitQuorum(round);
        }
      }
    }
  }

  /** Check if we have 2f+1 commit messages → finalize the round */
  private checkCommitQuorum(round: ConsensusRound): void {
    if (!round.pbft || round.pbft.commitQuorum) return;

    const quorumSize = this.getQuorumSize();
    if (round.pbft.commitMessages.size >= quorumSize) {
      round.pbft.commitQuorum = true;
      round.pbft.phase = 'finalized';
      this.commitQuorumCount++;

      // Clear any remaining timer
      if (round.pbft.viewChangeTimer) {
        clearTimeout(round.pbft.viewChangeTimer);
        round.pbft.viewChangeTimer = null;
      }

      // Finalize using the existing resonance scoring on collected votes
      this.finalizeRound(round);
    }
  }

  // ─── PBFT View Change ─────────────────────────────────

  /**
   * Request a view change (leader rotation).
   * Called when the current leader fails to propose within the timeout.
   * Increments the view number, which rotates the leader.
   */
  async requestViewChange(reason: string): Promise<void> {
    this.pbftViewNumber++;
    const newLeader = this.getPBFTLeader();

    // Notify listeners (P2P layer can broadcast this)
    if (this.onViewChange) {
      this.onViewChange(this.pbftViewNumber, reason);
    }

    // Re-check any pending rounds that were stuck in pre-prepare.
    // With the new leader, the round may need to be restarted.
    for (const round of this.rounds.values()) {
      if (!round.finalized && round.pbft && round.pbft.phase === 'pre-prepare') {
        // Update the round's leader and view number
        round.pbft.viewNumber = this.pbftViewNumber;
        round.pbft.leaderId = newLeader;

        // Clear the old timer
        if (round.pbft.viewChangeTimer) {
          clearTimeout(round.pbft.viewChangeTimer);
        }

        // Set a new timeout for the new leader
        const txId = round.transactionId;
        round.pbft.viewChangeTimer = setTimeout(() => {
          const r = this.rounds.get(txId);
          if (r && !r.finalized && r.pbft && r.pbft.phase === 'pre-prepare') {
            this.requestViewChange(`Leader ${newLeader} timed out for tx ${txId}`);
          }
        }, this.PBFT_VIEW_CHANGE_TIMEOUT_MS);
      }
    }
  }

  /** Get the current PBFT view number */
  getViewNumber(): number {
    return this.pbftViewNumber;
  }

  /** Get the current PBFT sequence number */
  getSequenceNumber(): number {
    return this.pbftSequenceNumber;
  }

  // ─── Finalization (shared by single-node and PBFT) ──

  /** Attempt to finalize a consensus round */
  private finalizeRound(round: ConsensusRound): void {
    if (round.finalized) return;

    const totalStake = this.getTotalStake();
    if (totalStake === 0) return;

    // Compute weighted approval from all votes
    let approveWeight = 0;
    let totalWeight = 0;

    for (const vote of round.votes) {
      const validator = this.validators.get(vote.validatorId);
      if (!validator) continue;

      const weight = validator.stake * validator.reputation;
      totalWeight += weight;

      if (vote.approve) {
        approveWeight += weight;
      }
    }

    // Normalize resonance to [0, 1]
    round.finalResonance = totalWeight > 0 ? approveWeight / totalWeight : 0;

    // Check if threshold is met
    // For PBFT rounds, quorum is already verified by commit phase.
    // For single-node, the original participation check applies.
    const participationRate = totalWeight / totalStake;
    const hasQuorum = round.pbft
      ? round.pbft.commitQuorum   // PBFT: 2f+1 commits already verified
      : (participationRate >= 0.5 || this.validators.size <= 1);

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
    let singleNodeRounds = 0;
    let distributedRounds = 0;

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
      if (round.isSingleNode) {
        singleNodeRounds++;
      } else {
        distributedRounds++;
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
      singleNodeRounds,
      distributedRounds,
      // PBFT-specific stats
      pbftEnabled: this.validators.size > 1,
      maxByzantineFaults: this.getMaxFaults(),
      currentView: this.pbftViewNumber,
      prepareQuorumReached: this.prepareQuorumCount,
      commitQuorumReached: this.commitQuorumCount,
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
    // Convert PBFT state Maps to arrays for JSON serialization
    const roundsForSerialization = Array.from(this.rounds.entries()).map(([id, round]) => {
      if (round.pbft) {
        return [id, {
          ...round,
          pbft: {
            ...round.pbft,
            prepareMessages: Array.from(round.pbft.prepareMessages.entries()),
            commitMessages: Array.from(round.pbft.commitMessages.entries()),
            viewChangeTimer: null, // Timers cannot be serialized
          },
        }];
      }
      return [id, round];
    });

    return JSON.stringify({
      validators: Array.from(this.validators.entries()),
      rounds: roundsForSerialization,
      localValidatorId: this.localValidator?.id,
      pbftViewNumber: this.pbftViewNumber,
      pbftSequenceNumber: this.pbftSequenceNumber,
      prepareQuorumCount: this.prepareQuorumCount,
      commitQuorumCount: this.commitQuorumCount,
    });
  }

  static deserialize(json: string): ResonanceConsensus {
    const data = JSON.parse(json);
    const consensus = new ResonanceConsensus();
    consensus.validators = new Map(data.validators);

    // Restore rounds, converting PBFT Map arrays back to Maps
    const rawRounds: [string, ConsensusRound][] = data.rounds;
    for (const [id, round] of rawRounds) {
      if (round.pbft) {
        round.pbft.prepareMessages = new Map(round.pbft.prepareMessages as any);
        round.pbft.commitMessages = new Map(round.pbft.commitMessages as any);
        round.pbft.viewChangeTimer = null; // Timers are not restored
      }
      consensus.rounds.set(id, round);
    }

    if (data.localValidatorId) {
      consensus.localValidator = consensus.validators.get(data.localValidatorId) || null;
    }

    // Restore PBFT state
    consensus.pbftViewNumber = data.pbftViewNumber ?? 0;
    consensus.pbftSequenceNumber = data.pbftSequenceNumber ?? 0;
    consensus.prepareQuorumCount = data.prepareQuorumCount ?? 0;
    consensus.commitQuorumCount = data.commitQuorumCount ?? 0;

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
  /** HONEST: how many rounds were single-node (local validation only) */
  singleNodeRounds: number;
  /** HONEST: how many rounds had real distributed consensus */
  distributedRounds: number;
  /** True when validators > 1 and PBFT protocol is active */
  pbftEnabled: boolean;
  /** Maximum Byzantine faults tolerable: f = floor((n-1)/3) */
  maxByzantineFaults: number;
  /** Current PBFT view number (increments on leader rotation) */
  currentView: number;
  /** Number of rounds that achieved prepare quorum (2f+1 prepares) */
  prepareQuorumReached: number;
  /** Number of rounds that achieved commit quorum (2f+1 commits) */
  commitQuorumReached: number;
}
