/**
 * CosmoWarp Wallet Engine — Integrated with CosmoMesh
 *
 * Manages wallet state, transactions via the CosmoMesh DAG,
 * and consensus validation through the Resonance protocol.
 */

import {
  generateKeyPair,
  isValidAddress,
} from './crypto';
import {
  CosmoMesh,
  type MeshTransaction,
  type MeshStats,
} from './cosmomesh';
import { ResonanceConsensus } from './consensus';

// ─── Types ───────────────────────────────────────────────

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  signature: string;
  type: 'send' | 'receive' | 'mine' | 'genesis';
  memo?: string;
  resonanceScore?: number;
  confirmations?: number;
  layer?: number;
  meshDepth?: number;
}

export interface WarpWallet {
  address: string;
  privateKey: string;
  publicKey: string;
  balance: number;
  transactions: Transaction[];
  createdAt: number;
  alias?: string;
}

// ─── Storage Keys ────────────────────────────────────────

const STORAGE_KEY = 'cosmowarp_wallet';
const TX_STORAGE_KEY = 'cosmowarp_global_tx';
const MESH_STORAGE_KEY = 'cosmowarp_mesh';
const CONSENSUS_STORAGE_KEY = 'cosmowarp_consensus';

// ─── Mesh Singleton ──────────────────────────────────────

let meshInstance: CosmoMesh | null = null;
let consensusInstance: ResonanceConsensus | null = null;

export function getMesh(): CosmoMesh {
  if (!meshInstance) {
    const saved = localStorage.getItem(MESH_STORAGE_KEY);
    if (saved) {
      try {
        meshInstance = CosmoMesh.deserialize(saved);
      } catch {
        meshInstance = new CosmoMesh();
      }
    } else {
      meshInstance = new CosmoMesh();
    }
  }
  return meshInstance;
}

export function getConsensus(): ResonanceConsensus {
  if (!consensusInstance) {
    const saved = localStorage.getItem(CONSENSUS_STORAGE_KEY);
    if (saved) {
      try {
        consensusInstance = ResonanceConsensus.deserialize(saved);
      } catch {
        consensusInstance = new ResonanceConsensus();
      }
    } else {
      consensusInstance = new ResonanceConsensus();
    }
  }
  return consensusInstance;
}

function saveMesh(): void {
  if (meshInstance) {
    localStorage.setItem(MESH_STORAGE_KEY, meshInstance.serialize());
  }
}

function saveConsensus(): void {
  if (consensusInstance) {
    localStorage.setItem(CONSENSUS_STORAGE_KEY, consensusInstance.serialize());
  }
}

// ─── ID Generation ───────────────────────────────────────

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── Convert MeshTransaction to UI Transaction ──────────

function meshTxToUiTx(mtx: MeshTransaction, myAddress: string): Transaction {
  let type: Transaction['type'] = 'send';
  if (mtx.type === 'genesis') type = 'genesis';
  else if (mtx.type === 'mine') type = 'mine';
  else if (mtx.to === myAddress && mtx.from !== myAddress) type = 'receive';

  return {
    id: mtx.id,
    from: mtx.from,
    to: mtx.to,
    amount: mtx.amount,
    timestamp: mtx.timestamp,
    signature: mtx.signature.slice(0, 16),
    type,
    memo: mtx.memo,
    resonanceScore: mtx.resonanceScore,
    confirmations: mtx.confirmations,
    layer: mtx.layer,
    meshDepth: mtx.meshDepth,
  };
}

// ─── Wallet CRUD ─────────────────────────────────────────

export function loadWallet(): WarpWallet | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveWallet(wallet: WarpWallet): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
}

export async function createWallet(alias?: string): Promise<WarpWallet> {
  const keyPair = await generateKeyPair();

  // Initialize mesh with genesis
  const mesh = getMesh();
  const consensus = getConsensus();

  await mesh.createGenesis(keyPair.address, 100);

  // Register as validator
  consensus.registerValidator({
    id: keyPair.address,
    publicKey: keyPair.publicKey,
    stake: 100,
    isLocal: true,
  });

  const wallet: WarpWallet = {
    address: keyPair.address,
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    balance: mesh.getBalance(keyPair.address),
    transactions: [{
      id: genId(),
      from: 'COSMO_GENESIS',
      to: keyPair.address,
      amount: 100,
      timestamp: Date.now(),
      signature: 'genesis',
      type: 'genesis',
      memo: 'Welcome to CosmoWarp! Genesis bonus: 100 \u03A9',
      resonanceScore: 1.0,
      confirmations: 0,
      layer: 6,
      meshDepth: 0,
    }],
    createdAt: Date.now(),
    alias,
  };

  saveWallet(wallet);
  saveMesh();
  saveConsensus();

  return wallet;
}

// ─── Send Warps ──────────────────────────────────────────

export async function sendWarps(
  wallet: WarpWallet,
  toAddress: string,
  amount: number,
  memo?: string
): Promise<{ success: boolean; error?: string; tx?: Transaction }> {
  if (amount <= 0) return { success: false, error: 'Amount must be positive' };
  if (amount > wallet.balance) return { success: false, error: 'Insufficient Warps' };
  if (toAddress === wallet.address) return { success: false, error: 'Cannot send to yourself' };
  if (!isValidAddress(toAddress)) return { success: false, error: 'Invalid address format' };

  const mesh = getMesh();
  const consensus = getConsensus();

  try {
    const { tx: meshTx, validation } = await mesh.createTransaction({
      from: wallet.address,
      to: toAddress,
      amount,
      privateKey: wallet.privateKey,
      publicKey: wallet.publicKey,
      memo,
    });

    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Run consensus
    await consensus.startRound(meshTx);

    // Update wallet state
    wallet.balance = mesh.getBalance(wallet.address);
    const uiTx = meshTxToUiTx(meshTx, wallet.address);
    wallet.transactions.unshift(uiTx);
    saveWallet(wallet);
    saveMesh();
    saveConsensus();

    addGlobalTx(uiTx);

    return { success: true, tx: uiTx };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' };
  }
}

// ─── Mine Warps ──────────────────────────────────────────

export async function mineWarps(
  wallet: WarpWallet,
  energyUsed: number,
  cycles: number
): Promise<Transaction> {
  const mesh = getMesh();
  const consensus = getConsensus();

  const { tx: meshTx } = await mesh.createMiningReward({
    to: wallet.address,
    energyUsed,
    cycles,
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey,
  });

  // Run consensus on mining reward
  await consensus.startRound(meshTx);

  // Update wallet
  wallet.balance = mesh.getBalance(wallet.address);
  const uiTx = meshTxToUiTx(meshTx, wallet.address);
  wallet.transactions.unshift(uiTx);
  saveWallet(wallet);
  saveMesh();
  saveConsensus();

  addGlobalTx(uiTx);

  return uiTx;
}

// ─── Global Transaction Feed ─────────────────────────────

export function getGlobalTransactions(): Transaction[] {
  const raw = localStorage.getItem(TX_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function addGlobalTx(tx: Transaction): void {
  const txs = getGlobalTransactions();
  txs.unshift(tx);
  localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(txs.slice(0, 100)));
}

// ─── Mesh Stats (exported for UI) ───────────────────────

export function getMeshStats(): MeshStats {
  return getMesh().getStats();
}
