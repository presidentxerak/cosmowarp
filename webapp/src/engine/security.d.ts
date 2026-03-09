/**
 * CosmoWarp Security — Protocol Hardening
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
export declare class RateLimiter {
    private limits;
    private readonly MAX_TX_PER_MINUTE;
    private readonly MAX_TX_PER_HOUR;
    private readonly MAX_TX_PER_DAY;
    private readonly BLOCK_DURATION_MS;
    private readonly MAX_VIOLATIONS;
    /** Check if an address is rate-limited. Returns null if OK, error string if blocked. */
    check(address: string): string | null;
    /** Record a transaction for rate limiting */
    record(address: string): void;
    private getEntry;
    private blockAddress;
}
export declare class NonceTracker {
    private usedNonces;
    private nonceTimestamps;
    private readonly NONCE_TTL_MS;
    /** Register a nonce. Returns false if already used (replay attack). */
    useNonce(nonce: string): boolean;
    /** Generate a unique nonce */
    generateNonce(): string;
    private cleanup;
}
export interface AmountLimitConfig {
    accountAgeHours: number;
    maxSingleTx: number;
    maxDailyTotal: number;
}
export declare function getAmountLimits(accountCreatedAt: number): AmountLimitConfig;
export declare function checkAmountLimit(amount: number, dailyTotal: number, accountCreatedAt: number): string | null;
export declare class StateIntegrity {
    private checksums;
    /** Compute and store a checksum for a piece of state */
    setChecksum(key: string, data: string): Promise<string>;
    /** Verify that state hasn't been tampered with */
    verify(key: string, data: string): Promise<boolean>;
    /** Get all checksums (for audit) */
    getAllChecksums(): Map<string, string>;
}
export interface SuspiciousPattern {
    type: 'rapid_fire' | 'round_trip' | 'dust_attack' | 'sybil_suspect';
    address: string;
    details: string;
    timestamp: number;
    confidence: number;
}
export declare class PatternDetector {
    private recentTxByAddress;
    /** Analyze a transaction for suspicious patterns */
    analyze(from: string, to: string, amount: number): SuspiciousPattern[];
}
export declare class SecurityManager {
    rateLimiter: RateLimiter;
    nonceTracker: NonceTracker;
    stateIntegrity: StateIntegrity;
    patternDetector: PatternDetector;
    /** Full security check before a transaction. Returns null if OK, error if blocked. */
    preTransactionCheck(params: {
        from: string;
        to: string;
        amount: number;
        accountCreatedAt: number;
        dailyTotal: number;
    }): Promise<{
        allowed: boolean;
        error?: string;
        patterns: SuspiciousPattern[];
    }>;
}
//# sourceMappingURL=security.d.ts.map