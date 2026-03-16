import { storage } from './storage';

/**
 * Strangrz Account Hierarchy — Levels, Titles & Rewards
 *
 * 7 levels aligned with the 7 fractal layers.
 * Each level has a cosmic title, reward multiplier, and privileges.
 * Advancement is based on total transactions + activity consistency.
 */

// ─── Level Definitions ───────────────────────────────────

export interface HierarchyLevel {
  id: number;
  name: string;
  title: string;
  symbol: string;
  minTransactions: number;
  minDaysActive: number;
  rewardMultiplier: number;     // Multiplier on mining rewards
  airdropBonus: number;         // Extra airdrop amount on level-up
  color: string;                // UI color class
  description: string;
}

export const HIERARCHY_LEVELS: HierarchyLevel[] = [
  {
    id: 0,
    name: 'Particle',
    title: 'Quantum Seed',
    symbol: '\u2022',       // •
    minTransactions: 0,
    minDaysActive: 0,
    rewardMultiplier: 1.0,
    airdropBonus: 0,
    color: 'opacity-40',
    description: 'Every journey begins with a single particle.',
  },
  {
    id: 1,
    name: 'Wave',
    title: 'Harmonic Traveler',
    symbol: '\u223F',       // ∿
    minTransactions: 10,
    minDaysActive: 3,
    rewardMultiplier: 1.2,
    airdropBonus: 100,
    color: 'opacity-80',
    description: 'Your transactions ripple through the mesh.',
  },
  {
    id: 2,
    name: 'Star',
    title: 'Stellar Navigator',
    symbol: '\u2605',       // ★
    minTransactions: 50,
    minDaysActive: 14,
    rewardMultiplier: 1.5,
    airdropBonus: 250,
    color: 'opacity-80',
    description: 'A guiding light in the StrangrzMesh.',
  },
  {
    id: 3,
    name: 'Nebula',
    title: 'Nebula Architect',
    symbol: '\u2604',       // ☄
    minTransactions: 200,
    minDaysActive: 30,
    rewardMultiplier: 2.0,
    airdropBonus: 500,
    color: 'opacity-80',
    description: 'You shape the fabric of the mesh.',
  },
  {
    id: 4,
    name: 'Galaxy',
    title: 'Galactic Guardian',
    symbol: '\u269B',       // ⚛
    minTransactions: 500,
    minDaysActive: 90,
    rewardMultiplier: 2.5,
    airdropBonus: 1000,
    color: 'opacity-80',
    description: 'A gravitational center of the network.',
  },
  {
    id: 5,
    name: 'Cosmos',
    title: 'Cosmic Sovereign',
    symbol: '\u2B21',       // ⬡
    minTransactions: 2000,
    minDaysActive: 180,
    rewardMultiplier: 3.5,
    airdropBonus: 2500,
    color: 'opacity-80',
    description: 'Sovereign of the cosmic order.',
  },
  {
    id: 6,
    name: 'Lumina',
    title: 'Lumina Transcendent',
    symbol: '\u2600',       // ☀
    minTransactions: 10000,
    minDaysActive: 365,
    rewardMultiplier: 5.0,
    airdropBonus: 5000,
    color: 'opacity-80',
    description: 'Transcended beyond the mesh. You ARE the light.',
  },
];

// ─── Account Profile ─────────────────────────────────────

export interface AccountProfile {
  address: string;
  level: number;                 // 0-6
  totalTransactions: number;
  totalSent: number;
  totalReceived: number;
  totalMined: number;
  daysActive: number;
  uniqueDaysActive: Set<string> | string[];  // YYYY-MM-DD dates
  firstActivityDate: string;
  lastActivityDate: string;
  levelUpHistory: Array<{ level: number; date: string; }>;
  xp: number;                   // Experience points for fine-grained progress
}

// ─── Hierarchy Engine ────────────────────────────────────

export class HierarchyEngine {
  private profiles: Map<string, AccountProfile> = new Map();

