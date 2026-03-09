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
export declare const TOTAL_SUPPLY = 69000000;
export declare const CREATOR_LOCKED = 1000000;
export declare const AIRDROP_AMOUNT = 1000;
export declare const AIRDROP_POOL = 10000000;
export declare const MINING_POOL: number;
export declare const BASE_MINING_REWARD = 50;
export declare const STREAK_REWARD = 10000;
export declare const STREAK_DAYS_REQUIRED = 365;
export declare const GOLDEN_RATIO = 1.618033988749895;
export declare const DECAY_CONSTANT = 5000000;
export interface SupplyState {
    totalMinted: number;
    totalMined: number;
    totalAirdropped: number;
    creatorLocked: number;
    creatorUnlocked: number;
    creatorAddress: string;
    circulatingSupply: number;
    burnedSupply: number;
    currentMiningReward: number;
    currentEpoch: number;
    airdropPoolRemaining: number;
    miningPoolRemaining: number;
    lastUpdated: number;
}
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
export declare function calculateMiningReward(totalMined: number): number;
/**
 * Calculate the Resonance Decay epoch.
 * Each epoch = when totalMined crosses a DECAY_CONSTANT boundary.
 */
export declare function calculateEpoch(totalMined: number): number;
/**
 * Estimate total supply at a given number of mining events.
 * Useful for projecting future supply.
 */
export declare function projectSupply(miningEvents: number): number;
export interface StreakRecord {
    address: string;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string;
    streakStartDate: string;
    totalStreakRewardsEarned: number;
    yearlyStreaksCompleted: number;
}
/** Get today's date as YYYY-MM-DD string */
export declare function getTodayDate(): string;
/** Update streak for an address after a transaction */
export declare function updateStreak(streak: StreakRecord): StreakRecord;
/** Check if an address qualifies for the annual 365-day streak reward */
export declare function checkStreakReward(streak: StreakRecord): boolean;
/** Check if it's December 31 (reward distribution day) */
export declare function isRewardDay(): boolean;
export declare class TokenomicsEngine {
    private state;
    private streaks;
    constructor(creatorAddress?: string);
    /** Process airdrop for a new account. Returns actual amount (may be less if pool low) */
    processAirdrop(address: string): number;
    /** Calculate and apply mining reward. Returns actual reward amount. */
    processMiningReward(energyUsed: number): number;
    /** Unlock creator tokens. Admin only. */
    unlockCreatorTokens(amount: number, adminAddress: string): boolean;
    /** Record activity for streak tracking */
    recordActivity(address: string): void;
    /** Process annual streak rewards (call on Dec 31) */
    processAnnualStreakRewards(): Array<{
        address: string;
        amount: number;
    }>;
    /** Burn CW (remove from circulation) */
    burn(amount: number): void;
    getState(): SupplyState;
    getStreak(address: string): StreakRecord | undefined;
    getAllStreaks(): StreakRecord[];
    getSupplyBreakdown(): SupplyBreakdown;
    serialize(): string;
    static deserialize(json: string): TokenomicsEngine;
    save(): void;
    static load(): TokenomicsEngine | null;
}
export interface SupplyBreakdown {
    total: number;
    minted: number;
    unminted: number;
    circulating: number;
    creatorLocked: number;
    creatorUnlocked: number;
    burned: number;
    airdropPoolRemaining: number;
    miningPoolRemaining: number;
    totalMined: number;
    totalAirdropped: number;
    currentReward: number;
    currentEpoch: number;
    percentMined: number;
}
//# sourceMappingURL=tokenomics.d.ts.map