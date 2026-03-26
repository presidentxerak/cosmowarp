import { describe, it, expect } from 'vitest';
import {
  PRIMARY_MARKET_FEE_PERCENT,
  SECONDARY_MARKET_FEE_PERCENT,
  TOTAL_SUPPLY,
  AIRDROP_AMOUNT,
  MINING_POOL,
  CREATOR_LOCKED,
  AIRDROP_POOL,
  BASE_MINING_REWARD,
  STORAGE_FEE_TIERS,
  DEFAULT_EXCHANGE_RATES,
  SHARD_COUNT,
  GAS_COST,
  RESONANCE_THRESHOLD,
  PROGRESSIVE_TX_LIMITS,
  STORAGE_KEYS,
} from './constants';

describe('Platform Constants', () => {
  it('fees are within valid range', () => {
    expect(PRIMARY_MARKET_FEE_PERCENT).toBeGreaterThan(0);
    expect(PRIMARY_MARKET_FEE_PERCENT).toBeLessThanOrEqual(100);
    expect(SECONDARY_MARKET_FEE_PERCENT).toBeGreaterThan(0);
    expect(SECONDARY_MARKET_FEE_PERCENT).toBeLessThan(PRIMARY_MARKET_FEE_PERCENT);
  });

  it('tokenomics supply is consistent', () => {
    expect(TOTAL_SUPPLY).toBe(69_000_000);
    expect(MINING_POOL).toBe(TOTAL_SUPPLY - CREATOR_LOCKED - AIRDROP_POOL);
    expect(AIRDROP_AMOUNT).toBeLessThan(AIRDROP_POOL);
    expect(BASE_MINING_REWARD).toBeLessThan(MINING_POOL);
  });

  it('storage fee tiers are ascending', () => {
    for (let i = 1; i < STORAGE_FEE_TIERS.length; i++) {
      expect(STORAGE_FEE_TIERS[i].maxBytes).toBeGreaterThan(STORAGE_FEE_TIERS[i - 1].maxBytes);
      expect(STORAGE_FEE_TIERS[i].fee).toBeGreaterThanOrEqual(STORAGE_FEE_TIERS[i - 1].fee);
    }
  });

  it('exchange rates are all positive', () => {
    for (const [, rate] of Object.entries(DEFAULT_EXCHANGE_RATES)) {
      expect(rate).toBeGreaterThan(0);
    }
  });

  it('blockchain has correct shard count', () => {
    expect(SHARD_COUNT).toBe(7);
    expect(GAS_COST).toBe(0);
  });

  it('consensus threshold is valid supermajority', () => {
    expect(RESONANCE_THRESHOLD).toBeGreaterThanOrEqual(0.5);
    expect(RESONANCE_THRESHOLD).toBeLessThanOrEqual(1);
  });

  it('progressive limits are ascending by age', () => {
    for (let i = 1; i < PROGRESSIVE_TX_LIMITS.length; i++) {
      expect(PROGRESSIVE_TX_LIMITS[i].ageHours).toBeGreaterThan(PROGRESSIVE_TX_LIMITS[i - 1].ageHours);
      expect(PROGRESSIVE_TX_LIMITS[i].maxSingleTx).toBeGreaterThan(PROGRESSIVE_TX_LIMITS[i - 1].maxSingleTx);
    }
  });

  it('storage keys are all prefixed with strangrz_', () => {
    for (const [, value] of Object.entries(STORAGE_KEYS)) {
      expect(value).toMatch(/^strangrz_/);
    }
  });
});
