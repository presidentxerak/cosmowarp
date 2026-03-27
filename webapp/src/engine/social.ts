import { storage } from './storage';

// ─── Types ─────────────────────────────────────────────

export interface UserProfile {
  address: string;
  alias: string;
  bio: string;
  profileImage: string;   // base64 custom avatar
  bannerImage: string;     // base64 custom banner
  joinedAt: number;
  following: string[];     // addresses this user follows
  followers: string[];     // addresses following this user
  blockedBy: string[];     // users who blocked this user
  blocked: string[];       // users this user blocked
  // Social links
  website: string;
  instagram: string;
  twitter: string;
  // Relationship lists
  closeFriends: string[];
  favorites: string[];
  muted: string[];
  restricted: string[];
}

export interface SocialStats {
  postsCount: number;
  wartsCreated: number;
  wartsCollected: number;
  tipsGiven: number;
  tipsReceived: number;
}

// ─── Storage ───────────────────────────────────────────

const STORAGE_KEY = 'strangrz_social';

function loadProfiles(): UserProfile[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const profiles = JSON.parse(raw) as UserProfile[];
    // Migrate old profiles that lack new fields
    return profiles.map(p => ({
      ...p,
      profileImage: p.profileImage || '',
      bannerImage: p.bannerImage || '',
      website: p.website || '',
      instagram: p.instagram || '',
      twitter: p.twitter || '',
      closeFriends: p.closeFriends || [],
      favorites: p.favorites || [],
      muted: p.muted || [],
      restricted: p.restricted || [],
    }));
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

  /** Check if an alias is already taken by another address */
  isAliasTaken(alias: string, excludeAddress?: string): boolean {
    const normalized = alias.trim().toLowerCase();
    if (!normalized) return false;
    return this.profiles.some(
      p => p.alias.toLowerCase() === normalized && p.address !== excludeAddress
    );
  }

  ensureProfile(address: string, alias: string): UserProfile {
    let profile = this.profiles.find(p => p.address === address);
    // If alias is taken by another address, fall back to truncated address
    const safeAlias = (alias && this.isAliasTaken(alias, address))
      ? address.slice(0, 10)
      : alias;
    if (!profile) {
      profile = {
        address,
        alias: safeAlias || address.slice(0, 10),
        bio: '',
        profileImage: '',
        bannerImage: '',
        joinedAt: Date.now(),
        following: [],
        followers: [],
        blockedBy: [],
        blocked: [],
        website: '',
        instagram: '',
        twitter: '',
        closeFriends: [],
        favorites: [],
        muted: [],
        restricted: [],
      };
      this.profiles.push(profile);
      this.save();
    } else if (safeAlias && safeAlias !== profile.alias) {
      profile.alias = safeAlias;
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
    const trimmed = alias.slice(0, 30);
    if (this.isAliasTaken(trimmed, address)) return false;
    profile.alias = trimmed;
    this.save();
    return true;
  }

  updateProfileImage(address: string, imageData: string): boolean {
    const profile = this.profiles.find(p => p.address === address);
    if (!profile) return false;
    profile.profileImage = imageData;
    this.save();
    return true;
  }

  updateBannerImage(address: string, imageData: string): boolean {
    const profile = this.profiles.find(p => p.address === address);
    if (!profile) return false;
    profile.bannerImage = imageData;
    this.save();
    return true;
  }

  updateLinks(address: string, links: { website?: string; instagram?: string; twitter?: string }): boolean {
    const profile = this.profiles.find(p => p.address === address);
    if (!profile) return false;
    if (links.website !== undefined) profile.website = links.website.slice(0, 200);
    if (links.instagram !== undefined) profile.instagram = links.instagram.slice(0, 100);
    if (links.twitter !== undefined) profile.twitter = links.twitter.slice(0, 100);
    this.save();
    return true;
  }

  // ─── Relationship lists ──────────────────────────────

  addToCloseFriends(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    if (!me || me.closeFriends.includes(targetAddress)) return false;
    me.closeFriends.push(targetAddress);
    this.save();
    return true;
  }

  removeFromCloseFriends(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    if (!me) return false;
    const idx = me.closeFriends.indexOf(targetAddress);
    if (idx >= 0) me.closeFriends.splice(idx, 1);
    this.save();
    return true;
  }

  addToFavorites(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    if (!me || me.favorites.includes(targetAddress)) return false;
    me.favorites.push(targetAddress);
    this.save();
    return true;
  }

  removeFromFavorites(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    if (!me) return false;
    const idx = me.favorites.indexOf(targetAddress);
    if (idx >= 0) me.favorites.splice(idx, 1);
    this.save();
    return true;
  }

  muteUser(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    if (!me || me.muted.includes(targetAddress)) return false;
    me.muted.push(targetAddress);
    this.save();
    return true;
  }

  unmuteUser(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    if (!me) return false;
    const idx = me.muted.indexOf(targetAddress);
    if (idx >= 0) me.muted.splice(idx, 1);
    this.save();
    return true;
  }

  restrictUser(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    if (!me || me.restricted.includes(targetAddress)) return false;
    me.restricted.push(targetAddress);
    this.save();
    return true;
  }

  unrestrictUser(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    if (!me) return false;
    const idx = me.restricted.indexOf(targetAddress);
    if (idx >= 0) me.restricted.splice(idx, 1);
    this.save();
    return true;
  }

  isCloseFriend(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    return me ? me.closeFriends.includes(targetAddress) : false;
  }

  isFavorite(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    return me ? me.favorites.includes(targetAddress) : false;
  }

  isMuted(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    return me ? me.muted.includes(targetAddress) : false;
  }

  isRestricted(myAddress: string, targetAddress: string): boolean {
    const me = this.profiles.find(p => p.address === myAddress);
    return me ? me.restricted.includes(targetAddress) : false;
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

    // Also remove from relationship lists
    const cfIdx = me.closeFriends.indexOf(targetAddress);
    if (cfIdx >= 0) me.closeFriends.splice(cfIdx, 1);
    const fIdx = me.favorites.indexOf(targetAddress);
    if (fIdx >= 0) me.favorites.splice(fIdx, 1);

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
