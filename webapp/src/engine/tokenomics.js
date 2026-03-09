"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenomicsEngine = exports.DECAY_CONSTANT = exports.GOLDEN_RATIO = exports.STREAK_DAYS_REQUIRED = exports.STREAK_REWARD = exports.BASE_MINING_REWARD = exports.MINING_POOL = exports.AIRDROP_POOL = exports.AIRDROP_AMOUNT = exports.CREATOR_LOCKED = exports.TOTAL_SUPPLY = void 0;
exports.calculateMiningReward = calculateMiningReward;
exports.calculateEpoch = calculateEpoch;
exports.projectSupply = projectSupply;
exports.getTodayDate = getTodayDate;
exports.updateStreak = updateStreak;
exports.checkStreakReward = checkStreakReward;
exports.isRewardDay = isRewardDay;
const storage_1 = require("./storage");
/**
 * CosmoWarp Tokenomics — Supply Management & Resonance Decay
 *
 * Total Supply: 69,000,000 CW (CosmoWarps)
 * Creator Lock: 1,000,000 CW (unlockable by admin)
 * Airdrop: 1,000 CW per new account
 * Mining: Resonance Decay (better than halving)
 * Streak Rewards: 10,000 CW for 365-day daily TX streak
 *
 * RESONANCE DECAY (replaces Bitcoin halving):
 * Instead of abrupt 50% cuts every N blocks, mining rewards decay
 * continuously following: reward = base * φ^(-totalMined / decayConstant)
 * where φ = 1.618... (golden ratio)
 *
 * Benefits over halving:
 * - No "halving shock" creating speculation bubbles
 * - Mathematically smooth and predictable
 * - Never reaches absolute zero — always an incentive
 * - Aligned with CosmoWarp's fractal/harmonic philosophy
 * - Self-adjusting based on actual mining activity
 */
// ─── Constants ───────────────────────────────────────────
exports.TOTAL_SUPPLY = 69_000_000;
exports.CREATOR_LOCKED = 1_000_000;
exports.AIRDROP_AMOUNT = 1_000;
exports.AIRDROP_POOL = 10_000_000; // Reserved for airdrops
exports.MINING_POOL = exports.TOTAL_SUPPLY - exports.CREATOR_LOCKED - exports.AIRDROP_POOL; // 58M
exports.BASE_MINING_REWARD = 50; // Starting reward per mine
exports.STREAK_REWARD = 10_000; // 365-day streak bonus
exports.STREAK_DAYS_REQUIRED = 365;
exports.GOLDEN_RATIO = 1.618033988749895;
exports.DECAY_CONSTANT = 5_000_000; // Controls decay speed
// ─── Resonance Decay Calculator ──────────────────────────
/**
 * Calculate current mining reward using Resonance Decay.
 * reward = BASE * φ^(-totalMined / DECAY_CONSTANT)
 *
 * At 0 mined: reward = 50 CW
 * At 5M mined: reward = 50 / φ ≈ 30.9 CW
 * At 10M mined: reward = 50 / φ² ≈ 19.1 CW
 * At 20M mined: reward = 50 / φ⁴ ≈ 7.3 CW
 * At 40M mined: reward = 50 / φ⁸ ≈ 1.1 CW
 * At 58M mined: reward ≈ 0.2 CW (minimum floor = 0.1)
 */
function calculateMiningReward(totalMined) {
    if (totalMined >= exports.MINING_POOL)
        return 0; // Pool exhausted
    const decayFactor = Math.pow(exports.GOLDEN_RATIO, -(totalMined / exports.DECAY_CONSTANT));
    const reward = exports.BASE_MINING_REWARD * decayFactor;
    // Floor: minimum 0.1 CW per mine (tiny but never zero)
    return Math.max(0.1, Math.round(reward * 100) / 100);
}
/**
 * Calculate the Resonance Decay epoch.
 * Each epoch = when totalMined crosses a DECAY_CONSTANT boundary.
 */
function calculateEpoch(totalMined) {
    return Math.floor(totalMined / exports.DECAY_CONSTANT);
}
/**
 * Estimate total supply at a given number of mining events.
 * Useful for projecting future supply.
 */
