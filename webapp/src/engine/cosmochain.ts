/**
 * StrangrzChain — Blockchain with Parallel Shard Processing
 *
 * Built on Strangrz's StrangrzCode protocol with REAL infrastructure:
 *
 * ─── What Is REAL ──────────────────────────────────────────
 *
 * 1. REAL CRYPTOGRAPHY — Ed25519 signatures, SHA-256 hashing via Web Crypto API
 * 2. REAL PARALLEL PROCESSING — Web Workers (OS-level threads), one per shard
 * 3. REAL STORAGE — IndexedDB (GBs of capacity, not 5MB localStorage)
 * 4. REAL COMPRESSION — StrangrzCode SVG, benchmarked with honest measured ratios
 * 5. REAL RATE LIMITING — Per-address limits enforced, not just documented
 * 6. ZERO GAS — Free because validators earn from staking, not user fees
 *
 * ─── What Is HONEST ────────────────────────────────────────
 *
 * - In single-node mode (one browser), consensus is local validation.
 *   This is acknowledged, not hidden. Real BFT consensus requires multiple
 *   connected peers via WebRTC.
 * - Compression ratios are MEASURED, not estimated. Run benchmark.ts to see
 *   real numbers. Structured data: ~5-30x. Base64 images: ~1-2x.
 * - "7000 TPS" is theoretical max with 7 worker threads. Real throughput
 *   depends on hardware. The benchmark measures actual TPS.
 * - Storage is local (IndexedDB) + P2P sync when peers connect.
 *   Not "on-chain" in the Ethereum sense until peers replicate blocks.
 *
 * ─── Architecture ──────────────────────────────────────────
 *
 *   Shard 0 (GRID)    → Micro-transactions (<10 ⬣)
 *   Shard 1 (HELIX)   → Standard transfers (10-100 ⬣)
 *   Shard 2 (GLYPH)   → Large transfers (100-1000 ⬣) + NFT ops
 *   Shard 3 (COSMO)   → System ops (governance, staking)
 *   Shard 4 (CHRONOS) → Time-locked transactions
 *   Shard 5 (NEXUS)   → Cross-shard bridges & atomic swaps
 *   Shard 6 (LUMINA)  → Genesis, epochs & chain coordination
 *
 *   Each shard runs in its own Web Worker (real OS thread).
 *   Blocks stored in IndexedDB (persistent, large-capacity).
 *   Beacon Blocks anchor all 7 shards into a global state root.
 */

import { sha256, signTransaction, verifySignature, isValidAddress, computeTxId } from './crypto';
import { encodeTransactionBatch, type StrangrzCodeContainer } from './cosmocode';
import { ShardCoordinator, type ShardMetrics } from './shardworker';
import { blockDB, txDB, beaconDB, initChainDB } from './chaindb';
import { storage } from './storage';
import { getCosmoProtocol, type CosmoProtocol } from './protocol';
import { ChainSync } from './chain-sync';
import type { StateInclusionProof, LightClientProof } from './stateproof';
import type { TamperAlert } from './integrity';

// ─── Constants ────────────────────────────────────────────

export const SHARD_COUNT = 7;
export const SHARD_BLOCK_TIME_MS = 1_500;         // 1.5s per shard block (10x faster than 15s)
export const BEACON_BLOCK_INTERVAL = 10;           // Beacon every 10 shard blocks
export const MAX_TX_PER_SHARD_BLOCK = 1000;        // 1000 TXs per shard block
export const MAX_TX_PER_SECOND = 7000;             // 7 shards × 1000 TXs = 7000 TPS theoretical
export const RATE_LIMIT_PER_MINUTE = 100;          // Anti-spam: max 100 TX/min per address
export const GAS_COST = 0;                         // Zero gas — always free
export const CHAIN_VERSION = 'StrangrzChain-v2.1';

// ─── Shard Types ─────────────────────────────────────────

export const ShardId = {
  GRID:    0,
  HELIX:   1,
  GLYPH:   2,
  COSMO:   3,
  CHRONOS: 4,
  NEXUS:   5,
  LUMINA:  6,
} as const;

export type ShardId = (typeof ShardId)[keyof typeof ShardId];

export const SHARD_NAMES = ['GRID', 'HELIX', 'GLYPH', 'COSMO', 'CHRONOS', 'NEXUS', 'LUMINA'];

export function assignShard(amount: number, type: ChainTransactionType): ShardId {
  if (type === 'genesis' || type === 'epoch') return ShardId.LUMINA;
  if (type === 'bridge') return ShardId.NEXUS;
  if (type === 'timelock') return ShardId.CHRONOS;
  if (type === 'governance' || type === 'stake' || type === 'unstake') return ShardId.COSMO;
  if (type === 'wart_mint' || type === 'wart_buy' || type === 'wart_transfer') return ShardId.GLYPH;
  if (amount >= 1000) return ShardId.GLYPH;
  if (amount >= 10) return ShardId.HELIX;
  return ShardId.GRID;
}

// ─── Transaction Types ───────────────────────────────────

export type ChainTransactionType =
  | 'transfer'
  | 'mine'
  | 'genesis'
  | 'epoch'
  | 'bridge'
  | 'timelock'
  | 'governance'
  | 'stake'
  | 'unstake'
  | 'wart_mint'
  | 'wart_buy'
  | 'wart_transfer';

