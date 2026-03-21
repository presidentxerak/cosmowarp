import { useState, useEffect, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import { shortAddress } from '../engine/crypto';
import { copyToClipboard } from '../lib/clipboard';
import { SocialEngine } from '../engine/social';
import { CosmoChatEngine } from '../engine/cosmochat';
import type { ChatPost } from '../engine/cosmochat';
import type { Wart } from '../engine/warts';
import { fetchSocialProfile, fetchFollowers, fetchFollowing } from '../lib/supabase-db';
import * as sync from '../lib/supabase-sync';
import { uploadAvatar, uploadBanner, downloadProfileImageAsDataUrl } from '../lib/supabase-storage';
import { upsertPlaylist, fetchPlaylists, deletePlaylistCloud } from '../lib/supabase-db';
import HexAvatar from './HexAvatar';
import InfoTooltip from './InfoTooltip';
import ShareModal from './ShareModal';

/** Convert base64 data URL to blob URL for reliable video playback on Safari */
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

const MAX_PROFILE_IMAGE_SIZE = 100 * 1024; // 100 Ko
const MAX_BANNER_SIZE = 200 * 1024;        // 200 Ko

type Tab = 'warts' | 'collected' | 'curations' | 'posts' | 'playlists' | 'followers' | 'following';

// ─── Playlist types ─────────────────────────────────
interface Playlist {
  id: string;
  title: string;
  description: string;
  type: 'music' | 'video';
  wartIds: string[];
  createdAt: number;
  coverWartId?: string;
}

const PLAYLISTS_KEY = 'strangrz_playlists';

function loadPlaylists(address: string): Playlist[] {
  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as (Playlist & { owner: string })[];
    return all.filter(p => p.owner === address);
  } catch { return []; }
}

function savePlaylists(address: string, playlists: Playlist[]): void {
  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY);
    const all = raw ? JSON.parse(raw) as (Playlist & { owner: string })[] : [];
    const others = all.filter(p => p.owner !== address);
    const withOwner = playlists.map(p => ({ ...p, owner: address }));
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify([...others, ...withOwner]));
  } catch { /* ignore */ }
  // Push to cloud
  for (const pl of playlists) {
    upsertPlaylist({ ...pl, owner: address }).catch(() => {});
  }
}

