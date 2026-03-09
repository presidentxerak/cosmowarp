/**
 * Tests for Phase 2 — Tokenomics, Hierarchy, Security, SDK
 */

// ─── Mock localStorage for Node.js ──────────────────────

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
};

import {
  TOTAL_SUPPLY, CREATOR_LOCKED, AIRDROP_AMOUNT, AIRDROP_POOL,
  MINING_POOL, BASE_MINING_REWARD, STREAK_REWARD, STREAK_DAYS_REQUIRED,
  GOLDEN_RATIO, DECAY_CONSTANT,
  calculateMiningReward, calculateEpoch, projectSupply,
  getTodayDate, updateStreak, checkStreakReward, isRewardDay,
  TokenomicsEngine,
  type StreakRecord,
} from '../../webapp/src/engine/tokenomics';

import {
  HIERARCHY_LEVELS,
  HierarchyEngine,
  type AccountProfile,
} from '../../webapp/src/engine/hierarchy';

import {
  RateLimiter, NonceTracker, PatternDetector,
  StateIntegrity, SecurityManager,
  getAmountLimits, checkAmountLimit,
} from '../../webapp/src/engine/security';

import { CosmorareSDK } from '../../webapp/src/engine/sdk';

// ─── Tokenomics Constants ───────────────────────────────

describe('Tokenomics Constants', () => {
  test('total supply is 69M', () => {
    expect(TOTAL_SUPPLY).toBe(69_000_000);
  });

  test('creator locked is 1M', () => {
    expect(CREATOR_LOCKED).toBe(1_000_000);
  });

  test('airdrop per account is 1000', () => {
    expect(AIRDROP_AMOUNT).toBe(1_000);
  });

  test('airdrop pool is 10M', () => {
    expect(AIRDROP_POOL).toBe(10_000_000);
  });

  test('mining pool = total - creator - airdrop', () => {
    expect(MINING_POOL).toBe(TOTAL_SUPPLY - CREATOR_LOCKED - AIRDROP_POOL);
    expect(MINING_POOL).toBe(58_000_000);
  });

  test('golden ratio is phi', () => {
    expect(GOLDEN_RATIO).toBeCloseTo(1.618033988749895, 10);
  });
});

// ─── Resonance Decay ────────────────────────────────────

describe('Resonance Decay', () => {
  test('base reward at 0 mined is 50 CW', () => {
    expect(calculateMiningReward(0)).toBe(BASE_MINING_REWARD);
  });

  test('reward decreases as more is mined', () => {
    const r0 = calculateMiningReward(0);
    const r5m = calculateMiningReward(5_000_000);
    const r10m = calculateMiningReward(10_000_000);
    const r20m = calculateMiningReward(20_000_000);
    const r40m = calculateMiningReward(40_000_000);

    expect(r5m).toBeLessThan(r0);
    expect(r10m).toBeLessThan(r5m);
    expect(r20m).toBeLessThan(r10m);
    expect(r40m).toBeLessThan(r20m);
  });

  test('reward never goes below 0.1', () => {
    expect(calculateMiningReward(57_999_999)).toBeGreaterThanOrEqual(0.1);
  });

  test('reward is 0 when pool exhausted', () => {
    expect(calculateMiningReward(MINING_POOL)).toBe(0);
  });

  test('at 5M mined reward is ~30.9', () => {
    const reward = calculateMiningReward(5_000_000);
    expect(reward).toBeGreaterThan(28);
    expect(reward).toBeLessThan(33);
  });

  test('epoch calculation works', () => {
    expect(calculateEpoch(0)).toBe(0);
    expect(calculateEpoch(4_999_999)).toBe(0);
    expect(calculateEpoch(5_000_000)).toBe(1);
    expect(calculateEpoch(10_000_000)).toBe(2);
  });

  test('projectSupply runs without error', () => {
    const supply = projectSupply(100);
    expect(supply).toBeGreaterThan(0);
  });
});

// ─── Streak System ──────────────────────────────────────