function projectSupply(miningEvents) {
    let total = 0;
    let mined = 0;
    for (let i = 0; i < miningEvents; i++) {
        const reward = calculateMiningReward(mined);
        if (reward <= 0)
            break;
        total += reward;
        mined += reward;
    }
    return total;
}
/** Get today's date as YYYY-MM-DD string */
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}
/** Get yesterday's date as YYYY-MM-DD string */
function getYesterdayDate() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}
/** Update streak for an address after a transaction */
function updateStreak(streak) {
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    if (streak.lastActivityDate === today) {
        // Already active today, no change
        return streak;
    }
    if (streak.lastActivityDate === yesterday) {
        // Consecutive day — increment streak
        streak.currentStreak++;
        streak.lastActivityDate = today;
        streak.longestStreak = Math.max(streak.longestStreak, streak.currentStreak);
    }
    else if (!streak.lastActivityDate) {
        // First activity ever
        streak.currentStreak = 1;
        streak.lastActivityDate = today;
        streak.streakStartDate = today;
        streak.longestStreak = 1;
    }
    else {
        // Streak broken — restart
        streak.currentStreak = 1;
        streak.lastActivityDate = today;
        streak.streakStartDate = today;
    }
    return streak;
}
/** Check if an address qualifies for the annual 365-day streak reward */
function checkStreakReward(streak) {
    return streak.currentStreak >= exports.STREAK_DAYS_REQUIRED;
}
/** Check if it's December 31 (reward distribution day) */
function isRewardDay() {
    const now = new Date();
    return now.getMonth() === 11 && now.getDate() === 31;
}
// ─── Tokenomics Engine ──────────────────────────────────
const TOKENOMICS_STORAGE_KEY = 'cosmowarp_tokenomics';
class TokenomicsEngine {
    state;
    streaks = new Map();
    constructor(creatorAddress = '') {
        this.state = {
            totalMinted: 0,
            totalMined: 0,
            totalAirdropped: 0,
            creatorLocked: exports.CREATOR_LOCKED,
            creatorUnlocked: 0,
            creatorAddress,
            circulatingSupply: 0,
            burnedSupply: 0,
            currentMiningReward: exports.BASE_MINING_REWARD,
            currentEpoch: 0,
            airdropPoolRemaining: exports.AIRDROP_POOL,
            miningPoolRemaining: exports.MINING_POOL,
            lastUpdated: Date.now(),
        };
    }
    // ─── Airdrop ─────────────────────────────────────────
    /** Process airdrop for a new account. Returns actual amount (may be less if pool low) */
    processAirdrop(address) {
        if (this.state.airdropPoolRemaining <= 0)
            return 0;
        const amount = Math.min(exports.AIRDROP_AMOUNT, this.state.airdropPoolRemaining);
        this.state.airdropPoolRemaining -= amount;
        this.state.totalAirdropped += amount;
        this.state.totalMinted += amount;
        this.state.circulatingSupply += amount;
        this.state.lastUpdated = Date.now();
        // Initialize streak for new account
        this.streaks.set(address, {
            address,
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: '',
            streakStartDate: '',
            totalStreakRewardsEarned: 0,
            yearlyStreaksCompleted: 0,
        });
        return amount;
    }
    // ─── Mining Reward ───────────────────────────────────
    /** Calculate and apply mining reward. Returns actual reward amount. */
    processMiningReward(energyUsed) {
        if (this.state.miningPoolRemaining <= 0)
            return 0;
        // Base reward from Resonance Decay
        const decayReward = calculateMiningReward(this.state.totalMined);
        // Scale by energy used (more computation = higher portion of reward)
        const energyMultiplier = Math.min(2.0, Math.max(0.1, energyUsed / 50));
        let reward = Math.round(decayReward * energyMultiplier * 100) / 100;
        // Cap at remaining pool
        reward = Math.min(reward, this.state.miningPoolRemaining);
        this.state.miningPoolRemaining -= reward;
        this.state.totalMined += reward;
        this.state.totalMinted += reward;
        this.state.circulatingSupply += reward;
        this.state.currentMiningReward = calculateMiningReward(this.state.totalMined);
        this.state.currentEpoch = calculateEpoch(this.state.totalMined);
        this.state.lastUpdated = Date.now();
        return reward;
    }
    // ─── Creator Lock ────────────────────────────────────
    /** Unlock creator tokens. Admin only. */
    unlockCreatorTokens(amount, adminAddress) {
        if (adminAddress !== this.state.creatorAddress)
            return false;
        if (amount <= 0 || amount > this.state.creatorLocked)
            return false;
        this.state.creatorLocked -= amount;
        this.state.creatorUnlocked += amount;
        this.state.circulatingSupply += amount;
        this.state.lastUpdated = Date.now();
        return true;
    }
    // ─── Streak Tracking ─────────────────────────────────
    /** Record activity for streak tracking */
    recordActivity(address) {
        let streak = this.streaks.get(address);
        if (!streak) {
            streak = {
                address,
                currentStreak: 0,
                longestStreak: 0,
                lastActivityDate: '',
                streakStartDate: '',
                totalStreakRewardsEarned: 0,
                yearlyStreaksCompleted: 0,
            };
        }
        this.streaks.set(address, updateStreak(streak));
    }
    /** Process annual streak rewards (call on Dec 31) */
    processAnnualStreakRewards() {
        const rewards = [];
        for (const [address, streak] of this.streaks) {
            if (checkStreakReward(streak)) {
                const amount = exports.STREAK_REWARD;
                streak.totalStreakRewardsEarned += amount;
                streak.yearlyStreaksCompleted++;
                this.state.totalMinted += amount;
                this.state.circulatingSupply += amount;
                rewards.push({ address, amount });
            }
        }
        this.state.lastUpdated = Date.now();
        return rewards;
    }
    // ─── Burn ────────────────────────────────────────────
    /** Burn CW (remove from circulation) */
    burn(amount) {
        this.state.burnedSupply += amount;
        this.state.circulatingSupply -= amount;
        this.state.lastUpdated = Date.now();
    }
    // ─── Queries ─────────────────────────────────────────
    getState() { return { ...this.state }; }
    getStreak(address) { return this.streaks.get(address); }
    getAllStreaks() { return Array.from(this.streaks.values()); }
    getSupplyBreakdown() {
        return {
            total: exports.TOTAL_SUPPLY,
            minted: this.state.totalMinted,
            unminted: exports.TOTAL_SUPPLY - this.state.totalMinted,
            circulating: this.state.circulatingSupply,
            creatorLocked: this.state.creatorLocked,
            creatorUnlocked: this.state.creatorUnlocked,
            burned: this.state.burnedSupply,
            airdropPoolRemaining: this.state.airdropPoolRemaining,
            miningPoolRemaining: this.state.miningPoolRemaining,
            totalMined: this.state.totalMined,
            totalAirdropped: this.state.totalAirdropped,
            currentReward: this.state.currentMiningReward,
            currentEpoch: this.state.currentEpoch,
            percentMined: (this.state.totalMined / exports.MINING_POOL) * 100,
        };
    }
    // ─── Persistence ─────────────────────────────────────
    serialize() {
        return JSON.stringify({
            state: this.state,
            streaks: Array.from(this.streaks.entries()),
        });
    }
    static deserialize(json) {
        const data = JSON.parse(json);
        const engine = new TokenomicsEngine();
        engine.state = data.state;
        engine.streaks = new Map(data.streaks);
        return engine;
    }
    save() {
        storage_1.storage.setItem(TOKENOMICS_STORAGE_KEY, this.serialize());
    }
    static load() {
        const raw = storage_1.storage.getItem(TOKENOMICS_STORAGE_KEY);
        if (!raw)
            return null;
        try {
            return TokenomicsEngine.deserialize(raw);
        }
        catch {
            return null;
        }
    }
}
exports.TokenomicsEngine = TokenomicsEngine;
//# sourceMappingURL=tokenomics.js.map