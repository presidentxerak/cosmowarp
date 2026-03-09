"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HierarchyEngine = exports.HIERARCHY_LEVELS = void 0;
const storage_1 = require("./storage");
exports.HIERARCHY_LEVELS = [
    {
        id: 0,
        name: 'Particle',
        title: 'Quantum Seed',
        symbol: '\u2022', // •
        minTransactions: 0,
        minDaysActive: 0,
        rewardMultiplier: 1.0,
        airdropBonus: 0,
        color: 'text-gray-400',
        description: 'Every journey begins with a single particle.',
    },
    {
        id: 1,
        name: 'Wave',
        title: 'Harmonic Traveler',
        symbol: '\u223F', // ∿
        minTransactions: 10,
        minDaysActive: 3,
        rewardMultiplier: 1.2,
        airdropBonus: 100,
        color: 'text-blue-400',
        description: 'Your transactions ripple through the mesh.',
    },
    {
        id: 2,
        name: 'Star',
        title: 'Stellar Navigator',
        symbol: '\u2605', // ★
        minTransactions: 50,
        minDaysActive: 14,
        rewardMultiplier: 1.5,
        airdropBonus: 250,
        color: 'text-yellow-400',
        description: 'A guiding light in the CosmoMesh.',
    },
    {
        id: 3,
        name: 'Nebula',
        title: 'Nebula Architect',
        symbol: '\u2604', // ☄
        minTransactions: 200,
        minDaysActive: 30,
        rewardMultiplier: 2.0,
        airdropBonus: 500,
        color: 'text-purple-400',
        description: 'You shape the fabric of the mesh.',
    },
    {
        id: 4,
        name: 'Galaxy',
        title: 'Galactic Guardian',
        symbol: '\u269B', // ⚛
        minTransactions: 500,
        minDaysActive: 90,
        rewardMultiplier: 2.5,
        airdropBonus: 1000,
        color: 'text-cyan-400',
        description: 'A gravitational center of the network.',
    },
    {
        id: 5,
        name: 'Cosmos',
        title: 'Cosmic Sovereign',
        symbol: '\u2B21', // ⬡
        minTransactions: 2000,
        minDaysActive: 180,
        rewardMultiplier: 3.5,
        airdropBonus: 2500,
        color: 'text-orange-400',
        description: 'Sovereign of the cosmic order.',
    },
    {
        id: 6,
        name: 'Lumina',
        title: 'Lumina Transcendent',
        symbol: '\u2600', // ☀
        minTransactions: 10000,
        minDaysActive: 365,
        rewardMultiplier: 5.0,
        airdropBonus: 5000,
        color: 'text-amber-300',
        description: 'Transcended beyond the mesh. You ARE the light.',
    },
];
// ─── Hierarchy Engine ────────────────────────────────────
class HierarchyEngine {
    profiles = new Map();
    /** Get or create a profile for an address */
    getProfile(address) {
        let profile = this.profiles.get(address);
        if (!profile) {
            profile = {
                address,
                level: 0,
                totalTransactions: 0,
                totalSent: 0,
                totalReceived: 0,
                totalMined: 0,
                daysActive: 0,
                uniqueDaysActive: [],
                firstActivityDate: '',
                lastActivityDate: '',
                levelUpHistory: [],
                xp: 0,
            };
            this.profiles.set(address, profile);
        }
        return profile;
    }
    /** Record a transaction and update profile + check level-up */
    recordTransaction(address, type, amount) {
        const profile = this.getProfile(address);
        const today = new Date().toISOString().split('T')[0];
        profile.totalTransactions++;
        if (type === 'send')
            profile.totalSent += amount;
        if (type === 'receive')
            profile.totalReceived += amount;
        if (type === 'mine')
            profile.totalMined += amount;
        // Track unique active days
        const daysSet = new Set(profile.uniqueDaysActive);
        if (!daysSet.has(today)) {
            daysSet.add(today);
            profile.daysActive = daysSet.size;
        }
        profile.uniqueDaysActive = Array.from(daysSet);
        profile.lastActivityDate = today;
        if (!profile.firstActivityDate)
            profile.firstActivityDate = today;
        // XP calculation: each TX = 10 XP, mining = 20 XP, streaks bonus
        profile.xp += type === 'mine' ? 20 : 10;
        // Check for level-up
        const oldLevel = profile.level;
        const newLevel = this.calculateLevel(profile);
        if (newLevel > oldLevel) {
            profile.level = newLevel;
            profile.levelUpHistory.push({ level: newLevel, date: today });
            this.profiles.set(address, profile);
            const levelDef = exports.HIERARCHY_LEVELS[newLevel];
            return {
                address,
                oldLevel,
                newLevel,
                levelDef,
                airdropBonus: levelDef.airdropBonus,
            };
        }
        this.profiles.set(address, profile);
        return null;
    }
    /** Calculate what level an account should be at */
    calculateLevel(profile) {
        let level = 0;
        for (let i = exports.HIERARCHY_LEVELS.length - 1; i >= 0; i--) {
            const def = exports.HIERARCHY_LEVELS[i];
            if (profile.totalTransactions >= def.minTransactions &&
                profile.daysActive >= def.minDaysActive) {
                level = i;
                break;
            }
        }
        return level;
    }
    /** Get the current level definition for an address */
    getLevelDef(address) {
        const profile = this.getProfile(address);
        return exports.HIERARCHY_LEVELS[profile.level];
    }
    /** Get reward multiplier for an address */
    getRewardMultiplier(address) {
        return this.getLevelDef(address).rewardMultiplier;
    }
    /** Get XP progress to next level (0-100%) */
    getProgressToNextLevel(address) {
        const profile = this.getProfile(address);
        if (profile.level >= exports.HIERARCHY_LEVELS.length - 1)
            return 100;
        const current = exports.HIERARCHY_LEVELS[profile.level];
        const next = exports.HIERARCHY_LEVELS[profile.level + 1];
        const txProgress = (profile.totalTransactions - current.minTransactions) /
            (next.minTransactions - current.minTransactions);
        const daysProgress = (profile.daysActive - current.minDaysActive) /
            (next.minDaysActive - current.minDaysActive);
        return Math.min(100, Math.max(0, Math.round(((txProgress + daysProgress) / 2) * 100)));
    }
    /** Get all profiles sorted by level (descending) */
    getLeaderboard() {
        return Array.from(this.profiles.values())
            .sort((a, b) => {
            if (b.level !== a.level)
                return b.level - a.level;
            return b.xp - a.xp;
        });
    }
    // ─── Serialization ───────────────────────────────────
    serialize() {
        return JSON.stringify({
            profiles: Array.from(this.profiles.entries()),
        });
    }
    static deserialize(json) {
        const data = JSON.parse(json);
        const engine = new HierarchyEngine();
        engine.profiles = new Map(data.profiles);
        return engine;
    }
    save() {
        storage_1.storage.setItem('cosmowarp_hierarchy', this.serialize());
    }
    static load() {
        const raw = storage_1.storage.getItem('cosmowarp_hierarchy');
        if (!raw)
            return null;
        try {
            return HierarchyEngine.deserialize(raw);
        }
        catch {
            return null;
        }
    }
}
exports.HierarchyEngine = HierarchyEngine;
//# sourceMappingURL=hierarchy.js.map