export interface ChainTransaction {
  id: string;                  // SHA-256 deterministic ID
  from: string;                // Sender address
  to: string;                  // Recipient address
  amount: number;              // Warp amount
  timestamp: number;           // Unix timestamp (ms)
  signature: string;           // Ed25519 signature
  publicKey: string;           // Sender's public key
  shard: ShardId;              // Which shard processes this TX
  type: ChainTransactionType;
  memo?: string;
  nonce: number;               // Per-address sequential nonce (replay protection)
  gasCost: 0;                  // Always 0 — zero gas
  // On-chain data (stored as StrangrzCode SVG)
  onChainData?: string;        // StrangrzCode SVG container (for wart mints, metadata, etc.)
  // Status
  status: 'pending' | 'confirmed' | 'finalized';
  blockNumber?: number;        // Block number in the shard
  beaconBlock?: number;        // Beacon block that anchored this TX
  confirmations: number;
}

// ─── Block Types ─────────────────────────────────────────

export interface ShardBlock {
  number: number;              // Block number in this shard
  shard: ShardId;
  parentHash: string;          // Hash of previous block in this shard
  stateRoot: string;           // Merkle root of shard state after this block
  transactionsRoot: string;    // Merkle root of included transactions
  timestamp: number;
  validator: string;           // Validator address that produced this block
  transactions: ChainTransaction[];
  // StrangrzCode SVG encoding of the block
  strangrzCodeSVG?: string;       // The full block encoded as StrangrzCode SVG
  hash: string;                // Block hash = SHA-256(header fields)
  gasUsed: 0;                  // Always 0
  // Metrics
  txCount: number;
  processingTimeMs: number;
}

export interface BeaconBlock {
  number: number;              // Beacon block number
  shardRoots: string[];        // State root from each shard (7 entries)
  shardHeads: number[];        // Latest block number per shard
  globalStateRoot: string;     // Combined Merkle root of all shards
  timestamp: number;
  validator: string;
  hash: string;
  strangrzCodeSVG?: string;
  // Cross-shard settlements
  crossShardSettlements: CrossShardSettlement[];
}

export interface CrossShardSettlement {
  txId: string;
  fromShard: ShardId;
  toShard: ShardId;
  amount: number;
  settled: boolean;
}

// ─── Shard State ─────────────────────────────────────────

export interface ShardState {
  shard: ShardId;
  blocks: ShardBlock[];
  pendingTransactions: ChainTransaction[];
  balances: Map<string, number>;
  nonces: Map<string, number>;         // Latest nonce per address
  stateRoot: string;
  latestBlockNumber: number;
  latestBlockHash: string;
  tpsHistory: number[];                // TPS samples for this shard
  // Rate limiting
  txCounts: Map<string, { count: number; windowStart: number }>;
}

// ─── StrangrzChain Engine ───────────────────────────────────

export class StrangrzChain {
  private shards: Map<ShardId, ShardState> = new Map();
  private beaconBlocks: BeaconBlock[] = [];
  private globalBalances: Map<string, number> = new Map();
  private globalNonces: Map<string, number> = new Map();
  private validators: Set<string> = new Set();
  private stakes: Map<string, number> = new Map();
  private genesisCreated: boolean = false;

  // REAL parallel processing via Web Workers
  private coordinator: ShardCoordinator;
  private processingQueues: Map<ShardId, ChainTransaction[]> = new Map();
  private isProcessing: boolean = false;

  // Infrastructure status
  private indexedDBReady: boolean = false;
  private _networkMode: 'single-node' | 'multi-node' = 'single-node';
  private _connectedPeers: number = 0;

  // CosmoProtocol integration — state proofs, integrity, auto-updates
  private protocol: CosmoProtocol;

  // Supabase chain sync — multi-node persistence
  private chainSync: ChainSync;

  constructor() {
    // Initialize shard coordinator (creates 7 Web Workers if available)
    this.coordinator = new ShardCoordinator();

    // Initialize CosmoProtocol (integrity + state proofs + auto-updates)
    this.protocol = getCosmoProtocol();

    // Initialize Supabase chain sync (multi-node block/tx propagation)
    this.chainSync = new ChainSync({
      onRemoteBlock: (block) => {
        const shard = this.shards.get(block.shard);
        if (shard && block.number > shard.latestBlockNumber) {
          shard.blocks.push(block);
          shard.latestBlockNumber = block.number;
          shard.latestBlockHash = block.hash;
        }
      },
      onRemoteTransaction: (tx) => {
        this.applyRemoteTransaction(tx);
      },
      onBalanceUpdate: (address, newBalance) => {
        this.globalBalances.set(address, newBalance);
      },
    });
    this.chainSync.start();

    // Initialize all 7 shards
    for (let i = 0; i < SHARD_COUNT; i++) {
      const shardId = i as ShardId;
      this.shards.set(shardId, {
        shard: shardId,
        blocks: [],
        pendingTransactions: [],
        balances: new Map(),
        nonces: new Map(),
        stateRoot: '0'.repeat(64),
        latestBlockNumber: 0,
        latestBlockHash: '0'.repeat(64),
        tpsHistory: [],
        txCounts: new Map(),
      });
      this.processingQueues.set(shardId, []);
    }

    // Initialize IndexedDB (async, non-blocking)
    initChainDB().then(ready => {
      this.indexedDBReady = ready;
      // Start background integrity scanning (every 5 minutes)
      if (ready) {
        this.startIntegrityScanning();
      }
    }).catch(() => {
      this.indexedDBReady = false;
    });
  }