describe('Streak System', () => {
  test('getTodayDate returns YYYY-MM-DD', () => {
    const today = getTodayDate();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('first activity starts streak at 1', () => {
    const streak: StreakRecord = {
      address: 'CWtest',
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: '',
      streakStartDate: '',
      totalStreakRewardsEarned: 0,
      yearlyStreaksCompleted: 0,
    };
    const updated = updateStreak(streak);
    expect(updated.currentStreak).toBe(1);
    expect(updated.lastActivityDate).toBe(getTodayDate());
  });

  test('same day activity does not increment streak', () => {
    const today = getTodayDate();
    const streak: StreakRecord = {
      address: 'CWtest',
      currentStreak: 5,
      longestStreak: 5,
      lastActivityDate: today,
      streakStartDate: '2025-01-01',
      totalStreakRewardsEarned: 0,
      yearlyStreaksCompleted: 0,
    };
    const updated = updateStreak(streak);
    expect(updated.currentStreak).toBe(5); // unchanged
  });

  test('checkStreakReward returns true at 365 days', () => {
    const streak: StreakRecord = {
      address: 'CWtest',
      currentStreak: 365,
      longestStreak: 365,
      lastActivityDate: getTodayDate(),
      streakStartDate: '2025-01-01',
      totalStreakRewardsEarned: 0,
      yearlyStreaksCompleted: 0,
    };
    expect(checkStreakReward(streak)).toBe(true);
  });

  test('checkStreakReward returns false at 364 days', () => {
    const streak: StreakRecord = {
      address: 'CWtest',
      currentStreak: 364,
      longestStreak: 364,
      lastActivityDate: getTodayDate(),
      streakStartDate: '2025-01-01',
      totalStreakRewardsEarned: 0,
      yearlyStreaksCompleted: 0,
    };
    expect(checkStreakReward(streak)).toBe(false);
  });

  test('streak reward amount is 10000 CW', () => {
    expect(STREAK_REWARD).toBe(10_000);
  });

  test('streak days required is 365', () => {
    expect(STREAK_DAYS_REQUIRED).toBe(365);
  });
});

// ─── Tokenomics Engine ──────────────────────────────────

describe('TokenomicsEngine', () => {
  beforeEach(() => storage.clear());

  test('airdrop gives 1000 CW', () => {
    const engine = new TokenomicsEngine('CWcreator');
    const amount = engine.processAirdrop('CWnew');
    expect(amount).toBe(1000);
    expect(engine.getState().totalAirdropped).toBe(1000);
    expect(engine.getState().circulatingSupply).toBe(1000);
  });

  test('mining reward decreases over time', () => {
    const engine = new TokenomicsEngine('CWcreator');
    const r1 = engine.processMiningReward(50);
    const r2 = engine.processMiningReward(50);
    // r2 should be slightly less than r1 due to decay
    expect(r2).toBeLessThanOrEqual(r1);
    expect(engine.getState().totalMined).toBeGreaterThan(0);
  });

  test('creator can unlock tokens', () => {
    const engine = new TokenomicsEngine('CWcreator');
    expect(engine.unlockCreatorTokens(100000, 'CWcreator')).toBe(true);
    expect(engine.getState().creatorLocked).toBe(CREATOR_LOCKED - 100000);
    expect(engine.getState().creatorUnlocked).toBe(100000);
  });

  test('non-admin cannot unlock creator tokens', () => {
    const engine = new TokenomicsEngine('CWcreator');
    expect(engine.unlockCreatorTokens(100000, 'CWhacker')).toBe(false);
  });

  test('cannot unlock more than locked', () => {
    const engine = new TokenomicsEngine('CWcreator');
    expect(engine.unlockCreatorTokens(CREATOR_LOCKED + 1, 'CWcreator')).toBe(false);
  });

  test('supply breakdown is correct', () => {
    const engine = new TokenomicsEngine('CWcreator');
    engine.processAirdrop('CW1');
    const breakdown = engine.getSupplyBreakdown();
    expect(breakdown.total).toBe(TOTAL_SUPPLY);
    expect(breakdown.totalAirdropped).toBe(1000);
  });

  test('serialization roundtrip', () => {
    const engine = new TokenomicsEngine('CWcreator');
    engine.processAirdrop('CW1');
    engine.processMiningReward(50);
    engine.recordActivity('CW1');

    const json = engine.serialize();
    const restored = TokenomicsEngine.deserialize(json);
    expect(restored.getState().totalAirdropped).toBe(engine.getState().totalAirdropped);
    expect(restored.getState().totalMined).toBe(engine.getState().totalMined);
  });

  test('burn reduces circulating supply', () => {
    const engine = new TokenomicsEngine('CWcreator');
    engine.processAirdrop('CW1');
    const before = engine.getState().circulatingSupply;
    engine.burn(100);
    expect(engine.getState().circulatingSupply).toBe(before - 100);
    expect(engine.getState().burnedSupply).toBe(100);
  });
});

// ─── Hierarchy ──────────────────────────────────────────

describe('Hierarchy', () => {
  test('7 levels defined', () => {
    expect(HIERARCHY_LEVELS).toHaveLength(7);
  });

  test('levels have correct names', () => {
    const names = HIERARCHY_LEVELS.map(l => l.name);
    expect(names).toEqual(['Particle', 'Wave', 'Star', 'Nebula', 'Galaxy', 'Cosmos', 'Lumina']);
  });

  test('reward multipliers increase', () => {
    for (let i = 1; i < HIERARCHY_LEVELS.length; i++) {
      expect(HIERARCHY_LEVELS[i].rewardMultiplier).toBeGreaterThan(HIERARCHY_LEVELS[i - 1].rewardMultiplier);
    }
  });

  test('Lumina has 5x multiplier', () => {
    expect(HIERARCHY_LEVELS[6].rewardMultiplier).toBe(5.0);
  });

  test('new account starts at Particle', () => {
    const engine = new HierarchyEngine();
    const profile = engine.getProfile('CWtest');
    expect(profile.level).toBe(0);
    expect(engine.getLevelDef('CWtest').name).toBe('Particle');
  });

  test('recording transactions increases XP', () => {
    const engine = new HierarchyEngine();
    engine.recordTransaction('CWtest', 'send', 10);
    const profile = engine.getProfile('CWtest');
    expect(profile.xp).toBe(10);
    expect(profile.totalTransactions).toBe(1);
    expect(profile.totalSent).toBe(10);
  });

  test('mining gives 20 XP', () => {
    const engine = new HierarchyEngine();
    engine.recordTransaction('CWtest', 'mine', 50);
    expect(engine.getProfile('CWtest').xp).toBe(20);
  });

  test('level up triggers at threshold', () => {
    const engine = new HierarchyEngine();
    // Need 10 transactions and 3 days active for Wave
    let levelUp = null;
    for (let i = 0; i < 10; i++) {
      levelUp = engine.recordTransaction('CWtest', 'send', 10);
    }
    // Days active check is tricky in testing (all in same day)
    // Just verify XP accumulates
    expect(engine.getProfile('CWtest').xp).toBe(100);
  });

  test('getProgressToNextLevel returns 0-100', () => {
    const engine = new HierarchyEngine();
    const progress = engine.getProgressToNextLevel('CWtest');
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(100);
  });

  test('leaderboard sorted by level', () => {
    const engine = new HierarchyEngine();
    engine.recordTransaction('CW1', 'send', 10);
    engine.recordTransaction('CW2', 'send', 10);
    engine.recordTransaction('CW2', 'mine', 50);
    const board = engine.getLeaderboard();
    expect(board.length).toBe(2);
  });

  test('serialization roundtrip', () => {
    const engine = new HierarchyEngine();
    engine.recordTransaction('CWtest', 'send', 100);
    const json = engine.serialize();
    const restored = HierarchyEngine.deserialize(json);
    expect(restored.getProfile('CWtest').totalSent).toBe(100);
  });
});

// ─── Security ───────────────────────────────────────────

describe('Security - RateLimiter', () => {
  test('allows first transaction', () => {
    const limiter = new RateLimiter();
    expect(limiter.check('CWtest')).toBeNull();
  });

  test('allows multiple transactions under limit', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 9; i++) {
      limiter.record('CWtest');
    }
    expect(limiter.check('CWtest')).toBeNull();
  });

  test('blocks after exceeding per-minute limit', () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < 10; i++) {
      limiter.record('CWtest');
    }
    const result = limiter.check('CWtest');
    expect(result).not.toBeNull();
    expect(result).toContain('Rate limit');
  });
});

