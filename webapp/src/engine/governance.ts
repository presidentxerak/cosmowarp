/**
 * Strangrz DAO Governance — Proposals, voting, execution
 *
 * Governance token weight = STZ holdings + activity score.
 * Proposal lifecycle: draft → active → passed/rejected → executed/expired
 * Quorum: 10% of circulating supply must vote.
 * Time-locked execution: 24h delay after passing.
 */

import { storage } from './storage';
import { supabase, isBackendAvailable } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────

export type ProposalType = 'parameter_change' | 'treasury_spend' | 'feature_request' | 'community';
export type ProposalStatus = 'draft' | 'active' | 'passed' | 'rejected' | 'executed' | 'expired';
export type VoteChoice = 'for' | 'against' | 'abstain';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  type: ProposalType;
  creator: string;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  voterCount: number;
  quorum: number;              // required vote weight to be valid
  deadline: number;            // voting ends at this timestamp
  executionDelay: number;      // ms after passing before execution
  createdAt: number;
  executedAt: number | null;
  /** Optional: parameter to change + new value */
  paramKey?: string;
  paramValue?: string;
  /** Optional: treasury spend amount */
  treasuryAmount?: number;
  treasuryRecipient?: string;
}

export interface Vote {
  proposalId: string;
  voter: string;
  choice: VoteChoice;
  weight: number;
  timestamp: number;
}

// ─── Constants ────────────────────────────────────────────

const STORAGE_KEY = 'strangrz_governance';
const VOTES_KEY = 'strangrz_votes';
const DEFAULT_VOTING_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days
const DEFAULT_EXECUTION_DELAY_MS = 24 * 60 * 60 * 1000;     // 24 hours
const DEFAULT_QUORUM_PERCENT = 10;                            // 10% of circulating

// ─── Storage ──────────────────────────────────────────────

function loadProposals(): Proposal[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveProposals(proposals: Proposal[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(proposals));
}

function loadVotes(): Vote[] {
  try {
    const raw = storage.getItem(VOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveVotes(votes: Vote[]): void {
  storage.setItem(VOTES_KEY, JSON.stringify(votes));
}

// ─── Governance Engine ────────────────────────────────────

export class GovernanceEngine {
  private proposals: Map<string, Proposal> = new Map();
  private votes: Vote[] = [];

  constructor() {
    for (const p of loadProposals()) this.proposals.set(p.id, p);
    this.votes = loadVotes();
  }

  static load(): GovernanceEngine { return new GovernanceEngine(); }

  private save(): void {
    saveProposals([...this.proposals.values()]);
    saveVotes(this.votes);
  }

  /** Create a new proposal */
  createProposal(
    creator: string,
    title: string,
    description: string,
    type: ProposalType,
    circulatingSupply: number,
    options?: { paramKey?: string; paramValue?: string; treasuryAmount?: number; treasuryRecipient?: string },
  ): Proposal {
    const id = `PROP_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const proposal: Proposal = {
      id, title, description, type, creator,
      status: 'active',
      votesFor: 0, votesAgainst: 0, votesAbstain: 0, voterCount: 0,
      quorum: Math.floor(circulatingSupply * DEFAULT_QUORUM_PERCENT / 100),
      deadline: now + DEFAULT_VOTING_PERIOD_MS,
      executionDelay: DEFAULT_EXECUTION_DELAY_MS,
      createdAt: now,
      executedAt: null,
      ...options,
    };
    this.proposals.set(id, proposal);
    this.save();
    this.syncToCloud(proposal);
    return proposal;
  }

  /** Cast a vote on a proposal */
  vote(proposalId: string, voter: string, choice: VoteChoice, weight: number): { success: boolean; error?: string } {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return { success: false, error: 'Proposal not found' };

    this.updateStatus(proposal);
    if (proposal.status !== 'active') return { success: false, error: 'Voting is closed' };
    if (proposal.creator === voter) return { success: false, error: 'Creator cannot vote on own proposal' };

    // Check if already voted
    if (this.votes.some(v => v.proposalId === proposalId && v.voter === voter)) {
      return { success: false, error: 'Already voted' };
    }

    const vote: Vote = { proposalId, voter, choice, weight, timestamp: Date.now() };
    this.votes.push(vote);

    switch (choice) {
      case 'for': proposal.votesFor += weight; break;
      case 'against': proposal.votesAgainst += weight; break;
      case 'abstain': proposal.votesAbstain += weight; break;
    }
    proposal.voterCount++;

    this.save();
    return { success: true };
  }

  /** Check and execute passed proposals */
  settle(proposalId: string): { success: boolean; error?: string } {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return { success: false, error: 'Proposal not found' };

    this.updateStatus(proposal);
    if (proposal.status !== 'passed') return { success: false, error: 'Proposal has not passed' };

    const executionTime = proposal.deadline + proposal.executionDelay;
    if (Date.now() < executionTime) {
      return { success: false, error: `Execution locked until ${new Date(executionTime).toISOString()}` };
    }

    proposal.status = 'executed';
    proposal.executedAt = Date.now();
    this.save();
    this.syncToCloud(proposal);
    return { success: true };
  }

  /** Get a proposal by ID */
  get(id: string): Proposal | null {
    const p = this.proposals.get(id);
    if (p) this.updateStatus(p);
    return p || null;
  }

  /** Get all active proposals */
  getActive(): Proposal[] {
    return [...this.proposals.values()]
      .map(p => { this.updateStatus(p); return p; })
      .filter(p => p.status === 'active')
      .sort((a, b) => a.deadline - b.deadline);
  }

  /** Get all proposals */
  getAll(): Proposal[] {
    return [...this.proposals.values()]
      .map(p => { this.updateStatus(p); return p; })
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Get votes for a proposal */
  getVotes(proposalId: string): Vote[] {
    return this.votes.filter(v => v.proposalId === proposalId);
  }

  /** Check if a user has voted on a proposal */
  hasVoted(proposalId: string, voter: string): boolean {
    return this.votes.some(v => v.proposalId === proposalId && v.voter === voter);
  }

  /** Auto-update proposal status based on time and votes */
  private updateStatus(proposal: Proposal): void {
    if (proposal.status !== 'active') return;
    if (Date.now() < proposal.deadline) return;

    const totalVoteWeight = proposal.votesFor + proposal.votesAgainst + proposal.votesAbstain;
    if (totalVoteWeight < proposal.quorum) {
      proposal.status = 'expired';
    } else if (proposal.votesFor > proposal.votesAgainst) {
      proposal.status = 'passed';
    } else {
      proposal.status = 'rejected';
    }
    this.save();
  }

  private syncToCloud(proposal: Proposal): void {
    if (!isBackendAvailable() || !supabase) return;
    supabase.from('proposals').upsert({
      id: proposal.id,
      title: proposal.title,
      description: proposal.description,
      proposal_type: proposal.type,
      creator: proposal.creator,
      status: proposal.status,
      votes_for: proposal.votesFor,
      votes_against: proposal.votesAgainst,
      votes_abstain: proposal.votesAbstain,
      voter_count: proposal.voterCount,
      quorum: proposal.quorum,
      deadline: proposal.deadline,
      created_at: proposal.createdAt,
      executed_at: proposal.executedAt,
    }, { onConflict: 'id' }).then(() => {}, () => {});
  }
}