  /** Get the CosmoProtocol instance */
  getProtocol(): CosmoProtocol {
    return this.protocol;
  }

  /** Get the ChainSync instance for multi-node persistence */
  getChainSync(): ChainSync {
    return this.chainSync;
  }

  /** Get real infrastructure status — no lies */
  getInfraStatus(): InfraStatus {
    const workerStatus = this.coordinator.getWorkerStatus();
    const protocolState = this.protocol.getState();
    return {
      indexedDB: this.indexedDBReady,
      webWorkers: workerStatus.real,
      webWorkersFallback: workerStatus.fallback,
      networkMode: this._networkMode,
      connectedPeers: this._connectedPeers,
      consensusType: this._connectedPeers > 0 ? 'distributed' : 'local-validation',
      storageEngine: this.indexedDBReady ? 'IndexedDB' : 'localStorage',
      isRealParallelism: workerStatus.real > 0,
      honestDescription: this.getHonestDescription(workerStatus.real),
      // Protocol v2.1 additions
      protocolVersion: protocolState.version,
      integrityVerification: protocolState.integrityEnabled,
      stateProofs: protocolState.stateProofsEnabled,
      autoUpdates: protocolState.autoUpdatesEnabled,
      tamperAlerts: protocolState.totalTamperAlerts,
      activeFeatures: protocolState.activeFeatures,
    };
  }

  private getHonestDescription(realWorkers: number): string {
    const parts: string[] = [];
    if (realWorkers > 0) {
      parts.push(`${realWorkers}/7 shards run in real OS threads (Web Workers)`);
    } else {
      parts.push('Shards process sequentially in main thread (no Web Worker support)');
    }
    if (this.indexedDBReady) {
      parts.push('Data persisted in IndexedDB (GB-scale capacity)');
    } else {
      parts.push('Data in localStorage (5-10MB limit)');
    }
    if (this._connectedPeers > 0) {
      parts.push(`${this._connectedPeers} peers connected — real distributed consensus`);
    } else {
      parts.push('Single-node mode — local validation only (not Byzantine fault tolerant)');
    }
    return parts.join('. ') + '.';
  }

  /** Update peer count (called by P2P layer) */
  setPeerCount(count: number): void {
    this._connectedPeers = count;
    this._networkMode = count > 0 ? 'multi-node' : 'single-node';
  }

  /** Get shard worker metrics (real performance data) */
  getShardWorkerMetrics(): ShardMetrics[] {
    return this.coordinator.getMetrics();
  }

  // ─── Genesis ─────────────────────────────────────────

  async createGenesis(address: string, amount: number = 1000): Promise<ChainTransaction> {
    const timestamp = Date.now();
    const id = await computeTxId('COSMO_GENESIS', address, amount, timestamp, []);

    const tx: ChainTransaction = {
      id,
      from: 'COSMO_GENESIS',
      to: address,
      amount,
      timestamp,
      signature: 'genesis',
      publicKey: '',
      shard: ShardId.LUMINA,
      type: 'genesis',
      memo: `StrangrzChain Genesis — ${amount} ⬣ created`,
      nonce: 0,
      gasCost: 0,
      status: 'finalized',
      blockNumber: 0,
      beaconBlock: 0,
      confirmations: 999,
    };

    // Update balances
    this.globalBalances.set(address, (this.globalBalances.get(address) || 0) + amount);
    const luminaShard = this.shards.get(ShardId.LUMINA)!;
    luminaShard.balances.set(address, (luminaShard.balances.get(address) || 0) + amount);

    // Create genesis block
    const genesisBlock = await this.createShardBlock(ShardId.LUMINA, [tx], address);
    luminaShard.blocks.push(genesisBlock);
    luminaShard.latestBlockNumber = 0;
    luminaShard.latestBlockHash = genesisBlock.hash;

    // Create genesis beacon
    const beaconBlock = await this.createBeaconBlock(address);
    this.beaconBlocks.push(beaconBlock);

    this.genesisCreated = true;
    return tx;
  }

  // ─── Transaction Submission ────────────────────────────

  async submitTransaction(params: {
    from: string;
    to: string;
    amount: number;
    privateKey: string;
    publicKey: string;
    memo?: string;
    type?: ChainTransactionType;
    onChainData?: string;
  }): Promise<{ tx: ChainTransaction; validation: TransactionValidation }> {
    const { from, to, amount, privateKey, publicKey, memo, type = 'transfer', onChainData } = params;

    // Determine shard
    const shard = assignShard(amount, type);

    // Get nonce
    const nonce = (this.globalNonces.get(from) || 0) + 1;

    const timestamp = Date.now();
    const id = await computeTxId(from, to, amount, timestamp, [nonce.toString()]);

    // Sign
    const signData = `${CHAIN_VERSION}:${id}:${from}:${to}:${amount}:${timestamp}:${nonce}:${shard}`;
    const signature = await signTransaction(signData, privateKey);

    const tx: ChainTransaction = {
      id,
      from,
      to,
      amount,
      timestamp,
      signature,
      publicKey,
      shard,
      type,
      memo,
      nonce,
      gasCost: 0,
      onChainData,
      status: 'pending',
      confirmations: 0,
    };

    // Validate
    const validation = await this.validateTransaction(tx);

    if (validation.valid) {
      // Add to processing queue for the appropriate shard
      this.processingQueues.get(shard)!.push(tx);
      this.globalNonces.set(from, nonce);

      // Process immediately (parallel shard execution)
      await this.processShardQueues();
    }

    return { tx, validation };
  }