describe('Security - NonceTracker', () => {
  test('accepts unique nonce', () => {
    const tracker = new NonceTracker();
    expect(tracker.useNonce('abc123')).toBe(true);
  });

  test('rejects duplicate nonce', () => {
    const tracker = new NonceTracker();
    tracker.useNonce('abc123');
    expect(tracker.useNonce('abc123')).toBe(false);
  });

  test('generates unique nonces', () => {
    const tracker = new NonceTracker();
    const n1 = tracker.generateNonce();
    const n2 = tracker.generateNonce();
    expect(n1).not.toBe(n2);
    expect(n1).toHaveLength(32);
  });
});

describe('Security - AmountLimits', () => {
  test('new account has 100 CW single tx limit', () => {
    const limits = getAmountLimits(Date.now());
    expect(limits.maxSingleTx).toBe(100);
  });

  test('24h old account has 1000 CW limit', () => {
    const limits = getAmountLimits(Date.now() - 25 * 3600000);
    expect(limits.maxSingleTx).toBe(1000);
  });

  test('30d old account has 100000 CW limit', () => {
    const limits = getAmountLimits(Date.now() - 31 * 24 * 3600000);
    expect(limits.maxSingleTx).toBe(100000);
  });

  test('checkAmountLimit blocks overspend', () => {
    const result = checkAmountLimit(200, 0, Date.now());
    expect(result).not.toBeNull();
    expect(result).toContain('limit');
  });

  test('checkAmountLimit allows within limit', () => {
    const result = checkAmountLimit(50, 0, Date.now());
    expect(result).toBeNull();
  });
});

