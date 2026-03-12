import { useState, useEffect, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { SocialEngine } from '../engine/social';
import { CosmoChatEngine } from '../engine/cosmochat';
import type { ChatPost } from '../engine/cosmochat';
import type { Wart } from '../engine/warts';
import * as sync from '../lib/supabase-sync';
import { fetchSocialProfile, fetchProfile, fetchFollowers, fetchFollowing } from '../lib/supabase-db';
import HexAvatar from './HexAvatar';

type Tab = 'posts' | 'created' | 'collection';

export default function UserProfileView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet, warts } = useWallet();
  const [targetAddress, setTargetAddress] = useState('');
  const [tab, setTab] = useState<Tab>('posts');
  const [alias, setAlias] = useState('');
  const [bio, setBio] = useState('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [posts, setPosts] = useState<ChatPost[]>([]);
  const [created, setCreated] = useState<Wart[]>([]);
  const [collection, setCollection] = useState<Wart[]>([]);
  const [mutualFollowers, setMutualFollowers] = useState<string[]>([]);
  // Social links
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [copied, setCopied] = useState(false);
  // Follow dropdown state
  const [showFollowMenu, setShowFollowMenu] = useState(false);
  const [isCloseFriend, setIsCloseFriend] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const addr = sessionStorage.getItem('strangrz_view_user');
    if (!addr) return;
    setTargetAddress(addr);
    refresh(addr);
  }, []);

  // Refresh created/collection when warts from context change (media rehydrated)
  useEffect(() => {
    if (!targetAddress) return;
    setCreated(warts.filter(w => w.creator === targetAddress));
    setCollection(warts.filter(w => w.owner === targetAddress));
  }, [warts, targetAddress]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showFollowMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowFollowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFollowMenu]);

  const refresh = (addr: string) => {
    const social = SocialEngine.load();
    const profile = social.getProfile(addr);

    const applyProfile = (p: { alias?: string; bio?: string; followers?: string[]; following?: string[]; website?: string; instagram?: string; twitter?: string } | null) => {
      let resolvedAlias = shortAddress(addr);
      if (p) {
        const pa = p.alias || '';
        const isTruncated = pa === addr.slice(0, 10) || pa === shortAddress(addr);
        if (pa && !isTruncated) {
          resolvedAlias = pa;
        } else if (wallet && wallet.address === addr && wallet.alias) {
          resolvedAlias = wallet.alias;
          social.ensureProfile(addr, wallet.alias);
        }
        setBio(p.bio || '');
        setFollowersCount(p.followers?.length || 0);
        setFollowingCount(p.following?.length || 0);
        setWebsite(p.website || '');
        setInstagram(p.instagram || '');
        setTwitter(p.twitter || '');
      } else if (wallet && wallet.address === addr && wallet.alias) {
        resolvedAlias = wallet.alias;
        social.ensureProfile(addr, wallet.alias);
      }
      setAlias(resolvedAlias);
    };

    // Apply local profile immediately
    applyProfile(profile);

    // If no local profile or alias is truncated, fetch from Supabase
    const localAlias = profile?.alias || '';
    const isTruncated = !localAlias || localAlias === addr.slice(0, 10) || localAlias === shortAddress(addr);
    if (isTruncated && !(wallet && wallet.address === addr)) {
      // Try social_profiles first, then fall back to profiles table
      Promise.all([
        fetchSocialProfile(addr).catch(() => null),
        fetchProfile(addr).catch(() => null),
      ]).then(([remote, walletProfile]) => {
        const resolvedAlias = (remote?.alias && remote.alias !== addr.slice(0, 10) && remote.alias !== shortAddress(addr))
          ? remote.alias
          : walletProfile?.alias || '';

        if (resolvedAlias) {
          const s = SocialEngine.load();
          s.ensureProfile(addr, resolvedAlias);
          if (remote?.bio) s.updateBio(addr, remote.bio);
          if (remote?.website || remote?.instagram || remote?.twitter) {
            s.updateLinks(addr, { website: remote?.website, instagram: remote?.instagram, twitter: remote?.twitter });
          }
          applyProfile(s.getProfile(addr));
        }
      }).catch(() => { /* non-critical */ });

      // Fetch follower/following counts from Supabase
      Promise.all([
        fetchFollowers(addr).catch(() => []),
        fetchFollowing(addr).catch(() => []),
      ]).then(([followers, following]) => {
        setFollowersCount(followers.length);
        setFollowingCount(following.length);
      });
    }

    if (wallet) {
      setIsFollowing(social.isFollowing(wallet.address, addr));
      setIsBlocked(social.isBlocked(wallet.address, addr));
      setIsCloseFriend(social.isCloseFriend(wallet.address, addr));
      setIsFavorite(social.isFavorite(wallet.address, addr));
      setIsMuted(social.isMuted(wallet.address, addr));
      setIsRestricted(social.isRestricted(wallet.address, addr));
      // Mutual followers
      const myProfile = social.getProfile(wallet.address);
      if (myProfile && profile) {
        const mutuals = myProfile.following.filter(a => profile.followers.includes(a));
        setMutualFollowers(mutuals);
      }
    }

    const chatEngine = CosmoChatEngine.load();
    setPosts(chatEngine.getUserPosts(addr));

    // Use warts from context (already has media loaded from IndexedDB)
    setCreated(warts.filter(w => w.creator === addr));
    setCollection(warts.filter(w => w.owner === addr));
  };

  const handleFollow = () => {
    if (!wallet || !targetAddress) return;
    const social = SocialEngine.load();
    social.ensureProfile(wallet.address, wallet.alias || shortAddress(wallet.address));
    social.ensureProfile(targetAddress, alias);
    social.follow(wallet.address, targetAddress);
    setIsFollowing(true);
    setFollowersCount(prev => prev + 1);
    sync.syncFollow(wallet.address, targetAddress);
    const myProfile = social.getProfile(wallet.address);
    if (myProfile) sync.syncSocialProfile(myProfile);
    const targetProfile = social.getProfile(targetAddress);
    if (targetProfile) sync.syncSocialProfile(targetProfile);
  };

  const handleUnfollow = () => {
    if (!wallet || !targetAddress) return;
    const social = SocialEngine.load();
    social.unfollow(wallet.address, targetAddress);
    setIsFollowing(false);
    setIsCloseFriend(false);
    setIsFavorite(false);
    setFollowersCount(prev => Math.max(0, prev - 1));
    setShowFollowMenu(false);
    sync.syncUnfollow(wallet.address, targetAddress);
    const myProfile = social.getProfile(wallet.address);
    if (myProfile) sync.syncSocialProfile(myProfile);
  };

  const handleBlock = () => {
    if (!wallet || !targetAddress) return;
    const social = SocialEngine.load();
    social.block(wallet.address, targetAddress);
    setIsBlocked(true);
    setIsFollowing(false);
  };

  const handleUnblock = () => {
    if (!wallet || !targetAddress) return;
    const social = SocialEngine.load();
    social.unblock(wallet.address, targetAddress);
    setIsBlocked(false);
  };

  const handleMessage = () => {
    sessionStorage.setItem('strangrz_dm_to', targetAddress);
    onNavigate('message');
  };

  const handleViewUser = (address: string) => {
    sessionStorage.setItem('strangrz_view_user', address);
    setTargetAddress(address);
    setTab('posts');
    refresh(address);
  };

  const handleViewWart = (wart: Wart) => {
    sessionStorage.setItem('strangrz_open_wart', wart.id);
    onNavigate('gallery');
  };

  const toggleCloseFriend = () => {
    if (!wallet) return;
    const social = SocialEngine.load();
    if (isCloseFriend) {
      social.removeFromCloseFriends(wallet.address, targetAddress);
    } else {
      social.addToCloseFriends(wallet.address, targetAddress);
    }
    setIsCloseFriend(!isCloseFriend);
  };

  const toggleFavorite = () => {
    if (!wallet) return;
    const social = SocialEngine.load();
    if (isFavorite) {
      social.removeFromFavorites(wallet.address, targetAddress);
    } else {
      social.addToFavorites(wallet.address, targetAddress);
    }
    setIsFavorite(!isFavorite);
  };

  const toggleMute = () => {
    if (!wallet) return;
    const social = SocialEngine.load();
    if (isMuted) {
      social.unmuteUser(wallet.address, targetAddress);
    } else {
      social.muteUser(wallet.address, targetAddress);
    }
    setIsMuted(!isMuted);
  };

  const toggleRestrict = () => {
    if (!wallet) return;
    const social = SocialEngine.load();
    if (isRestricted) {
      social.unrestrictUser(wallet.address, targetAddress);
    } else {
      social.restrictUser(wallet.address, targetAddress);
    }
    setIsRestricted(!isRestricted);
  };

  if (!targetAddress) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-120px)]">
        <p className="opacity-40 text-base">No user selected</p>
      </div>
    );
  }

  const isMe = wallet?.address === targetAddress;

  const tabList: { id: Tab; label: string; count: number }[] = [
    { id: 'posts', label: 'Posts', count: posts.length },
    { id: 'created', label: 'Created', count: created.length },
    { id: 'collection', label: 'Collection', count: collection.length },
  ];

  // ─── Resolve creator alias ─────────────────────────────
  const getCreatorName = (address: string): string => {
    if (wallet && address === wallet.address) return wallet.alias || shortAddress(address);
    const social = SocialEngine.load();
    const profile = social.getProfile(address);
    return profile?.alias || shortAddress(address);
  };

  // ─── Wart Card with social bar ─────────────────────────
  const WartCard = ({ wart }: { wart: Wart }) => (
    <div className="glass-panel overflow-hidden cursor-pointer" onClick={() => handleViewWart(wart)}>
      <div className="aspect-square overflow-hidden bg-current/5">
        {wart.mediaType === 'video' && wart.imageData ? (
          <video src={wart.imageData} className="w-full h-full object-cover" muted playsInline />
        ) : wart.mediaType === 'audio' && wart.audioCover ? (
          <img src={wart.audioCover} alt={wart.title} className="w-full h-full object-cover" />
        ) : wart.imageData ? (
          <img src={wart.imageData} alt={wart.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl opacity-30">
              {wart.mediaType === 'video' ? '\u25B6' : wart.mediaType === 'audio' ? '\u266B' : '\u25C8'}
            </span>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-body-sm font-medium opacity-90 truncate">{wart.title}</p>
        <div
          className="flex items-center gap-1 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => { e.stopPropagation(); handleViewUser(wart.creator); }}
        >
          <HexAvatar address={wart.creator} size={16} />
          <p className="text-[10px] opacity-40 truncate">
            {getCreatorName(wart.creator)}
          </p>
        </div>
        <p className="text-label opacity-40">{wart.price !== null ? `${wart.price} \u2B23` : 'Not listed'}</p>
        {/* Social bar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
          <button className="flex items-center gap-1 opacity-40 hover:opacity-80 cursor-pointer" onClick={e => e.stopPropagation()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            {wart.history.length > 0 && <span className="text-[10px]">Tip {wart.history.length}{'\u2B23'}</span>}
          </button>
          <button className="opacity-40 hover:opacity-80 cursor-pointer" onClick={e => e.stopPropagation()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </button>
          <button className="opacity-40 hover:opacity-80 cursor-pointer" onClick={e => e.stopPropagation()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </button>
          <button className="opacity-40 hover:opacity-80 cursor-pointer" onClick={e => e.stopPropagation()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-0 pb-4">
      {/* Back button */}
      <div className="px-3 py-2">
        <button
          onClick={() => onNavigate('wall')}
          className="flex items-center gap-1.5 text-body-sm opacity-50 hover:opacity-90 cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Profile header - centered */}
      <div className="glass-panel p-5 sm:p-6">
        <div className="flex flex-col items-center text-center">
          <HexAvatar address={targetAddress} size={80} animate className="mb-3" />
          <h2 className="text-title-md font-bold opacity-100 font-title">{alias}</h2>
          <p
            className="text-[11px] opacity-40 font-mono mt-0.5 cursor-pointer hover:opacity-60 transition-opacity"
            onClick={() => {
              navigator.clipboard.writeText(targetAddress);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            title="Copier l'adresse"
          >
            {targetAddress}
            <span className="ml-1 inline-block align-middle">
              {copied ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              )}
            </span>
          </p>

          {/* Social links */}
          {(website || instagram || twitter) && (
            <div className="mt-2 flex flex-wrap gap-3 justify-center">
              {website && (
                <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-[11px] opacity-80 hover:opacity-90 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  {website.replace(/^https?:\/\//, '').slice(0, 30)}
                </a>
              )}
              {instagram && (
                <a href={`https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[11px] opacity-80 hover:opacity-80 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/></svg>
                  @{instagram.replace('@', '')}
                </a>
              )}
              {twitter && (
                <a href={`https://x.com/${twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[11px] opacity-80 hover:opacity-80 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  @{twitter.replace('@', '')}
                </a>
              )}
            </div>
          )}

          {/* Bio */}
          {bio && <p className="text-body-sm opacity-50 mt-3 max-w-sm">{bio}</p>}

          {/* Action buttons */}
          {!isMe && wallet && (
            <div className="flex gap-2 mt-4 items-center">
              {isBlocked ? (
                <button onClick={handleUnblock} className="text-body-sm px-4 py-2 border border-current/15 opacity-70 cursor-pointer hover:bg-current/5 transition-colors">
                  Unblock
                </button>
              ) : isFollowing ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowFollowMenu(!showFollowMenu)}
                    className="text-body-sm px-4 py-2 border border-current/10 opacity-80 cursor-pointer hover:bg-current/5 transition-colors flex items-center gap-1"
                  >
                    Following
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {/* Instagram-style dropdown */}
                  {showFollowMenu && (
                    <div className="absolute top-full left-0 mt-1 w-52 glass-panel border border-current/15 z-50 follow-dropdown">
                      <button
                        onClick={toggleCloseFriend}
                        className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span className="opacity-70">Close friends</span>
                        {isCloseFriend && <span className="opacity-80">{'\u2713'}</span>}
                      </button>
                      <button
                        onClick={toggleFavorite}
                        className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span className="opacity-70">Favorites</span>
                        {isFavorite && <span className="opacity-80">{'\u2605'}</span>}
                      </button>
                      <div className="border-t border-current/10" />
                      <button
                        onClick={toggleMute}
                        className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span className="opacity-70">Mute</span>
                        {isMuted && <span className="opacity-40">{'\u2713'}</span>}
                      </button>
                      <button
                        onClick={toggleRestrict}
                        className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <span className="opacity-70">Restrict</span>
                        {isRestricted && <span className="opacity-40">{'\u2713'}</span>}
                      </button>
                      <div className="border-t border-current/10" />
                      <button
                        onClick={handleUnfollow}
                        className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors opacity-70"
                      >
                        Unfollow
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={handleFollow} className="warp-button text-body-sm px-5 py-2">
                  Follow
                </button>
              )}
              <button onClick={handleMessage} className="text-body-sm px-4 py-2 border border-current/15 opacity-70 cursor-pointer hover:bg-current/5 transition-colors">
                Message
              </button>
              {!isBlocked && (
                <button onClick={handleBlock} className="text-body-sm px-2 py-2 opacity-30 cursor-pointer hover:opacity-70 transition-colors" title="Block">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-6 mt-4 text-body-sm">
            <div className="text-center">
              <span className="block font-bold opacity-90 text-base">{followersCount}</span>
              <span className="opacity-40">Followers</span>
            </div>
            <div className="text-center">
              <span className="block font-bold opacity-90 text-base">{followingCount}</span>
              <span className="opacity-40">Following</span>
            </div>
            <div className="text-center">
              <span className="block font-bold opacity-90 text-base">{posts.length}</span>
              <span className="opacity-40">Posts</span>
            </div>
          </div>

          {/* Mutual followers */}
          {mutualFollowers.length > 0 && (
            <p className="text-label opacity-40 mt-2">
              Followed by {mutualFollowers.length} {mutualFollowers.length === 1 ? 'person' : 'people'} you follow
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-current/10 overflow-x-auto">
        {tabList.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2.5 text-body-sm font-medium transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              tab === t.id
                ? 'border-current/20 opacity-80'
                : 'border-transparent opacity-40 hover:opacity-70'
            }`}
          >
            {t.label} <span className="text-label opacity-30 ml-1">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="pt-2">
        {tab === 'posts' && (
          posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-40 text-base">No posts yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => (
                <div key={post.id} className="glass-panel p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <HexAvatar address={post.author} size={24} onClick={() => handleViewUser(post.author)} />
                    <span className="text-body-sm font-medium opacity-90 cursor-pointer hover:opacity-80" onClick={() => handleViewUser(post.author)}>@{post.authorAlias}</span>
                  </div>
                  <p className="text-base opacity-70 whitespace-pre-wrap">{post.content}</p>
                  {post.mediaData && post.mediaType === 'image' && (
                    <img src={post.mediaData} alt="" className="mt-2 w-full max-h-80 object-contain" />
                  )}
                  {post.mediaData && post.mediaType === 'video' && (
                    <video controls src={post.mediaData} className="mt-2 w-full max-h-80 object-contain bg-black" />
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
                    <span className="opacity-40 text-body-sm">{post.tipCount > 0 ? `Tip ${post.tipCount}\u2B23` : '0 tips'}</span>
                    <span className="opacity-40 text-body-sm">{post.rewarpCount} rewarps</span>
                    <span className="opacity-40 text-body-sm">{post.comments.length} comments</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'created' && (
          created.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-40 text-base">No artwork created</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {created.map(wart => (
                <WartCard key={wart.id} wart={wart} />
              ))}
            </div>
          )
        )}

        {tab === 'collection' && (
          collection.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-40 text-base">Empty collection</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {collection.map(wart => (
                <WartCard key={wart.id} wart={wart} />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