export default function ProfileView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { wallet, unlocked, lock, signOut, myCreated, myCollection, warts: allWarts, marketplace, toggleWartLike, toggleWartBookmark } = useWallet();
  const [tab, setTab] = useState<Tab>('warts');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [posts, setPosts] = useState<ChatPost[]>([]);
  const [bio, setBio] = useState('');
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersList, setFollowersList] = useState<{ address: string; alias: string }[]>([]);
  const [followingList, setFollowingList] = useState<{ address: string; alias: string }[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistType, setNewPlaylistType] = useState<'music' | 'video'>('music');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [editingLinks, setEditingLinks] = useState(false);
  const [linkWebsite, setLinkWebsite] = useState('');
  const [linkInstagram, setLinkInstagram] = useState('');
  const [linkTwitter, setLinkTwitter] = useState('');
  const [bannerImage, setBannerImage] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [shareWartId, setShareWartId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const heroVideoNum = useRef(getHeroVideoNum()).current;

  useEffect(() => {
    if (!wallet) return;
    const social = SocialEngine.load();
    const profile = social.ensureProfile(wallet.address, wallet.alias || shortAddress(wallet.address));
    setBio(profile.bio);
    setFollowersCount(profile.followers.length);
    setFollowingCount(profile.following.length);
    setFollowersList(social.getFollowers(wallet.address).map(p => ({ address: p.address, alias: p.alias })));
    setFollowingList(social.getFollowing(wallet.address).map(p => ({ address: p.address, alias: p.alias })));
    setWebsite(profile.website);
    setInstagram(profile.instagram);
    setTwitter(profile.twitter);
    setBannerImage(profile.bannerImage || '');
    setProfileImage(profile.profileImage || '');

    // If avatar/banner missing locally, try downloading from cloud
    if (!profile.profileImage) {
      downloadProfileImageAsDataUrl(wallet.address, 'avatar').then(data => {
        if (data) {
          setProfileImage(data);
          const s = SocialEngine.load();
          s.updateProfileImage(wallet.address, data);
        }
      }).catch(() => {});
    }
    if (!profile.bannerImage) {
      downloadProfileImageAsDataUrl(wallet.address, 'banner').then(data => {
        if (data) {
          setBannerImage(data);
          const s = SocialEngine.load();
          s.updateBannerImage(wallet.address, data);
        }
      }).catch(() => {});
    }

    const chatEngine = CosmoChatEngine.load();
    setPosts(chatEngine.getUserPosts(wallet.address));
    const localPl = loadPlaylists(wallet.address);
    setPlaylists(localPl);
    // Merge playlists from cloud
    fetchPlaylists(wallet.address).then(cloudPl => {
      if (!cloudPl || cloudPl.length === 0) return;
      const localIds = new Set(localPl.map(p => p.id));
      const merged = [...localPl];
      for (const cp of cloudPl) {
        if (!localIds.has(cp.id)) merged.push(cp as Playlist);
      }
      if (merged.length > localPl.length) {
        savePlaylists(wallet.address, merged);
        setPlaylists(merged);
      }
    }).catch(() => {});

    // Sync social relationships from cloud (follows, blocks, close friends, etc.)
    social.syncFromCloud(wallet.address).then(() => {
      const updatedProfile = social.getProfile(wallet.address);
      if (updatedProfile) {
        setFollowersCount(updatedProfile.followers.length);
        setFollowingCount(updatedProfile.following.length);
        setFollowersList(social.getFollowers(wallet.address).map(p => ({ address: p.address, alias: p.alias })));
        setFollowingList(social.getFollowing(wallet.address).map(p => ({ address: p.address, alias: p.alias })));
      }
    }).catch(() => {});

    fetchSocialProfile(wallet.address).then(remote => {
      if (!remote) return;
      if (remote.bio) { setBio(remote.bio); social.updateBio(wallet.address, remote.bio); }
      if (remote.website) { setWebsite(remote.website); }
      if (remote.instagram) { setInstagram(remote.instagram); }
      if (remote.twitter) { setTwitter(remote.twitter); }
      if (remote.website || remote.instagram || remote.twitter) {
        social.updateLinks(wallet.address, {
          website: remote.website || profile.website,
          instagram: remote.instagram || profile.instagram,
          twitter: remote.twitter || profile.twitter,
        });
      }
    }).catch(() => {});

    Promise.all([
      fetchFollowers(wallet.address).catch(() => []),
      fetchFollowing(wallet.address).catch(() => []),
    ]).then(([cloudFollowers, cloudFollowing]) => {
      if (cloudFollowers.length > profile.followers.length) setFollowersCount(cloudFollowers.length);
      if (cloudFollowing.length > profile.following.length) setFollowingCount(cloudFollowing.length);
    }).catch(() => {});
  }, [wallet]);

  if (!wallet || !unlocked) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-120px)]">
        <div className="text-center px-6">
          <HexAvatar address="default" size={64} className="mx-auto mb-4" />
          <p className="opacity-50 text-base">Unlock your wallet to view profile</p>
        </div>
      </div>
    );
  }

  const alias = wallet.alias || shortAddress(wallet.address);

  const handleSaveBio = () => {
    const social = SocialEngine.load();
    social.updateBio(wallet.address, bioInput);
    setBio(bioInput);
    setEditingBio(false);
    const profile = social.getProfile(wallet.address);
    if (profile) sync.syncSocialProfile(profile);
  };

  const handleSaveLinks = () => {
    const social = SocialEngine.load();
    social.updateLinks(wallet.address, { website: linkWebsite, instagram: linkInstagram, twitter: linkTwitter });
    setWebsite(linkWebsite);
    setInstagram(linkInstagram);
    setTwitter(linkTwitter);
    setEditingLinks(false);
    const profile = social.getProfile(wallet.address);
    if (profile) sync.syncSocialProfile(profile);
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      setUploadError(`Photo de profil trop lourde (${Math.round(file.size / 1024)} Ko). Max 100 Ko.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const social = SocialEngine.load();
      social.updateProfileImage(wallet.address, data);
      setProfileImage(data);
      uploadAvatar(data, wallet.address).catch(() => {});
    };
    reader.readAsDataURL(file);
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    if (file.size > MAX_BANNER_SIZE) {
      setUploadError(`Banniere trop lourde (${Math.round(file.size / 1024)} Ko). Max 200 Ko.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      const social = SocialEngine.load();
      social.updateBannerImage(wallet.address, data);
      setBannerImage(data);
      uploadBanner(data, wallet.address).catch(() => {});
    };
    reader.readAsDataURL(file);
  };

  const handleViewUser = (address: string) => {
    sessionStorage.setItem('strangrz_view_user', address);
    onNavigate('user-profile');
  };

  const handleViewWart = (wart: Wart) => {
    sessionStorage.setItem('strangrz_open_wart', wart.id);
    onNavigate('gallery');
  };

  // Load curator articles from localStorage
  const curatorArticles = (() => {
    try {
      const raw = localStorage.getItem('strangrz_curator_articles');
      if (!raw) return [];
      const articles = JSON.parse(raw) as { id: string; authorAddress: string; title: string; subtitle: string; coverWartId: string; createdAt: number; likes: string[]; views: number }[];
      return articles.filter(a => a.authorAddress === wallet.address);
    } catch { return []; }
  })();

  const tabList: { id: Tab; label: string; count?: number }[] = [
    { id: 'warts', label: 'Created', count: myCreated.length },
    { id: 'collected', label: 'Collection', count: myCollection.length },
    { id: 'curations', label: 'Curations', count: curatorArticles.length },
    { id: 'posts', label: 'Posts', count: posts.length },
    { id: 'playlists', label: 'Playlists', count: playlists.length },
    { id: 'followers', label: 'Followers', count: followersCount },
    { id: 'following', label: 'Following', count: followingCount },
  ];

  // ─── Playlist CRUD ──────────────────────────────
  const handleCreatePlaylist = () => {
    if (!wallet || !newPlaylistTitle.trim()) return;
    const newPlaylist: Playlist = {
      id: `PL_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: newPlaylistTitle.trim(),
      description: newPlaylistDesc.trim(),
      type: newPlaylistType,
      wartIds: [],
      createdAt: Date.now(),
    };
    const updated = [...playlists, newPlaylist];
    setPlaylists(updated);
    savePlaylists(wallet.address, updated);
    setCreatingPlaylist(false);
    setNewPlaylistTitle('');
    setNewPlaylistDesc('');
  };

  const handleDeletePlaylist = (id: string) => {
    if (!wallet) return;
    const updated = playlists.filter(p => p.id !== id);
    setPlaylists(updated);
    savePlaylists(wallet.address, updated);
    deletePlaylistCloud(id).catch(() => {});
  };

  const handleAddToPlaylist = (playlistId: string, wartId: string) => {
    if (!wallet) return;
    const updated = playlists.map(p => {
      if (p.id !== playlistId) return p;
      if (p.wartIds.includes(wartId)) return p;
      return { ...p, wartIds: [...p.wartIds, wartId], coverWartId: p.coverWartId || wartId };
    });
    setPlaylists(updated);
    savePlaylists(wallet.address, updated);
  };

  const handleRemoveFromPlaylist = (playlistId: string, wartId: string) => {
    if (!wallet) return;
    const updated = playlists.map(p => {
      if (p.id !== playlistId) return p;
      return { ...p, wartIds: p.wartIds.filter(id => id !== wartId) };
    });
    setPlaylists(updated);
    savePlaylists(wallet.address, updated);
  };

  // Media warts available for playlists (global)
  const allAvailableWarts = [...(allWarts || []), ...(marketplace || []), ...(myCreated || []), ...(myCollection || [])].filter((w, i, arr) => arr.findIndex(x => x.id === w.id) === i);
  const musicWarts = allAvailableWarts.filter(w => w.mediaType === 'audio');
  const videoWarts = allAvailableWarts.filter(w => w.mediaType === 'video');

  // ─── Wart Card reusable ──────────────────────────
  const WartCard = ({ wart }: { wart: Wart }) => (
    <div className="glass-panel overflow-hidden cursor-pointer hover:border-current/20 transition-all" onClick={() => handleViewWart(wart)}>
      <div className="aspect-square overflow-hidden bg-current/5">
        {wart.mediaType === 'video' && wart.imageData ? (
          <video src={wart.imageData.startsWith('data:') ? dataUrlToBlobUrl(wart.imageData) : wart.imageData} className="w-full h-full object-cover" muted playsInline preload="metadata" />
        ) : wart.mediaType === 'audio' && wart.audioCover ? (
          <img src={wart.audioCover} alt={wart.title} className="w-full h-full object-cover" />
        ) : wart.mediaType !== 'audio' && wart.imageData ? (
          <img src={wart.imageData} alt={wart.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl opacity-50">{wart.mediaType === 'video' ? '\u25B6' : wart.mediaType === 'audio' ? '\u266B' : '\u25C8'}</span>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-body-sm font-medium opacity-90 truncate">{wart.title}</p>
        <p className="text-label opacity-60">{wart.price !== null ? `${wart.price} \u2B23` : 'Not listed'}</p>
        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-current/10">
          <button className={`opacity-${wart.likes?.includes(wallet.address) ? '80' : '40'} hover:opacity-80 cursor-pointer`} onClick={e => { e.stopPropagation(); toggleWartLike(wart.id); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={wart.likes?.includes(wallet.address) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <button className="opacity-60 hover:opacity-80 cursor-pointer" onClick={e => { e.stopPropagation(); setShareWartId(wart.id); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </button>
          <button className={`opacity-${wart.bookmarks?.includes(wallet.address) ? '80' : '40'} hover:opacity-80 cursor-pointer`} onClick={e => { e.stopPropagation(); toggleWartBookmark(wart.id); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill={wart.bookmarks?.includes(wallet.address) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pb-4">
      {/* ─── Banner ───────────────────────────────────────── */}
      <div className="relative w-full h-48 sm:h-64 overflow-hidden group">
        {/* Banner content: custom image or hero video placeholder */}
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
        {/* Banner edit button — always visible */}
        <button
          onClick={() => bannerRef.current?.click()}
          className="absolute top-3 right-3 flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-all cursor-pointer"
          title="Changer la bannière (max 200 Ko)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Edit
        </button>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
        {/* Top-left action buttons — always visible */}
        <div className="absolute top-3 left-3 flex gap-2">
          <button
            onClick={() => onNavigate('wallet')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-all cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 10h20" />
            </svg>
            Wallet
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-all cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Paramètres
          </button>
        </div>
      </div>

      {/* ─── Profile Info (centered, overlapping banner) ──── */}
      <div className="relative px-3 sm:px-4">
        {/* Avatar - overlapping the banner */}
        <div className="flex flex-col items-center -mt-14 sm:-mt-16">
          <div className="relative group">
            <div className="w-28 h-28 sm:w-32 sm:h-32 overflow-hidden flex items-center justify-center">
              {profileImage ? (
                <img src={profileImage} alt={alias} className="w-full h-full object-cover rounded-full" />
              ) : (
                <HexAvatar address={wallet.address} size={128} animate />
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Changer la photo de profil (max 100 Ko)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} />
          </div>

          {/* Upload error */}
          {uploadError && (
            <p className="text-[11px] mt-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400">{uploadError}</p>
          )}

          {/* Name & address */}
          <h2 className="text-title-lg font-bold opacity-100 font-title mt-3">{alias}</h2>
          <div className="flex items-center gap-1.5 mt-0.5 justify-center">
            <p className="text-[11px] opacity-60 font-mono">{wallet.address}</p>
            <button
              className="opacity-40 hover:opacity-80 cursor-pointer transition-opacity"
              title="Copy address"
              onClick={() => { copyToClipboard(wallet.address); setCopiedAddress(true); setTimeout(() => setCopiedAddress(false), 2000); }}
            >
              {copiedAddress ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              )}
            </button>
          </div>

          {/* Balance & Level */}
          <div className="flex gap-4 mt-2 items-center flex-wrap justify-center">
            <span className="text-base font-bold opacity-80">{wallet.balance.toFixed(2)} {'\u2B23'}</span>
            <InfoTooltip text="Your STRNGRZ balance (\u2B23). Earn by mining, selling artworks, or receiving tips." />
            <span className="text-body-sm opacity-60">|</span>
            <span className="text-base font-bold opacity-80">Lv.{wallet.level || 1}</span>
            <span className="text-label opacity-60">{wallet.levelName}</span>
            <InfoTooltip text={`Level ${wallet.level || 1} ${wallet.levelName || 'Particle'}. Progress through 7 cosmic tiers by staying active.`} />
          </div>

          {/* Curator badge */}
          {myCollection.length >= 100 && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold tracking-wide" style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#d4af37' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                CURATOR
              </span>
              <InfoTooltip text="You are a Curator! With 10+ collected works, you can create editorial articles and curate collections." />
            </div>
          )}

          {/* Bio */}
          <div className="mt-3 w-full max-w-sm text-center">
            {editingBio ? (
              <div className="flex gap-2">
                <input
                  className="warp-input flex-1 text-body-sm py-1.5"
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={280}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveBio(); }}
                  autoFocus
                />
                <button onClick={handleSaveBio} className="warp-button text-body-sm px-3 py-1.5">Save</button>
                <button onClick={() => setEditingBio(false)} className="text-body-sm opacity-60 cursor-pointer">Cancel</button>
              </div>
            ) : (
              <p
                className="text-body-sm opacity-60 cursor-pointer hover:opacity-80 transition-colors"
                onClick={() => { setBioInput(bio); setEditingBio(true); }}
              >
                {bio || 'Tap to add a bio...'}
              </p>
            )}
          </div>

          {/* Social links */}
          <div className="mt-2 flex flex-wrap gap-3 justify-center items-center">
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
            <button
              onClick={() => { setLinkWebsite(website); setLinkInstagram(instagram); setLinkTwitter(twitter); setEditingLinks(!editingLinks); }}
              className="text-label opacity-50 hover:opacity-50 cursor-pointer"
            >
              {editingLinks ? 'Cancel' : (website || instagram || twitter ? 'Edit links' : '+ Add links')}
            </button>
          </div>

          {/* Edit links form */}
          {editingLinks && (
            <div className="mt-3 w-full max-w-sm space-y-2">
              <input className="warp-input text-body-sm py-1.5" value={linkWebsite} onChange={e => setLinkWebsite(e.target.value)} placeholder="Website URL" />
              <input className="warp-input text-body-sm py-1.5" value={linkInstagram} onChange={e => setLinkInstagram(e.target.value)} placeholder="Instagram username" />
              <input className="warp-input text-body-sm py-1.5" value={linkTwitter} onChange={e => setLinkTwitter(e.target.value)} placeholder="X (Twitter) username" />
              <button onClick={handleSaveLinks} className="warp-button text-body-sm w-full py-1.5">Save Links</button>
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-6 mt-4 text-body-sm">
            <button onClick={() => setTab('followers')} className="cursor-pointer hover:opacity-80 transition-colors text-center">
              <span className="block font-bold opacity-90 text-base">{followersCount}</span>
              <span className="opacity-60">Followers</span>
            </button>
            <button onClick={() => setTab('following')} className="cursor-pointer hover:opacity-80 transition-colors text-center">
              <span className="block font-bold opacity-90 text-base">{followingCount}</span>
              <span className="opacity-60">Following</span>
            </button>
            <div className="text-center">
              <span className="block font-bold opacity-90 text-base">{posts.length}</span>
              <span className="opacity-60">Posts</span>
            </div>
            <div className="text-center">
              <span className="block font-bold opacity-90 text-base">{myCreated.length}</span>
              <span className="opacity-60">Created</span>
            </div>
            <div className="text-center">
              <span className="block font-bold opacity-90 text-base">{myCollection.length}</span>
              <span className="opacity-60">Collected</span>
            </div>
          </div>
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
            {t.label}
            {t.count !== undefined && <span className="ml-1 text-label opacity-50">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ─── Tab content ──────────────────────────────────── */}
      <div className="px-0 pt-2">
        {/* Posts */}
        {tab === 'posts' && (
          posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">No posts yet</p>
              <button onClick={() => onNavigate('wall')} className="text-body-sm opacity-80 mt-2 cursor-pointer">Go to Wall</button>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => (
                <div key={post.id} className="glass-panel p-3">
                  <p className="text-base opacity-70 whitespace-pre-wrap">{post.content}</p>
                  {post.mediaData && post.mediaType === 'image' && (
                    <img src={post.mediaData} alt="" className="mt-2 w-full max-h-64 object-cover" />
                  )}
                  <div className="flex gap-4 mt-2 text-label opacity-60">
                    <span>{post.tipCount} tips</span>
                    <span>{post.rewarpCount} rewarps</span>
                    <span>{post.comments.length} comments</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Created Warts */}
        {tab === 'warts' && (
          myCreated.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">Aucune Strangrz créée</p>
              <button onClick={() => onNavigate('gallery')} className="text-body-sm opacity-80 mt-2 cursor-pointer">Go to Gallery</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {myCreated.map((wart: Wart) => <WartCard key={wart.id} wart={wart} />)}
            </div>
          )
        )}

        {/* Collection */}
        {tab === 'collected' && (
          myCollection.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">Aucune Strangrz dans la collection</p>
              <button onClick={() => onNavigate('gallery')} className="text-body-sm opacity-80 mt-2 cursor-pointer">Browse Gallery</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {myCollection.map((wart: Wart) => <WartCard key={wart.id} wart={wart} />)}
            </div>
          )
        )}

        {/* Curations */}
        {tab === 'curations' && (
          curatorArticles.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">Aucune curation</p>
              {myCollection.length >= 10 ? (
                <button onClick={() => onNavigate('gallery')} className="text-body-sm opacity-80 mt-2 cursor-pointer">Creer un article</button>
              ) : (
                <p className="text-label opacity-50 mt-1">Collectionnez 10 œuvres pour devenir Curateur</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {curatorArticles.map(article => {
                const coverWart = myCreated.find(w => w.id === article.coverWartId) || myCollection.find(w => w.id === article.coverWartId);
                return (
                  <div key={article.id} className="glass-panel overflow-hidden cursor-pointer hover:border-current/20 transition-all" onClick={() => onNavigate('gallery')}>
                    <div className="h-32 overflow-hidden bg-current/5">
                      {coverWart?.imageData ? (
                        <img src={coverWart.imageData} alt={article.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-20"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
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
          <div>
            {/* Create playlist button */}
            {!creatingPlaylist ? (
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => setCreatingPlaylist(true)}
                  className="warp-button text-body-sm px-4 py-2 flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New Playlist
                </button>
              </div>
            ) : (
              <div className="glass-panel p-4 mb-4 space-y-3">
                <h3 className="text-base font-bold opacity-90">Create Playlist</h3>
                <input
                  className="warp-input text-body-sm py-1.5 w-full"
                  value={newPlaylistTitle}
                  onChange={e => setNewPlaylistTitle(e.target.value)}
                  placeholder="Playlist title"
                  maxLength={60}
                  autoFocus
                />
                <input
                  className="warp-input text-body-sm py-1.5 w-full"
                  value={newPlaylistDesc}
                  onChange={e => setNewPlaylistDesc(e.target.value)}
                  placeholder="Description (optional)"
                  maxLength={200}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewPlaylistType('music')}
                    className={`flex-1 py-2 text-body-sm font-medium border cursor-pointer transition-all ${newPlaylistType === 'music' ? 'border-current/30 opacity-90 bg-current/5' : 'border-current/10 opacity-50'}`}
                  >
                    {'\u266B'} Music
                  </button>
                  <button
                    onClick={() => setNewPlaylistType('video')}
                    className={`flex-1 py-2 text-body-sm font-medium border cursor-pointer transition-all ${newPlaylistType === 'video' ? 'border-current/30 opacity-90 bg-current/5' : 'border-current/10 opacity-50'}`}
                  >
                    {'\u25B6'} Video
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreatePlaylist} className="warp-button text-body-sm px-4 py-1.5 flex-1" disabled={!newPlaylistTitle.trim()}>Create</button>
                  <button onClick={() => setCreatingPlaylist(false)} className="text-body-sm opacity-60 cursor-pointer px-4">Cancel</button>
                </div>
              </div>
            )}

            {playlists.length === 0 && !creatingPlaylist ? (
              <div className="text-center py-12">
                <p className="text-2xl mb-2 opacity-30">{'\u266B'}</p>
                <p className="opacity-60 text-base">No playlists yet</p>
                <p className="text-body-sm opacity-40 mt-1">Create playlists to organize your music and videos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {playlists.map(pl => {
                  const allWarts = [...myCreated, ...myCollection];
                  const coverWart = pl.coverWartId ? allWarts.find(w => w.id === pl.coverWartId) : null;
                  const playlistWarts = pl.wartIds.map(id => allWarts.find(w => w.id === id)).filter(Boolean) as Wart[];
                  const availableWarts = pl.type === 'music' ? musicWarts : videoWarts;
                  const notInPlaylist = availableWarts.filter(w => !pl.wartIds.includes(w.id));

                  return (
                    <div key={pl.id} className="glass-panel overflow-hidden">
                      {/* Playlist header */}
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-16 h-16 shrink-0 bg-current/5 overflow-hidden flex items-center justify-center">
                          {coverWart?.imageData || coverWart?.audioCover ? (
                            <img src={coverWart.audioCover || coverWart.imageData} alt={pl.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl opacity-30">{pl.type === 'music' ? '\u266B' : '\u25B6'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold opacity-90 truncate">{pl.title}</p>
                          {pl.description && <p className="text-label opacity-50 truncate">{pl.description}</p>}
                          <p className="text-label opacity-40 mt-0.5">{playlistWarts.length} tracks · {pl.type === 'music' ? '\u266B' : '\u25B6'}</p>
                        </div>
                        <button
                          onClick={() => handleDeletePlaylist(pl.id)}
                          className="shrink-0 opacity-40 hover:opacity-70 cursor-pointer p-1"
                          title="Delete playlist"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </div>

                      {/* Playlist items */}
                      {playlistWarts.length > 0 && (
                        <div className="border-t border-current/10">
                          {playlistWarts.map((w, idx) => (
                            <div key={w.id} className="flex items-center gap-2 px-3 py-2 hover:bg-current/5 transition-colors">
                              <span className="text-label opacity-40 w-5 text-right">{idx + 1}</span>
                              <div className="w-8 h-8 shrink-0 bg-current/5 overflow-hidden">
                                {(w.audioCover || w.imageData) ? (
                                  <img src={w.audioCover || w.imageData} alt={w.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><span className="text-xs opacity-40">{pl.type === 'music' ? '\u266B' : '\u25B6'}</span></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-body-sm opacity-80 truncate">{w.title}</p>
                              </div>
                              <button
                                onClick={() => handleRemoveFromPlaylist(pl.id, w.id)}
                                className="opacity-30 hover:opacity-60 cursor-pointer"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add tracks */}
                      {notInPlaylist.length > 0 && (
                        <div className="border-t border-current/10 p-2">
                          <p className="text-label opacity-50 px-1 mb-1">Add tracks:</p>
                          <div className="flex flex-wrap gap-1">
                            {notInPlaylist.slice(0, 6).map(w => (
                              <button
                                key={w.id}
                                onClick={() => handleAddToPlaylist(pl.id, w.id)}
                                className="flex items-center gap-1 px-2 py-1 text-label opacity-60 hover:opacity-80 border border-current/10 cursor-pointer transition-all hover:bg-current/5"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                {w.title.slice(0, 20)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Followers */}
        {tab === 'followers' && (
          followersList.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">No followers yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {followersList.map(user => (
                <button
                  key={user.address}
                  onClick={() => handleViewUser(user.address)}
                  className="w-full flex items-center gap-3 p-3 glass-panel hover:bg-current/5 transition-colors cursor-pointer text-left"
                >
                  <HexAvatar address={user.address} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium opacity-90 truncate">{user.alias}</p>
                    <p className="text-label opacity-60 truncate">{shortAddress(user.address)}</p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* Following */}
        {tab === 'following' && (
          followingList.length === 0 ? (
            <div className="text-center py-12">
              <p className="opacity-60 text-base">Not following anyone yet</p>
              <button onClick={() => onNavigate('discover')} className="text-body-sm opacity-80 mt-2 cursor-pointer">Discover users</button>
            </div>
          ) : (
            <div className="space-y-1">
              {followingList.map(user => (
                <button
                  key={user.address}
                  onClick={() => handleViewUser(user.address)}
                  className="w-full flex items-center gap-3 p-3 glass-panel hover:bg-current/5 transition-colors cursor-pointer text-left"
                >
                  <HexAvatar address={user.address} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium opacity-90 truncate">{user.alias}</p>
                    <p className="text-label opacity-60 truncate">{shortAddress(user.address)}</p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* ─── Account actions ──────────────────────────────── */}
      <div className="glass-panel p-4 space-y-2 mt-4">
        <button
          onClick={lock}
          className="w-full text-left px-3 py-2.5 text-base opacity-70 hover:bg-current/5 transition-colors cursor-pointer flex items-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-60">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Lock Wallet
        </button>
        <button
          onClick={() => { if (confirm('Sign out? Make sure you have a backup.')) { signOut(); onNavigate('wallet'); } }}
          className="w-full text-left px-3 py-2.5 text-base opacity-70 hover:bg-current/5 transition-colors cursor-pointer flex items-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="opacity-70">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>

      {/* Share Modal */}
      {shareWartId && (() => {
        const sw = [...myCreated, ...myCollection].find(w => w.id === shareWartId);
        if (!sw) return null;
        return (
          <ShareModal
            wart={sw}
            walletAddress={wallet.address}
            walletAlias={wallet.alias}
            onClose={() => setShareWartId(null)}
          />
        );
      })()}
    </div>
  );
}
