/**
 * CosmoWarp Account Hierarchy — Levels, Titles & Rewards
 *
 * 7 levels aligned with the 7 fractal layers.
 * Each level has a cosmic title, reward multiplier, and privileges.
 * Advancement is based on total transactions + activity consistency.
 */
export interface HierarchyLevel {
    id: number;
    name: string;
    title: string;
    symbol: string;
    minTransactions: number;
    minDaysActive: number;
    rewardMultiplier: number;
    airdropBonus: number;
    color: string;
    description: string;
}
export declare const HIERARCHY_LEVELS: HierarchyLevel[];
export interface AccountProfile {
    address: string;
    level: number;
    totalTransactions: number;
    totalSent: number;
    totalReceived: number;
    totalMined: number;
    daysActive: number;
    uniqueDaysActive: Set<string> | string[];
    firstActivityDate: string;
    lastActivityDate: string;
    levelUpHistory: Array<{
        level: number;
        date: string;
    }>;
    xp: number;
}
export declare class HierarchyEngine {
    private profiles;
    /** Get or create a profile for an address */
    getProfile(address: string): AccountProfile;
    /** Record a transaction and update profile + check level-up */
    recordTransaction(address: string, type: 'send' | 'receive' | 'mine', amount: number): LevelUpResult | null;
    /** Calculate what level an account should be at */
    private calculateLevel;
    /** Get the current level definition for an address */
    getLevelDef(address: string): HierarchyLevel;
    /** Get reward multiplier for an address */
    getRewardMultiplier(address: string): number;
    /** Get XP progress to next level (0-100%) */
    getProgressToNextLevel(address: string): number;
    /** Get all profiles sorted by level (descending) */
    getLeaderboard(): AccountProfile[];
    serialize(): string;
    static deserialize(json: string): HierarchyEngine;
    save(): void;
    static load(): HierarchyEngine | null;
}
export interface LevelUpResult {
    address: string;
    oldLevel: number;
    newLevel: number;
    levelDef: HierarchyLevel;
    airdropBonus: number;
}
//# sourceMappingURL=hierarchy.d.ts.map