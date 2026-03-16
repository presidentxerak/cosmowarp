/**
 * Strangrz Chain Sync — Bridges StrangrzChain to Supabase for Multi-Node Persistence
 *
 * This module connects the local StrangrzChain (IndexedDB/localStorage) to the
 * Supabase backend, enabling:
 *
 * 1. Block propagation — new blocks are pushed to Supabase and pulled by other nodes
 * 2. Balance reconciliation — Supabase is the source of truth for balances
 * 3. Transaction deduplication — prevents double-processing across nodes
 * 4. State sync on startup — pull missing blocks from Supabase on login
 *
 * Architecture:
 *   Local StrangrzChain → chain-sync → Supabase (shared state)
 *                    ← Supabase Realtime (push updates)
 */

import { supabase, isBackendAvailable } from '../lib/supabase';
import type { ChainTransaction, ShardBlock, BeaconBlock, ShardId } from './cosmochain';

// ─── Types ───────────────────────────────────────────────

export interface ChainSyncStatus {
  connected: boolean;
  lastSyncAt: number;
  blocksPushed: number;
  blocksPulled: number;
  transactionsPushed: number;
  transactionsPulled: number;
  realtimeSubscribed: boolean;
  errors: number;
}

export type ChainSyncEventHandler = {
  onRemoteBlock?: (block: ShardBlock) => void;
  onRemoteBeacon?: (beacon: BeaconBlock) => void;
  onRemoteTransaction?: (tx: ChainTransaction) => void;
  onBalanceUpdate?: (address: string, newBalance: number) => void;
  onSyncComplete?: () => void;
};

// ─── Chain Sync Engine ──────────────────────────────────

export class ChainSync {
  private status: ChainSyncStatus = {
    connected: false,
    lastSyncAt: 0,
    blocksPushed: 0,
    blocksPulled: 0,
    transactionsPushed: 0,
    transactionsPulled: 0,
    realtimeSubscribed: false,
    errors: 0,
  };

  private handlers: ChainSyncEventHandler = {};
  private realtimeChannel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
  private syncInProgress = false;

  constructor(handlers?: ChainSyncEventHandler) {
    if (handlers) this.handlers = handlers;
  }

  getStatus(): ChainSyncStatus {
    return { ...this.status };
  }

  // ─── Initialization ─────────────────────────────────

  /**
   * Start chain sync: connect to Supabase Realtime and pull missing data.
   */
  async start(): Promise<void> {
    if (!isBackendAvailable() || !supabase) {
      this.status.connected = false;
      return;
    }

    this.status.connected = true;

    // Subscribe to realtime updates
    this.subscribeToRealtime();
  }

