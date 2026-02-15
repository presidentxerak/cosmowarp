/**
 * CosmoWarp Wallet Engine — Integrated with CosmoMesh + Tokenomics + Hierarchy + Security
 *
 * Manages wallet state, transactions via the CosmoMesh DAG,
 * consensus validation, tokenomics (Resonance Decay), hierarchy levels,
 * admin registry, and security hardening.
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
import { TokenomicsEngine, AIRDROP_AMOUNT, type SupplyBreakdown } from './tokenomics';
import { HierarchyEngine, HIERARCHY_LEVELS, type HierarchyLevel, type LevelUpResult } from './hierarchy';
import { AdminRegistry, type RegistryDashboard } from './registry';
import { SecurityManager } from './security';

// ─── Types ───────────────────────────────────────────────

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  signature: string;
  type: 'send' | 'receive' | 'mine' | 'genesis' | 'airdrop' | 'level_up' | 'streak_reward';
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
  level: number;
  levelName: string;
  levelTitle: string;
  levelSymbol: string;
  rewardMultiplier: number;
  streakDays: number;
  xp: number;
  isAdmin: boolean;
}

// ─── Storage Keys ────────────────────────────────────────

const STORAGE_KEY = 'cosmowarp_wallet';
const TX_STORAGE_KEY = 'cosmowarp_global_tx';
const MESH_STORAGE_KEY = 'cosmowarp_mesh';
const CONSENSUS_STORAGE_KEY = 'cosmowarp_consensus';
const ADMIN_ADDRESS_KEY = 'cosmowarp_admin_address';
const DAILY_TOTAL_KEY = 'cosmowarp_daily_totals';

// ─── Singletons ─────────────────────────────────────────

let meshInstance: CosmoMesh | null = null;
let consensusInstance: ResonanceConsensus | null = null;
let tokenomicsInstance: TokenomicsEngine | null = null;
let hierarchyInstance: HierarchyEngine | null = null;
let registryInstance: AdminRegistry | null = null;
let securityInstance: SecurityManager | null = null;

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

export function getTokenomics(): TokenomicsEngine {
  if (!tokenomicsInstance) {
    tokenomicsInstance = TokenomicsEngine.load() || new TokenomicsEngine();
  }
  return tokenomicsInstance;
}

export function getHierarchy(): HierarchyEngine {
  if (!hierarchyInstance) {
    hierarchyInstance = HierarchyEngine.load() || new HierarchyEngine();
  }
  return hierarchyInstance;
}

export function getRegistry(): AdminRegistry {
  if (!registryInstance) {
    registryInstance = new AdminRegistry();
  }
  return registryInstance;
}

export function getSecurity(): SecurityManager {
  if (!securityInstance) {
    securityInstance = new SecurityManager();
  }
  return securityInstance;
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

function saveEngines(): void {
  saveMesh();
  saveConsensus();
  getTokenomics().save();
  getHierarchy().save();
}

// ─── ID Generation ───────────────────────────────────────

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── Daily Total Tracking ────────────────────────────────

function getDailyTotal(address: string): number {
  const raw = localStorage.getItem(DAILY_TOTAL_KEY);
  if (!raw) return 0;
  try {
    const data = JSON.parse(raw);
    const today = new Date().toISOString().split('T')[0];
    if (data.date !== today) return 0;
    return data.totals?.[address] || 0;
  } catch {
    return 0;
  }
}

function addDailyTotal(address: string, amount: number): void {
  const today = new Date().toISOString().split('T')[0];
  let data: { date: string; totals: Record<string, number> };
  try {
    const raw = localStorage.getItem(DAILY_TOTAL_KEY);
    data = raw ? JSON.parse(raw) : { date: today, totals: {} };
    if (data.date !== today) data = { date: today, totals: {} };
  } catch {
    data = { date: today, totals: {} };
  }
  data.totals[address] = (data.totals[address] || 0) + amount;
  localStorage.setItem(DAILY_TOTAL_KEY, JSON.stringify(data));
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

// ─── Wallet Helpers ─────────────────────────────────────

function enrichWalletWithHierarchy(wallet: WarpWallet): void {
  const hierarchy = getHierarchy();
  const profile = hierarchy.getProfile(wallet.address);
  const levelDef = HIERARCHY_LEVELS[profile.level];
  wallet.level = profile.level;
  wallet.levelName = levelDef.name;
  wallet.levelTitle = levelDef.title;
  wallet.levelSymbol = levelDef.symbol;
  wallet.rewardMultiplier = levelDef.rewardMultiplier;
  wallet.xp = profile.xp;

  const tokenomics = getTokenomics();
  const streak = tokenomics.getStreak(wallet.address);
  wallet.streakDays = streak?.currentStreak || 0;
}

// ─── Wallet CRUD ─────────────────────────────────────────

export function loadWallet(): WarpWallet | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const wallet: WarpWallet = JSON.parse(raw);
    enrichWalletWithHierarchy(wallet);
    return wallet;
  } catch {
    return null;
  }
}

export function saveWallet(wallet: WarpWallet): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
}

export function isAdminAddress(address: string): boolean {
  const adminAddr = localStorage.getItem(ADMIN_ADDRESS_KEY);
  return !!adminAddr && adminAddr === address;
}

export async function createWallet(alias?: string): Promise<WarpWallet> {
  const keyPair = await generateKeyPair();

  // Initialize mesh with genesis
  const mesh = getMesh();
  const consensus = getConsensus();
  const tokenomics = getTokenomics();
  const hierarchy = getHierarchy();
  const registry = getRegistry();

  // First wallet created becomes admin
  const existingAdmin = localStorage.getItem(ADMIN_ADDRESS_KEY);
  const isFirstWallet = !existingAdmin;
  if (isFirstWallet) {
    localStorage.setItem(ADMIN_ADDRESS_KEY, keyPair.address);
    tokenomics.constructor.prototype; // ensure creator address set
    await registry.initAdmin(keyPair.address);
  }

  // Process airdrop (1000 CW)
  const airdropAmount = tokenomics.processAirdrop(keyPair.address);

  // Genesis in mesh
  await mesh.createGenesis(keyPair.address, airdropAmount);

  // Register as validator
  consensus.registerValidator({
    id: keyPair.address,
    publicKey: keyPair.publicKey,
    stake: airdropAmount,
    isLocal: true,
  });

  // Register in hierarchy
  hierarchy.getProfile(keyPair.address);

  // Register in admin registry
  registry.registerAccount({
    address: keyPair.address,
    publicKey: keyPair.publicKey,
    alias,
    createdAt: Date.now(),
    level: 0,
    balance: airdropAmount,
    totalTransactions: 0,
    lastActive: Date.now(),
    status: 'active',
    flags: isFirstWallet ? ['admin', 'creator'] : [],
  });

  const levelDef = HIERARCHY_LEVELS[0];
  const wallet: WarpWallet = {
    address: keyPair.address,
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    balance: mesh.getBalance(keyPair.address),
    transactions: [{
      id: genId(),
      from: 'COSMO_GENESIS',
      to: keyPair.address,
      amount: airdropAmount,
      timestamp: Date.now(),
      signature: 'genesis',
      type: 'airdrop',
      memo: `Welcome to CosmoWarp! Airdrop: ${airdropAmount} \u03A9`,
      resonanceScore: 1.0,
      confirmations: 0,
      layer: 6,
      meshDepth: 0,
    }],
    createdAt: Date.now(),
    alias,
    level: 0,
    levelName: levelDef.name,
    levelTitle: levelDef.title,
    levelSymbol: levelDef.symbol,
    rewardMultiplier: levelDef.rewardMultiplier,
    streakDays: 0,
    xp: 0,
    isAdmin: isFirstWallet,
  };

  saveWallet(wallet);
  saveEngines();

  return wallet;
}

// ─── Send Warps ──────────────────────────────────────────

export async function sendWarps(
  wallet: WarpWallet,
  toAddress: string,
  amount: number,
  memo?: string
): Promise<{ success: boolean; error?: string; tx?: Transaction; levelUp?: LevelUpResult }> {
  if (amount <= 0) return { success: false, error: 'Amount must be positive' };
  if (amount > wallet.balance) return { success: false, error: 'Insufficient Warps' };
  if (toAddress === wallet.address) return { success: false, error: 'Cannot send to yourself' };
  if (!isValidAddress(toAddress)) return { success: false, error: 'Invalid address format' };

  // Security checks
  const security = getSecurity();
  const securityResult = await security.preTransactionCheck({
    from: wallet.address,
    to: toAddress,
    amount,
    accountCreatedAt: wallet.createdAt,
    dailyTotal: getDailyTotal(wallet.address),
  });

  if (!securityResult.allowed) {
    // Log security event in registry
    getRegistry().addSecurityEvent({
      type: 'suspicious_pattern',
      address: wallet.address,
      details: securityResult.error || 'Security check failed',
      severity: 'warning',
    });
    return { success: false, error: securityResult.error };
  }

  const mesh = getMesh();
  const consensus = getConsensus();
  const tokenomics = getTokenomics();
  const hierarchy = getHierarchy();
  const registry = getRegistry();

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

    // Record activity for streaks
    tokenomics.recordActivity(wallet.address);

    // Record in hierarchy (sender)
    const levelUp = hierarchy.recordTransaction(wallet.address, 'send', amount);

    // Log in registry
    registry.logTransaction({
      id: meshTx.id,
      from: wallet.address,
      to: toAddress,
      amount,
      type: 'send',
      timestamp: Date.now(),
      layer: meshTx.layer,
      resonanceScore: meshTx.resonanceScore,
      status: 'confirmed',
    });

    // Track daily total
    addDailyTotal(wallet.address, amount);

    // Log suspicious patterns
    for (const pattern of securityResult.patterns) {
      registry.addSecurityEvent({
        type: 'suspicious_pattern',
        address: pattern.address,
        details: `${pattern.type}: ${pattern.details} (confidence: ${(pattern.confidence * 100).toFixed(0)}%)`,
        severity: pattern.confidence >= 0.7 ? 'warning' : 'info',
      });
    }

    // Update wallet state
    wallet.balance = mesh.getBalance(wallet.address);
    const uiTx = meshTxToUiTx(meshTx, wallet.address);
    wallet.transactions.unshift(uiTx);
    enrichWalletWithHierarchy(wallet);
    saveWallet(wallet);
    saveEngines();

    addGlobalTx(uiTx);

    // Process level-up bonus if applicable
    if (levelUp) {
      wallet.balance += levelUp.airdropBonus;
      const levelUpTx: Transaction = {
        id: genId(),
        from: 'COSMO_HIERARCHY',
        to: wallet.address,
        amount: levelUp.airdropBonus,
        timestamp: Date.now(),
        signature: 'level_up',
        type: 'level_up',
        memo: `Level up! ${HIERARCHY_LEVELS[levelUp.oldLevel].name} \u2192 ${levelUp.levelDef.name}: ${levelUp.levelDef.title}`,
      };
      wallet.transactions.unshift(levelUpTx);
      addGlobalTx(levelUpTx);
      saveWallet(wallet);

      registry.addSecurityEvent({
        type: 'level_up',
        address: wallet.address,
        details: `Level ${levelUp.oldLevel} \u2192 ${levelUp.newLevel}: ${levelUp.levelDef.title}`,
        severity: 'info',
      });
    }

    return { success: true, tx: uiTx, levelUp: levelUp || undefined };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' };
  }
}

// ─── Mine Warps ──────────────────────────────────────────

export async function mineWarps(
  wallet: WarpWallet,
  energyUsed: number,
  cycles: number
): Promise<{ tx: Transaction; levelUp?: LevelUpResult }> {
  const mesh = getMesh();
  const consensus = getConsensus();
  const tokenomics = getTokenomics();
  const hierarchy = getHierarchy();
  const registry = getRegistry();

  // Calculate reward with Resonance Decay + hierarchy multiplier
  const baseReward = tokenomics.processMiningReward(energyUsed);
  const multiplier = hierarchy.getRewardMultiplier(wallet.address);
  const finalReward = Math.round(baseReward * multiplier * 100) / 100;

  const { tx: meshTx } = await mesh.createMiningReward({
    to: wallet.address,
    energyUsed,
    cycles,
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey,
  });

  // Override amount with tokenomics-calculated reward
  meshTx.amount = finalReward;

  // Run consensus on mining reward
  await consensus.startRound(meshTx);

  // Record activity
  tokenomics.recordActivity(wallet.address);

  // Record in hierarchy
  const levelUp = hierarchy.recordTransaction(wallet.address, 'mine', finalReward);

  // Log in registry
  registry.logTransaction({
    id: meshTx.id,
    from: 'COSMO_MINING',
    to: wallet.address,
    amount: finalReward,
    type: 'mine',
    timestamp: Date.now(),
    layer: meshTx.layer,
    resonanceScore: meshTx.resonanceScore,
    status: 'confirmed',
  });

  // Update wallet
  wallet.balance = mesh.getBalance(wallet.address) + finalReward;
  const uiTx = meshTxToUiTx(meshTx, wallet.address);
  uiTx.amount = finalReward;
  wallet.transactions.unshift(uiTx);
  enrichWalletWithHierarchy(wallet);
  saveWallet(wallet);
  saveEngines();

  addGlobalTx(uiTx);

  // Process level-up
  if (levelUp) {
    wallet.balance += levelUp.airdropBonus;
    const levelUpTx: Transaction = {
      id: genId(),
      from: 'COSMO_HIERARCHY',
      to: wallet.address,
      amount: levelUp.airdropBonus,
      timestamp: Date.now(),
      signature: 'level_up',
      type: 'level_up',
      memo: `Level up! ${HIERARCHY_LEVELS[levelUp.oldLevel].name} \u2192 ${levelUp.levelDef.name}: ${levelUp.levelDef.title}`,
    };
    wallet.transactions.unshift(levelUpTx);
    addGlobalTx(levelUpTx);
    saveWallet(wallet);
  }

  return { tx: uiTx, levelUp: levelUp || undefined };
}

// ─── Admin Operations ────────────────────────────────────

export async function unlockAdminRegistry(wallet: WarpWallet): Promise<boolean> {
  if (!wallet.isAdmin) return false;
  const registry = getRegistry();
  return registry.unlock(wallet.address);
}

export function getAdminDashboard(): RegistryDashboard | null {
  try {
    return getRegistry().getDashboard();
  } catch {
    return null;
  }
}

export function getSupplyBreakdown(): SupplyBreakdown {
  return getTokenomics().getSupplyBreakdown();
}

export async function unlockCreatorTokens(wallet: WarpWallet, amount: number): Promise<boolean> {
  if (!wallet.isAdmin) return false;
  const tokenomics = getTokenomics();
  const success = tokenomics.unlockCreatorTokens(amount, wallet.address);
  if (success) {
    wallet.balance += amount;
    const tx: Transaction = {
      id: genId(),
      from: 'COSMO_CREATOR_LOCK',
      to: wallet.address,
      amount,
      timestamp: Date.now(),
      signature: 'creator_unlock',
      type: 'genesis',
      memo: `Creator tokens unlocked: ${amount} \u03A9`,
    };
    wallet.transactions.unshift(tx);
    addGlobalTx(tx);
    saveWallet(wallet);
    saveEngines();

    getRegistry().addSecurityEvent({
      type: 'creator_unlock',
      address: wallet.address,
      details: `Unlocked ${amount} CW from creator lock`,
      severity: 'info',
    });
  }
  return success;
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
  localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(txs.slice(0, 200)));
}

// ─── Mesh Stats (exported for UI) ───────────────────────

export function getMeshStats(): MeshStats {
  return getMesh().getStats();
}

// ─── Hierarchy Exports ──────────────────────────────────

export function getAccountLevel(address: string): HierarchyLevel {
  return getHierarchy().getLevelDef(address);
}

export function getProgressToNextLevel(address: string): number {
  return getHierarchy().getProgressToNextLevel(address);
}

export { HIERARCHY_LEVELS, AIRDROP_AMOUNT };
export type { LevelUpResult, HierarchyLevel, SupplyBreakdown, RegistryDashboard };
