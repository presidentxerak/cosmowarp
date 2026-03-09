/**
 * Cosmorare Admin Registry — Private Protocol Ledger
 *
 * Encrypted, admin-only registry that tracks:
 * - All accounts created (addresses, dates, levels)
 * - All transactions (complete audit trail)
 * - Protocol activity (mining, airdrops, streak rewards)
 * - Wallet balances at any point in time
 * - Security events (failed auth, suspicious activity)
 *
 * Access: Admin only (creator address + admin key)
 * Storage: AES-GCM encrypted storage, exportable
 */

import { sha256, encryptData, decryptData, type EncryptedPayload } from './crypto';
import { storage } from './storage';
import type { SupplyState } from './tokenomics';

// ─── Registry Entry Types ────────────────────────────────

export interface AccountEntry {
  address: string;
  publicKey: string;
  alias?: string;
  createdAt: number;
  level: number;
  balance: number;
  totalTransactions: number;
  lastActive: number;
  status: 'active' | 'suspended' | 'flagged';
  flags: string[];
}

export interface TransactionEntry {
  id: string;
  from: string;
  to: string;
  amount: number;
  type: string;
  timestamp: number;
  layer: number;
  resonanceScore: number;
  status: 'confirmed' | 'pending' | 'rejected';
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  address: string;
  timestamp: number;
  details: string;
  severity: 'info' | 'warning' | 'critical';
  resolved: boolean;
}

export type SecurityEventType =
  | 'account_created'
  | 'large_transfer'
  | 'rapid_transactions'
  | 'failed_signature'
  | 'suspicious_pattern'
  | 'admin_action'
  | 'streak_reward'
  | 'level_up'
  | 'creator_unlock';

export interface ProtocolSnapshot {
  timestamp: number;
  totalAccounts: number;
  totalTransactions: number;
  circulatingSupply: number;
  totalMined: number;
  totalAirdropped: number;
  activeLast24h: number;
  avgResonance: number;
}

// ─── Admin Registry ──────────────────────────────────────

const REGISTRY_STORAGE_KEY = 'cosmorare_registry_enc';
const ADMIN_HASH_KEY = 'cosmorare_admin_hash';

export class AdminRegistry {
  private accounts: Map<string, AccountEntry> = new Map();
  private transactions: TransactionEntry[] = [];
  private securityEvents: SecurityEvent[] = [];
  private snapshots: ProtocolSnapshot[] = [];
  private adminAddressHash: string = '';
  private isUnlocked: boolean = false;

  // ─── Admin Authentication ────────────────────────────

  /** Initialize admin with address. Only callable once. */
  async initAdmin(adminAddress: string): Promise<void> {
    if (this.adminAddressHash) {
      throw new Error('Admin already initialized');
    }
    this.adminAddressHash = await sha256('COSMOWARP_ADMIN:' + adminAddress);
    storage.setItem(ADMIN_HASH_KEY, this.adminAddressHash);
  }

  /** Verify admin access */
  async verifyAdmin(address: string): Promise<boolean> {
    const storedHash = this.adminAddressHash || storage.getItem(ADMIN_HASH_KEY) || '';
    if (!storedHash) return false;
    const hash = await sha256('COSMOWARP_ADMIN:' + address);
    return hash === storedHash;
  }

  /** Unlock registry with admin credentials */
  async unlock(adminAddress: string): Promise<boolean> {
    const isAdmin = await this.verifyAdmin(adminAddress);
    if (isAdmin) {
      this.isUnlocked = true;
      await this.loadEncrypted(adminAddress);
    }
    return isAdmin;
  }

  /** Lock registry */
  lock(): void {
    this.isUnlocked = false;
  }

  private checkAccess(): void {
    if (!this.isUnlocked) throw new Error('Registry locked. Admin authentication required.');
  }

  // ─── Account Tracking ────────────────────────────────

  registerAccount(entry: AccountEntry): void {
    this.accounts.set(entry.address, entry);
    this.addSecurityEvent({
      type: 'account_created',
      address: entry.address,
      details: `New account: ${entry.alias || 'anonymous'}`,
      severity: 'info',
    });
  }

  updateAccount(address: string, updates: Partial<AccountEntry>): void {
    const existing = this.accounts.get(address);
    if (existing) {
      this.accounts.set(address, { ...existing, ...updates });
    }
  }

  getAccount(address: string): AccountEntry | undefined {
    this.checkAccess();
    return this.accounts.get(address);
  }

  getAllAccounts(): AccountEntry[] {
    this.checkAccess();
    return Array.from(this.accounts.values());
  }

  getAccountCount(): number {
    return this.accounts.size;
  }

  // ─── Transaction Logging ─────────────────────────────

  logTransaction(entry: TransactionEntry): void {
    this.transactions.push(entry);

    // Auto-detect large transfers
    if (entry.amount >= 10000) {
      this.addSecurityEvent({
        type: 'large_transfer',
        address: entry.from,
        details: `Large transfer: ${entry.amount} CW to ${entry.to}`,
        severity: 'warning',
      });
    }

    // Keep last 100,000 transactions in memory
    if (this.transactions.length > 100000) {
      this.transactions = this.transactions.slice(-100000);
    }
  }

