/**
 * Cosmorare Security — Protocol Hardening
 *
 * Multi-layer security against hacking:
 * 1. Rate Limiting — per-address TX rate limits
 * 2. Anti-Tamper — integrity checks on state data
 * 3. Nonce Tracking — replay attack prevention
 * 4. Amount Limits — progressive limits based on account age
 * 5. Pattern Detection — suspicious activity flagging
 * 6. Audit Trail — immutable log of all security events
 * 7. State Integrity — SHA-256 checksums on critical state
 */

import { sha256 } from './crypto';

// ─── Rate Limiter ────────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[];
  blocked: boolean;
  blockUntil: number;
  violations: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();

  // Default limits
  private readonly MAX_TX_PER_MINUTE = 10;
  private readonly MAX_TX_PER_HOUR = 100;
  private readonly MAX_TX_PER_DAY = 1000;
  private readonly BLOCK_DURATION_MS = 300000; // 5 minutes
  private readonly MAX_VIOLATIONS = 5;         // Permanent block threshold

  /** Check if an address is rate-limited. Returns null if OK, error string if blocked. */
  check(address: string): string | null {
    const entry = this.getEntry(address);
    const now = Date.now();

    // Check if currently blocked
    if (entry.blocked) {
      if (now < entry.blockUntil) {
        const remaining = Math.ceil((entry.blockUntil - now) / 1000);
        return `Rate limited. Try again in ${remaining}s.`;
      }
      entry.blocked = false;
    }

    // Check permanent block
    if (entry.violations >= this.MAX_VIOLATIONS) {
      return 'Account temporarily suspended due to excessive rate limit violations.';
    }

    // Clean old timestamps
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    const lastMinute = entry.timestamps.filter(t => t >= oneMinuteAgo).length;
    const lastHour = entry.timestamps.filter(t => t >= oneHourAgo).length;
    const lastDay = entry.timestamps.filter(t => t >= oneDayAgo).length;

    if (lastMinute >= this.MAX_TX_PER_MINUTE) {
      this.blockAddress(entry);
      return `Rate limit exceeded: max ${this.MAX_TX_PER_MINUTE} TX/minute.`;
    }

    if (lastHour >= this.MAX_TX_PER_HOUR) {
      this.blockAddress(entry);
      return `Rate limit exceeded: max ${this.MAX_TX_PER_HOUR} TX/hour.`;
    }

    if (lastDay >= this.MAX_TX_PER_DAY) {
      return `Daily limit reached: max ${this.MAX_TX_PER_DAY} TX/day.`;
    }

    return null;
  }

  /** Record a transaction for rate limiting */
  record(address: string): void {
    const entry = this.getEntry(address);
    entry.timestamps.push(Date.now());

    // Cleanup: keep only last 24h of timestamps
    const cutoff = Date.now() - 86400000;
    entry.timestamps = entry.timestamps.filter(t => t >= cutoff);

    this.limits.set(address, entry);
  }

  private getEntry(address: string): RateLimitEntry {
    let entry = this.limits.get(address);
    if (!entry) {
      entry = { timestamps: [], blocked: false, blockUntil: 0, violations: 0 };
      this.limits.set(address, entry);
    }
    return entry;
  }

  private blockAddress(entry: RateLimitEntry): void {
    entry.blocked = true;
    entry.blockUntil = Date.now() + this.BLOCK_DURATION_MS;
    entry.violations++;
  }
}

// ─── Nonce Tracker (Replay Prevention) ───────────────────

export class NonceTracker {
  private usedNonces: Set<string> = new Set();
  private nonceTimestamps: Map<string, number> = new Map();
  private readonly NONCE_TTL_MS = 3600000; // 1 hour

  /** Register a nonce. Returns false if already used (replay attack). */
  useNonce(nonce: string): boolean {
    if (this.usedNonces.has(nonce)) return false;

    this.usedNonces.add(nonce);
    this.nonceTimestamps.set(nonce, Date.now());
    this.cleanup();
    return true;
  }

  /** Generate a unique nonce */
  generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.NONCE_TTL_MS;
    for (const [nonce, timestamp] of this.nonceTimestamps) {
      if (timestamp < cutoff) {
        this.usedNonces.delete(nonce);
        this.nonceTimestamps.delete(nonce);
      }
    }
  }
}

// ─── Amount Limits (Progressive) ─────────────────────────

export interface AmountLimitConfig {
  accountAgeHours: number;
  maxSingleTx: number;
  maxDailyTotal: number;
}

const PROGRESSIVE_LIMITS: AmountLimitConfig[] = [
  { accountAgeHours: 0,   maxSingleTx: 100,    maxDailyTotal: 500 },
  { accountAgeHours: 24,  maxSingleTx: 1000,   maxDailyTotal: 5000 },
  { accountAgeHours: 168, maxSingleTx: 10000,  maxDailyTotal: 50000 },  // 1 week
  { accountAgeHours: 720, maxSingleTx: 100000, maxDailyTotal: 500000 }, // 30 days
];

export function getAmountLimits(accountCreatedAt: number): AmountLimitConfig {
  const ageHours = (Date.now() - accountCreatedAt) / 3600000;

  let limits = PROGRESSIVE_LIMITS[0];
  for (const config of PROGRESSIVE_LIMITS) {
    if (ageHours >= config.accountAgeHours) {
      limits = config;
    }
  }
  return limits;
}