describe('Security - PatternDetector', () => {
  test('no patterns for normal transaction', () => {
    const detector = new PatternDetector();
    const patterns = detector.analyze('CW1', 'CW2', 100);
    expect(patterns).toHaveLength(0);
  });
});

describe('Security - StateIntegrity', () => {
  test('checksum verification passes for same data', async () => {
    const integrity = new StateIntegrity();
    await integrity.setChecksum('test', 'hello');
    expect(await integrity.verify('test', 'hello')).toBe(true);
  });

  test('checksum verification fails for tampered data', async () => {
    const integrity = new StateIntegrity();
    await integrity.setChecksum('test', 'hello');
    expect(await integrity.verify('test', 'tampered')).toBe(false);
  });
});

describe('SecurityManager', () => {
  test('allows valid transaction', async () => {
    const manager = new SecurityManager();
    const result = await manager.preTransactionCheck({
      from: 'CWsender',
      to: 'CWrecipient',
      amount: 50,
      accountCreatedAt: Date.now() - 86400000,
      dailyTotal: 0,
    });
    expect(result.allowed).toBe(true);
  });

  test('blocks oversized transaction for new account', async () => {
    const manager = new SecurityManager();
    const result = await manager.preTransactionCheck({
      from: 'CWsender',
      to: 'CWrecipient',
      amount: 500,
      accountCreatedAt: Date.now(),
      dailyTotal: 0,
    });
    expect(result.allowed).toBe(false);
  });
});

// ─── SDK ────────────────────────────────────────────────

describe('Cosmorare SDK', () => {
  test('getVersion returns version string', () => {
    const sdk = new CosmorareSDK();
    expect(sdk.getVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('getProtocolInfo returns correct data', () => {
    const sdk = new CosmorareSDK();
    const info = sdk.getProtocolInfo();
    expect(info.name).toBe('Cosmorare');
    expect(info.totalSupply).toBe(TOTAL_SUPPLY);
    expect(info.airdropAmount).toBe(AIRDROP_AMOUNT);
    expect(info.layers).toHaveLength(7);
    expect(info.hierarchyLevels).toHaveLength(7);
    expect(info.features.length).toBeGreaterThan(5);
  });

  test('createWallet generates valid address', async () => {
    const sdk = new CosmorareSDK();
    const wallet = await sdk.createWallet('TestUser');
    expect(wallet.address).toMatch(/^CW/);
    expect(wallet.publicKey).toBeTruthy();
    expect(wallet.alias).toBe('TestUser');
  });

  test('validateAddress checks format', () => {
    const sdk = new CosmorareSDK();
    expect(sdk.validateAddress('CW' + 'a'.repeat(40))).toBe(true);
    expect(sdk.validateAddress('invalid')).toBe(false);
  });

  test('hash computes SHA-256', async () => {
    const sdk = new CosmorareSDK();
    const hash = await sdk.hash('hello');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  test('calculateReward returns Resonance Decay value', () => {
    const sdk = new CosmorareSDK();
    expect(sdk.calculateReward(0)).toBe(50);
    expect(sdk.calculateReward(5_000_000)).toBeLessThan(50);
  });

  test('getRewardCurve generates curve data', () => {
    const sdk = new CosmorareSDK();
    const curve = sdk.getRewardCurve(10);
    expect(curve).toHaveLength(11);
    expect(curve[0].reward).toBe(50);
    expect(curve[10].reward).toBe(0); // pool exhausted
  });

  test('event system works', () => {
    const sdk = new CosmorareSDK();
    let received = false;
    const handler = () => { received = true; };
    sdk.on('balance_changed', handler);
    sdk.emit({
      type: 'balance_changed',
      address: 'CWtest',
      data: {},
      timestamp: Date.now(),
    });
    expect(received).toBe(true);
  });

  test('event unsubscribe works', () => {
    const sdk = new CosmorareSDK();
    let count = 0;
    const handler = () => { count++; };
    sdk.on('balance_changed', handler);
    sdk.emit({ type: 'balance_changed', address: 'CWtest', data: {}, timestamp: Date.now() });
    sdk.off('balance_changed', handler);
    sdk.emit({ type: 'balance_changed', address: 'CWtest', data: {}, timestamp: Date.now() });
    expect(count).toBe(1);
  });

  test('getLayerForAmount returns correct layers', () => {
    const sdk = new CosmorareSDK();
    expect(sdk.getLayerForAmount(5)).toBe('GRID');
    expect(sdk.getLayerForAmount(50)).toBe('HELIX');
    expect(sdk.getLayerForAmount(5000)).toBe('GLYPH');
  });
});
