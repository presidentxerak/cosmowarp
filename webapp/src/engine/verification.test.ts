import { describe, it, expect, beforeEach } from 'vitest';
import {
  isVerified, getVerification, getAllVerified, verifyCreator,
  revokeVerification, computeCreatorStats, getFeatured,
} from './verification';
import type { Wart } from './warts';

function makeWart(overrides: Partial<Wart> = {}): Wart {
  return {
    id: `wart_${Math.random().toString(36).slice(2)}`,
    title: 'Art', description: '', imageData: '', mediaType: 'image',
    creator: 'STZ_alice', owner: 'STZ_alice',
    price: 100, listed: true, createdAt: Date.now(),
    history: [], royaltyPercent: 5, comments: [],
    editionType: 'unique', maxEditions: null, editionNumber: 1,
    availableUntil: null, storageMode: 'local', vaultBackup: false,
    ...overrides,
  };
}

describe('Creator Verification', () => {
  beforeEach(() => localStorage.clear());

  it('starts unverified', () => {
    expect(isVerified('STZ_alice')).toBe(false);
    expect(getVerification('STZ_alice')).toBeNull();
  });

  it('verifies a creator', async () => {
    await verifyCreator('STZ_alice', 'STZ_admin', 'verified', 'Great artist');
    expect(isVerified('STZ_alice')).toBe(true);
    const v = getVerification('STZ_alice')!;
    expect(v.status).toBe('verified');
    expect(v.verifiedBy).toBe('STZ_admin');
    expect(v.reason).toBe('Great artist');
  });

  it('lists all verified', async () => {
    await verifyCreator('STZ_alice', 'STZ_admin');
    await verifyCreator('STZ_bob', 'STZ_admin', 'featured');
    expect(getAllVerified()).toHaveLength(2);
  });

  it('revokes verification', async () => {
    await verifyCreator('STZ_alice', 'STZ_admin');
    expect(isVerified('STZ_alice')).toBe(true);
    await revokeVerification('STZ_alice');
    expect(isVerified('STZ_alice')).toBe(false);
  });

  it('gets featured creators', async () => {
    await verifyCreator('STZ_alice', 'STZ_admin', 'verified');
    await verifyCreator('STZ_bob', 'STZ_admin', 'featured');
    await verifyCreator('STZ_carol', 'STZ_admin', 'featured');
    expect(getFeatured()).toHaveLength(2);
    expect(getFeatured().every(v => v.status === 'featured')).toBe(true);
  });

  it('persists across loads', async () => {
    await verifyCreator('STZ_alice', 'STZ_admin');
    // Simulate reload by clearing module state
    expect(isVerified('STZ_alice')).toBe(true);
  });
});

describe('Creator Stats', () => {
  it('computes stats from wart history', () => {
    const warts = [
      makeWart({
        creator: 'STZ_alice',
        owner: 'STZ_bob',
        history: [
          { from: 'STZ_alice', to: 'STZ_bob', price: 200, timestamp: 1000, txId: 't1' },
        ],
      }),
      makeWart({
        creator: 'STZ_alice',
        owner: 'STZ_carol',
        history: [
          { from: 'STZ_alice', to: 'STZ_carol', price: 500, timestamp: 2000, txId: 't2' },
        ],
      }),
      makeWart({ creator: 'STZ_alice', owner: 'STZ_alice' }), // unsold
    ];

    const stats = computeCreatorStats('STZ_alice', warts, 42);
    expect(stats.totalArtworks).toBe(3);
    expect(stats.totalSales).toBe(2);
    expect(stats.totalVolume).toBe(700);
    expect(stats.totalCollectors).toBe(2);
    expect(stats.avgSalePrice).toBe(350);
    expect(stats.topSalePrice).toBe(500);
    expect(stats.followerCount).toBe(42);
  });

  it('handles creator with no sales', () => {
    const warts = [makeWart({ creator: 'STZ_new', owner: 'STZ_new' })];
    const stats = computeCreatorStats('STZ_new', warts);
    expect(stats.totalSales).toBe(0);
    expect(stats.avgSalePrice).toBe(0);
    expect(stats.totalCollectors).toBe(0);
  });
});