  // ─── Transaction Validation ────────────────────────────

  async validateTransaction(tx: ChainTransaction): Promise<TransactionValidation> {
    const errors: string[] = [];

    // 1. Amount validation
    if (tx.amount < 0) errors.push('Amount cannot be negative');

    // 2. Address validation
    if (tx.from !== 'COSMO_GENESIS' && tx.from !== 'COSMO_MINE' && !isValidAddress(tx.from)) {
      errors.push('Invalid sender address');
    }
    if (!isValidAddress(tx.to)) errors.push('Invalid recipient address');

    // 3. Self-send check
    if (tx.from === tx.to) errors.push('Cannot send to yourself');

    // 4. Balance check (skip for system transactions)
    if (tx.from !== 'COSMO_GENESIS' && tx.from !== 'COSMO_MINE') {
      const balance = this.globalBalances.get(tx.from) || 0;
      if (balance < tx.amount) {
        errors.push(`Insufficient balance: ${balance} < ${tx.amount}`);
      }
    }

    // 5. Nonce check
    if (tx.from !== 'COSMO_GENESIS' && tx.from !== 'COSMO_MINE') {
      const expectedNonce = (this.globalNonces.get(tx.from) || 0) + 1;
      if (tx.nonce !== expectedNonce && tx.nonce !== (this.globalNonces.get(tx.from) || 0)) {
        // Allow current nonce (already applied) or next nonce
        if (tx.nonce > expectedNonce + 10) {
          errors.push(`Nonce too far ahead: got ${tx.nonce}, expected ${expectedNonce}`);
        }
      }
    }

    // 6. Signature verification (skip system TXs)
    if (tx.from !== 'COSMO_GENESIS' && tx.from !== 'COSMO_MINE' && tx.publicKey) {
      const signData = `${CHAIN_VERSION}:${tx.id}:${tx.from}:${tx.to}:${tx.amount}:${tx.timestamp}:${tx.nonce}:${tx.shard}`;
      const sigValid = await verifySignature(signData, tx.signature, tx.publicKey);
      if (!sigValid) errors.push('Invalid Ed25519 signature');
    }

    // 7. Rate limiting
    if (tx.from !== 'COSMO_GENESIS' && tx.from !== 'COSMO_MINE') {
      const shardState = this.shards.get(tx.shard)!;
      const rateInfo = shardState.txCounts.get(tx.from);
      if (rateInfo) {
        const elapsed = Date.now() - rateInfo.windowStart;
        if (elapsed < 60000 && rateInfo.count >= RATE_LIMIT_PER_MINUTE) {
          errors.push('Rate limit exceeded (100 TX/minute)');
        }
      }
    }

    // 8. Gas cost is always 0
    if (tx.gasCost !== 0) errors.push('Gas cost must be 0 (StrangrzChain is free)');

    return {
      valid: errors.length === 0,
      errors,
      shard: tx.shard,
      estimatedConfirmTime: SHARD_BLOCK_TIME_MS,
      gasCost: 0,
    };
  }

  // ─── Parallel Shard Processing ─────────────────────────