  /** Get or create a profile for an address */
  getProfile(address: string): AccountProfile {
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
  recordTransaction(address: string, type: 'send' | 'receive' | 'mine', amount: number): LevelUpResult | null {
    const profile = this.getProfile(address);
    const today = new Date().toISOString().split('T')[0];

    profile.totalTransactions++;
    if (type === 'send') profile.totalSent += amount;
    if (type === 'receive') profile.totalReceived += amount;
    if (type === 'mine') profile.totalMined += amount;

    // Track unique active days
    const daysSet = new Set(profile.uniqueDaysActive as string[]);
    if (!daysSet.has(today)) {
      daysSet.add(today);
      profile.daysActive = daysSet.size;
    }
    profile.uniqueDaysActive = Array.from(daysSet);
    profile.lastActivityDate = today;
    if (!profile.firstActivityDate) profile.firstActivityDate = today;

    // XP calculation: each TX = 10 XP, mining = 20 XP, streaks bonus
    profile.xp += type === 'mine' ? 20 : 10;

    // Check for level-up
    const oldLevel = profile.level;
    const newLevel = this.calculateLevel(profile);

    if (newLevel > oldLevel) {
      profile.level = newLevel;
      profile.levelUpHistory.push({ level: newLevel, date: today });
      this.profiles.set(address, profile);

      const levelDef = HIERARCHY_LEVELS[newLevel];
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
  private calculateLevel(profile: AccountProfile): number {
    let level = 0;
    for (let i = HIERARCHY_LEVELS.length - 1; i >= 0; i--) {
      const def = HIERARCHY_LEVELS[i];
      if (profile.totalTransactions >= def.minTransactions &&
          profile.daysActive >= def.minDaysActive) {
        level = i;
        break;
      }
    }
    return level;
  }

  /** Get the current level definition for an address */
  getLevelDef(address: string): HierarchyLevel {
    const profile = this.getProfile(address);
    return HIERARCHY_LEVELS[profile.level];
  }

  /** Get reward multiplier for an address */
  getRewardMultiplier(address: string): number {
    return this.getLevelDef(address).rewardMultiplier;
  }

  /** Get XP progress to next level (0-100%) */
  getProgressToNextLevel(address: string): number {
    const profile = this.getProfile(address);
    if (profile.level >= HIERARCHY_LEVELS.length - 1) return 100;

    const current = HIERARCHY_LEVELS[profile.level];
    const next = HIERARCHY_LEVELS[profile.level + 1];

    const txProgress = (profile.totalTransactions - current.minTransactions) /
                       (next.minTransactions - current.minTransactions);
    const daysProgress = (profile.daysActive - current.minDaysActive) /
                         (next.minDaysActive - current.minDaysActive);

    return Math.min(100, Math.max(0, Math.round(((txProgress + daysProgress) / 2) * 100)));
  }

  /** Get all profiles sorted by level (descending) */
  getLeaderboard(): AccountProfile[] {
    return Array.from(this.profiles.values())
      .sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.xp - a.xp;
      });
  }

  // ─── Serialization ───────────────────────────────────

  serialize(): string {
    return JSON.stringify({
      profiles: Array.from(this.profiles.entries()),
    });
  }

  static deserialize(json: string): HierarchyEngine {
    const data = JSON.parse(json);
    const engine = new HierarchyEngine();
    engine.profiles = new Map(data.profiles);
    return engine;
  }

  save(): void {
    storage.setItem('strangrz_hierarchy', this.serialize());
  }

  static load(): HierarchyEngine | null {
    const raw = storage.getItem('strangrz_hierarchy');
    if (!raw) return null;
    try {
      return HierarchyEngine.deserialize(raw);
    } catch {
      return null;
    }
  }
}

// ─── Types ───────────────────────────────────────────────

export interface LevelUpResult {
  address: string;
  oldLevel: number;
  newLevel: number;
  levelDef: HierarchyLevel;
  airdropBonus: number;
}
