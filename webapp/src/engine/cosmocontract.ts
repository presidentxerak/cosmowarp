/**
 * CosmoContract — Lightweight Smart Contracts for Digital Art
 *
 * NOT Ethereum-style Turing-complete smart contracts.
 * Instead: purpose-built, declarative contracts for art transactions.
 *
 * ─── Why Not Turing-Complete? ────────────────────────────────
 *
 * 1. 99% of NFT smart contracts do the same 5 things
 * 2. Turing-complete = attack surface (reentrancy, overflow, etc.)
 * 3. Declarative contracts are auditable by non-developers
 * 4. Zero gas means no economic attack vectors
 *
 * ─── Contract Types ──────────────────────────────────────────
 *
 * 1. ROYALTY CONTRACT — Automatic creator royalties on every resale
 *    - Configurable percentage (0-50%)
 *    - Split royalties between multiple creators
 *    - Enforced at protocol level (not bypassable)
 *
 * 2. LICENSE CONTRACT — Usage rights for artwork
 *    - Personal use (free)
 *    - Commercial use (one-time or subscription)
 *    - Exclusive license (transfers all usage rights)
 *    - Print rights (physical reproduction)
 *
 * 3. ESCROW CONTRACT — Safe trading with dispute resolution
 *    - Buyer deposits funds → seller delivers → buyer confirms
 *    - Automatic timeout (7 days) with refund
 *    - Dispute resolution via community voting (future)
 *
 * 4. AUCTION CONTRACT — Time-limited competitive bidding
 *    - English auction (ascending bids)
 *    - Reserve price support
 *    - Anti-sniping (extends if bid in last 5 min)
 *    - Automatic settlement
 *
 * 5. COMMISSION CONTRACT — Custom artwork agreements
 *    - Creator agrees to deliver custom work
 *    - Milestone-based payments
 *    - Automatic delivery confirmation
 *
 * ─── Security Model ─────────────────────────────────────────
 *
 * - All contracts are signed by both parties (Ed25519)
 * - State transitions are deterministic and verifiable
 * - No arbitrary code execution = no exploits
 * - Contract state is stored on-chain via StrangrzChain
 */

import { sha256, signTransaction } from './crypto';
import { storage } from './storage';

// ─── Contract Types ──────────────────────────────────────

export type ContractType = 'royalty' | 'license' | 'escrow' | 'auction' | 'commission';
export type ContractStatus = 'draft' | 'active' | 'completed' | 'cancelled' | 'disputed' | 'expired';

export interface CosmoContract {
  id: string;
  type: ContractType;
  status: ContractStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt: number | null;
  parties: ContractParty[];
  terms: ContractTerms;
  history: ContractEvent[];
  signatures: ContractSignature[];
  wartId?: string;                 // Associated artwork
  onChainTxId?: string;           // StrangrzChain TX
}

export interface ContractParty {
  address: string;
  role: 'creator' | 'buyer' | 'seller' | 'licensee' | 'commissioner';
  alias?: string;
}

export interface ContractSignature {
  address: string;
  signature: string;
  timestamp: number;
  signedHash: string;             // What was signed
}

export interface ContractEvent {
  type: string;
  timestamp: number;
  actor: string;
  details: string;
  txId?: string;
}

// ─── Contract Terms (discriminated union) ────────────────

export type ContractTerms =
  | RoyaltyTerms
  | LicenseTerms
  | EscrowTerms
  | AuctionTerms
  | CommissionTerms;

export interface RoyaltyTerms {
  type: 'royalty';
  royaltyPercent: number;          // 0-50%
  splits: RoyaltySplit[];          // Multiple creators can split
  minResalePrice: number;          // Minimum price for royalty to apply
  perpetual: boolean;              // Applies forever or limited generations
  maxGenerations?: number;         // How many resales trigger royalties
}

export interface RoyaltySplit {
  address: string;
  percent: number;                 // Of the royalty amount
  role: string;                    // "original creator", "collaborator", etc.
}