  /**
   * Stop chain sync and unsubscribe from realtime.
   */
  stop(): void {
    if (this.realtimeChannel) {
      supabase?.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.status.connected = false;
    this.status.realtimeSubscribed = false;
  }

  // ─── Push: Local → Supabase ─────────────────────────

  /**
   * Push a new shard block to Supabase.
   */
  async pushBlock(block: ShardBlock): Promise<boolean> {
    if (!isBackendAvailable() || !supabase) return false;

    try {
      const { error } = await supabase.from('chain_blocks').upsert({
        block_key: `${block.shard}:${block.number}`,
        shard_id: block.shard,
        block_number: block.number,
        parent_hash: block.parentHash,
        state_root: block.stateRoot,
        transactions_root: block.transactionsRoot,
        block_hash: block.hash,
        validator: block.validator,
        tx_count: block.txCount,
        processing_time_ms: block.processingTimeMs,
        strangrz_code_svg: block.strangrzCodeSVG || null,
        created_at: block.timestamp,
      }, { onConflict: 'block_key' });

      if (error) {
        if (!error.message.includes('duplicate')) {
          console.error('[ChainSync] pushBlock error:', error.message);
          this.status.errors++;
        }
        return false;
      }

      this.status.blocksPushed++;
      return true;
    } catch {
      this.status.errors++;
      return false;
    }
  }

  /**
   * Push a beacon block to Supabase.
   */
  async pushBeacon(beacon: BeaconBlock): Promise<boolean> {
    if (!isBackendAvailable() || !supabase) return false;

    try {
      const { error } = await supabase.from('chain_beacons').upsert({
        beacon_number: beacon.number,
        shard_roots: beacon.shardRoots,
        shard_heads: beacon.shardHeads,
        global_state_root: beacon.globalStateRoot,
        beacon_hash: beacon.hash,
        validator: beacon.validator,
        created_at: beacon.timestamp,
      }, { onConflict: 'beacon_number' });

      if (error && !error.message.includes('duplicate')) {
        console.error('[ChainSync] pushBeacon error:', error.message);
        this.status.errors++;
        return false;
      }

      return true;
    } catch {
      this.status.errors++;
      return false;
    }
  }

  /**
   * Push a confirmed transaction to Supabase.
   */
  async pushTransaction(tx: ChainTransaction): Promise<boolean> {
    if (!isBackendAvailable() || !supabase) return false;

    try {
      const { error } = await supabase.from('chain_transactions').upsert({
        id: tx.id,
        from_addr: tx.from,
        to_addr: tx.to,
        amount: tx.amount,
        tx_type: tx.type,
        shard_id: tx.shard,
        nonce: tx.nonce,
        signature: tx.signature,
        public_key: tx.publicKey,
        memo: tx.memo || null,
        block_number: tx.blockNumber || null,
        beacon_block: tx.beaconBlock || null,
        status: tx.status,
        confirmations: tx.confirmations,
        on_chain_data: tx.onChainData || null,
        created_at: tx.timestamp,
      }, { onConflict: 'id' });

      if (error && !error.message.includes('duplicate')) {
        console.error('[ChainSync] pushTransaction error:', error.message);
        this.status.errors++;
        return false;
      }

      this.status.transactionsPushed++;
      return true;
    } catch {
      this.status.errors++;
      return false;
    }
  }

  /**
   * Push balance update to Supabase (source of truth for multi-node).
   */
  async pushBalance(address: string, balance: number): Promise<boolean> {
    if (!isBackendAvailable() || !supabase) return false;

    try {
      const { error } = await supabase.from('profiles')
        .update({ balance, updated_at: Date.now() })
        .eq('address', address);

      if (error) {
        console.error('[ChainSync] pushBalance error:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // ─── Pull: Supabase → Local ─────────────────────────

  /**
   * Pull blocks from Supabase that we don't have locally.
   */
  async pullBlocks(shardId: ShardId, fromBlockNumber: number): Promise<ShardBlock[]> {
    if (!isBackendAvailable() || !supabase) return [];

    try {
      const { data, error } = await supabase
        .from('chain_blocks')
        .select('*')
        .eq('shard_id', shardId)
        .gt('block_number', fromBlockNumber)
        .order('block_number', { ascending: true })
        .limit(100);

      if (error || !data) return [];

      this.status.blocksPulled += data.length;

      return data.map((row: Record<string, unknown>) => ({
        number: row.block_number as number,
        shard: row.shard_id as ShardId,
        parentHash: row.parent_hash as string,
        stateRoot: row.state_root as string,
        transactionsRoot: row.transactions_root as string,
        timestamp: Number(row.created_at),
        validator: row.validator as string,
        transactions: [],
        strangrzCodeSVG: (row.strangrz_code_svg as string) || undefined,
        hash: row.block_hash as string,
        gasUsed: 0 as const,
        txCount: row.tx_count as number,
        processingTimeMs: row.processing_time_ms as number,
      }));
    } catch {
      this.status.errors++;
      return [];
    }
  }

  /**
   * Pull transactions for a specific block from Supabase.
   */
  async pullTransactions(shardId: ShardId, blockNumber: number): Promise<ChainTransaction[]> {
    if (!isBackendAvailable() || !supabase) return [];

    try {
      const { data, error } = await supabase
        .from('chain_transactions')
        .select('*')
        .eq('shard_id', shardId)
        .eq('block_number', blockNumber)
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      this.status.transactionsPulled += data.length;

      return data.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        from: row.from_addr as string,
        to: row.to_addr as string,
        amount: Number(row.amount),
        timestamp: Number(row.created_at),
        signature: row.signature as string,
        publicKey: row.public_key as string,
        shard: row.shard_id as ShardId,
        type: row.tx_type as ChainTransaction['type'],
        memo: (row.memo as string) || undefined,
        nonce: Number(row.nonce),
        gasCost: 0 as const,
        onChainData: (row.on_chain_data as string) || undefined,
        status: (row.status as ChainTransaction['status']) || 'confirmed',
        blockNumber: row.block_number as number | undefined,
        beaconBlock: row.beacon_block as number | undefined,
        confirmations: Number(row.confirmations) || 0,
      }));
    } catch {
      this.status.errors++;
      return [];
    }
  }

  /**
   * Pull the authoritative balance from Supabase.
   */
  async pullBalance(address: string): Promise<number | null> {
    if (!isBackendAvailable() || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('address', address)
        .single();

      if (error || !data) return null;
      return Number(data.balance);
    } catch {
      return null;
    }
  }

  /**
   * Full sync: pull all missing data from Supabase on startup.
   */
  async fullSync(localShardHeads: Map<number, number>): Promise<{
    blocks: ShardBlock[];
    beacons: BeaconBlock[];
  }> {
    if (!isBackendAvailable() || this.syncInProgress) {
      return { blocks: [], beacons: [] };
    }

    this.syncInProgress = true;
    const allBlocks: ShardBlock[] = [];

    try {
      // Pull missing blocks for each shard
      for (const [shardId, localHead] of localShardHeads) {
        const blocks = await this.pullBlocks(shardId as ShardId, localHead);
        allBlocks.push(...blocks);
      }

      // Pull missing beacons
      const beacons = await this.pullBeacons(0); // Pull all beacons (could optimize with local head)

      this.status.lastSyncAt = Date.now();
      this.handlers.onSyncComplete?.();

      return { blocks: allBlocks, beacons };
    } finally {
      this.syncInProgress = false;
    }
  }

  private async pullBeacons(fromNumber: number): Promise<BeaconBlock[]> {
    if (!isBackendAvailable() || !supabase) return [];

    try {
      const { data, error } = await supabase
        .from('chain_beacons')
        .select('*')
        .gt('beacon_number', fromNumber)
        .order('beacon_number', { ascending: true })
        .limit(100);

      if (error || !data) return [];

      return data.map((row: Record<string, unknown>) => ({
        number: row.beacon_number as number,
        shardRoots: row.shard_roots as string[],
        shardHeads: row.shard_heads as number[],
        globalStateRoot: row.global_state_root as string,
        timestamp: Number(row.created_at),
        validator: row.validator as string,
        hash: row.beacon_hash as string,
        crossShardSettlements: [],
      }));
    } catch {
      return [];
    }
  }

  // ─── Realtime Subscriptions ─────────────────────────

  private subscribeToRealtime(): void {
    if (!supabase || this.realtimeChannel) return;

    this.realtimeChannel = supabase.channel('chain-sync')
      // Listen for new blocks
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chain_blocks',
      }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const block: ShardBlock = {
          number: row.block_number as number,
          shard: row.shard_id as ShardId,
          parentHash: row.parent_hash as string,
          stateRoot: row.state_root as string,
          transactionsRoot: row.transactions_root as string,
          timestamp: Number(row.created_at),
          validator: row.validator as string,
          transactions: [],
          hash: row.block_hash as string,
          gasUsed: 0,
          txCount: row.tx_count as number,
          processingTimeMs: row.processing_time_ms as number,
        };
        this.handlers.onRemoteBlock?.(block);
        this.status.blocksPulled++;
      })
      // Listen for new transactions
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chain_transactions',
      }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const tx: ChainTransaction = {
          id: row.id as string,
          from: row.from_addr as string,
          to: row.to_addr as string,
          amount: Number(row.amount),
          timestamp: Number(row.created_at),
          signature: row.signature as string,
          publicKey: row.public_key as string,
          shard: row.shard_id as ShardId,
          type: row.tx_type as ChainTransaction['type'],
          memo: (row.memo as string) || undefined,
          nonce: Number(row.nonce),
          gasCost: 0,
          status: 'confirmed',
          confirmations: Number(row.confirmations) || 0,
        };
        this.handlers.onRemoteTransaction?.(tx);
        this.status.transactionsPulled++;
      })
      // Listen for balance updates
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: 'balance=neq.null',
      }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const address = row.address as string;
        const balance = Number(row.balance);
        this.handlers.onBalanceUpdate?.(address, balance);
      })
      .subscribe((status) => {
        this.status.realtimeSubscribed = status === 'SUBSCRIBED';
      });
  }
}

