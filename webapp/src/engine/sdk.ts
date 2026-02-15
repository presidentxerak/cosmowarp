/**
 * CosmoWarp Public SDK — Developer API
 *
 * Open-source API for building apps on the CosmoWarp ecosystem.
 * Provides read access to the mesh, wallet creation, transaction
 * submission, and event subscriptions.
 *
 * Usage:
 *   const cosmo = new CosmoWarpSDK();
 *   const wallet = await cosmo.createWallet('MyApp User');
 *   const tx = await cosmo.send(wallet, recipientAddress, 100, 'Payment');
 *   const balance = cosmo.getBalance(wallet.address);
 */

import { generateKeyPair, sha256, shortAddress, isValidAddress, type CosmoKeyPair } from './crypto';
import { TOTAL_SUPPLY, AIRDROP_AMOUNT, calculateMiningReward, type SupplyBreakdown } from './tokenomics';
import { HIERARCHY_LEVELS, type HierarchyLevel } from './hierarchy';
import { LAYER_NAMES, type MeshStats } from './cosmomesh';

// ─── SDK Wallet (Public Interface) ───────────────────────

export interface SDKWallet {
  address: string;
  publicKey: string;
  privateKey: string;  // In production: encrypted or hardware-backed
  alias?: string;
  createdAt: number;
}

// ─── SDK Transaction Result ──────────────────────────────

export interface SDKTransactionResult {
  success: boolean;
  transactionId?: string;
  amount?: number;
  fee?: number;
  layer?: string;
  resonanceScore?: number;
  error?: string;
}

// ─── Event Types ─────────────────────────────────────────

export type SDKEventType =
  | 'transaction_received'
  | 'transaction_confirmed'
  | 'balance_changed'
  | 'level_up'
  | 'streak_milestone';

export interface SDKEvent {
  type: SDKEventType;
  address: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// ─── CosmoWarp SDK ───────────────────────────────────────

export class CosmoWarpSDK {
  private version = '1.0.0';
  private eventListeners: Map<SDKEventType, Array<(event: SDKEvent) => void>> = new Map();

  constructor() {
    // Initialize event maps
    const events: SDKEventType[] = [
      'transaction_received',
      'transaction_confirmed',
      'balance_changed',
      'level_up',
      'streak_milestone',
    ];
    for (const event of events) {
      this.eventListeners.set(event, []);
    }
  }

  // ─── Info ────────────────────────────────────────────

  /** Get SDK version */
  getVersion(): string { return this.version; }

  /** Get protocol constants */
  getProtocolInfo(): ProtocolInfo {
    return {
      name: 'CosmoWarp',
      version: this.version,
      totalSupply: TOTAL_SUPPLY,
      airdropAmount: AIRDROP_AMOUNT,
      layers: LAYER_NAMES,
      hierarchyLevels: HIERARCHY_LEVELS.map(l => ({
        name: l.name,
        title: l.title,
        symbol: l.symbol,
        minTransactions: l.minTransactions,
        rewardMultiplier: l.rewardMultiplier,
      })),
      features: [
        'Ed25519 signatures',
        'SHA-256 hashing',
        'AES-GCM encryption',
        'DAG-based mesh (not blockchain)',
        '7 fractal validation layers',
        'Resonance Consensus',
        'Resonance Decay (golden ratio mining curve)',
        'WebRTC P2P networking',
        'Account hierarchy with 7 levels',
        'Annual streak rewards',
      ],
    };
  }

  // ─── Wallet ──────────────────────────────────────────

  /** Create a new wallet */
  async createWallet(alias?: string): Promise<SDKWallet> {
    const keyPair = await generateKeyPair();
    return {
      address: keyPair.address,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      alias,
      createdAt: Date.now(),
    };
  }

  /** Validate an address format */
  validateAddress(address: string): boolean {
    return isValidAddress(address);
  }

  /** Shorten an address for display */
  formatAddress(address: string): string {
    return shortAddress(address);
  }

  // ─── Cryptographic Utilities ─────────────────────────

  /** Hash data with SHA-256 */
  async hash(data: string): Promise<string> {
    return sha256(data);
  }

  /** Generate a new Ed25519 key pair */
  async generateKeys(): Promise<CosmoKeyPair> {
    return generateKeyPair();
  }

  // ─── Mining Calculator ───────────────────────────────

  /** Calculate current mining reward for a given total mined */
  calculateReward(totalMined: number): number {
    return calculateMiningReward(totalMined);
  }

  /** Get the mining reward curve (for charts) */
  getRewardCurve(points: number = 100): Array<{ mined: number; reward: number }> {
    const curve: Array<{ mined: number; reward: number }> = [];
    const step = 58_000_000 / points;
    for (let i = 0; i <= points; i++) {
      const mined = Math.round(i * step);
      curve.push({ mined, reward: calculateMiningReward(mined) });
    }
    return curve;
  }

  // ─── Events ──────────────────────────────────────────

  /** Subscribe to SDK events */
  on(event: SDKEventType, callback: (event: SDKEvent) => void): void {
    this.eventListeners.get(event)?.push(callback);
  }

  /** Unsubscribe from SDK events */
  off(event: SDKEventType, callback: (event: SDKEvent) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index >= 0) listeners.splice(index, 1);
    }
  }

  /** Emit an event (used internally) */
  emit(event: SDKEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      for (const cb of listeners) {
        try { cb(event); } catch { /* listener error, ignore */ }
      }
    }
  }

  // ─── Layer Utilities ─────────────────────────────────

  /** Get the layer name for an amount */
  getLayerForAmount(amount: number): string {
    if (amount >= 1000) return 'GLYPH';
    if (amount >= 10) return 'HELIX';
    return 'GRID';
  }

  /** Get all layer names */
  getLayerNames(): string[] {
    return [...LAYER_NAMES];
  }
}

// ─── Types ───────────────────────────────────────────────

export interface ProtocolInfo {
  name: string;
  version: string;
  totalSupply: number;
  airdropAmount: number;
  layers: string[];
  hierarchyLevels: Array<{
    name: string;
    title: string;
    symbol: string;
    minTransactions: number;
    rewardMultiplier: number;
  }>;
  features: string[];
}

// ─── Global SDK Instance ─────────────────────────────────

export const cosmowarp = new CosmoWarpSDK();
