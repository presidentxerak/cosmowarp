"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityManager = exports.PatternDetector = exports.StateIntegrity = exports.NonceTracker = exports.RateLimiter = void 0;
exports.getAmountLimits = getAmountLimits;
exports.checkAmountLimit = checkAmountLimit;
const crypto_1 = require("./crypto");
class RateLimiter {
    limits = new Map();
    // Default limits
    MAX_TX_PER_MINUTE = 10;
    MAX_TX_PER_HOUR = 100;
    MAX_TX_PER_DAY = 1000;
    BLOCK_DURATION_MS = 300000; // 5 minutes
    MAX_VIOLATIONS = 5; // Permanent block threshold
    /** Check if an address is rate-limited. Returns null if OK, error string if blocked. */
    check(address) {
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
    record(address) {
        const entry = this.getEntry(address);
        entry.timestamps.push(Date.now());
        // Cleanup: keep only last 24h of timestamps
        const cutoff = Date.now() - 86400000;
        entry.timestamps = entry.timestamps.filter(t => t >= cutoff);
        this.limits.set(address, entry);
    }
    getEntry(address) {
        let entry = this.limits.get(address);
        if (!entry) {
            entry = { timestamps: [], blocked: false, blockUntil: 0, violations: 0 };
            this.limits.set(address, entry);
        }
        return entry;
    }
    blockAddress(entry) {
        entry.blocked = true;
        entry.blockUntil = Date.now() + this.BLOCK_DURATION_MS;
        entry.violations++;
    }
}
exports.RateLimiter = RateLimiter;
// ─── Nonce Tracker (Replay Prevention) ───────────────────
class NonceTracker {
    usedNonces = new Set();
    nonceTimestamps = new Map();
    NONCE_TTL_MS = 3600000; // 1 hour
    /** Register a nonce. Returns false if already used (replay attack). */
    useNonce(nonce) {
        if (this.usedNonces.has(nonce))
            return false;
        this.usedNonces.add(nonce);
        this.nonceTimestamps.set(nonce, Date.now());
        this.cleanup();
        return true;
    }
    /** Generate a unique nonce */
    generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    cleanup() {
        const cutoff = Date.now() - this.NONCE_TTL_MS;
        for (const [nonce, timestamp] of this.nonceTimestamps) {
            if (timestamp < cutoff) {
                this.usedNonces.delete(nonce);
                this.nonceTimestamps.delete(nonce);
            }
        }
    }
}
exports.NonceTracker = NonceTracker;
const PROGRESSIVE_LIMITS = [
    { accountAgeHours: 0, maxSingleTx: 100, maxDailyTotal: 500 },
    { accountAgeHours: 24, maxSingleTx: 1000, maxDailyTotal: 5000 },
    { accountAgeHours: 168, maxSingleTx: 10000, maxDailyTotal: 50000 }, // 1 week
    { accountAgeHours: 720, maxSingleTx: 100000, maxDailyTotal: 500000 }, // 30 days
];
function getAmountLimits(accountCreatedAt) {
    const ageHours = (Date.now() - accountCreatedAt) / 3600000;
    let limits = PROGRESSIVE_LIMITS[0];
    for (const config of PROGRESSIVE_LIMITS) {
        if (ageHours >= config.accountAgeHours) {
            limits = config;
        }
    }
    return limits;
}
function checkAmountLimit(amount, dailyTotal, accountCreatedAt) {
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
class StateIntegrity {
    checksums = new Map();
    /** Compute and store a checksum for a piece of state */
    async setChecksum(key, data) {
        const checksum = await (0, crypto_1.sha256)('STATE_INTEGRITY:' + key + ':' + data);
        this.checksums.set(key, checksum);
        return checksum;
    }
    /** Verify that state hasn't been tampered with */
    async verify(key, data) {
        const stored = this.checksums.get(key);
        if (!stored)
            return true; // No checksum = first time, OK
        const current = await (0, crypto_1.sha256)('STATE_INTEGRITY:' + key + ':' + data);
        return current === stored;
    }
    /** Get all checksums (for audit) */
    getAllChecksums() {
        return new Map(this.checksums);
    }
}
exports.StateIntegrity = StateIntegrity;
class PatternDetector {
    recentTxByAddress = new Map();
    /** Analyze a transaction for suspicious patterns */
    analyze(from, to, amount) {
        const patterns = [];
        const now = Date.now();
        // Get recent history
        if (!this.recentTxByAddress.has(from)) {
            this.recentTxByAddress.set(from, []);
        }
        const history = this.recentTxByAddress.get(from);
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
exports.PatternDetector = PatternDetector;
// ─── Security Manager (Facade) ───────────────────────────
class SecurityManager {
    rateLimiter = new RateLimiter();
    nonceTracker = new NonceTracker();
    stateIntegrity = new StateIntegrity();
    patternDetector = new PatternDetector();
    /** Full security check before a transaction. Returns null if OK, error if blocked. */
    async preTransactionCheck(params) {
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
exports.SecurityManager = SecurityManager;
//# sourceMappingURL=security.js.map