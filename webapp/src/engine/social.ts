import { storage } from './storage';

// ─── Types ─────────────────────────────────────────────

export interface UserProfile {
  address: string;
  alias: string;
  bio: string;
  joinedAt: number;
  following: string[];   // addresses this user follows
  followers: string[];   // addresses following this user
  blockedBy: string[];   // users who blocked this user
  blocked: string[];     // users this user blocked
}

export interface SocialStats {
  postsCount: number;
  wartsCreated: number;
  wartsCollected: number;
  tipsGiven: number;
  tipsReceived: number;
}

// ─── Storage ───────────────────────────────────────────

const STORAGE_KEY = 'cosmowarp_social';

function loadProfiles(): UserProfile[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveProfiles(profiles: UserProfile[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

// ─── Social Engine ─────────────────────────────────────

export class SocialEngine {
  private profiles: UserProfile[];

  private constructor(profiles: UserProfile[]) {
    this.profiles = profiles;
  }

  static load(): SocialEngine {
    return new SocialEngine(loadProfiles());
  }

  private save(): void {
    saveProfiles(this.profiles);
  }

  // ─── Profile CRUD ──────────────────────────────────

  getProfile(address: string): UserProfile | null {
    return this.profiles.find(p => p.address === address) || null;
  }

  ensureProfile(address: string, alias: string): UserProfile {
    let profile = this.profiles.find(p => p.address === address);
    if (!profile) {
      profile = {
        address,
        alias: alias || address.slice(0, 10),
        bio: '',
        joinedAt: Date.now(),
        following: [],
        followers: [],
        blockedBy: [],
        blocked: [],
      };
      this.profiles.push(profile);
      this.save();
    } else if (alias && alias !== profile.alias) {
      profile.alias = alias;
      this.save();
    }
    return profile;
  }

  updateBio(address: string, bio: string): boolean {
    const profile = this.profiles.find(p => p.address === address);
    if (!profile) return false;
    profile.bio = bio.slice(0, 280);
    this.save();
    return true;
  }

  updateAlias(address: string, alias: string): boolean {
    const profile = this.profiles.find(p => p.address === address);
    if (!profile) return false;
    profile.alias = alias.slice(0, 30);
    this.save();
    return true;
  }

  // ─── Follow / Unfollow ─────────────────────────────

  follow(myAddress: string, targetAddress: string): boolean {
    if (myAddress === targetAddress) return false;
    const me = this.profiles.find(p => p.address === myAddress);
    const target = this.profiles.find(p => p.address === targetAddress);
    if (!me || !target) return false;
    if (me.following.includes(targetAddress)) return false;
    if (me.blocked.includes(targetAddress)) return false;

    me.following.push(targetAddress);
    target.followers.push(myAddress);
    this.save();
    return true;
  }

  unfollow(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    const target = this.profiles.find(p => p.address === targetAddress);
    if (!me || !target) return false;

    const idx1 = me.following.indexOf(targetAddress);
    if (idx1 >= 0) me.following.splice(idx1, 1);

    const idx2 = target.followers.indexOf(myAddress);
    if (idx2 >= 0) target.followers.splice(idx2, 1);

    this.save();
    return true;
  }

  isFollowing(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    return me ? me.following.includes(targetAddress) : false;
  }

  getFollowers(address: string): UserProfile[] {
    const profile = this.profiles.find(p => p.address === address);
    if (!profile) return [];
    return profile.followers
      .map(a => this.profiles.find(p => p.address === a))
      .filter((p): p is UserProfile => !!p);
  }

  getFollowing(address: string): UserProfile[] {
    const profile = this.profiles.find(p => p.address === address);
    if (!profile) return [];
    return profile.following
      .map(a => this.profiles.find(p => p.address === a))
      .filter((p): p is UserProfile => !!p);
  }

  // ─── Block ─────────────────────────────────────────

  block(myAddress: string, targetAddress: string): boolean {
    if (myAddress === targetAddress) return false;
    const me = this.profiles.find(p => p.address === myAddress);
    const target = this.profiles.find(p => p.address === targetAddress);
    if (!me || !target) return false;
    if (me.blocked.includes(targetAddress)) return false;

    me.blocked.push(targetAddress);
    target.blockedBy.push(myAddress);

    // Auto-unfollow both ways
    this.unfollow(myAddress, targetAddress);
    this.unfollow(targetAddress, myAddress);

    this.save();
    return true;
  }

  unblock(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    const target = this.profiles.find(p => p.address === targetAddress);
    if (!me || !target) return false;

    const idx1 = me.blocked.indexOf(targetAddress);
    if (idx1 >= 0) me.blocked.splice(idx1, 1);

    const idx2 = target.blockedBy.indexOf(myAddress);
    if (idx2 >= 0) target.blockedBy.splice(idx2, 1);

    this.save();
    return true;
  }

  isBlocked(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    return me ? me.blocked.includes(targetAddress) : false;
  }

  // ─── Discovery ─────────────────────────────────────

  getAllProfiles(): UserProfile[] {
    return [...this.profiles];
  }

  searchProfiles(query: string): UserProfile[] {
    const q = query.toLowerCase();
    return this.profiles.filter(
      p => p.alias.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
    );
  }

  /** Suggest users to follow: popular users not yet followed */
  getSuggestions(myAddress: string, limit = 10): UserProfile[] {
    const me = this.profiles.find(p => p.address === myAddress);
    if (!me) return this.profiles.slice(0, limit);
    return this.profiles
      .filter(p =>
        p.address !== myAddress &&
        !me.following.includes(p.address) &&
        !me.blocked.includes(p.address)
      )
      .sort((a, b) => b.followers.length - a.followers.length)
      .slice(0, limit);
  }

  /** Get the feed: posts from users I follow */
  getFollowingAddresses(myAddress: string): string[] {
    const me = this.profiles.find(p => p.address === myAddress);
    return me ? [...me.following] : [];
  }

  /** Mutual follows (friends) */
  getMutuals(address: string): UserProfile[] {
    const profile = this.profiles.find(p => p.address === address);
    if (!profile) return [];
    return profile.following
      .filter(a => profile.followers.includes(a))
      .map(a => this.profiles.find(p => p.address === a))
      .filter((p): p is UserProfile => !!p);
  }
}