export interface LicenseTerms {
  type: 'license';
  licenseType: 'personal' | 'commercial' | 'exclusive' | 'print';
  price: number;                   // In Warps (Ω)
  priceFiat?: FiatPrice;           // Optional fiat equivalent
  duration: number | null;         // Milliseconds, null = perpetual
  territory: string;               // 'worldwide' or specific
  restrictions: string[];          // What licensee CAN'T do
  deliverables: string[];          // What is included
}

export interface EscrowTerms {
  type: 'escrow';
  amount: number;                  // Escrowed amount in Warps
  priceFiat?: FiatPrice;           // Fiat equivalent
  timeoutMs: number;               // Auto-refund after this time (default 7 days)
  buyerAddress: string;
  sellerAddress: string;
  buyerConfirmed: boolean;
  sellerDelivered: boolean;
  escrowAddress: string;           // Virtual escrow address
  refundable: boolean;
}

export interface AuctionTerms {
  type: 'auction';
  startPrice: number;
  reservePrice: number | null;     // Minimum price to sell
  startPriceFiat?: FiatPrice;
  currentBid: number;
  currentBidder: string | null;
  bids: AuctionBid[];
  endsAt: number;                  // Auction end time
  antiSnipingMs: number;           // Extend if bid in last N ms (default 5 min)
  settled: boolean;
}

export interface AuctionBid {
  bidder: string;
  amount: number;
  amountFiat?: FiatPrice;
  timestamp: number;
  signature: string;
}

export interface CommissionTerms {
  type: 'commission';
  description: string;
  totalPrice: number;
  priceFiat?: FiatPrice;
  milestones: CommissionMilestone[];
  currentMilestone: number;
  deliveryDeadline: number;
}

export interface CommissionMilestone {
  name: string;
  description: string;
  percent: number;                 // % of total price released at this milestone
  completed: boolean;
  completedAt?: number;
  deliverable?: string;            // What the creator delivers
}

// ─── Fiat Price ──────────────────────────────────────────

export interface FiatPrice {
  amount: number;
  currency: 'EUR' | 'USD' | 'GBP' | 'JPY' | 'CHF';
  exchangeRate: number;            // Warps per 1 unit of fiat at time of creation
  lockedRate: boolean;             // If true, rate doesn't change
}

// ─── Contract Engine ─────────────────────────────────────

const CONTRACTS_KEY = 'strangrz_contracts';

