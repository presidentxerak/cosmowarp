import { describe, it, expect, beforeEach } from 'vitest';
import { SubscriptionEngine } from './subscriptions';

describe('SubscriptionEngine', () => {
  beforeEach(() => localStorage.clear());

  it('subscribes to a creator', () => {
    const engine = SubscriptionEngine.load();
    const sub = engine.subscribe('STZ_fan', 'STZ_artist', 'supporter');
    expect(sub.id).toMatch(/^SUB_/);
    expect(sub.tier).toBe('supporter');
    expect(sub.autoRenew).toBe(true);
    expect(sub.expiresAt).toBeGreaterThan(Date.now());
  });

  it('checks access correctly', () => {
    const engine = SubscriptionEngine.load();
    engine.subscribe('STZ_fan', 'STZ_artist', 'supporter');
    expect(engine.hasAccess('STZ_fan', 'STZ_artist', 'free')).toBe(true);
    expect(engine.hasAccess('STZ_fan', 'STZ_artist', 'supporter')).toBe(true);
    expect(engine.hasAccess('STZ_fan', 'STZ_artist', 'premium')).toBe(false);
  });

  it('creator always has access to own content', () => {
    const engine = SubscriptionEngine.load();
    expect(engine.hasAccess('STZ_artist', 'STZ_artist', 'premium')).toBe(true);
  });

  it('free tier is always accessible', () => {
    const engine = SubscriptionEngine.load();
    expect(engine.hasAccess('STZ_random', 'STZ_artist', 'free')).toBe(true);
  });

  it('unsubscribe disables auto-renew', () => {
    const engine = SubscriptionEngine.load();
    engine.subscribe('STZ_fan', 'STZ_artist', 'supporter');
    expect(engine.unsubscribe('STZ_fan', 'STZ_artist')).toBe(true);
    const sub = engine.getSubscription('STZ_fan', 'STZ_artist');
    expect(sub!.autoRenew).toBe(false);
  });

  it('counts subscribers by tier', () => {
    const engine = SubscriptionEngine.load();
    engine.subscribe('STZ_fan1', 'STZ_artist', 'supporter');
    engine.subscribe('STZ_fan2', 'STZ_artist', 'premium');
    engine.subscribe('STZ_fan3', 'STZ_artist', 'supporter');
    const counts = engine.getSubscriberCounts('STZ_artist');
    expect(counts.supporter).toBe(2);
    expect(counts.premium).toBe(1);
  });

  it('lists active subscriptions', () => {
    const engine = SubscriptionEngine.load();
    engine.subscribe('STZ_fan', 'STZ_artist1', 'supporter');
    engine.subscribe('STZ_fan', 'STZ_artist2', 'premium');
    expect(engine.getMySubscriptions('STZ_fan')).toHaveLength(2);
  });

  it('setup custom tiers', () => {
    const engine = SubscriptionEngine.load();
    engine.setupTiers('STZ_artist', [
      { tier: 'free', name: 'Basic', priceStz: 0, perks: ['Public art'] },
      { tier: 'premium', name: 'VIP', priceStz: 500, perks: ['All access'] },
    ]);
    const tiers = engine.getTiers('STZ_artist');
    expect(tiers).toHaveLength(2);
    expect(tiers[1].priceStz).toBe(500);
  });

  it('persists across loads', () => {
    const e1 = SubscriptionEngine.load();
    e1.subscribe('STZ_fan', 'STZ_artist', 'supporter');
    const e2 = SubscriptionEngine.load();
    expect(e2.getMySubscriptions('STZ_fan')).toHaveLength(1);
  });
});