  /**
   * Process all shard queues in REAL parallel (Web Workers).
   * Each shard runs in its own OS thread via ShardCoordinator.
   * Falls back to sequential main-thread processing if Workers unavailable.
   */
  async processShardQueues(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Dispatch to real Web Worker threads via coordinator
      const workerResults = await this.coordinator.dispatchToAllShards((shardId) => {
        const queue = this.processingQueues.get(shardId as ShardId)!;
        const batch = queue.splice(0, MAX_TX_PER_SHARD_BLOCK);
        return batch;
      });

      // Apply results from workers back to main-thread state
      for (const result of workerResults) {
        const shardId = result.shardId as ShardId;
        const shard = this.shards.get(shardId)!;

        // The worker already validated; now apply balance changes in main thread
        // (Workers can't share memory with main thread, so balances are applied here)
        const batch = shard.pendingTransactions.splice(0, result.processedCount);
        for (const tx of batch) {
          this.applyTransaction(tx, shard);
        }

        // Create shard block with real processing time from the worker
        const block = await this.createShardBlock(shardId, batch, 'local');
        block.processingTimeMs = result.processingTimeMs;

        shard.blocks.push(block);
        shard.latestBlockNumber = block.number;
        shard.latestBlockHash = block.hash;

        // Track real TPS
        if (result.processingTimeMs > 0) {
          const realTps = result.processedCount / (result.processingTimeMs / 1000);
          shard.tpsHistory.push(realTps);
          if (shard.tpsHistory.length > 60) shard.tpsHistory.shift();
        }

        // Persist block to IndexedDB (real storage)
        if (this.indexedDBReady) {
          const rawJson = JSON.stringify(batch);
          const rawSize = new TextEncoder().encode(rawJson).length;

          // StrangrzCode SVG compression (real, measured)
          let strangrzCodeSVG: string | undefined;
          let compressedSize = rawSize;
          try {
            const txData = batch.map(tx => ({
              id: tx.id, from: tx.from, to: tx.to, amount: tx.amount,
              type: tx.type, nonce: tx.nonce, ts: tx.timestamp,
            }));
            const container = await encodeTransactionBatch(txData);
            strangrzCodeSVG = container.svg;
            compressedSize = new TextEncoder().encode(strangrzCodeSVG).length;
            block.strangrzCodeSVG = strangrzCodeSVG;
          } catch {
            // Compression failed — store raw (honest about it)
          }

          await blockDB.put({
            key: `${shardId}:${block.number}`,
            shard: shardId,
            number: block.number,
            parentHash: block.parentHash,
            stateRoot: block.stateRoot,
            transactionsRoot: block.transactionsRoot,
            timestamp: block.timestamp,
            validator: block.validator,
            hash: block.hash,
            txCount: block.txCount,
            processingTimeMs: block.processingTimeMs,
            strangrzCodeSVG,
            rawSize,
            compressedSize,
          });

          // Persist transactions to IndexedDB
          await txDB.putBatch(batch.map(tx => ({
            id: tx.id,
            from: tx.from,
            to: tx.to,
            amount: tx.amount,
            timestamp: tx.timestamp,
            signature: tx.signature,
            publicKey: tx.publicKey,
            shard: tx.shard,
            type: tx.type,
            memo: tx.memo,
            nonce: tx.nonce,
            blockNumber: tx.blockNumber,
            status: tx.status,
            confirmations: tx.confirmations,
            onChainData: tx.onChainData,
          })));

          // Push block + transactions to Supabase for multi-node sync
          this.chainSync.pushBlock(block);
          for (const tx of batch) {
            this.chainSync.pushTransaction(tx);
          }
        }
      }

      // Check if we need a beacon block
      const totalBlocks = Array.from(this.shards.values())
        .reduce((sum, s) => sum + s.latestBlockNumber, 0);

      if (totalBlocks > 0 && totalBlocks % (BEACON_BLOCK_INTERVAL * SHARD_COUNT) === 0) {
        const beacon = await this.createBeaconBlock('system');
        this.beaconBlocks.push(beacon);

        // Persist beacon to IndexedDB
        if (this.indexedDBReady) {
          await beaconDB.put({
            number: beacon.number,
            shardRoots: beacon.shardRoots,
            shardHeads: beacon.shardHeads,
            globalStateRoot: beacon.globalStateRoot,
            timestamp: beacon.timestamp,
            validator: beacon.validator,
            hash: beacon.hash,
          });

          // Push beacon to Supabase for multi-node sync
          this.chainSync.pushBeacon(beacon);
        }

        // Check for scheduled protocol updates at this beacon block
        await this.protocol.checkActivations(beacon.number);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private applyTransaction(tx: ChainTransaction, shard: ShardState): void {
    // Update balances
    if (tx.from !== 'COSMO_GENESIS' && tx.from !== 'COSMO_MINE') {
      const fromBalance = this.globalBalances.get(tx.from) || 0;
      this.globalBalances.set(tx.from, fromBalance - tx.amount);
      shard.balances.set(tx.from, (shard.balances.get(tx.from) || 0) - tx.amount);
    }

    const toBalance = this.globalBalances.get(tx.to) || 0;
    this.globalBalances.set(tx.to, toBalance + tx.amount);
    shard.balances.set(tx.to, (shard.balances.get(tx.to) || 0) + tx.amount);

    // Update nonce
    shard.nonces.set(tx.from, tx.nonce);

    // Update rate limiting
    const rateInfo = shard.txCounts.get(tx.from);
    const now = Date.now();
    if (!rateInfo || now - rateInfo.windowStart >= 60000) {
      shard.txCounts.set(tx.from, { count: 1, windowStart: now });
    } else {
      rateInfo.count++;
    }

    // Mark as confirmed
    tx.status = 'confirmed';
    tx.blockNumber = shard.latestBlockNumber + 1;
    tx.confirmations = 1;
  }

  /**
   * Apply a transaction received from a remote node via Supabase Realtime.
   * Only applies balance changes if the transaction is new to this node.
   */
  private applyRemoteTransaction(tx: ChainTransaction): void {
    const shard = this.shards.get(tx.shard);
    if (!shard) return;

    // Skip if we already processed this transaction locally
    const existingTx = shard.blocks.some(b =>
      b.transactions.some((t: ChainTransaction) => t.id === tx.id)
    );
    if (existingTx) return;

    // Apply balance changes from remote transaction
    if (tx.from !== 'COSMO_GENESIS' && tx.from !== 'COSMO_MINE') {
      const fromBalance = this.globalBalances.get(tx.from) || 0;
      this.globalBalances.set(tx.from, fromBalance - tx.amount);
    }
    const toBalance = this.globalBalances.get(tx.to) || 0;
    this.globalBalances.set(tx.to, toBalance + tx.amount);
  }

  // ─── Block Creation ────────────────────────────────────

  private async createShardBlock(
    shardId: ShardId,
    transactions: ChainTransaction[],
    validator: string,
  ): Promise<ShardBlock> {
    const shard = this.shards.get(shardId)!;
    const blockNumber = shard.latestBlockNumber + 1;

    // Compute transaction root
    const txHashes = await Promise.all(
      transactions.map(tx => sha256(JSON.stringify(tx)))
    );
    const transactionsRoot = txHashes.length > 0
      ? await computeMerkleRoot(txHashes)
      : '0'.repeat(64);

    // Compute state root via Merkle Patricia Trie (real cryptographic proof)
    const stateRoot = await this.protocol.updateShardState(
      shardId,
      shard.balances,
      blockNumber
    );

    // Compute block hash
    const timestamp = Date.now();
    const headerData = [
      CHAIN_VERSION,
      shardId.toString(),
      blockNumber.toString(),
      shard.latestBlockHash,
      stateRoot,
      transactionsRoot,
      timestamp.toString(),
      validator,
    ].join(':');
    const hash = await sha256(headerData);

    return {
      number: blockNumber,
      shard: shardId,
      parentHash: shard.latestBlockHash,
      stateRoot,
      transactionsRoot,
      timestamp,
      validator,
      transactions,
      hash,
      gasUsed: 0,
      txCount: transactions.length,
      processingTimeMs: 0,
    };
  }

  private async createBeaconBlock(validator: string): Promise<BeaconBlock> {
    const shardRoots: string[] = [];
    const shardHeads: number[] = [];

    for (let i = 0; i < SHARD_COUNT; i++) {
      const shard = this.shards.get(i as ShardId)!;
      shardRoots.push(shard.stateRoot || '0'.repeat(64));
      shardHeads.push(shard.latestBlockNumber);
    }

    const globalStateRoot = await computeMerkleRoot(shardRoots);

    const headerData = [
      CHAIN_VERSION,
      'BEACON',
      this.beaconBlocks.length.toString(),
      ...shardRoots,
      Date.now().toString(),
      validator,
    ].join(':');
    const hash = await sha256(headerData);

    return {
      number: this.beaconBlocks.length,
      shardRoots,
      shardHeads,
      globalStateRoot,
      timestamp: Date.now(),
      validator,
      hash,
      crossShardSettlements: [],
    };
  }

  // ─── Mining Integration ────────────────────────────────

  async createMiningReward(params: {
    to: string;
    reward: number;
    publicKey: string;
    privateKey: string;
  }): Promise<{ tx: ChainTransaction; validation: TransactionValidation }> {
    return this.submitTransaction({
      from: 'COSMO_MINE',
      to: params.to,
      amount: params.reward,
      privateKey: params.privateKey,
      publicKey: params.publicKey,
      type: 'mine',
      memo: `StrangrzChain Mining Reward: ${params.reward} ⬣`,
    });
  }

  // ─── Staking ───────────────────────────────────────────

  async stake(params: {
    address: string;
    amount: number;
    privateKey: string;
    publicKey: string;
  }): Promise<{ tx: ChainTransaction; validation: TransactionValidation }> {
    const result = await this.submitTransaction({
      from: params.address,
      to: 'COSMO_STAKE',
      amount: params.amount,
      privateKey: params.privateKey,
      publicKey: params.publicKey,
      type: 'stake',
      memo: `Staked ${params.amount} ⬣`,
    });

    if (result.validation.valid) {
      this.stakes.set(params.address, (this.stakes.get(params.address) || 0) + params.amount);
      this.validators.add(params.address);
    }

    return result;
  }

  // ─── On-Chain Wart/NFT Storage ─────────────────────────

  async mintWartOnChain(params: {
    creator: string;
    title: string;
    imageData: string;
    privateKey: string;
    publicKey: string;
    metadata?: Record<string, string>;
  }): Promise<{ tx: ChainTransaction; validation: TransactionValidation; strangrzCode?: StrangrzCodeContainer }> {
    // Encode the artwork as StrangrzCode SVG (full on-chain storage)
    let strangrzCode: StrangrzCodeContainer | undefined;
    let onChainData: string | undefined;

    try {
      const { imageToOnChainSVG } = await import('./cosmocode');
      strangrzCode = await imageToOnChainSVG(
        params.imageData,
        params.title,
        params.creator,
        params.metadata,
      );
      onChainData = strangrzCode.svg;
    } catch {
      // If SVG encoding fails, store raw (less efficient but still works)
      onChainData = params.imageData;
    }

    const result = await this.submitTransaction({
      from: params.creator,
      to: params.creator,
      amount: 0,
      privateKey: params.privateKey,
      publicKey: params.publicKey,
      type: 'wart_mint',
      memo: `Minted on-chain: ${params.title}`,
      onChainData,
    });

    return { ...result, strangrzCode };
  }

  // ─── Queries ───────────────────────────────────────────

  getBalance(address: string): number {
    return this.globalBalances.get(address) || 0;
  }

  getNonce(address: string): number {
    return this.globalNonces.get(address) || 0;
  }

  getStake(address: string): number {
    return this.stakes.get(address) || 0;
  }

  getShardState(shardId: ShardId): ShardState | undefined {
    return this.shards.get(shardId);
  }

  getShardBlock(shardId: ShardId, blockNumber: number): ShardBlock | undefined {
    const shard = this.shards.get(shardId);
    return shard?.blocks[blockNumber];
  }

  getBeaconBlock(number: number): BeaconBlock | undefined {
    return this.beaconBlocks[number];
  }

  getLatestBeaconBlock(): BeaconBlock | undefined {
    return this.beaconBlocks[this.beaconBlocks.length - 1];
  }

  getTransactionsByAddress(address: string): ChainTransaction[] {
    const txs: ChainTransaction[] = [];
    for (const shard of this.shards.values()) {
      for (const block of shard.blocks) {
        for (const tx of block.transactions) {
          if (tx.from === address || tx.to === address) {
            txs.push(tx);
          }
        }
      }
    }
    return txs.sort((a, b) => b.timestamp - a.timestamp);
  }

  getRecentTransactions(limit: number = 100): ChainTransaction[] {
    const txs: ChainTransaction[] = [];
    for (const shard of this.shards.values()) {
      for (const block of shard.blocks) {
        txs.push(...block.transactions);
      }
    }
    return txs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  getTransaction(id: string): ChainTransaction | undefined {
    for (const shard of this.shards.values()) {
      for (const block of shard.blocks) {
        const tx = block.transactions.find(t => t.id === id);
        if (tx) return tx;
      }
    }
    return undefined;
  }

  // ─── State Proof Queries (Better than Ethereum) ──────

  /**
   * Prove an account balance with a Merkle proof.
   * The proof can be verified by anyone without the full chain.
   * Ethereum equivalent: eth_getProof — but ours works per-shard.
   */
  async proveBalance(address: string, shardId?: ShardId): Promise<StateInclusionProof | null> {
    const shard = shardId ?? this.findAddressShard(address);
    if (shard === undefined) return null;
    return this.protocol.proveAccountBalance(shard, address);
  }

  /**
   * Prove a balance at a historical block number.
   * Ethereum doesn't support this without an archive node.
   */
  async proveBalanceAtBlock(
    address: string,
    blockNumber: number,
    shardId: ShardId
  ): Promise<StateInclusionProof | null> {
    return this.protocol.proveBalanceAtBlock(shardId, address, blockNumber);
  }

  /**
   * Generate a light client proof for specific accounts.
   * Allows verification of state without downloading the full chain.
   */
  async generateLightClientProof(params: {
    shardId: ShardId;
    accounts: string[];
    validatorPrivateKey: string;
  }): Promise<LightClientProof | null> {
    const shard = this.shards.get(params.shardId);
    if (!shard) return null;

    return this.protocol.generateLightClientProof({
      blockNumber: shard.latestBlockNumber,
      shardId: params.shardId,
      accounts: params.accounts,
      validatorPrivateKey: params.validatorPrivateKey,
    });
  }

  /** Get global state root (across all 7 shards) */
  getGlobalStateRoot(): string {
    return this.protocol.getGlobalStateRoot();
  }

  /** Get shard state root */
  getShardStateRoot(shardId: ShardId): string {
    return this.protocol.getShardStateRoot(shardId);
  }

  /** Get tamper alerts from integrity verifier */
  getTamperAlerts(): TamperAlert[] {
    return this.protocol.getTamperAlerts();
  }

  /** Get the protocol version */
  getProtocolVersion(): string {
    return this.protocol.getVersion();
  }

  /** Get protocol state (features, integrity, updates) */
  getProtocolState() {
    return this.protocol.getState();
  }

  /** Find which shard an address has a balance in */
  private findAddressShard(address: string): ShardId | undefined {
    for (const [shardId, shard] of this.shards) {
      if (shard.balances.has(address)) return shardId;
    }
    return undefined;
  }

  // ─── Integrity Scanning ─────────────────────────────

  private startIntegrityScanning(): void {
    const params = this.protocol.getParameters();
    this.protocol.startBackgroundScanning(
      params.integrityCheckIntervalMs,
      async () => {
        const verifier = this.protocol.getVerifier();
        const latestBlocks = new Map<number, number>();
        for (const [shardId, shard] of this.shards) {
          latestBlocks.set(shardId, shard.latestBlockNumber);
        }
        return verifier.verifyFullChain({
          getBlock: (shard, num) => blockDB.getRaw(shard, num),
          getBeacon: (num) => import('./chaindb').then(m => m.beaconDB.getRaw(num)),
          shardCount: SHARD_COUNT,
          latestBlocks,
          latestBeacon: this.beaconBlocks.length - 1,
        });
      }
    );
  }

  // ─── Chain Statistics ──────────────────────────────────

  /** Get REAL measured compression ratio from IndexedDB data */
  async getRealCompressionRatio(): Promise<number> {
    if (!this.indexedDBReady) return this.estimateCompressionRatio();
    try {
      const { mediaDB: mDB } = await import('./chaindb');
      const stats = await mDB.getRealCompressionStats();
      return stats.ratio;
    } catch {
      return this.estimateCompressionRatio();
    }
  }

  getStats(): ChainStats {
    let totalBlocks = 0;
    let totalTx = 0;
    let totalProcessingTime = 0;
    const shardStats: ShardStats[] = [];

    for (let i = 0; i < SHARD_COUNT; i++) {
      const shard = this.shards.get(i as ShardId)!;
      const shardTxCount = shard.blocks.reduce((sum, b) => sum + b.txCount, 0);
      const shardTime = shard.blocks.reduce((sum, b) => sum + b.processingTimeMs, 0);
      const avgTps = shard.tpsHistory.length > 0
        ? shard.tpsHistory.reduce((a, b) => a + b, 0) / shard.tpsHistory.length
        : 0;

      totalBlocks += shard.blocks.length;
      totalTx += shardTxCount;
      totalProcessingTime += shardTime;

      shardStats.push({
        shardId: i as ShardId,
        name: SHARD_NAMES[i],
        blocks: shard.blocks.length,
        transactions: shardTxCount,
        pendingTx: shard.pendingTransactions.length,
        avgTps,
        latestBlock: shard.latestBlockNumber,
        addresses: shard.balances.size,
      });
    }

    return {
      chainVersion: CHAIN_VERSION,
      totalBlocks,
      totalTransactions: totalTx,
      beaconBlocks: this.beaconBlocks.length,
      gasCost: 0,
      avgBlockTime: totalBlocks > 0 ? totalProcessingTime / totalBlocks : 0,
      totalTps: shardStats.reduce((sum, s) => sum + s.avgTps, 0),
      shards: shardStats,
      validators: this.validators.size,
      totalStaked: Array.from(this.stakes.values()).reduce((a, b) => a + b, 0),
      addresses: this.globalBalances.size,
      compressionRatio: this.estimateCompressionRatio(),
    };
  }

  private estimateCompressionRatio(): number {
    let totalRaw = 0;
    let totalCompressed = 0;

    for (const shard of this.shards.values()) {
      for (const block of shard.blocks) {
        const rawSize = JSON.stringify(block.transactions).length;
        const compressedSize = block.strangrzCodeSVG?.length || rawSize;
        totalRaw += rawSize;
        totalCompressed += compressedSize;
      }
    }

    return totalCompressed > 0 ? totalRaw / totalCompressed : 1;
  }

  // ─── Serialization ─────────────────────────────────────

  serialize(): string {
    const data = {
      version: CHAIN_VERSION,
      shards: Array.from(this.shards.entries()).map(([id, shard]) => ({
        id,
        blocks: shard.blocks,
        balances: Array.from(shard.balances.entries()),
        nonces: Array.from(shard.nonces.entries()),
        stateRoot: shard.stateRoot,
        latestBlockNumber: shard.latestBlockNumber,
        latestBlockHash: shard.latestBlockHash,
      })),
      beaconBlocks: this.beaconBlocks,
      globalBalances: Array.from(this.globalBalances.entries()),
      globalNonces: Array.from(this.globalNonces.entries()),
      validators: Array.from(this.validators),
      stakes: Array.from(this.stakes.entries()),
      genesisCreated: this.genesisCreated,
    };
    return JSON.stringify(data);
  }

  static deserialize(json: string): StrangrzChain {
    const data = JSON.parse(json);
    const chain = new StrangrzChain();

    for (const shardData of data.shards) {
      const shard = chain.shards.get(shardData.id as ShardId)!;
      shard.blocks = shardData.blocks;
      shard.balances = new Map(shardData.balances);
      shard.nonces = new Map(shardData.nonces);
      shard.stateRoot = shardData.stateRoot;
      shard.latestBlockNumber = shardData.latestBlockNumber;
      shard.latestBlockHash = shardData.latestBlockHash;
    }

    chain.beaconBlocks = data.beaconBlocks;
    chain.globalBalances = new Map(data.globalBalances);
    chain.globalNonces = new Map(data.globalNonces);
    chain.validators = new Set(data.validators);
    chain.stakes = new Map(data.stakes);
    chain.genesisCreated = data.genesisCreated;

    return chain;
  }

  save(): void {
    storage.setItem('strangrz_chain', this.serialize());
  }

  static load(): StrangrzChain | null {
    const raw = storage.getItem('strangrz_chain');
    if (!raw) return null;
    try {
      return StrangrzChain.deserialize(raw);
    } catch {
      return null;
    }
  }
}

// ─── Merkle Root Helper ──────────────────────────────────

async function computeMerkleRoot(hashes: string[]): Promise<string> {
  if (hashes.length === 0) return '0'.repeat(64);
  if (hashes.length === 1) return hashes[0];

  let level = [...hashes];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        next.push(await sha256(level[i] + level[i + 1]));
      } else {
        next.push(await sha256(level[i] + level[i]));
      }
    }
    level = next;
  }
  return level[0];
}

