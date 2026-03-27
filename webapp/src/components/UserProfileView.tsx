import { useState, useEffect, useRef, useMemo } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { SocialEngine } from '../engine/social';
import { CosmoChatEngine } from '../engine/cosmochat';
import type { ChatPost } from '../engine/cosmochat';
import type { Wart } from '../engine/warts';
import * as sync from '../lib/supabase-sync';
import { fetchSocialProfile, fetchProfile, fetchFollowers, fetchFollowing, fetchAllPosts } from '../lib/supabase-db';
import { getMediaUrl } from '../lib/supabase-storage';
import HexAvatar from './HexAvatar';
import { copyToClipboard } from '../lib/clipboard';

/** Convert base64 data URL to blob URL for reliable video/audio playback on Safari */
function dataUrlToBlobUrl(dataUrl: string): string {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
  try {
    const [header, b64] = dataUrl.split(',');
    const mime = header.match(/data:(.*?);/)?.[1] || 'video/mp4';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return dataUrl;
  }
}

/** Pick a random hero video number (1-3) and keep it stable per session */
function getHeroVideoNum(): number {
  const stored = sessionStorage.getItem('strangrz_hero_video');
  if (stored) return Number(stored);
  const num = Math.floor(Math.random() * 3) + 1;
  sessionStorage.setItem('strangrz_hero_video', String(num));
  return num;
}

type Tab = 'posts' | 'created' | 'collection' | 'curations' | 'media' | 'playlists';

// ─── Playlist types (read-only for viewing other users) ─
interface Playlist {
  id: string;
  title: string;
  description: string;
  type: 'music' | 'video';
  wartIds: string[];
  createdAt: number;
  coverWartId?: string;
}

function loadUserPlaylists(address: string): Playlist[] {
  try {
    const raw = localStorage.getItem('strangrz_playlists');
    if (!raw) return [];
    const all = JSON.parse(raw) as (Playlist & { owner: string })[];
    return all.filter(p => p.owner === address);
  } catch { return []; }
}