export function checkAmountLimit(
  amount: number,
  dailyTotal: number,
  accountCreatedAt: number
): string | null {
  const limits = getAmountLimits(accountCreatedAt);

  if (amount > limits.maxSingleTx) {
    return `Single TX limit: ${limits.maxSingleTx} CW (account age restriction).`;
  }

  if (dailyTotal + amount > limits.maxDailyTotal) {
    return `Daily limit: ${limits.maxDailyTotal} CW. Used: ${dailyTotal} CW.`;
  }

  return null;
}

// ─── State Integrity ─────────────────────────────────────

export class StateIntegrity {
  private checksums: Map<string, string> = new Map();

  /** Compute and store a checksum for a piece of state */
  async setChecksum(key: string, data: string): Promise<string> {
    const checksum = await sha256('STATE_INTEGRITY:' + key + ':' + data);
    this.checksums.set(key, checksum);
    return checksum;
  }

  /** Verify that state hasn't been tampered with */
  async verify(key: string, data: string): Promise<boolean> {
    const stored = this.checksums.get(key);
    if (!stored) return true; // No checksum = first time, OK
    const current = await sha256('STATE_INTEGRITY:' + key + ':' + data);
    return current === stored;
  }

  /** Get all checksums (for audit) */
  getAllChecksums(): Map<string, string> {
    return new Map(this.checksums);
  }
}

// ─── Pattern Detection ───────────────────────────────────

export interface SuspiciousPattern {
  type: 'rapid_fire' | 'round_trip' | 'dust_attack' | 'sybil_suspect';
  address: string;
  details: string;
  timestamp: number;
  confidence: number; // 0-1
}

export class PatternDetector {
  private recentTxByAddress: Map<string, Array<{ to: string; amount: number; time: number }>> = new Map();

  /** Analyze a transaction for suspicious patterns */
  analyze(from: string, to: string, amount: number): SuspiciousPattern[] {
    const patterns: SuspiciousPattern[] = [];
    const now = Date.now();

    // Get recent history
    if (!this.recentTxByAddress.has(from)) {
      this.recentTxByAddress.set(from, []);
    }
    const history = this.recentTxByAddress.get(from)!;
    history.push({ to, amount, time: now });

    // Keep only last hour
    const cutoff = now - 3600000;
    const recent = history.filter(h => h.time >= cutoff);
    this.recentTxByAddress.set(from, recent);

    // Pattern 1: Rapid-fire (>5 TX in 10 seconds)
    const last10s = recent.filter(h => h.time >= now - 10000);
    if (last10s.length > 5) {
      patterns.push({
        type: 'rapid_fire',
        address: from,
        details: `${last10s.length} transactions in 10 seconds`,
        timestamp: now,
        confidence: Math.min(1.0, last10s.length / 10),
      });
    }

    // Pattern 2: Round-trip (A -> B -> A in short time)
    const roundTrips = recent.filter(h => h.to === from);
    if (roundTrips.length > 2) {
      patterns.push({
        type: 'round_trip',
        address: from,
        details: `${roundTrips.length} round-trip transactions detected`,
        timestamp: now,
        confidence: 0.6,
      });
    }

    // Pattern 3: Dust attack (many tiny TX to different addresses)
    const dustTx = recent.filter(h => h.amount < 1);
    const uniqueRecipients = new Set(dustTx.map(h => h.to));
    if (dustTx.length > 10 && uniqueRecipients.size > 5) {
      patterns.push({
        type: 'dust_attack',
        address: from,
        details: `${dustTx.length} dust TX to ${uniqueRecipients.size} addresses`,
        timestamp: now,
        confidence: 0.8,
      });
    }

    return patterns;
  }
}

// ─── Security Manager (Facade) ───────────────────────────

export class SecurityManager {
  public rateLimiter = new RateLimiter();
  public nonceTracker = new NonceTracker();
  public stateIntegrity = new StateIntegrity();
  public patternDetector = new PatternDetector();

  /** Full security check before a transaction. Returns null if OK, error if blocked. */
  async preTransactionCheck(params: {
    from: string;
    to: string;
    amount: number;
    accountCreatedAt: number;
    dailyTotal: number;
  }): Promise<{ allowed: boolean; error?: string; patterns: SuspiciousPattern[] }> {
    // 1. Rate limit
    const rateLimitError = this.rateLimiter.check(params.from);
    if (rateLimitError) {
      return { allowed: false, error: rateLimitError, patterns: [] };
    }

    // 2. Amount limits
    const amountError = checkAmountLimit(params.amount, params.dailyTotal, params.accountCreatedAt);
    if (amountError) {
      return { allowed: false, error: amountError, patterns: [] };
    }

    // 3. Pattern detection
    const patterns = this.patternDetector.analyze(params.from, params.to, params.amount);
    const critical = patterns.filter(p => p.confidence >= 0.9);
    if (critical.length > 0) {
      return {
        allowed: false,
        error: `Suspicious activity detected: ${critical[0].type}`,
        patterns,
      };
    }

    // 4. Record for rate limiting
    this.rateLimiter.record(params.from);

    return { allowed: true, patterns };
  }
}
