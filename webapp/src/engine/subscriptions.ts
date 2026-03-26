/**
 * Strangrz Subscriptions — Creator tiers with gated content
 *
 * Tiers: free, supporter, premium
 * Subscribers pay monthly STZ, get access to gated warts.
 */

import { storage } from './storage';

// ─── Types ────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'supporter' | 'premium';

export interface CreatorTier {
  tier: SubscriptionTier;
  name: string;
  priceStz: number;        // monthly STZ cost (0 for free)
  perks: string[];
}

export interface CreatorSubscriptionConfig {
  creatorAddress: string;
  tiers: CreatorTier[];
  createdAt: number;
}

export interface Subscription {
  id: string;
  subscriberAddress: string;
  creatorAddress: string;
  tier: SubscriptionTier;
  startedAt: number;
  expiresAt: number;       // when the current period ends
  autoRenew: boolean;
  totalPaid: number;
}

// ─── Constants ────────────────────────────────────────────

const CONFIG_KEY = 'strangrz_sub_configs';
const SUBS_KEY = 'strangrz_subscriptions';
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const DEFAULT_TIERS: CreatorTier[] = [
  { tier: 'free', name: 'Free', priceStz: 0, perks: ['Access to public artworks'] },
  { tier: 'supporter', name: 'Supporter', priceStz: 50, perks: ['Early access to new drops', 'Supporter badge'] },
  { tier: 'premium', name: 'Premium', priceStz: 200, perks: ['Exclusive gated artworks', 'Direct messaging', 'Premium badge', 'Behind-the-scenes content'] },
];

// ─── Storage ──────────────────────────────────────────────

function loadConfigs(): Map<string, CreatorSubscriptionConfig> {
  try {
    const raw = storage.getItem(CONFIG_KEY);
    const arr: CreatorSubscriptionConfig[] = raw ? JSON.parse(raw) : [];
    return new Map(arr.map(c => [c.creatorAddress, c]));
  } catch { return new Map(); }
}

function saveConfigs(configs: Map<string, CreatorSubscriptionConfig>): void {
  storage.setItem(CONFIG_KEY, JSON.stringify([...configs.values()]));
}

function loadSubs(): Subscription[] {
  try {
    const raw = storage.getItem(SUBS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSubs(subs: Subscription[]): void {
  storage.setItem(SUBS_KEY, JSON.stringify(subs));
}

// ─── Subscription Engine ──────────────────────────────────

export class SubscriptionEngine {
  private configs: Map<string, CreatorSubscriptionConfig>;
  private subs: Subscription[];

  constructor() {
    this.configs = loadConfigs();
    this.subs = loadSubs();
  }

  static load(): SubscriptionEngine { return new SubscriptionEngine(); }

  private save(): void {
    saveConfigs(this.configs);
    saveSubs(this.subs);
  }

  /** Creator: set up subscription tiers */
  setupTiers(creatorAddress: string, tiers?: CreatorTier[]): CreatorSubscriptionConfig {
    const config: CreatorSubscriptionConfig = {
      creatorAddress,
      tiers: tiers || DEFAULT_TIERS,
      createdAt: Date.now(),
    };
    this.configs.set(creatorAddress, config);
    this.save();
    return config;
  }

  /** Get tiers for a creator */
  getTiers(creatorAddress: string): CreatorTier[] {
    return this.configs.get(creatorAddress)?.tiers || DEFAULT_TIERS;
  }

  /** Subscribe to a creator */
  subscribe(subscriberAddress: string, creatorAddress: string, tier: SubscriptionTier): Subscription {
    // Check if already subscribed
    const existing = this.getSubscription(subscriberAddress, creatorAddress);
    if (existing && existing.expiresAt > Date.now()) {
      // Upgrade tier if higher
      existing.tier = tier;
      this.save();
      return existing;
    }

    const now = Date.now();
    const sub: Subscription = {
      id: `SUB_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      subscriberAddress,
      creatorAddress,
      tier,
      startedAt: now,
      expiresAt: now + PERIOD_MS,
      autoRenew: true,
      totalPaid: 0,
    };
    this.subs.push(sub);
    this.save();
    return sub;
  }

  /** Unsubscribe (disable auto-renew) */
  unsubscribe(subscriberAddress: string, creatorAddress: string): boolean {
    const sub = this.getSubscription(subscriberAddress, creatorAddress);
    if (!sub) return false;
    sub.autoRenew = false;
    this.save();
    return true;
  }

  /** Get active subscription between subscriber and creator */
  getSubscription(subscriberAddress: string, creatorAddress: string): Subscription | null {
    return this.subs.find(s =>
      s.subscriberAddress === subscriberAddress &&
      s.creatorAddress === creatorAddress
    ) || null;
  }

  /** Check if user has access to a tier */
  hasAccess(subscriberAddress: string, creatorAddress: string, requiredTier: SubscriptionTier): boolean {
    if (subscriberAddress === creatorAddress) return true; // creators always have access
    if (requiredTier === 'free') return true;

    const sub = this.getSubscription(subscriberAddress, creatorAddress);
    if (!sub || sub.expiresAt < Date.now()) return false;

    const tierOrder: SubscriptionTier[] = ['free', 'supporter', 'premium'];
    return tierOrder.indexOf(sub.tier) >= tierOrder.indexOf(requiredTier);
  }

  /** Get all active subscribers for a creator */
  getSubscribers(creatorAddress: string): Subscription[] {
    const now = Date.now();
    return this.subs.filter(s => s.creatorAddress === creatorAddress && s.expiresAt > now);
  }

  /** Get all active subscriptions for a user */
  getMySubscriptions(subscriberAddress: string): Subscription[] {
    return this.subs.filter(s => s.subscriberAddress === subscriberAddress && s.expiresAt > Date.now());
  }

  /** Get subscriber count by tier for a creator */
  getSubscriberCounts(creatorAddress: string): Record<SubscriptionTier, number> {
    const subs = this.getSubscribers(creatorAddress);
    const counts: Record<SubscriptionTier, number> = { free: 0, supporter: 0, premium: 0 };
    for (const s of subs) counts[s.tier]++;
    return counts;
  }
}