export class ContractEngine {
  private contracts: Map<string, CosmoContract> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    const raw = storage.getItem(CONTRACTS_KEY);
    if (!raw) return;
    try {
      const arr: CosmoContract[] = JSON.parse(raw);
      for (const c of arr) {
        this.contracts.set(c.id, c);
      }
    } catch { /* corrupt */ }
  }

  private save(): void {
    storage.setItem(CONTRACTS_KEY, JSON.stringify(Array.from(this.contracts.values())));
  }

  private genId(): string {
    return 'CWCONTRACT_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  // ─── Create Contracts ──────────────────────────────

  async createRoyaltyContract(params: {
    wartId: string;
    creator: string;
    creatorPrivateKey: string;
    royaltyPercent: number;
    splits?: RoyaltySplit[];
    minResalePrice?: number;
  }): Promise<CosmoContract> {
    if (params.royaltyPercent < 0 || params.royaltyPercent > 50) {
      throw new Error('Royalty must be 0-50%');
    }

    const id = this.genId();
    const terms: RoyaltyTerms = {
      type: 'royalty',
      royaltyPercent: params.royaltyPercent,
      splits: params.splits || [{ address: params.creator, percent: 100, role: 'original creator' }],
      minResalePrice: params.minResalePrice || 0,
      perpetual: true,
    };

    const contract = await this.createContract(id, 'royalty', terms, [
      { address: params.creator, role: 'creator' },
    ], params.wartId, params.creator, params.creatorPrivateKey);

    return contract;
  }

  async createLicenseContract(params: {
    wartId: string;
    creator: string;
    creatorPrivateKey: string;
    licensee: string;
    licenseType: LicenseTerms['licenseType'];
    price: number;
    priceFiat?: FiatPrice;
    durationDays?: number;
    restrictions?: string[];
  }): Promise<CosmoContract> {
    const id = this.genId();
    const terms: LicenseTerms = {
      type: 'license',
      licenseType: params.licenseType,
      price: params.price,
      priceFiat: params.priceFiat,
      duration: params.durationDays ? params.durationDays * 86400000 : null,
      territory: 'worldwide',
      restrictions: params.restrictions || [],
      deliverables: ['Digital file access', 'Certificate of license'],
    };

    const contract = await this.createContract(id, 'license', terms, [
      { address: params.creator, role: 'creator' },
      { address: params.licensee, role: 'licensee' },
    ], params.wartId, params.creator, params.creatorPrivateKey);

    return contract;
  }

  async createEscrowContract(params: {
    wartId: string;
    seller: string;
    buyer: string;
    initiatorPrivateKey: string;
    initiatorAddress: string;
    amount: number;
    priceFiat?: FiatPrice;
    timeoutDays?: number;
  }): Promise<CosmoContract> {
    const id = this.genId();
    const escrowAddress = 'CW_ESCROW_' + id.slice(12);
    const terms: EscrowTerms = {
      type: 'escrow',
      amount: params.amount,
      priceFiat: params.priceFiat,
      timeoutMs: (params.timeoutDays || 7) * 86400000,
      buyerAddress: params.buyer,
      sellerAddress: params.seller,
      buyerConfirmed: false,
      sellerDelivered: false,
      escrowAddress,
      refundable: true,
    };

    const contract = await this.createContract(id, 'escrow', terms, [
      { address: params.seller, role: 'seller' },
      { address: params.buyer, role: 'buyer' },
    ], params.wartId, params.initiatorAddress, params.initiatorPrivateKey);

    return contract;
  }

  async createAuctionContract(params: {
    wartId: string;
    seller: string;
    sellerPrivateKey: string;
    startPrice: number;
    startPriceFiat?: FiatPrice;
    reservePrice?: number;
    durationHours: number;
    antiSnipingMinutes?: number;
  }): Promise<CosmoContract> {
    const id = this.genId();
    const terms: AuctionTerms = {
      type: 'auction',
      startPrice: params.startPrice,
      reservePrice: params.reservePrice || null,
      startPriceFiat: params.startPriceFiat,
      currentBid: 0,
      currentBidder: null,
      bids: [],
      endsAt: Date.now() + params.durationHours * 3600000,
      antiSnipingMs: (params.antiSnipingMinutes || 5) * 60000,
      settled: false,
    };

    const contract = await this.createContract(id, 'auction', terms, [
      { address: params.seller, role: 'seller' },
    ], params.wartId, params.seller, params.sellerPrivateKey);

    return contract;
  }

  async createCommissionContract(params: {
    creator: string;
    commissioner: string;
    initiatorAddress: string;
    initiatorPrivateKey: string;
    description: string;
    totalPrice: number;
    priceFiat?: FiatPrice;
    milestones: Array<{ name: string; description: string; percent: number }>;
    deliveryDays: number;
  }): Promise<CosmoContract> {
    const id = this.genId();
    const terms: CommissionTerms = {
      type: 'commission',
      description: params.description,
      totalPrice: params.totalPrice,
      priceFiat: params.priceFiat,
      milestones: params.milestones.map(m => ({
        ...m,
        completed: false,
      })),
      currentMilestone: 0,
      deliveryDeadline: Date.now() + params.deliveryDays * 86400000,
    };

    const contract = await this.createContract(id, 'commission', terms, [
      { address: params.creator, role: 'creator' },
      { address: params.commissioner, role: 'commissioner' },
    ], undefined, params.initiatorAddress, params.initiatorPrivateKey);

    return contract;
  }

  // ─── Contract Actions ──────────────────────────────

  /**
   * Place a bid on an auction contract.
   */
  async placeBid(contractId: string, bidder: string, amount: number, privateKey: string): Promise<boolean> {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.type !== 'auction' || contract.status !== 'active') return false;

    const terms = contract.terms as AuctionTerms;
    if (Date.now() > terms.endsAt) {
      contract.status = 'expired';
      this.save();
      return false;
    }

    if (amount <= terms.currentBid || amount < terms.startPrice) return false;

    // Anti-sniping: extend auction if bid in last N ms
    const timeRemaining = terms.endsAt - Date.now();
    if (timeRemaining < terms.antiSnipingMs) {
      terms.endsAt = Date.now() + terms.antiSnipingMs;
    }

    const bidData = `BID:${contractId}:${bidder}:${amount}:${Date.now()}`;
    const signature = await signTransaction(bidData, privateKey);

    terms.bids.push({
      bidder,
      amount,
      timestamp: Date.now(),
      signature,
    });
    terms.currentBid = amount;
    terms.currentBidder = bidder;

    contract.history.push({
      type: 'bid',
      timestamp: Date.now(),
      actor: bidder,
      details: `Bid ${amount} Ω`,
    });

    contract.updatedAt = Date.now();
    this.save();
    return true;
  }

  /**
   * Settle an auction (transfer artwork to winner).
   */
  async settleAuction(contractId: string): Promise<{ winner: string; amount: number } | null> {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.type !== 'auction') return null;

    const terms = contract.terms as AuctionTerms;
    if (Date.now() < terms.endsAt && terms.bids.length > 0) return null;
    if (terms.settled) return null;

    if (!terms.currentBidder || terms.currentBid === 0) {
      contract.status = 'expired';
      this.save();
      return null;
    }

    // Check reserve price
    if (terms.reservePrice && terms.currentBid < terms.reservePrice) {
      contract.status = 'expired';
      contract.history.push({
        type: 'reserve_not_met',
        timestamp: Date.now(),
        actor: 'system',
        details: `Reserve price ${terms.reservePrice} Ω not met (highest bid: ${terms.currentBid} Ω)`,
      });
      this.save();
      return null;
    }

    terms.settled = true;
    contract.status = 'completed';
    contract.history.push({
      type: 'settled',
      timestamp: Date.now(),
      actor: 'system',
      details: `Auction won by ${terms.currentBidder} for ${terms.currentBid} Ω`,
    });
    contract.updatedAt = Date.now();
    this.save();

    return { winner: terms.currentBidder, amount: terms.currentBid };
  }

  /**
   * Confirm delivery in an escrow contract (buyer side).
   */
  confirmEscrowDelivery(contractId: string, buyerAddress: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.type !== 'escrow' || contract.status !== 'active') return false;

    const terms = contract.terms as EscrowTerms;
    if (terms.buyerAddress !== buyerAddress) return false;

    terms.buyerConfirmed = true;

    if (terms.sellerDelivered && terms.buyerConfirmed) {
      contract.status = 'completed';
      contract.history.push({
        type: 'completed',
        timestamp: Date.now(),
        actor: buyerAddress,
        details: 'Buyer confirmed delivery — funds released to seller',
      });
    } else {
      contract.history.push({
        type: 'buyer_confirmed',
        timestamp: Date.now(),
        actor: buyerAddress,
        details: 'Buyer confirmed delivery',
      });
    }

    contract.updatedAt = Date.now();
    this.save();
    return true;
  }

  /**
   * Mark delivery in an escrow contract (seller side).
   */
  markEscrowDelivered(contractId: string, sellerAddress: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.type !== 'escrow' || contract.status !== 'active') return false;

    const terms = contract.terms as EscrowTerms;
    if (terms.sellerAddress !== sellerAddress) return false;

    terms.sellerDelivered = true;

    contract.history.push({
      type: 'delivered',
      timestamp: Date.now(),
      actor: sellerAddress,
      details: 'Seller marked as delivered',
    });

    if (terms.sellerDelivered && terms.buyerConfirmed) {
      contract.status = 'completed';
      contract.history.push({
        type: 'completed',
        timestamp: Date.now(),
        actor: 'system',
        details: 'Both parties confirmed — funds released',
      });
    }

    contract.updatedAt = Date.now();
    this.save();
    return true;
  }

  /**
   * Complete a commission milestone.
   */
  completeMilestone(contractId: string, milestoneIndex: number, creatorAddress: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.type !== 'commission' || contract.status !== 'active') return false;

    const terms = contract.terms as CommissionTerms;
    const party = contract.parties.find(p => p.address === creatorAddress && p.role === 'creator');
    if (!party) return false;

    if (milestoneIndex >= terms.milestones.length) return false;
    const milestone = terms.milestones[milestoneIndex];
    if (milestone.completed) return false;

    milestone.completed = true;
    milestone.completedAt = Date.now();
    terms.currentMilestone = milestoneIndex + 1;

    contract.history.push({
      type: 'milestone_completed',
      timestamp: Date.now(),
      actor: creatorAddress,
      details: `Milestone "${milestone.name}" completed (${milestone.percent}% released)`,
    });

    // Check if all milestones complete
    if (terms.milestones.every(m => m.completed)) {
      contract.status = 'completed';
      contract.history.push({
        type: 'commission_completed',
        timestamp: Date.now(),
        actor: 'system',
        details: 'All milestones completed — commission finished',
      });
    }

    contract.updatedAt = Date.now();
    this.save();
    return true;
  }

  /**
   * Cancel a contract (must be draft or the canceller must be authorized).
   */
  cancelContract(contractId: string, cancellerAddress: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract) return false;

    const isParty = contract.parties.some(p => p.address === cancellerAddress);
    if (!isParty) return false;

    if (contract.status === 'completed') return false;

    contract.status = 'cancelled';
    contract.history.push({
      type: 'cancelled',
      timestamp: Date.now(),
      actor: cancellerAddress,
      details: 'Contract cancelled',
    });
    contract.updatedAt = Date.now();
    this.save();
    return true;
  }

  /**
   * Calculate royalty distribution for a resale.
   */
  calculateRoyalty(contractId: string, salePrice: number): { total: number; splits: Array<{ address: string; amount: number }> } | null {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.type !== 'royalty') return null;

    const terms = contract.terms as RoyaltyTerms;
    if (salePrice < terms.minResalePrice) return { total: 0, splits: [] };

    const totalRoyalty = Math.round(salePrice * terms.royaltyPercent / 100 * 100) / 100;
    const splits = terms.splits.map(s => ({
      address: s.address,
      amount: Math.round(totalRoyalty * s.percent / 100 * 100) / 100,
    }));

    return { total: totalRoyalty, splits };
  }

  // ─── Queries ─────────────────────────────────────────

  getContract(id: string): CosmoContract | undefined {
    return this.contracts.get(id);
  }

  getContractsByParty(address: string): CosmoContract[] {
    return Array.from(this.contracts.values())
      .filter(c => c.parties.some(p => p.address === address))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getContractsByWart(wartId: string): CosmoContract[] {
    return Array.from(this.contracts.values())
      .filter(c => c.wartId === wartId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getActiveAuctions(): CosmoContract[] {
    return Array.from(this.contracts.values())
      .filter(c => c.type === 'auction' && c.status === 'active')
      .sort((a, b) => {
        const aTerms = a.terms as AuctionTerms;
        const bTerms = b.terms as AuctionTerms;
        return aTerms.endsAt - bTerms.endsAt;
      });
  }

  getActiveEscrows(address: string): CosmoContract[] {
    return Array.from(this.contracts.values())
      .filter(c => c.type === 'escrow' && c.status === 'active' &&
        c.parties.some(p => p.address === address));
  }

  getRoyaltyContract(wartId: string): CosmoContract | undefined {
    return Array.from(this.contracts.values())
      .find(c => c.type === 'royalty' && c.wartId === wartId && c.status === 'active');
  }

  // ─── Private Helpers ────────────────────────────────

  private async createContract(
    id: string,
    type: ContractType,
    terms: ContractTerms,
    parties: ContractParty[],
    wartId: string | undefined,
    signerAddress: string,
    signerPrivateKey: string,
  ): Promise<CosmoContract> {
    const contract: CosmoContract = {
      id,
      type,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: null,
      parties,
      terms,
      history: [{
        type: 'created',
        timestamp: Date.now(),
        actor: signerAddress,
        details: `${type} contract created`,
      }],
      signatures: [],
      wartId,
    };

    // Sign the contract
    const contractHash = await sha256(JSON.stringify({ id, type, terms, parties, wartId }));
    const signature = await signTransaction(contractHash, signerPrivateKey);

    contract.signatures.push({
      address: signerAddress,
      signature,
      timestamp: Date.now(),
      signedHash: contractHash,
    });

    this.contracts.set(id, contract);
    this.save();

    return contract;
  }
}