// ─── Supabase SQL Schema ────────────────────────────────
//
// Run these in Supabase SQL Editor to create the required tables:
//
// CREATE TABLE IF NOT EXISTS chain_blocks (
//   block_key TEXT PRIMARY KEY,
//   shard_id INTEGER NOT NULL,
//   block_number INTEGER NOT NULL,
//   parent_hash TEXT NOT NULL,
//   state_root TEXT NOT NULL,
//   transactions_root TEXT NOT NULL,
//   block_hash TEXT NOT NULL,
//   validator TEXT NOT NULL,
//   tx_count INTEGER DEFAULT 0,
//   processing_time_ms REAL DEFAULT 0,
//   strangrz_code_svg TEXT,
//   created_at BIGINT NOT NULL
// );
// CREATE INDEX idx_chain_blocks_shard ON chain_blocks(shard_id, block_number);
//
// CREATE TABLE IF NOT EXISTS chain_beacons (
//   beacon_number INTEGER PRIMARY KEY,
//   shard_roots TEXT[] NOT NULL,
//   shard_heads INTEGER[] NOT NULL,
//   global_state_root TEXT NOT NULL,
//   beacon_hash TEXT NOT NULL,
//   validator TEXT NOT NULL,
//   created_at BIGINT NOT NULL
// );
//
// CREATE TABLE IF NOT EXISTS chain_transactions (
//   id TEXT PRIMARY KEY,
//   from_addr TEXT NOT NULL,
//   to_addr TEXT NOT NULL,
//   amount NUMERIC NOT NULL,
//   tx_type TEXT NOT NULL,
//   shard_id INTEGER NOT NULL,
//   nonce INTEGER NOT NULL,
//   signature TEXT NOT NULL,
//   public_key TEXT,
//   memo TEXT,
//   block_number INTEGER,
//   beacon_block INTEGER,
//   status TEXT DEFAULT 'confirmed',
//   confirmations INTEGER DEFAULT 0,
//   on_chain_data TEXT,
//   created_at BIGINT NOT NULL
// );
// CREATE INDEX idx_chain_tx_shard ON chain_transactions(shard_id, block_number);
// CREATE INDEX idx_chain_tx_addr ON chain_transactions(from_addr);
// CREATE INDEX idx_chain_tx_to ON chain_transactions(to_addr);
//
// -- Enable Realtime for these tables
// ALTER PUBLICATION supabase_realtime ADD TABLE chain_blocks;
// ALTER PUBLICATION supabase_realtime ADD TABLE chain_transactions;
// ALTER PUBLICATION supabase_realtime ADD TABLE chain_beacons;