  getTransactions(limit: number = 100, offset: number = 0): TransactionEntry[] {
    this.checkAccess();
    return this.transactions.slice(-(offset + limit), offset ? -offset : undefined).reverse();
  }

  getTransactionsByAddress(address: string, limit: number = 50): TransactionEntry[] {
    this.checkAccess();
    return this.transactions
      .filter(tx => tx.from === address || tx.to === address)
      .slice(-limit)
      .reverse();
  }

  getTransactionCount(): number {
    return this.transactions.length;
  }

  // ─── Security Events ─────────────────────────────────

  addSecurityEvent(params: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved'>): void {
    this.securityEvents.push({
      ...params,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      resolved: false,
    });

    // Keep last 10,000 events
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-10000);
    }
  }

  getSecurityEvents(severity?: SecurityEvent['severity']): SecurityEvent[] {
    this.checkAccess();
    if (severity) {
      return this.securityEvents.filter(e => e.severity === severity);
    }
    return [...this.securityEvents].reverse();
  }

  resolveSecurityEvent(eventId: string): void {
    this.checkAccess();
    const event = this.securityEvents.find(e => e.id === eventId);
    if (event) event.resolved = true;
  }

  // ─── Protocol Snapshots ──────────────────────────────

  takeSnapshot(supplyState: SupplyState, activeCount: number, avgResonance: number): void {
    this.snapshots.push({
      timestamp: Date.now(),
      totalAccounts: this.accounts.size,
      totalTransactions: this.transactions.length,
      circulatingSupply: supplyState.circulatingSupply,
      totalMined: supplyState.totalMined,
      totalAirdropped: supplyState.totalAirdropped,
      activeLast24h: activeCount,
      avgResonance,
    });

    // Keep last 365 snapshots (1 per day = 1 year)
    if (this.snapshots.length > 365) {
      this.snapshots = this.snapshots.slice(-365);
    }
  }

  getSnapshots(): ProtocolSnapshot[] {
    this.checkAccess();
    return [...this.snapshots];
  }

  // ─── Dashboard Data ──────────────────────────────────

  getDashboard(): RegistryDashboard {
    this.checkAccess();

    const now = Date.now();
    const last24h = now - 86400000;
    const activeLast24h = Array.from(this.accounts.values()).filter(a => a.lastActive >= last24h).length;

    const recentTx = this.transactions.filter(t => t.timestamp >= last24h);
    const txVolume24h = recentTx.reduce((sum, t) => sum + t.amount, 0);

    const criticalEvents = this.securityEvents.filter(e => e.severity === 'critical' && !e.resolved);

    const levelDistribution: Record<number, number> = {};
    for (const account of this.accounts.values()) {
      levelDistribution[account.level] = (levelDistribution[account.level] || 0) + 1;
    }

    return {
      totalAccounts: this.accounts.size,
      activeLast24h,
      totalTransactions: this.transactions.length,
      transactions24h: recentTx.length,
      volume24h: txVolume24h,
      unresolvedCritical: criticalEvents.length,
      levelDistribution,
      recentEvents: this.securityEvents.slice(-20).reverse(),
    };
  }

  // ─── Encrypted Persistence ───────────────────────────

  async saveEncrypted(adminAddress: string): Promise<void> {
    const data = JSON.stringify({
      accounts: Array.from(this.accounts.entries()),
      transactions: this.transactions.slice(-50000),
      securityEvents: this.securityEvents.slice(-5000),
      snapshots: this.snapshots,
      adminAddressHash: this.adminAddressHash,
    });

    const secret = 'COSMOWARP_REGISTRY_KEY:' + adminAddress;
    const encrypted = await encryptData(data, secret);
    storage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(encrypted));
  }

  async loadEncrypted(adminAddress: string): Promise<boolean> {
    const raw = storage.getItem(REGISTRY_STORAGE_KEY);
    if (!raw) return false;

    try {
      const encrypted: EncryptedPayload = JSON.parse(raw);
      const secret = 'COSMOWARP_REGISTRY_KEY:' + adminAddress;
      const data = await decryptData(encrypted, secret);
      const parsed = JSON.parse(data);

      this.accounts = new Map(parsed.accounts);
      this.transactions = parsed.transactions;
      this.securityEvents = parsed.securityEvents;
      this.snapshots = parsed.snapshots || [];
      this.adminAddressHash = parsed.adminAddressHash;

      return true;
    } catch {
      return false;
    }
  }

  /** Export registry as unencrypted JSON (admin download) */
  exportJSON(): string {
    this.checkAccess();
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      accounts: Array.from(this.accounts.entries()),
      transactionCount: this.transactions.length,
      recentTransactions: this.transactions.slice(-1000),
      securityEvents: this.securityEvents,
      snapshots: this.snapshots,
    }, null, 2);
  }
}

// ─── Types ───────────────────────────────────────────────

export interface RegistryDashboard {
  totalAccounts: number;
  activeLast24h: number;
  totalTransactions: number;
  transactions24h: number;
  volume24h: number;
  unresolvedCritical: number;
  levelDistribution: Record<number, number>;
  recentEvents: SecurityEvent[];
}