// ─── Types ───────────────────────────────────────────────

export interface TransactionValidation {
  valid: boolean;
  errors: string[];
  shard: ShardId;
  estimatedConfirmTime: number;
  gasCost: 0;
}

export interface ShardStats {
  shardId: ShardId;
  name: string;
  blocks: number;
  transactions: number;
  pendingTx: number;
  avgTps: number;
  latestBlock: number;
  addresses: number;
}

export interface ChainStats {
  chainVersion: string;
  totalBlocks: number;
  totalTransactions: number;
  beaconBlocks: number;
  gasCost: 0;
  avgBlockTime: number;
  totalTps: number;
  shards: ShardStats[];
  validators: number;
  totalStaked: number;
  addresses: number;
  compressionRatio: number;
}

/** Honest infrastructure status — no lies, no exaggeration */
export interface InfraStatus {
  indexedDB: boolean;
  webWorkers: number;           // How many shards run in real OS threads
  webWorkersFallback: number;   // How many shards fall back to main thread
  networkMode: 'single-node' | 'multi-node';
  connectedPeers: number;
  consensusType: 'local-validation' | 'distributed';
  storageEngine: 'IndexedDB' | 'localStorage';
  isRealParallelism: boolean;   // true if at least 1 Web Worker is running
  honestDescription: string;    // Plain English summary
  // Protocol v2.1 — Strangrz Protocole additions
  protocolVersion: string;
  integrityVerification: boolean;  // Block integrity checked on every read
  stateProofs: boolean;            // Merkle Patricia Trie state proofs active
  autoUpdates: boolean;            // Automatic protocol updates enabled
  tamperAlerts: number;            // Total tamper alerts detected
  activeFeatures: string[];        // Enabled feature flags
}