export default function UserProfileView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet, warts } = useWallet();
  const [targetAddress, setTargetAddress] = useState('');
  const [tab, setTab] = useState<Tab>('created');
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
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [copied, setCopied] = useState(false);
  const [bannerImage, setBannerImage] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [showFollowMenu, setShowFollowMenu] = useState(false);
  const [isCloseFriend, setIsCloseFriend] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const heroVideoNum = useRef(getHeroVideoNum()).current;

  useEffect(() => {
    if (!targetAddress) return;
    setCreated(warts.filter(w => w.creator === targetAddress));
    setCollection(warts.filter(w => w.owner === targetAddress));
  }, [warts, targetAddress]);

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

    // Load banner/profile images
    setBannerImage(profile?.bannerImage || '');
    setProfileImage(profile?.profileImage || '');

    const isAliasLikeAddress = (a: string) =>
      !a || a === addr.slice(0, 10) || a === shortAddress(addr) || /^[0-9a-f]{10,}$/i.test(a);

    const applyProfile = (p: { alias?: string; bio?: string; followers?: string[]; following?: string[]; website?: string; instagram?: string; twitter?: string; bannerImage?: string; profileImage?: string } | null) => {
      // Start with best known alias: wallet.alias for own profile, else local profile alias
      let resolvedAlias = (wallet && wallet.address === addr && wallet.alias)
        ? wallet.alias
        : shortAddress(addr);

      if (p) {
        const pa = p.alias || '';
        if (pa && !isAliasLikeAddress(pa)) {
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
        if (p.bannerImage) setBannerImage(p.bannerImage);
        if (p.profileImage) setProfileImage(p.profileImage);
      } else if (wallet && wallet.address === addr && wallet.alias) {
        resolvedAlias = wallet.alias;
        social.ensureProfile(addr, wallet.alias);
      }
      setAlias(resolvedAlias);
    };

    applyProfile(profile);

    // Always try to fetch from Supabase when alias looks like a truncated address
    const currentAlias = profile?.alias || (wallet && wallet.address === addr ? wallet.alias : '') || '';
    const needsRemoteFetch = isAliasLikeAddress(currentAlias);
    if (needsRemoteFetch) {
      Promise.all([
        fetchSocialProfile(addr).catch(() => null),
        fetchProfile(addr).catch(() => null),
      ]).then(([remote, walletProfile]) => {
        const remoteAlias = (remote?.alias && !isAliasLikeAddress(remote.alias))
          ? remote.alias
          : (walletProfile?.alias && !isAliasLikeAddress(walletProfile.alias))
            ? walletProfile.alias
            : '';

        if (remoteAlias) {
          const s = SocialEngine.load();
          s.ensureProfile(addr, remoteAlias);
          if (remote?.bio) s.updateBio(addr, remote.bio);
          if (remote?.website || remote?.instagram || remote?.twitter) {
            s.updateLinks(addr, { website: remote?.website, instagram: remote?.instagram, twitter: remote?.twitter });
          }
          applyProfile(s.getProfile(addr));
        }
      }).catch(() => {});
    }

    // Always fetch follower/following counts from cloud for accuracy
    Promise.all([
      fetchFollowers(addr).catch(() => []),
      fetchFollowing(addr).catch(() => []),
    ]).then(([followers, following]) => {
      if (followers.length > 0 || following.length > 0) {
        setFollowersCount(prev => Math.max(prev, followers.length));
        setFollowingCount(prev => Math.max(prev, following.length));
      }
    });

    if (wallet) {
      setIsFollowing(social.isFollowing(wallet.address, addr));
      setIsBlocked(social.isBlocked(wallet.address, addr));
      setIsCloseFriend(social.isCloseFriend(wallet.address, addr));
      setIsFavorite(social.isFavorite(wallet.address, addr));
      setIsMuted(social.isMuted(wallet.address, addr));
      setIsRestricted(social.isRestricted(wallet.address, addr));
      const myProfile = social.getProfile(wallet.address);
      if (myProfile && profile) {
        const mutuals = myProfile.following.filter(a => profile.followers.includes(a));
        setMutualFollowers(mutuals);
      }
    }

    const chatEngine = CosmoChatEngine.load();
    const localPosts = chatEngine.getUserPosts(addr);
    setPosts(localPosts);

    setCreated(warts.filter(w => w.creator === addr));
    setCollection(warts.filter(w => w.owner === addr));
    setUserPlaylists(loadUserPlaylists(addr));

    Promise.all([
      sync.pullWarts({ creator: addr }).catch(() => []),
      sync.pullWarts({ owner: addr }).catch(() => []),
    ]).then(([cloudCreated, cloudOwned]) => {
      const localIds = new Set(warts.map(w => w.id));
      const toWart = (row: Record<string, unknown>): Wart => ({
        id: row.id as string,
        title: (row.title as string) || '',
        description: (row.description as string) || '',
        imageData: row.media_path ? getMediaUrl(row.media_path as string) : '',
        mediaType: (row.media_type as Wart['mediaType']) || 'image',
        creator: (row.creator as string) || '',
        owner: (row.owner as string) || '',
        price: row.price != null ? Number(row.price) : null,
        listed: (row.listed as boolean) || false,
        createdAt: Number(row.created_at) || Date.now(),
        history: [],
        royaltyPercent: Number(row.royalty_percent) || 5,
        comments: [],
        editionType: (row.edition_type as Wart['editionType']) || 'unique',
        maxEditions: row.max_editions != null ? Number(row.max_editions) : null,
        editionNumber: Number(row.edition_number) || 1,
        availableUntil: row.available_until != null ? Number(row.available_until) : null,
        certId: (row.cert_id as string) || undefined,
        contentFingerprint: (row.content_fingerprint as string) || undefined,
        creatorSignature: (row.creator_signature as string) || undefined,
        storageMode: (row.storage_mode as Wart['storageMode']) || 'hybrid',
        vaultBackup: false,
      });

      const remoteCreated = cloudCreated.filter(r => !localIds.has(r.id as string)).map(toWart);
      const remoteOwned = cloudOwned.filter(r => !localIds.has(r.id as string)).map(toWart);

      const localCreated = warts.filter(w => w.creator === addr);
      const localCollection = warts.filter(w => w.owner === addr);

      if (remoteCreated.length > 0) setCreated([...localCreated, ...remoteCreated]);
      if (remoteOwned.length > 0) setCollection([...localCollection, ...remoteOwned]);
    }).catch(() => {});

    fetchAllPosts().then(cloudPosts => {
      const userCloudPosts = cloudPosts.filter(p => p.author === addr);
      const localPostIds = new Set(localPosts.map(p => p.id));
      const newPosts: ChatPost[] = userCloudPosts
        .filter(cp => !localPostIds.has(cp.id))
        .map(cp => ({
          ...cp,
          mediaType: cp.mediaType as ChatPost['mediaType'],
          tips: {},
          rewarps: [],
          comments: [],
          bookmarkedBy: [],
          isRewarp: false,
        }));
      if (newPosts.length > 0) {
        setPosts(prev => [...prev, ...newPosts].sort((a, b) => b.timestamp - a.timestamp));
      }
    }).catch(() => {});
  };

  useEffect(() => {
    const addr = sessionStorage.getItem('strangrz_view_user');
    if (!addr) return;
    setTargetAddress(addr);
    refresh(addr);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setTab('created');
    refresh(address);
  };

  const handleViewWart = (wart: Wart) => {
    sessionStorage.setItem('strangrz_open_wart', wart.id);
    onNavigate('gallery');
  };

  const toggleCloseFriend = () => {
    if (!wallet) return;
    const social = SocialEngine.load();
    if (isCloseFriend) social.removeFromCloseFriends(wallet.address, targetAddress);
    else social.addToCloseFriends(wallet.address, targetAddress);
    setIsCloseFriend(!isCloseFriend);
  };

  const toggleFavorite = () => {
    if (!wallet) return;
    const social = SocialEngine.load();
    if (isFavorite) social.removeFromFavorites(wallet.address, targetAddress);
    else social.addToFavorites(wallet.address, targetAddress);
    setIsFavorite(!isFavorite);
  };

  const toggleMute = () => {
    if (!wallet) return;
    const social = SocialEngine.load();
    if (isMuted) social.unmuteUser(wallet.address, targetAddress);
    else social.muteUser(wallet.address, targetAddress);
    setIsMuted(!isMuted);
  };

  const toggleRestrict = () => {
    if (!wallet) return;
    const social = SocialEngine.load();
    if (isRestricted) social.unrestrictUser(wallet.address, targetAddress);
    else social.restrictUser(wallet.address, targetAddress);
    setIsRestricted(!isRestricted);
  };

  if (!targetAddress) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-120px)]">
        <p className="opacity-60 text-base">No user selected</p>
      </div>
    );
  }

  const isMe = wallet?.address === targetAddress;

  // Load curator articles for this user
  const curatorArticles = (() => {
    try {
      const raw = localStorage.getItem('strangrz_curator_articles');
      if (!raw) return [];
      const articles = JSON.parse(raw) as { id: string; authorAddress: string; title: string; subtitle: string; coverWartId: string; createdAt: number; likes: string[]; views: number }[];
      return articles.filter(a => a.authorAddress === targetAddress);
    } catch { return []; }
  })();

  const mediaWarts = [...created, ...collection].filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i);
  const tabList: { id: Tab; label: string; count: number }[] = [
    { id: 'created', label: 'Created', count: created.length },
    { id: 'collection', label: 'Collection', count: collection.length },
    { id: 'curations', label: 'Curations', count: curatorArticles.length },
    { id: 'posts', label: 'Posts', count: posts.length },
    { id: 'playlists', label: 'Playlists', count: userPlaylists.length },
    { id: 'media', label: 'Media', count: mediaWarts.length },
  ];

  const getCreatorName = (address: string): string => {
    if (wallet && address === wallet.address) return wallet.alias || shortAddress(address);
    const social = SocialEngine.load();
    const profile = social.getProfile(address);
    return profile?.alias || shortAddress(address);
  };

  const WartCard = ({ wart }: { wart: Wart }) => {
    const videoBlobUrl = useMemo(() => wart.mediaType === 'video' && wart.imageData ? dataUrlToBlobUrl(wart.imageData) : '', [wart.imageData, wart.mediaType]);
    return (
    <div className="glass-panel overflow-hidden cursor-pointer hover:border-current/20 transition-all" onClick={() => handleViewWart(wart)}>
      <div className="aspect-square overflow-hidden bg-current/5">
        {wart.mediaType === 'video' && wart.imageData ? (
          <video src={videoBlobUrl || wart.imageData} className="w-full h-full object-cover" muted playsInline preload="metadata" />
        ) : wart.mediaType === 'audio' && wart.audioCover ? (
          <img src={wart.audioCover} alt={wart.title} className="w-full h-full object-cover" />
        ) : wart.imageData ? (
          <img src={wart.imageData} alt={wart.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl opacity-50">
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
          <p className="text-[10px] opacity-60 truncate">{getCreatorName(wart.creator)}</p>
        </div>
        <p className="text-label opacity-60">{wart.price !== null ? `${wart.price} \u2B23` : 'Not listed'}</p>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
          <button className="flex items-center gap-1 opacity-60 hover:opacity-80 cursor-pointer" onClick={e => e.stopPropagation()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <button className="opacity-60 hover:opacity-80 cursor-pointer" onClick={e => e.stopPropagation()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </button>
          <button className="opacity-60 hover:opacity-80 cursor-pointer" onClick={e => e.stopPropagation()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </button>
          <button className="opacity-60 hover:opacity-80 cursor-pointer" onClick={e => e.stopPropagation()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
  };

  return (
    <div className="pb-4">
      {/* ─── Banner ───────────────────────────────────────── */}
      <div className="relative w-full h-48 sm:h-64 overflow-hidden">
        {bannerImage ? (
          <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <video
            src={`${import.meta.env.BASE_URL}strangrz-landing-hero-random-${heroVideoNum}.mp4`}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
          />
        )}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        {/* Back button */}
        <button
          onClick={() => onNavigate('wall')}
          className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-white/80 bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* ─── Profile Info (centered, overlapping banner) ──── */}
      <div className="relative px-4">
        <div className="flex flex-col items-center -mt-14 sm:-mt-16">
          {/* Avatar */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-[var(--bg,#0a0a0f)] overflow-hidden bg-[var(--bg,#0a0a0f)]">
            {profileImage ? (
              <img src={profileImage} alt={alias} className="w-full h-full object-cover" />
            ) : (
              <HexAvatar address={targetAddress} size={128} animate />
            )}
          </div>

          <h2 className="text-title-md font-bold opacity-100 font-title mt-3">{alias}</h2>
          <p
            className="text-[11px] opacity-60 font-mono mt-0.5 cursor-pointer hover:opacity-60 transition-opacity"
            onClick={() => {
              copyToClipboard(targetAddress);
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

          {/* Curator badge */}
          {collection.length >= 100 && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold tracking-wide" style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                CURATOR
              </span>
            </div>
          )}

          {/* Bio */}
          {bio && <p className="text-body-sm opacity-50 mt-3 max-w-sm text-center">{bio}</p>}

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
                  {showFollowMenu && (
                    <div className="absolute top-full left-0 mt-1 w-52 glass-panel border border-current/15 z-50 follow-dropdown">
                      <button onClick={toggleCloseFriend} className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors flex items-center justify-between">
                        <span className="opacity-70">Close friends</span>
                        {isCloseFriend && <span className="opacity-80">{'\u2713'}</span>}
                      </button>
                      <button onClick={toggleFavorite} className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors flex items-center justify-between">
                        <span className="opacity-70">Favorites</span>
                        {isFavorite && <span className="opacity-80">{'\u2605'}</span>}
                      </button>
                      <div className="border-t border-current/10" />
                      <button onClick={toggleMute} className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors flex items-center justify-between">
                        <span className="opacity-70">Mute</span>
                        {isMuted && <span className="opacity-60">{'\u2713'}</span>}
                      </button>
                      <button onClick={toggleRestrict} className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors flex items-center justify-between">
                        <span className="opacity-70">Restrict</span>
                        {isRestricted && <span className="opacity-60">{'\u2713'}</span>}
                      </button>
                      <div className="border-t border-current/10" />
                      <button onClick={handleUnfollow} className="w-full text-left px-4 py-2.5 text-body-sm hover:bg-current/5 cursor-pointer transition-colors opacity-70">
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
                <button onClick={handleBlock} className="text-body-sm px-2 py-2 opacity-50 cursor-pointer hover:opacity-70 transition-colors" title="Block">
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
              <span className="opacity-60">Followers</span>
            </div>
            <div className="text-center">
              <span className="block font-bold opacity-90 text-base">{followingCount}</span>
              <span className="opacity-60">Following</span>
            </div>
            <div className="text-center">
              <span className="block font-bold opacity-90 text-base">{posts.length}</span>
              <span className="opacity-60">Posts</span>
            </div>
          </div>

          {/* Mutual followers */}
          {mutualFollowers.length > 0 && (
            <p className="text-label opacity-60 mt-2">
              Followed by {mutualFollowers.length} {mutualFollowers.length === 1 ? 'person' : 'people'} you follow
            </p>
          )}
        </div>
      </div>

      {/* ─── Tabs ─────────────────────────────────────────── */}
      <div className="flex border-b border-current/10 overflow-x-auto mt-4">
        {tabList.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2.5 text-body-sm font-medium transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              tab === t.id
                ? 'border-current/20 opacity-80'
                : 'border-transparent opacity-60 hover:opacity-70'
            }`}
          >
            {t.label} <span className="text-label opacity-50 ml-1">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ─── Content ──────────────────────────────────────── */}
      <div className="pt-2">
        {tab === 'posts' && (
          posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">No posts yet</p>
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
                    <img src={post.mediaData} alt="" className="mt-2 w-auto max-w-full" />
                  )}
                  {post.mediaData && post.mediaType === 'video' && (
                    <video controls playsInline preload="auto" src={post.mediaData.startsWith('data:') ? dataUrlToBlobUrl(post.mediaData) : post.mediaData} className="mt-2 w-full bg-black" />
                  )}
                  {post.mediaData && post.mediaType === 'audio' && (
                    <audio controls src={post.mediaData} className="mt-2 w-full h-10" />
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
                    <span className="opacity-60 text-body-sm">{post.tipCount > 0 ? `Tip ${post.tipCount}\u2B23` : '0 tips'}</span>
                    <span className="opacity-60 text-body-sm">{post.rewarpCount} rewarps</span>
                    <span className="opacity-60 text-body-sm">{post.comments.length} comments</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'created' && (
          created.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">No artwork created</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {created.map(wart => <WartCard key={wart.id} wart={wart} />)}
            </div>
          )
        )}

        {tab === 'collection' && (
          collection.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">Empty collection</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {collection.map(wart => <WartCard key={wart.id} wart={wart} />)}
            </div>
          )
        )}

        {/* Curations */}
        {tab === 'curations' && (
          curatorArticles.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">Aucune curation</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {curatorArticles.map(article => {
                const allWarts = [...created, ...collection];
                const coverWart = allWarts.find(w => w.id === article.coverWartId);
                return (
                  <div key={article.id} className="glass-panel overflow-hidden cursor-pointer hover:border-current/20 transition-all" onClick={() => onNavigate('gallery')}>
                    <div className="h-32 overflow-hidden bg-current/5">
                      {coverWart?.imageData ? (
                        <img src={coverWart.imageData} alt={article.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-body-sm font-bold opacity-90 truncate">{article.title}</p>
                      {article.subtitle && <p className="text-label opacity-60 truncate mt-0.5">{article.subtitle}</p>}
                      <div className="flex gap-3 mt-2 text-label opacity-50">
                        <span>{article.likes?.length || 0} likes</span>
                        <span>{article.views || 0} views</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Playlists */}
        {tab === 'playlists' && (
          userPlaylists.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-2xl mb-2 opacity-30">{'\u266B'}</p>
              <p className="opacity-60 text-base">No playlists</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userPlaylists.map(pl => {
                const allWarts = [...created, ...collection];
                const coverWart = pl.coverWartId ? allWarts.find(w => w.id === pl.coverWartId) : null;
                const playlistWarts = pl.wartIds.map(id => allWarts.find(w => w.id === id)).filter(Boolean) as Wart[];

                return (
                  <div key={pl.id} className="glass-panel overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-14 h-14 shrink-0 bg-current/5 overflow-hidden flex items-center justify-center">
                        {(coverWart?.audioCover || coverWart?.imageData) ? (
                          <img src={coverWart.audioCover || coverWart.imageData} alt={pl.title} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl opacity-30">{pl.type === 'music' ? '\u266B' : '\u25B6'}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold opacity-90 truncate">{pl.title}</p>
                        {pl.description && <p className="text-label opacity-50 truncate">{pl.description}</p>}
                        <p className="text-label opacity-40">{playlistWarts.length} tracks · {pl.type === 'music' ? '\u266B Music' : '\u25B6 Video'}</p>
                      </div>
                    </div>
                    {playlistWarts.length > 0 && (
                      <div className="border-t border-current/10">
                        {playlistWarts.map((w, idx) => (
                          <div
                            key={w.id}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-current/5 transition-colors cursor-pointer"
                            onClick={() => handleViewWart(w)}
                          >
                            <span className="text-label opacity-40 w-5 text-right">{idx + 1}</span>
                            <div className="w-8 h-8 shrink-0 bg-current/5 overflow-hidden">
                              {(w.audioCover || w.imageData) ? (
                                <img src={w.audioCover || w.imageData} alt={w.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"><span className="text-xs opacity-40">{pl.type === 'music' ? '\u266B' : '\u25B6'}</span></div>
                              )}
                            </div>
                            <p className="text-body-sm opacity-80 truncate flex-1">{w.title}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {tab === 'media' && (
          mediaWarts.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">No media</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {mediaWarts.map(wart => <WartCard key={wart.id} wart={wart} />)}
            </div>
          )
        )}
      </div>
    </div>
  );
}
